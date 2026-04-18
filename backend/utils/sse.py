from __future__ import annotations

import json
from typing import Any


def sse_payload(payload: dict[str, Any], event: str | None = None) -> str:
    body = json.dumps(payload, ensure_ascii=True)
    if event:
        return f"event: {event}\ndata: {body}\n\n"
    return f"data: {body}\n\n"

