from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Body
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
import structlog

from services.chat_service import get_chat_service

router = APIRouter(tags=["chat"])
logger = structlog.get_logger()


class ChatStreamRequest(BaseModel):
    session_id: str = Field(min_length=1)
    message: str = Field(min_length=1)
    top_k: int | None = Field(default=None, ge=1, le=12)


@router.post("/api/chat/stream")
async def chat_stream(payload: ChatStreamRequest = Body(...)):
    logger.info(
        "chat_stream_request",
        session_id=payload.session_id,
        top_k=payload.top_k,
    )
    stream = get_chat_service().stream_chat(
        session_id=payload.session_id,
        user_message=payload.message,
        top_k=payload.top_k,
    )
    return StreamingResponse(
        stream,
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )

