from __future__ import annotations

import re


_WHITESPACE_RE = re.compile(r"\s+")


def normalize_text_encoding(content: bytes) -> str:
    """Decode bytes into normalized text with sensible fallbacks."""
    for encoding in ("utf-8-sig", "utf-16", "latin-1"):
        try:
            return content.decode(encoding)
        except UnicodeDecodeError:
            continue
    return content.decode("utf-8", errors="replace")


def clean_text(raw_text: str) -> str:
    """Normalize whitespace and strip leading/trailing noise."""
    normalized = _WHITESPACE_RE.sub(" ", raw_text)
    return normalized.strip()

