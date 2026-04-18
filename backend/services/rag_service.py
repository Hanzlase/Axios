from __future__ import annotations

from dataclasses import dataclass
from threading import Lock
import re
from typing import Any

import structlog

from core.config import get_settings
from services.ingestion_service import get_ingestion_store

logger = structlog.get_logger()

_TOKEN_RE = re.compile(r"\S+")


def _tokenize(text: str) -> list[str]:
    return _TOKEN_RE.findall(text)


@dataclass(slots=True)
class RagChunk:
    chunk_id: str
    session_id: str
    file_id: str
    filename: str
    text: str
    token_count: int
    upload_time: str


@dataclass(slots=True)
class RagResult:
    chunk: RagChunk
    score: float
    rank: int


@dataclass(slots=True)
class SessionRagIndex:
    signature: tuple[tuple[str, str], ...]
    chunks: list[RagChunk]
    faiss_index: Any
    bm25_index: Any


class RagService:
    def __init__(self) -> None:
        self._settings = get_settings()
        self._session_indices: dict[str, SessionRagIndex] = {}
        self._embedding_model: Any | None = None
        self._reranker_model: Any | None = None
        self._lock = Lock()

    def _load_embedding_model(self) -> Any:
        with self._lock:
            if self._embedding_model is not None:
                return self._embedding_model
            from sentence_transformers import SentenceTransformer

            self._embedding_model = SentenceTransformer(
                self._settings.rag_embedding_model,
            )
            logger.info("embedding_model_loaded", model=self._settings.rag_embedding_model)
            return self._embedding_model

    def _load_reranker_model(self) -> Any:
        with self._lock:
            if self._reranker_model is not None:
                return self._reranker_model
            from sentence_transformers import CrossEncoder

            self._reranker_model = CrossEncoder(self._settings.rag_reranker_model)
            logger.info("reranker_model_loaded", model=self._settings.rag_reranker_model)
            return self._reranker_model

    def _encode(self, texts: list[str]) -> Any:
        model = self._load_embedding_model()
        embeddings = model.encode(
            texts,
            convert_to_numpy=True,
            normalize_embeddings=True,
            show_progress_bar=False,
        )
        return embeddings.astype("float32")

    def _chunk_text(self, text: str) -> list[str]:
        tokens = _tokenize(text)
        if not tokens:
            return []

        chunk_size = self._settings.rag_chunk_size_tokens
        overlap = min(self._settings.rag_chunk_overlap_tokens, chunk_size - 1)
        step = max(1, chunk_size - overlap)

        chunks: list[str] = []
        for start in range(0, len(tokens), step):
            piece_tokens = tokens[start : start + chunk_size]
            if not piece_tokens:
                continue
            chunks.append(" ".join(piece_tokens))
            if start + chunk_size >= len(tokens):
                break
        return chunks

    def _signature_for_session(self, session_id: str) -> tuple[tuple[str, str], ...]:
        store = get_ingestion_store()
        records = store.get_session_files_for_indexing(session_id)
        processed = [
            record
            for record in records
            if record.get("status") == "processed" and record.get("extracted_text")
        ]
        return tuple(
            sorted(
                (
                    str(record["file_id"]),
                    str(record.get("processed_at") or ""),
                )
                for record in processed
            )
        )

    def _get_processed_records(self, session_id: str) -> list[dict[str, Any]]:
        store = get_ingestion_store()
        records = store.get_session_files_for_indexing(session_id)
        return [
            record
            for record in records
            if record.get("status") == "processed" and record.get("extracted_text")
        ]

    def _build_index(self, session_id: str) -> SessionRagIndex | None:
        signature = self._signature_for_session(session_id)
        with self._lock:
            existing = self._session_indices.get(session_id)
            if existing and existing.signature == signature:
                return existing

        records = self._get_processed_records(session_id)
        if not records:
            with self._lock:
                self._session_indices.pop(session_id, None)
            return None

        chunks: list[RagChunk] = []
        for record in records:
            text = str(record.get("extracted_text") or "")
            if not text.strip():
                continue

            file_chunks = self._chunk_text(text)
            for index, chunk_text in enumerate(file_chunks):
                chunks.append(
                    RagChunk(
                        chunk_id=f"{record['file_id']}::{index}",
                        session_id=session_id,
                        file_id=str(record["file_id"]),
                        filename=str(record["filename"]),
                        text=chunk_text,
                        token_count=len(_tokenize(chunk_text)),
                        upload_time=str(record.get("upload_time") or ""),
                    )
                )

        if not chunks:
            return None

        embeddings = self._encode([chunk.text for chunk in chunks])

        import faiss
        from rank_bm25 import BM25Okapi

        index = faiss.IndexFlatIP(embeddings.shape[1])
        index.add(embeddings)

        tokenized_chunks = [_tokenize(chunk.text.lower()) for chunk in chunks]
        bm25 = BM25Okapi(tokenized_chunks)

        session_index = SessionRagIndex(
            signature=signature,
            chunks=chunks,
            faiss_index=index,
            bm25_index=bm25,
        )

        with self._lock:
            self._session_indices[session_id] = session_index

        logger.info(
            "session_rag_indexed",
            session_id=session_id,
            chunks=len(chunks),
            files=len(records),
        )
        return session_index

    def retrieve(self, session_id: str, query: str, top_k: int | None = None) -> list[RagResult]:
        if not query.strip():
            return []

        session_index = self._build_index(session_id)
        if session_index is None:
            return []

        import numpy as np

        candidate_top_k = max(top_k or self._settings.rag_retrieval_top_k, 1)
        total_chunks = len(session_index.chunks)
        vector_candidates = min(self._settings.rag_vector_candidates, total_chunks)
        keyword_candidates = min(self._settings.rag_keyword_candidates, total_chunks)

        query_embedding = self._encode([query])
        vector_scores, vector_indices = session_index.faiss_index.search(
            query_embedding,
            vector_candidates,
        )

        merged_scores: dict[int, float] = {}
        for rank, idx in enumerate(vector_indices[0].tolist(), start=1):
            if idx < 0:
                continue
            merged_scores[idx] = merged_scores.get(idx, 0.0) + (1.0 / (60 + rank))

        keyword_tokens = _tokenize(query.lower())
        if keyword_tokens:
            bm25_scores = session_index.bm25_index.get_scores(keyword_tokens)
            keyword_ranked = sorted(
                range(len(bm25_scores)),
                key=lambda idx: bm25_scores[idx],
                reverse=True,
            )[:keyword_candidates]
            for rank, idx in enumerate(keyword_ranked, start=1):
                merged_scores[idx] = merged_scores.get(idx, 0.0) + (1.0 / (60 + rank))

        if not merged_scores:
            return []

        candidate_indices = [
            idx
            for idx, _ in sorted(
                merged_scores.items(),
                key=lambda item: item[1],
                reverse=True,
            )
        ][: max(candidate_top_k * 4, 12)]

        reranked_pairs = self._rerank(query, candidate_indices, session_index.chunks, merged_scores)
        results: list[RagResult] = []
        for rank, (chunk_idx, score) in enumerate(reranked_pairs[:candidate_top_k], start=1):
            results.append(
                RagResult(
                    chunk=session_index.chunks[chunk_idx],
                    score=float(score),
                    rank=rank,
                )
            )
        return results

    def _rerank(
        self,
        query: str,
        candidate_indices: list[int],
        chunks: list[RagChunk],
        fallback_scores: dict[int, float],
    ) -> list[tuple[int, float]]:
        if not candidate_indices:
            return []

        try:
            reranker = self._load_reranker_model()
            pairs = [(query, chunks[idx].text) for idx in candidate_indices]
            scores = reranker.predict(pairs, show_progress_bar=False)
            reranked = sorted(
                (
                    (candidate_indices[i], float(scores[i]))
                    for i in range(len(candidate_indices))
                ),
                key=lambda item: item[1],
                reverse=True,
            )
            return reranked
        except Exception:
            logger.exception("rerank_failed_fallback")
            return sorted(
                ((idx, fallback_scores.get(idx, 0.0)) for idx in candidate_indices),
                key=lambda item: item[1],
                reverse=True,
            )


_RAG_SERVICE = RagService()


def get_rag_service() -> RagService:
    return _RAG_SERVICE
