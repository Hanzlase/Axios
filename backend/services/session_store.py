from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from threading import Lock
from typing import Any


@dataclass
class ChatMessage:
    role: str  # "user" | "assistant"
    content: str
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


@dataclass
class SessionData:
    session_id: str
    chat_history: list[ChatMessage] = field(default_factory=list)
    agent_results: dict[str, Any] = field(default_factory=dict)
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    last_active: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


class SessionStore:
    MAX_HISTORY = 10

    def __init__(self) -> None:
        self._lock = Lock()
        self._sessions: dict[str, SessionData] = {}

    def _get_or_create(self, session_id: str) -> SessionData:
        if session_id not in self._sessions:
            self._sessions[session_id] = SessionData(session_id=session_id)
        return self._sessions[session_id]

    def add_message(self, session_id: str, role: str, content: str) -> None:
        with self._lock:
            session = self._get_or_create(session_id)
            session.chat_history.append(ChatMessage(role=role, content=content))
            if len(session.chat_history) > self.MAX_HISTORY:
                session.chat_history = session.chat_history[-self.MAX_HISTORY :]
            session.last_active = datetime.now(timezone.utc)

    def get_history(self, session_id: str, last_n: int = 10) -> list[ChatMessage]:
        with self._lock:
            session = self._sessions.get(session_id)
            if not session:
                return []
            return list(session.chat_history[-last_n:])

    def save_agent_result(self, session_id: str, mode: str, result: Any) -> None:
        with self._lock:
            session = self._get_or_create(session_id)
            session.agent_results[mode] = result
            session.last_active = datetime.now(timezone.utc)

    def get_agent_result(self, session_id: str, mode: str) -> Any | None:
        with self._lock:
            session = self._sessions.get(session_id)
            return session.agent_results.get(mode) if session else None

    def get_session_info(self, session_id: str) -> dict | None:
        with self._lock:
            session = self._sessions.get(session_id)
            if not session:
                return None
            return {
                "session_id": session_id,
                "message_count": len(session.chat_history),
                "has_agent_results": list(session.agent_results.keys()),
                "created_at": session.created_at.isoformat(),
                "last_active": session.last_active.isoformat(),
                "history": [
                    {"role": m.role, "content": m.content, "created_at": m.created_at}
                    for m in session.chat_history
                ],
            }

    def clear_session(self, session_id: str) -> None:
        with self._lock:
            self._sessions.pop(session_id, None)


_STORE = SessionStore()


def get_session_store() -> SessionStore:
    return _STORE
