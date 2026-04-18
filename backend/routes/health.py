from __future__ import annotations

from fastapi import APIRouter
import structlog

from services.system_service import get_health_payload
from utils.time_utils import monotonic_ms

router = APIRouter(tags=["monitoring"])
logger = structlog.get_logger()


@router.get("/health")
async def health_check():
    start_ms = monotonic_ms()
    payload = get_health_payload(response_ms=monotonic_ms() - start_ms)
    logger.info("health_check", status=payload["status"])
    return payload
