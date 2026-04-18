// Session management with localStorage persistence

const SESSIONS_KEY = "axion_sessions";
const ACTIVE_KEY = "axion_active_session";
const SESSION_UI_PREFIX = "axion_session_ui:";

export type StoredSession = {
  id: string;
  title: string;
  createdAt: string;
};

export type SessionUiState = {
  /** Selected file/document for focus in WorkspaceShell */
  activeDocumentId?: string | null;

  /** Per-mode persisted outputs (so switching tabs doesn't wipe) */
  explain?: {
    level?: "simple" | "intermediate" | "advanced";
    /** Back-compat: a single stored explanation bucket */
    content?: string;
    sources?: unknown[];
    /** New: independent stored explanations per level */
    byLevel?: Partial<
      Record<
        "simple" | "intermediate" | "advanced",
        { content?: string; sources?: unknown[] }
      >
    >;
  };
  quiz?: {
    questions?: unknown[];
    answers?: Record<number, string>;
    revealed?: boolean;
    numQ?: number;
  };
  flashcards?: {
    cards?: unknown[];
    currentIndex?: number;
    numCards?: number;
  };
};

function generateUUID(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function uiKey(sessionId: string): string {
  return `${SESSION_UI_PREFIX}${sessionId}`;
}

export function loadSessions(): StoredSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SESSIONS_KEY);
    return raw ? (JSON.parse(raw) as StoredSession[]) : [];
  } catch {
    return [];
  }
}

export function saveSessions(sessions: StoredSession[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
}

export function getActiveSessionId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACTIVE_KEY);
}

export function setActiveSessionId(id: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ACTIVE_KEY, id);
}

export function createSession(title?: string): StoredSession {
  const session: StoredSession = {
    id: generateUUID(),
    title: title ?? `Session ${new Date().toLocaleString()}`,
    createdAt: new Date().toISOString(),
  };
  const sessions = loadSessions();
  sessions.unshift(session);
  saveSessions(sessions);
  setActiveSessionId(session.id);
  return session;
}

export function renameSession(id: string, title: string): void {
  const sessions = loadSessions().map((s) => (s.id === id ? { ...s, title } : s));
  saveSessions(sessions);
}

export function deleteStoredSession(id: string): StoredSession[] {
  const sessions = loadSessions().filter((s) => s.id !== id);
  saveSessions(sessions);
  clearSessionUiState(id);
  return sessions;
}

/** On first load: returns existing sessions + active ID; creates a default session if none exist. */
export function getOrBootstrap(): { sessions: StoredSession[]; activeId: string } {
  const sessions = loadSessions();
  if (sessions.length === 0) {
    const session = createSession("My First Session");
    return { sessions: [session], activeId: session.id };
  }
  let activeId = getActiveSessionId();
  if (!activeId || !sessions.find((s) => s.id === activeId)) {
    activeId = sessions[0]!.id;
    setActiveSessionId(activeId);
  }
  return { sessions, activeId };
}

export function loadSessionUiState(sessionId: string): SessionUiState {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(uiKey(sessionId));
    return raw ? (JSON.parse(raw) as SessionUiState) : {};
  } catch {
    return {};
  }
}

export function saveSessionUiState(sessionId: string, state: SessionUiState): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(uiKey(sessionId), JSON.stringify(state));
}

export function patchSessionUiState(sessionId: string, patch: Partial<SessionUiState>): void {
  const current = loadSessionUiState(sessionId);
  saveSessionUiState(sessionId, { ...current, ...patch });
}

export function clearSessionUiState(sessionId: string): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(uiKey(sessionId));
}
