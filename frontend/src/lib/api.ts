export type HealthResponse = {
  status: string;
  timestamp: string;
  service: string;
  response_ms?: number;
};

export type StatusResponse = {
  name: string;
  version: string;
  env: string;
  uptime_seconds: number;
  host: string;
  capabilities: string[];
};

export type UploadFileRecord = {
  file_id: string;
  session_id: string;
  filename: string;
  file_type: string;
  upload_time: string;
  size_bytes: number;
  status: "queued" | "processing" | "processed" | "failed";
  text_length: number;
  error: string | null;
};

export type UploadResponse = {
  status: string;
  session_id: string;
  accepted_count: number;
  rejected_count: number;
  files: UploadFileRecord[];
  rejected_files: Array<{
    filename: string;
    reason: string;
  }>;
};

export type UploadStatusResponse = {
  session_id: string;
  count: number;
  files: UploadFileRecord[];
};

export type ChatSource = {
  chunk_id: string;
  file_id: string;
  filename: string;
  rank: number;
  score: number;
  token_count: number;
};

export type ChatStreamRequest = {
  session_id: string;
  message: string;
  top_k?: number;
};

export type ChatStreamEvent =
  | { type: "status"; value: string }
  | { type: "sources"; sources: ChatSource[] }
  | { type: "token"; token: string }
  | { type: "error"; message: string }
  | { type: "done" };

// ── Agent types ─────────────────────────────────────────────────────────────

export type AgentMode = "auto" | "chat" | "explain" | "quiz" | "flashcards" | "plan" | "summarize";

export type ExplainLevel = "simple" | "intermediate" | "advanced";

export type QuizQuestion = {
  id: number;
  question: string;
  options: string[]; // ["A. ...", "B. ...", "C. ...", "D. ..."]
  correct: string;   // "A" | "B" | "C" | "D"
  explanation?: string;
};

export type Flashcard = {
  id: number;
  front: string;
  back: string;
};

export type PlanDay = {
  day: number;
  label: string;
  topic: string;
  tasks: string[];
  duration: string;
};

export type AgentStreamEvent =
  | { type: "intent"; detected: AgentMode }
  | { type: "status"; value: string }
  | { type: "sources"; sources: ChatSource[] }
  | { type: "token"; token: string }
  | { type: "result"; mode: "quiz"; data: { questions: QuizQuestion[] } }
  | { type: "result"; mode: "flashcards"; data: { cards: Flashcard[] } }
  | { type: "result"; mode: "plan"; data: { title: string; schedule: PlanDay[] } }
  | { type: "error"; message: string }
  | { type: "done" };

export type AgentStreamRequest = {
  session_id: string;
  message: string;
  mode?: AgentMode;
  level?: ExplainLevel;
  num_questions?: number;
  num_cards?: number;
  num_days?: number;
  top_k?: number;
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ??
  "http://localhost:8000";

async function request<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
    signal,
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return (await response.json()) as T;
}

export function fetchHealth(signal?: AbortSignal): Promise<HealthResponse> {
  return request<HealthResponse>("/health", signal);
}

export function fetchStatus(signal?: AbortSignal): Promise<StatusResponse> {
  return request<StatusResponse>("/api/status", signal);
}

export function fetchUploadStatus(
  sessionId: string,
  signal?: AbortSignal,
): Promise<UploadStatusResponse> {
  return request<UploadStatusResponse>(`/api/uploads/${sessionId}`, signal);
}

export async function deleteSession(sessionId: string): Promise<void> {
  await fetch(`${API_BASE_URL}/api/sessions/${sessionId}`, {
    method: "DELETE",
  });
}

export function uploadFiles(
  files: File[],
  sessionId: string,
  onProgress?: (percent: number) => void,
): Promise<UploadResponse> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_BASE_URL}/upload`);
    xhr.responseType = "json";

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable || !onProgress) {
        return;
      }
      onProgress(Math.round((event.loaded / event.total) * 100));
    };

    xhr.onerror = () => {
      reject(new Error("Upload failed due to a network issue."));
    };

    xhr.onload = () => {
      const payload = xhr.response as UploadResponse | null;
      if (xhr.status >= 200 && xhr.status < 300 && payload) {
        resolve(payload);
        return;
      }

      const message =
        typeof payload === "object" && payload && "status" in payload
          ? "Upload request failed."
          : `Upload failed with status ${xhr.status}`;
      reject(new Error(message));
    };

    const formData = new FormData();
    formData.append("session_id", sessionId);
    for (const file of files) {
      formData.append("files", file, file.name);
    }

    xhr.send(formData);
  });
}

function parseSseEvent(rawEvent: string): ChatStreamEvent | null {
  const normalized = rawEvent.replace(/\r/g, "");
  const dataLine = normalized
    .split("\n")
    .find((line) => line.startsWith("data:"));
  if (!dataLine) {
    return null;
  }

  const rawData = dataLine.slice(5).trim();
  if (!rawData) {
    return null;
  }

  try {
    return JSON.parse(rawData) as ChatStreamEvent;
  } catch {
    return null;
  }
}

export async function streamChatResponse(
  request: ChatStreamRequest,
  callbacks: {
    onEvent?: (event: ChatStreamEvent) => void;
    onToken?: (token: string) => void;
    onDone?: () => void;
  } = {},
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/chat/stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Chat stream failed (${response.status}): ${detail}`);
  }

  if (!response.body) {
    throw new Error("Chat stream unavailable: empty response body.");
  }

  const decoder = new TextDecoder("utf-8");
  const reader = response.body.getReader();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });

    while (true) {
      const boundaryIndex = buffer.indexOf("\n\n");
      if (boundaryIndex === -1) {
        break;
      }

      const rawEvent = buffer.slice(0, boundaryIndex);
      buffer = buffer.slice(boundaryIndex + 2);
      const event = parseSseEvent(rawEvent);
      if (!event) {
        continue;
      }

      callbacks.onEvent?.(event);
      if (event.type === "token") {
        callbacks.onToken?.(event.token);
      }
      if (event.type === "done") {
        callbacks.onDone?.();
      }
    }
  }
}

export async function streamAgentResponse(
  request: AgentStreamRequest,
  callbacks: {
    onEvent?: (event: AgentStreamEvent) => void;
    onToken?: (token: string) => void;
    onDone?: () => void;
  } = {},
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/agent/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Agent stream failed (${response.status}): ${detail}`);
  }
  if (!response.body) throw new Error("Agent stream: empty response body.");

  const decoder = new TextDecoder("utf-8");
  const reader = response.body.getReader();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    while (true) {
      const idx = buffer.indexOf("\n\n");
      if (idx === -1) break;
      const raw = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      const dataLine = raw.replace(/\r/g, "").split("\n").find((l) => l.startsWith("data:"));
      if (!dataLine) continue;
      const payload = dataLine.slice(5).trim();
      if (!payload) continue;
      try {
        const event = JSON.parse(payload) as AgentStreamEvent;
        callbacks.onEvent?.(event);
        if (event.type === "token") callbacks.onToken?.(event.token);
        if (event.type === "done") callbacks.onDone?.();
      } catch {
        // skip malformed frame
      }
    }
  }
}

// ── Session history ───────────────────────────────────────────────────────────

export type SessionHistoryMessage = {
  role: "user" | "assistant";
  content: string;
  created_at: string;
};

export type SessionHistoryResponse = {
  session_id: string;
  message_count: number;
  has_agent_results: string[];
  history: SessionHistoryMessage[];
};

export function fetchSessionHistory(
  sessionId: string,
  signal?: AbortSignal,
): Promise<SessionHistoryResponse> {
  return request<SessionHistoryResponse>(`/api/sessions/${sessionId}`, signal);
}

// ── Agent result persistence ───────────────────────────────────────────────

export type PersistedResults = {
  quiz?: { questions: QuizQuestion[] };
  flashcards?: { cards: Flashcard[] };
  plan?: { title: string; schedule: PlanDay[] };
  explain?: { content: string };
};

export type SessionResultsResponse = {
  session_id: string;
  results: PersistedResults;
};

export async function fetchSessionResults(
  sessionId: string,
): Promise<SessionResultsResponse> {
  return request<SessionResultsResponse>(`/api/sessions/${sessionId}/results`);
}

// ── Export ────────────────────────────────────────────────────────────────────

export type ExportFormat = "markdown" | "pdf" | "csv";
export type ExportContentType = "chat" | "quiz" | "flashcards" | "plan";

export async function exportSession(
  sessionId: string,
  format: ExportFormat,
  contentType: ExportContentType,
): Promise<{ blob: Blob; filename: string }> {
  const response = await fetch(`${API_BASE_URL}/api/export`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      session_id: sessionId,
      format,
      content_type: contentType,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Export failed (${response.status}): ${detail}`);
  }

  const disposition = response.headers.get("Content-Disposition") ?? "";
  const match = disposition.match(/filename="([^"]+)"/);
  const filename = match?.[1] ?? `axion_export.${format}`;
  const blob = await response.blob();
  return { blob, filename };
}

export { API_BASE_URL };


