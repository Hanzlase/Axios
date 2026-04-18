from __future__ import annotations

from datetime import datetime, timezone
from time import perf_counter


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def utc_now_iso() -> str:
    return utc_now().isoformat()


def monotonic_ms() -> float:
    return perf_counter() * 1000

