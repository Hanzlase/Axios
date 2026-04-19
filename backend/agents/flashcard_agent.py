from __future__ import annotations

from typing import AsyncIterator

import structlog

from services.llm_service import complete, extract_json
from utils.sse import sse_payload

logger = structlog.get_logger()

_SYSTEM_PROMPT = (
    "You are a flashcard generator. Create concise question-answer flashcards from the context. "
    "Return ONLY valid JSON — no markdown fences, no prose outside the JSON object. "
    'Schema: {"cards": [{"id": 1, "front": "Question or term", "back": "Concise answer or definition"}]}'
)


class FlashcardAgent:
    async def run(
        self,
        session_id: str,
        message: str,
        context: str,
        num_cards: int = 10,
        **kwargs,
    ) -> AsyncIterator[str]:
        # Provider fallback is handled inside services.llm_service.complete()

        user_prompt = (
            f"Context:\n{context}\n\n"
            f"Topic / focus: {message}\n\n"
            f"Generate exactly {num_cards} flashcards covering the most important concepts. "
            "Front: a clear question or term. Back: a concise, accurate answer or definition. "
            "Return ONLY the JSON object."
        )

        try:
            yield sse_payload({"type": "status", "value": "generating"})
            raw = await complete(_SYSTEM_PROMPT, user_prompt, temperature=0.2, max_tokens=2000)
            data = extract_json(raw)
            cards = data.get("cards") or []
            if not cards:
                raise ValueError("LLM returned no flashcards.")
            yield sse_payload({"type": "result", "mode": "flashcards", "data": {"cards": cards}})
        except Exception as exc:
            logger.exception("flashcard_agent_failed", session_id=session_id, error=str(exc))
            yield sse_payload({"type": "error", "message": f"Flashcard generation failed: {exc}"})

        yield sse_payload({"type": "done"})


_FLASHCARD = FlashcardAgent()


def get_flashcard_agent() -> FlashcardAgent:
    return _FLASHCARD
