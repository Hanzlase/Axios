from __future__ import annotations

from typing import AsyncIterator

import structlog

from services.llm_service import complete, extract_json
from utils.sse import sse_payload

logger = structlog.get_logger()

_SYSTEM_PROMPT = (
    "You are a study planner. Create a structured day-by-day study schedule from the context. "
    "Return ONLY valid JSON — no markdown fences, no prose outside the JSON object. "
    "Schema: {\"title\": \"...\", \"schedule\": ["
    "{\"day\": 1, \"label\": \"Day 1\", \"topic\": \"...\", "
    "\"tasks\": [\"...\", \"...\"], \"duration\": \"2 hours\"}]}"
)


class PlannerAgent:
    async def run(
        self,
        session_id: str,
        message: str,
        context: str,
        num_days: int = 7,
        **kwargs,
    ) -> AsyncIterator[str]:
        user_prompt = (
            f"Context:\n{context}\n\n"
            f"Request: {message}\n\n"
            f"Generate a {num_days}-day study plan. "
            "Each day must have: a topic, 2–4 concrete tasks, and an estimated duration. "
            "Make it realistic and progressive (easy → complex). "
            "Return ONLY the JSON object."
        )

        try:
            yield sse_payload({"type": "status", "value": "generating"})
            raw = await complete(_SYSTEM_PROMPT, user_prompt, temperature=0.3, max_tokens=2500)
            data = extract_json(raw)
            schedule = data.get("schedule") or []
            if not schedule:
                raise ValueError("LLM returned no schedule.")
            yield sse_payload(
                {"type": "result", "mode": "plan", "data": {"title": data.get("title", "Study Plan"), "schedule": schedule}}
            )
        except Exception as exc:
            logger.exception("planner_agent_failed", session_id=session_id, error=str(exc))
            yield sse_payload({"type": "error", "message": f"Planner generation failed: {exc}"})

        yield sse_payload({"type": "done"})


_PLANNER = PlannerAgent()


def get_planner_agent() -> PlannerAgent:
    return _PLANNER
