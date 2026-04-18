from __future__ import annotations

import asyncio
import json
from typing import AsyncIterator

import httpx
import structlog

from core.config import get_settings
from services.rag_service import RagResult, get_rag_service
from services.session_store import ChatMessage, get_session_store
from utils.sse import sse_payload

logger = structlog.get_logger()


class ChatService:
    def __init__(self) -> None:
        self._settings = get_settings()

    async def stream_chat(
        self,
        session_id: str,
        user_message: str,
        top_k: int | None = None,
    ) -> AsyncIterator[str]:
        message = user_message.strip()
        if not message:
            yield sse_payload({"type": "error", "message": "Message cannot be empty."})
            yield sse_payload({"type": "done"})
            return

        session_store = get_session_store()
        # Capture history BEFORE adding the current turn
        history = session_store.get_history(session_id, last_n=9)
        session_store.add_message(session_id, "user", message)

        response_buffer: list[str] = []
        try:
            yield sse_payload({"type": "status", "value": "retrieving"})

            rag_service = get_rag_service()
            rag_results = await asyncio.to_thread(
                rag_service.retrieve,
                session_id,
                message,
                top_k,
            )

            sources = [
                {
                    "chunk_id": result.chunk.chunk_id,
                    "file_id": result.chunk.file_id,
                    "filename": result.chunk.filename,
                    "rank": result.rank,
                    "score": round(result.score, 4),
                    "token_count": result.chunk.token_count,
                }
                for result in rag_results
            ]
            yield sse_payload({"type": "sources", "sources": sources})

            context = self._build_context(rag_results)

            yield sse_payload({"type": "status", "value": "generating"})

            async for token in self._stream_tokens_with_fallback(message, context, history):
                yield sse_payload({"type": "token", "token": token})
                response_buffer.append(token)

            if response_buffer:
                session_store.add_message(session_id, "assistant", "".join(response_buffer))
            yield sse_payload({"type": "done"})
        except Exception:
            logger.exception("chat_stream_failed", session_id=session_id)
            yield sse_payload(
                {
                    "type": "error",
                    "message": "Failed to generate response. Check backend logs.",
                }
            )
            yield sse_payload({"type": "done"})

    async def _stream_tokens_with_fallback(
        self,
        user_message: str,
        retrieved_context: str,
        history: list[ChatMessage] | None = None,
    ) -> AsyncIterator[str]:
        order = [p.strip().lower() for p in (self._settings.llm_fallback_order or []) if p.strip()]
        if not order:
            order = ["openrouter", "cohere"]

        last_error: Exception | None = None
        fell_back_from_openrouter = False

        for provider in order:
            try:
                if provider == "openrouter":
                    if not self._settings.openrouter_api_key:
                        raise RuntimeError("OpenRouter API key is not configured")
                    async for t in self._stream_openrouter_tokens(user_message, retrieved_context, history):
                        yield t
                    return

                if provider == "cohere":
                    if not self._settings.cohere_api_key:
                        raise RuntimeError("Cohere API key is not configured")

                    async for t in self._stream_cohere_tokens(user_message, retrieved_context, history):
                        yield t
                    return

                raise RuntimeError(f"Unknown LLM provider in fallback order: {provider}")
            except Exception as exc:
                last_error = exc
                # Only fall through on rate limits / transient upstream errors.
                if provider == "openrouter" and self._is_openrouter_rate_limit(exc):
                    fell_back_from_openrouter = True
                    logger.warning("openrouter_rate_limited_falling_back", error=str(exc))
                    continue
                # For other errors, don't silently switch providers.
                raise

        if last_error:
            raise last_error

        raise RuntimeError("No LLM provider available")

    @staticmethod
    def _is_openrouter_rate_limit(exc: Exception) -> bool:
        msg = str(exc)
        return any(
            needle in msg
            for needle in [
                "OpenRouter error 429",
                "Rate limit",
                "Too Many Requests",
                "free-models-per-day",
            ]
        )

    @staticmethod
    def _build_context(results: list[RagResult]) -> str:
        if not results:
            return "No indexed document context is available for this session."

        blocks: list[str] = []
        for result in results:
            blocks.append(
                "\n".join(
                    [
                        f"[Source: {result.chunk.filename}]",
                        result.chunk.text,
                    ]
                )
            )
        return "\n\n---\n\n".join(blocks)

    def _build_messages(
        self,
        user_message: str,
        retrieved_context: str,
        history: list[ChatMessage] | None = None,
    ) -> list[dict]:
        system_prompt = (
            "You are Axion's retrieval assistant. "
            "Answer precisely and use markdown with clear structure when helpful. "
            "Ground your answer in retrieved context; if context is missing, say so clearly. "
            "You have access to the prior conversation history for continuity."
        )
        user_prompt = (
            "Retrieved context:\n"
            f"{retrieved_context}\n\n"
            "User question:\n"
            f"{user_message}\n\n"
            "Instructions:\n"
            "- Prefer concise answers first.\n"
            "- Use bullet lists or tables when it improves clarity.\n"
            "- Mention relevant source filenames inline when citing context.\n"
        )

        messages: list[dict] = [{"role": "system", "content": system_prompt}]
        for msg in (history or []):
            messages.append({"role": msg.role, "content": msg.content})
        messages.append({"role": "user", "content": user_prompt})
        return messages

    async def _stream_openrouter_tokens(
        self,
        user_message: str,
        retrieved_context: str,
        history: list[ChatMessage] | None = None,
    ) -> AsyncIterator[str]:
        messages = self._build_messages(user_message, retrieved_context, history)
        payload = {
            "model": self._settings.openrouter_model,
            "stream": True,
            "temperature": 0.2,
            "messages": messages,
        }
        headers = {
            "Authorization": f"Bearer {self._settings.openrouter_api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": self._settings.openrouter_site_url,
            "X-Title": self._settings.openrouter_site_name,
        }

        timeout = httpx.Timeout(connect=20.0, read=None, write=20.0, pool=20.0)
        endpoint = f"{self._settings.openrouter_base_url}/chat/completions"

        async with httpx.AsyncClient(timeout=timeout) as client:
            async with client.stream(
                "POST",
                endpoint,
                headers=headers,
                json=payload,
            ) as response:
                if response.status_code >= 400:
                    body = await response.aread()
                    detail = body.decode("utf-8", errors="replace")
                    raise RuntimeError(
                        f"OpenRouter error {response.status_code}: {detail[:1000]}",
                    )

                async for line in response.aiter_lines():
                    if not line:
                        continue
                    if not line.startswith("data:"):
                        continue

                    payload_raw = line.removeprefix("data:").strip()
                    if payload_raw == "[DONE]":
                        break

                    try:
                        parsed = json.loads(payload_raw)
                    except json.JSONDecodeError:
                        continue

                    choices = parsed.get("choices") or []
                    if not choices:
                        continue
                    delta = choices[0].get("delta") or {}
                    token = delta.get("content")
                    if token:
                        yield str(token)

    async def _stream_cohere_tokens(
        self,
        user_message: str,
        retrieved_context: str,
        history: list[ChatMessage] | None = None,
    ) -> AsyncIterator[str]:
        # Cohere v2 streaming uses SSE lines like: event: message
        # We'll parse JSON payloads and emit text deltas.
        messages = self._build_messages(user_message, retrieved_context, history)

        # Map OpenAI-style messages into a single prompt for Cohere.
        system = ""
        user = ""
        for m in messages:
            if m.get("role") == "system":
                system = str(m.get("content") or "")
            elif m.get("role") == "user":
                user = str(m.get("content") or "")

        payload = {
            "model": self._settings.cohere_model,
            "stream": True,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            "temperature": 0.2,
        }
        headers = {
            "Authorization": f"Bearer {self._settings.cohere_api_key}",
            "Content-Type": "application/json",
        }

        endpoint = f"{self._settings.cohere_base_url}/chat"
        timeout = httpx.Timeout(connect=20.0, read=None, write=20.0, pool=20.0)

        async with httpx.AsyncClient(timeout=timeout) as client:
            async with client.stream("POST", endpoint, headers=headers, json=payload) as response:
                if response.status_code >= 400:
                    body = await response.aread()
                    detail = body.decode("utf-8", errors="replace")
                    raise RuntimeError(f"Cohere error {response.status_code}: {detail[:1000]}")

                event: str | None = None
                data_lines: list[str] = []

                async for line in response.aiter_lines():
                    if line is None:
                        continue

                    if line.startswith("event:"):
                        event = line.removeprefix("event:").strip()
                        continue

                    if line.startswith("data:"):
                        data_lines.append(line.removeprefix("data:").strip())
                        continue

                    # blank line means end of event block
                    if line == "":
                        if not data_lines:
                            event = None
                            continue

                        raw = "\n".join(data_lines).strip()
                        data_lines = []

                        if raw == "[DONE]":
                            break

                        try:
                            parsed = json.loads(raw)
                        except json.JSONDecodeError:
                            event = None
                            continue

                        # Cohere v2 emits 'delta' text in different event shapes.
                        # Handle common ones defensively.
                        delta_text = None
                        if isinstance(parsed, dict):
                            # e.g. {"type":"content_delta","delta":{"text":"..."}}
                            if parsed.get("type") in {"content_delta", "text-generation"}:
                                delta = parsed.get("delta") or {}
                                delta_text = delta.get("text") or delta.get("content")

                            # e.g. {"message":{"content":[{"type":"text","text":"..."}]}}
                            if delta_text is None and "message" in parsed:
                                msg = parsed.get("message") or {}
                                content = msg.get("content") or []
                                if content and isinstance(content, list):
                                    first = content[0] or {}
                                    if isinstance(first, dict):
                                        delta_text = first.get("text")

                        if delta_text:
                            yield str(delta_text)

                        event = None


_CHAT_SERVICE = ChatService()


def get_chat_service() -> ChatService:
    return _CHAT_SERVICE

