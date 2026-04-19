from __future__ import annotations

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

            for bi, n_q in enumerate(batches, start=1):
                yield sse_payload(
                    {
                        "type": "status",
                        "value": f"generating_batch_{bi}_of_{len(batches)}",
                    }
                )

                user_prompt = (
                    f"Context:\n{context}\n\n"
                    f"Topic / focus: {message}\n\n"
                    f"Generate exactly {n_q} MCQ questions. "
                    "Each must have exactly 4 options labelled A–D. "
                    "'correct' must be only the letter (A, B, C, or D). "
                    "Return ONLY the JSON object."
                )

                # Conservative token budget per batch (reliability > speed).
                max_tokens = min(5000, 1000 + (n_q * 450))

                # Light retry: models occasionally stream an empty body/time out mid-stream.
                raw = ""
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
                        if not batch_questions:
                            raise ValueError("LLM returned no questions.")
                        all_questions.extend(batch_questions)
                        last_exc = None
                        break
                    except Exception as exc:
                        last_exc = exc
                        continue

                if last_exc is not None:
                    raise last_exc

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
