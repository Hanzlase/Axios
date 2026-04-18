from __future__ import annotations

from fastapi import APIRouter
import structlog

from services.session_store import get_session_store

router = APIRouter(tags=["sessions"])
logger = structlog.get_logger()


@router.get("/api/sessions/{session_id}")
async def get_session(session_id: str):
    store = get_session_store()
    info = store.get_session_info(session_id)
    if info is None:
        return {
            "session_id": session_id,
            "message_count": 0,
            "has_agent_results": [],
            "history": [],
        }
    return info


@router.get("/api/sessions/{session_id}/results")
async def get_session_results(session_id: str, mode: str | None = None):
    """Return persisted agent results for a session (quiz | flashcards | plan | explain)."""
    store = get_session_store()
    if mode:
        result = store.get_agent_result(session_id, mode)
        return {"session_id": session_id, "mode": mode, "result": result}
    # Return all modes
    all_results = {
        m: store.get_agent_result(session_id, m)
        for m in ["quiz", "flashcards", "plan", "explain"]
    }
    return {
        "session_id": session_id,
        "results": {k: v for k, v in all_results.items() if v is not None},
    }


@router.delete("/api/sessions/{session_id}", status_code=204)
async def clear_session(session_id: str):
    get_session_store().clear_session(session_id)

