from __future__ import annotations

import socket

from core.config import get_settings
from utils.time_utils import utc_now, utc_now_iso

_STARTED_AT = utc_now()


def get_health_payload(response_ms: float | None = None) -> dict[str, object]:
    payload: dict[str, object] = {
        "status": "ok",
        "timestamp": utc_now_iso(),
        "service": "axion-api",
    }
    if response_ms is not None:
        payload["response_ms"] = round(response_ms, 2)
    return payload


def get_status_payload() -> dict[str, object]:
    settings = get_settings()
    uptime_seconds = int((utc_now() - _STARTED_AT).total_seconds())
    return {
        "name": settings.app_name,
        "version": settings.api_version,
        "env": settings.env,
        "uptime_seconds": uptime_seconds,
        "host": socket.gethostname(),
        "capabilities": ["document-workspace", "status-observability", "rag-ready"],
    }

