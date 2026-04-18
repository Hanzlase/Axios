from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, Body, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel
import structlog

from services.export_service import build_export

router = APIRouter(tags=["export"])
logger = structlog.get_logger()


class ExportRequest(BaseModel):
    session_id: str
    format: Literal["markdown", "pdf", "csv"] = "markdown"
    content_type: Literal["chat", "quiz", "flashcards", "plan"] = "chat"


@router.post("/api/export")
async def export_session(payload: ExportRequest = Body(...)):
    try:
        content_bytes, media_type, filename = build_export(
            session_id=payload.session_id,
            fmt=payload.format,
            content_type=payload.content_type,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except RuntimeError as exc:
        raise HTTPException(status_code=501, detail=str(exc))
    except Exception:
        logger.exception(
            "export_failed",
            session_id=payload.session_id,
            fmt=payload.format,
            content_type=payload.content_type,
        )
        raise HTTPException(status_code=500, detail="Export generation failed.")

    logger.info(
        "export_success",
        session_id=payload.session_id,
        fmt=payload.format,
        content_type=payload.content_type,
        size_bytes=len(content_bytes),
    )

    return Response(
        content=content_bytes,
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
