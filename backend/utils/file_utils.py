from __future__ import annotations

from pathlib import Path


SUPPORTED_EXTENSIONS = {".pdf", ".docx", ".txt", ".csv"}


def detect_extension(filename: str) -> str:
    return Path(filename).suffix.lower()


def is_supported_extension(filename: str) -> bool:
    return detect_extension(filename) in SUPPORTED_EXTENSIONS

