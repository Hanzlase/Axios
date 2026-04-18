from __future__ import annotations

import json
import re
from typing import AsyncIterator

import httpx
import structlog

from core.config import get_settings

logger = structlog.get_logger()


async def stream_completion(
    system_prompt: str,
    user_prompt: str,
    temperature: float = 0.2,
    max_tokens: int | None = None,
) -> AsyncIterator[str]:
    """Stream tokens from OpenRouter."""
    settings = get_settings()
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

    timeout = httpx.Timeout(connect=20.0, read=None, write=20.0, pool=20.0)
    endpoint = f"{settings.openrouter_base_url}/chat/completions"

    async with httpx.AsyncClient(timeout=timeout) as client:
        async with client.stream("POST", endpoint, headers=headers, json=payload) as response:
            if response.status_code >= 400:
                body = await response.aread()
                raise RuntimeError(
                    f"OpenRouter error {response.status_code}: {body.decode('utf-8', errors='replace')[:500]}"
                )
            async for line in response.aiter_lines():
                if not line or not line.startswith("data:"):
                    continue
                raw = line.removeprefix("data:").strip()
                if raw == "[DONE]":
                    break
                try:
                    parsed = json.loads(raw)
                except json.JSONDecodeError:
                    continue
                choices = parsed.get("choices") or []
                if not choices:
                    continue
                delta = choices[0].get("delta") or {}
                token = delta.get("content")
                if token:
                    yield str(token)


async def complete(
    system_prompt: str,
    user_prompt: str,
    temperature: float = 0.1,
    max_tokens: int | None = None,
) -> str:
    """Collect a full non-streaming completion."""
    chunks: list[str] = []
    async for token in stream_completion(system_prompt, user_prompt, temperature, max_tokens):
        chunks.append(token)
    return "".join(chunks)


def _extract_first_json_object(text: str) -> str | None:
    """Return the first *balanced* JSON object substring.

    This is more reliable than a greedy regex when the JSON contains braces inside strings
    (common in long generations).
    """
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

        # not in string
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
    """Extract JSON from LLM output, handling markdown code fences and surrounding prose."""
    text = text.strip()

    # 1) Direct parse
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # 2) Markdown fenced block
    match = re.search(r"```(?:json)?\s*([\s\S]+?)\s*```", text)
    if match:
        fenced = match.group(1).strip()
        try:
            return json.loads(fenced)
        except json.JSONDecodeError:
            # If the fenced content still has extra text, try balanced extraction within it
            inner = _extract_first_json_object(fenced)
            if inner:
                return json.loads(inner)

    # 3) Balanced object anywhere in the text
    obj = _extract_first_json_object(text)
    if obj:
        try:
            return json.loads(obj)
        except json.JSONDecodeError:
            pass

    raise ValueError(f"Could not extract JSON. Raw snippet: {text[:300]}")
