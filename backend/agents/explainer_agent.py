from __future__ import annotations

import re
from typing import AsyncIterator

import structlog

from services.llm_service import stream_completion
from utils.sse import sse_payload

logger = structlog.get_logger()

_LEVEL_GUIDANCE = {
    "simple": (
        "Explain as if to a curious beginner. Use plain language, everyday analogies, "
        "and short sentences. Avoid jargon; define any technical term you must use."
    ),
    "intermediate": (
        "Explain to someone with basic domain knowledge. Use proper terminology with "
        "brief definitions. Balance depth and accessibility."
    ),
    "advanced": (
        "Explain to a domain expert. Use precise technical language, discuss nuances, "
        "edge cases, trade-offs, and deeper implications."
    ),
}


class ExplainerAgent:
    async def run(
        self,
        session_id: str,
        message: str,
        context: str,
        level: str = "intermediate",
        **kwargs,
    ) -> AsyncIterator[str]:
        from core.config import get_settings

        if not get_settings().openrouter_api_key:
            fallback = (
                "OpenRouter API key is not configured. "
                "Set OPENROUTER_API_KEY to enable explanations."
            )
            for word in fallback.split():
                yield sse_payload({"type": "token", "token": f"{word} "})
            yield sse_payload({"type": "done"})
            return

        guidance = _LEVEL_GUIDANCE.get(level, _LEVEL_GUIDANCE["intermediate"])
        system_prompt = (
            f"You are an expert teacher. {guidance} "
            "Ground your explanation in the retrieved context when available. "
            "Use Markdown: headings, bullet points, bold key terms, and concrete examples. "
            "If context is absent, explain from general knowledge and note it."
        )
        user_prompt = (
            f"Retrieved context:\n{context}\n\n"
            f"Explain the following at {level} level:\n{message}\n\n"
            "Provide a clear, well-structured explanation."
        )

        try:
            async for token in stream_completion(system_prompt, user_prompt, temperature=0.3):
                yield sse_payload({"type": "token", "token": token})
        except Exception:
            logger.exception("explainer_agent_failed", session_id=session_id)
            yield sse_payload(
                {"type": "error", "message": "Explainer agent failed. Check backend logs."}
            )

        yield sse_payload({"type": "done"})


_EXPLAINER = ExplainerAgent()


def get_explainer_agent() -> ExplainerAgent:
    return _EXPLAINER
