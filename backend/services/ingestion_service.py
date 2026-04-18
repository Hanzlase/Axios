from __future__ import annotations

import csv
from dataclasses import dataclass
from datetime import datetime, timezone
from io import BytesIO, StringIO
from threading import Lock
from typing import Any
from uuid import uuid4

import structlog

from utils.file_utils import detect_extension
from utils.text_utils import clean_text, normalize_text_encoding

# --- persistence (simple JSON file on disk) ---
import json
from pathlib import Path

logger = structlog.get_logger()

FileStatus = str


@dataclass(slots=True)
class UploadPayload:
    file_id: str
    session_id: str
    filename: str
    content: bytes
    upload_time: str
    extension: str


class IngestionStore:
    """In-memory ingestion state store for queued/processed files.

    NOTE: This store also persists its metadata to disk so sessions keep their
    uploaded docs after a page refresh or backend restart.
    """

    def __init__(self) -> None:
        self._lock = Lock()
        self._files: dict[str, dict[str, Any]] = {}
        self._sessions: dict[str, list[str]] = {}

        self._data_dir = Path("data")
        self._data_dir.mkdir(parents=True, exist_ok=True)
        self._persist_path = self._data_dir / "ingestion_store.json"
        self._load_from_disk()

    def _load_from_disk(self) -> None:
        try:
            if not self._persist_path.exists():
                return
            raw = self._persist_path.read_text(encoding="utf-8")
            data = json.loads(raw)
            files = data.get("files", {})
            sessions = data.get("sessions", {})
            if isinstance(files, dict) and isinstance(sessions, dict):
                self._files = files
                self._sessions = {k: list(v) for k, v in sessions.items() if isinstance(v, list)}
        except Exception:
            logger.exception("ingestion_store_load_failed")

    def _save_to_disk(self) -> None:
        try:
            data = {"files": self._files, "sessions": self._sessions}
            tmp = self._persist_path.with_suffix(".tmp")
            tmp.write_text(json.dumps(data), encoding="utf-8")
            tmp.replace(self._persist_path)
        except Exception:
            logger.exception("ingestion_store_save_failed")

    def create_file_record(
        self,
        *,
        file_id: str,
        session_id: str,
        filename: str,
        extension: str,
        upload_time: str,
        size_bytes: int,
    ) -> dict[str, Any]:
        record = {
            "file_id": file_id,
            "session_id": session_id,
            "filename": filename,
            "file_type": extension.lstrip("."),
            "upload_time": upload_time,
            "size_bytes": size_bytes,
            "status": "queued",
            "text_length": 0,
            "error": None,
        }

        with self._lock:
            self._files[file_id] = record
            self._sessions.setdefault(session_id, []).append(file_id)
            self._save_to_disk()

        return record.copy()

    def update_file(self, file_id: str, **updates: Any) -> None:
        with self._lock:
            existing = self._files.get(file_id)
            if existing is None:
                return
            existing.update(updates)
            self._save_to_disk()

    def get_session_files(self, session_id: str) -> list[dict[str, Any]]:
        with self._lock:
            ids = self._sessions.get(session_id, [])
            return [
                self._public_record(self._files[file_id])
                for file_id in ids
                if file_id in self._files
            ]

    def get_session_files_for_indexing(self, session_id: str) -> list[dict[str, Any]]:
        """Return full internal records for indexing/retrieval services."""
        with self._lock:
            ids = self._sessions.get(session_id, [])
            return [self._files[file_id].copy() for file_id in ids if file_id in self._files]

    def get_file(self, file_id: str) -> dict[str, Any] | None:
        with self._lock:
            record = self._files.get(file_id)
            return self._public_record(record) if record else None

    @staticmethod
    def _public_record(record: dict[str, Any]) -> dict[str, Any]:
        public = record.copy()
        public.pop("extracted_text", None)
        return public


_STORE = IngestionStore()


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def get_ingestion_store() -> IngestionStore:
    return _STORE


def create_payload(
    *,
    session_id: str,
    filename: str,
    content: bytes,
) -> UploadPayload:
    return UploadPayload(
        file_id=uuid4().hex,
        session_id=session_id,
        filename=filename,
        content=content,
        upload_time=utc_now_iso(),
        extension=detect_extension(filename),
    )


def extract_text_from_file(payload: UploadPayload) -> str:
    extension = payload.extension
    content = payload.content

    if extension == ".pdf":
        from pypdf import PdfReader

        reader = PdfReader(BytesIO(content))
        return "\n".join(page.extract_text() or "" for page in reader.pages)

    if extension == ".docx":
        from docx import Document

        document = Document(BytesIO(content))
        return "\n".join(paragraph.text for paragraph in document.paragraphs)

    if extension == ".txt":
        return normalize_text_encoding(content)

    if extension == ".csv":
        decoded = normalize_text_encoding(content)
        stream = StringIO(decoded)
        rows = csv.reader(stream)
        return "\n".join(", ".join(cell.strip() for cell in row) for row in rows)

    raise ValueError(f"Unsupported file type: {extension}")


def process_upload_batch(payloads: list[UploadPayload]) -> None:
    store = get_ingestion_store()

    for payload in payloads:
        store.update_file(payload.file_id, status="processing")
        try:
            extracted_text = extract_text_from_file(payload)
            cleaned = clean_text(extracted_text)
            store.update_file(
                payload.file_id,
                status="processed",
                text_length=len(cleaned),
                extracted_text=cleaned,
                processed_at=utc_now_iso(),
            )
            logger.info(
                "file_processed",
                file_id=payload.file_id,
                filename=payload.filename,
                session_id=payload.session_id,
                text_length=len(cleaned),
            )
        except Exception as exc:
            store.update_file(
                payload.file_id,
                status="failed",
                error=str(exc),
                processed_at=utc_now_iso(),
            )
            logger.exception(
                "file_processing_failed",
                file_id=payload.file_id,
                filename=payload.filename,
                session_id=payload.session_id,
            )
