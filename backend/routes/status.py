from __future__ import annotations

from fastapi import APIRouter
import structlog

from services.system_service import get_status_payload

router = APIRouter(tags=["monitoring"])
logger = structlog.get_logger()


@router.get("/api/status")
async def api_status():
    payload = get_status_payload()
    logger.info("status_check", env=payload["env"], version=payload["version"])
    return payload
