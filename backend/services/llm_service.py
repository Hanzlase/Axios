from __future__ import annotations

import json
import re
from typing import AsyncIterator

import httpx
import structlog

from core.config import get_settings

logger = structlog.get_logger()


async def _cohere_stream_completion(
    system_prompt: str,
    user_prompt: str,
    temperature: float = 0.2,
    max_tokens: int | None = None,
) -> AsyncIterator[str]:
    settings = get_settings()
    if not settings.cohere_api_key:
        raise RuntimeError("Cohere API key is not configured")

    payload: dict = {
        "model": settings.cohere_model,
        "stream": True,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": temperature,
    }
    if max_tokens is not None:
        payload["max_tokens"] = min(max_tokens, 4000)

    headers = {
        "Authorization": f"Bearer {settings.cohere_api_key}",
        "Content-Type": "application/json",
    }
    endpoint = f"{settings.cohere_base_url}/chat"
    timeout = httpx.Timeout(connect=10.0, read=30.0, write=10.0, pool=10.0)

    async with httpx.AsyncClient(timeout=timeout) as client:
        async with client.stream("POST", endpoint, headers=headers, json=payload) as response:
            if response.status_code >= 400:
                body = await response.aread()
                detail = body.decode("utf-8", errors="replace")
                raise RuntimeError(f"Cohere error {response.status_code}: {detail[:1000]}")

            async for line in response.aiter_lines():
                if not line or not line.startswith("data:"):
                    continue
                raw = line.removeprefix("data:").strip()
                if not raw or raw == "[DONE]":
                    break
                try:
                    parsed = json.loads(raw)
                    if isinstance(parsed, dict):
                        ptype = parsed.get("type")
                        delta = parsed.get("delta") if isinstance(parsed.get("delta"), dict) else {}
                        delta_text: str | None = None
                        if ptype in {"content-delta", "content_delta", "text-generation"}:
                            msg_obj = delta.get("message")
                            if isinstance(msg_obj, dict):
                                content_obj = msg_obj.get("content")
                                if isinstance(content_obj, dict):
                                    delta_text = content_obj.get("text")
                                elif isinstance(content_obj, str):
                                    delta_text = content_obj
                            if delta_text is None:
                                delta_text = delta.get("text") or delta.get("content")

                        if delta_text is None and ptype in {"message_delta", "message"}:
                            content = delta.get("content") or (parsed.get("message") or {}).get("content")
                            if isinstance(content, list) and content:
                                first = content[0]
                                if isinstance(first, dict):
                                    delta_text = first.get("text") or first.get("delta")

                        if delta_text is None and isinstance(parsed.get("text"), str):
                            delta_text = parsed.get("text")

                        if delta_text:
                            yield str(delta_text)
                except Exception:
                    continue


async def _openrouter_stream_completion(
    system_prompt: str,
    user_prompt: str,
    temperature: float = 0.2,
    max_tokens: int | None = None,
) -> AsyncIterator[str]:
    settings = get_settings()
    if not settings.openrouter_api_key:
        raise RuntimeError("OpenRouter API key is not configured")

    payload: dict = {
        "model": settings.openrouter_model,
        "stream": True,
        "temperature": temperature,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
    }
    if max_tokens:
        payload["max_tokens"] = max_tokens

    headers = {
        "Authorization": f"Bearer {settings.openrouter_api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": settings.openrouter_site_url,
        "X-Title": settings.openrouter_site_name,
    }

    timeout = httpx.Timeout(connect=10.0, read=30.0, write=10.0, pool=10.0)
    endpoint = f"{settings.openrouter_base_url}/chat/completions"

    async with httpx.AsyncClient(timeout=timeout) as client:
        async with client.stream("POST", endpoint, headers=headers, json=payload) as response:
            if response.status_code >= 400:
                body = await response.aread()
                detail = body.decode("utf-8", errors="replace")
                raise RuntimeError(f"OpenRouter error {response.status_code}: {detail[:1000]}")

            async for line in response.aiter_lines():
                if not line or not line.startswith("data:"):
                    continue
                raw = line.removeprefix("data:").strip()
                if raw == "[DONE]":
                    break
                try:
                    parsed = json.loads(raw)
                    choices = parsed.get("choices") or []
                    if choices:
                        delta = choices[0].get("delta") or {}
                        token = delta.get("content")
                        if token:
                            yield str(token)
                except json.JSONDecodeError:
                    continue


async def stream_completion(
    system_prompt: str,
    user_prompt: str,
    temperature: float = 0.2,
    max_tokens: int | None = None,
) -> AsyncIterator[str]:
    """Stream tokens with provider fallback according to configured llm_fallback_order."""
    settings = get_settings()
    providers = settings.llm_fallback_order or ["cohere", "openrouter"]

    last_error: Exception | None = None
    for provider in providers:
        provider = provider.strip().lower()
        if provider == "cohere" and settings.cohere_api_key:
            try:
                async for token in _cohere_stream_completion(system_prompt, user_prompt, temperature, max_tokens):
                    yield token
                return
            except Exception as exc:
                logger.warning("cohere_stream_failed_trying_fallback", error=str(exc))
                last_error = exc

        elif provider == "openrouter" and settings.openrouter_api_key:
            try:
                async for token in _openrouter_stream_completion(system_prompt, user_prompt, temperature, max_tokens):
                    yield token
                return
            except Exception as exc:
                logger.warning("openrouter_stream_failed_trying_fallback", error=str(exc))
                last_error = exc

    if last_error:
        raise last_error
    raise RuntimeError("No working LLM provider available.")


async def complete(
    system_prompt: str,
    user_prompt: str,
    temperature: float = 0.1,
    max_tokens: int | None = None,
) -> str:
    """Collect a full completion with provider fallback."""
    chunks: list[str] = []
    async for token in stream_completion(system_prompt, user_prompt, temperature, max_tokens):
        chunks.append(token)
    return "".join(chunks)


def _extract_first_json_object(text: str) -> str | None:
    start = text.find("{")
    if start == -1:
        return None

    depth = 0
    in_string = False
    escape = False

    for i in range(start, len(text)):
        ch = text[i]
        if in_string:
            if escape:
                escape = False
                continue
            if ch == "\\":
                escape = True
                continue
            if ch == '"':
                in_string = False
            continue

        if ch == '"':
            in_string = True
            continue
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                return text[start : i + 1]

    return None


def extract_json(text: str) -> dict:
    text = text.strip()

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    match = re.search(r"```(?:json)?\s*([\s\S]+?)\s*```", text)
    if match:
        fenced = match.group(1).strip()
        try:
            return json.loads(fenced)
        except json.JSONDecodeError:
            inner = _extract_first_json_object(fenced)
            if inner:
                return json.loads(inner)

    obj = _extract_first_json_object(text)
    if obj:
        try:
            return json.loads(obj)
        except json.JSONDecodeError:
            pass

    raise ValueError(f"Could not extract JSON. Raw snippet: {text[:300]}")
