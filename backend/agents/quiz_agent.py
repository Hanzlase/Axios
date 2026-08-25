from __future__ import annotations

import asyncio
from typing import AsyncIterator

import structlog

from services.llm_service import complete, extract_json
from utils.sse import sse_payload

logger = structlog.get_logger()

_SYSTEM_PROMPT = (
    "You are a quiz generator. Create multiple-choice questions from the provided context. "
    "Return ONLY valid JSON — no markdown fences, no prose outside the JSON object. "
    'Schema: {"questions": [{"id": 1, "question": "...", '
    '"options": ["A. ...", "B. ...", "C. ...", "D. ..."], '
    '"correct": "A", "explanation": "..."}]}'
)


class QuizAgent:
    async def run(
        self,
        session_id: str,
        message: str,
        context: str,
        num_questions: int = 5,
        **kwargs,
    ) -> AsyncIterator[str]:
        total = int(num_questions)
        batch_size = int(kwargs.get("batch_size") or 8)
        batch_size = max(1, min(batch_size, 15))

        # Keep batches small enough to reliably return valid JSON.
        batches: list[int] = []
        remaining = total
        while remaining > 0:
            n = min(batch_size, remaining)
            batches.append(n)
            remaining -= n

        all_questions: list[dict] = []

        try:
            yield sse_payload({"type": "status", "value": "generating"})

            async def _generate_batch(n_q: int) -> list[dict]:
                user_prompt = (
                    f"Context:\n{context}\n\n"
                    f"Topic / focus: {message}\n\n"
                    f"Generate exactly {n_q} MCQ questions. "
                    "Each must have exactly 4 options labelled A–D. "
                    "'correct' must be only the letter (A, B, C, or D). "
                    "Return ONLY the JSON object."
                )
                max_tokens = min(3500, 800 + (n_q * 300))
                last_exc: Exception | None = None
                for attempt in range(1, 3):
                    try:
                        raw = await complete(
                            _SYSTEM_PROMPT,
                            user_prompt,
                            temperature=0.2,
                            max_tokens=max_tokens,
                        )
                        data = extract_json(raw)
                        batch_questions = data.get("questions") or []
                        if batch_questions:
                            return batch_questions
                    except Exception as exc:
                        last_exc = exc
                if last_exc:
                    raise last_exc
                return []

            results = await asyncio.gather(*[_generate_batch(n_q) for n_q in batches])
            for batch_qs in results:
                all_questions.extend(batch_qs)

            # Renumber sequentially to avoid duplicate IDs across batches
            normalized: list[dict] = []
            for i, q in enumerate(all_questions, start=1):
                if isinstance(q, dict):
                    q = {**q, "id": i}
                normalized.append(q)

            if not normalized:
                raise ValueError("LLM returned no questions.")

            yield sse_payload({"type": "result", "mode": "quiz", "data": {"questions": normalized}})

        except Exception as exc:
            logger.exception("quiz_agent_failed", session_id=session_id, error=str(exc))
            yield sse_payload({"type": "error", "message": f"Quiz generation failed: {exc}"})

        yield sse_payload({"type": "done"})


_QUIZ = QuizAgent()


def get_quiz_agent() -> QuizAgent:
    return _QUIZ
