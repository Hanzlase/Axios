from __future__ import annotations

import asyncio
from typing import Literal

from fastapi import APIRouter, Body
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
import structlog

from agents.explainer_agent import get_explainer_agent
from agents.flashcard_agent import get_flashcard_agent
from agents.planner_agent import get_planner_agent
from agents.quiz_agent import get_quiz_agent
from services.chat_service import get_chat_service
from services.intent_service import classify_intent
from services.rag_service import RagResult, get_rag_service
from services.session_store import get_session_store
from utils.sse import sse_payload

router = APIRouter(tags=["agents"])
logger = structlog.get_logger()

AgentMode = Literal["auto", "chat", "explain", "quiz", "flashcards", "plan", "summarize"]


class AgentStreamRequest(BaseModel):
    session_id: str = Field(min_length=1)
    message: str = Field(min_length=1)
    mode: AgentMode = "auto"
    level: Literal["simple", "intermediate", "advanced"] = "intermediate"
    num_questions: int = Field(default=5, ge=1, le=50)
    num_cards: int = Field(default=10, ge=1, le=100)
    num_days: int = Field(default=7, ge=1, le=90)
    top_k: int | None = Field(default=None, ge=1, le=12)


def _build_context(results: list[RagResult]) -> str:
    if not results:
        return "No indexed document context is available for this session."
    blocks = [f"[Source: {r.chunk.filename}]\n{r.chunk.text}" for r in results]
    return "\n\n---\n\n".join(blocks)


async def _agent_stream(req: AgentStreamRequest):
    message = req.message.strip()

    # 1. Resolve mode
    mode = req.mode
    if mode == "auto":
        mode = classify_intent(message)
        yield sse_payload({"type": "intent", "detected": mode})

    logger.info("agent_stream_request", session_id=req.session_id, mode=mode)

    # 2. RAG retrieval (all modes use context)
    try:
        yield sse_payload({"type": "status", "value": "retrieving"})
        rag_service = get_rag_service()
        rag_results: list[RagResult] = await asyncio.to_thread(
            rag_service.retrieve, req.session_id, message, req.top_k
        )
        sources = [
            {
                "chunk_id": r.chunk.chunk_id,
                "file_id": r.chunk.file_id,
                "filename": r.chunk.filename,
                "rank": r.rank,
                "score": round(r.score, 4),
                "token_count": r.chunk.token_count,
            }
            for r in rag_results
        ]
        yield sse_payload({"type": "sources", "sources": sources})
        context = _build_context(rag_results)
    except Exception:
        logger.exception("agent_rag_failed", session_id=req.session_id)
        yield sse_payload({"type": "error", "message": "Retrieval failed."})
        yield sse_payload({"type": "done"})
        return

    # 3. Route to agent
    if mode == "quiz":
        agent = get_quiz_agent()
        store = get_session_store()
        async for chunk in agent.run(
            req.session_id, message, context, num_questions=req.num_questions
        ):
            # Intercept result to save in session store
            if chunk and '"mode": "quiz"' in chunk:
                import json as _json
                try:
                    frame = _json.loads(chunk.removeprefix("data:").strip())
                    if frame.get("type") == "result":
                        store.save_agent_result(req.session_id, "quiz", frame["data"])
                except Exception:
                    pass
            yield chunk

    elif mode == "flashcards":
        agent = get_flashcard_agent()
        store = get_session_store()
        async for chunk in agent.run(
            req.session_id, message, context, num_cards=req.num_cards
        ):
            if chunk and '"mode": "flashcards"' in chunk:
                import json as _json
                try:
                    frame = _json.loads(chunk.removeprefix("data:").strip())
                    if frame.get("type") == "result":
                        store.save_agent_result(req.session_id, "flashcards", frame["data"])
                except Exception:
                    pass
            yield chunk

    elif mode == "plan":
        agent = get_planner_agent()
        store = get_session_store()
        async for chunk in agent.run(
            req.session_id, message, context, num_days=req.num_days
        ):
            if chunk and '"mode": "plan"' in chunk:
                import json as _json
                try:
                    frame = _json.loads(chunk.removeprefix("data:").strip())
                    if frame.get("type") == "result":
                        store.save_agent_result(req.session_id, "plan", frame["data"])
                except Exception:
                    pass
            yield chunk

    elif mode == "explain":
        agent = get_explainer_agent()
        async for chunk in agent.run(
            req.session_id, message, context, level=req.level
        ):
            yield chunk

    else:
        # chat / summarize → use existing chat service streaming
        chat = get_chat_service()
        async for chunk in chat.stream_chat(
            session_id=req.session_id,
            user_message=message,
            top_k=req.top_k,
        ):
            yield chunk


@router.post("/api/agent/stream")
async def agent_stream(payload: AgentStreamRequest = Body(..., embed=True)):
    return StreamingResponse(
        _agent_stream(payload),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
