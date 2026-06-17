# Axion (Axios) — Project Description

This document explains what the Axion project is, how it is structured, and how each major part was implemented.

> Repo layout (high level)
>
> - `backend/` — FastAPI API server (SSE streaming, ingestion, RAG, agents, export)
> - `frontend/` — Next.js UI (App Router) that consumes the API + SSE streams
> - `README.md` — quickstart + Railway deployment guide (two-service)

---

## 1) What Axion is

Axion is a **document-grounded AI workspace**:

1. You upload documents into a **session**.
2. The backend extracts text, chunks it, and builds a **hybrid retrieval index** (vector + BM25).
3. When you ask for an output (chat / explain / quiz / flashcards / study plan), the backend retrieves relevant evidence from your uploaded documents (RAG).
4. An LLM is called with the retrieved context, and responses are streamed back to the browser using **Server-Sent Events (SSE)**.
5. Generated artifacts can be exported as **Markdown / CSV / PDF**.

The design goal is: *fast iteration, clear separation of concerns, and “grounded” outputs that can cite which file chunks influenced the result*.

---

## 2) Architecture overview

### Components

- **Frontend**: Next.js App Router UI
  - Handles sessions in `localStorage`.
  - Uploads documents.
  - Starts streaming requests (chat + agent modes).
  - Parses SSE events progressively to show live output.

- **Backend**: FastAPI
  - `/upload` accepts files, stores metadata, extracts text in a background task.
  - RAG service builds per-session indexes (FAISS + BM25) and merges candidates.
  - Chat and agent endpoints return **SSE streams** so the UI can render tokens as they arrive.
  - Export service returns downloadable files.

### Flow (request lifecycle)

1. **Upload** → `/upload` (multipart)
2. **Ingestion** → extract text, clean it, persist ingestion metadata
3. **Query** → `/api/chat/stream` or `/api/agent/stream`
4. **Retrieve** → vector search + BM25 + rerank
5. **Generate** → LLM stream with provider fallback
6. **Stream** → SSE events (`status`, `sources`, `token`, `result`, `done`)
7. **Persist** → store chat turns and agent results per session

---

## 3) Backend (FastAPI) implementation

### 3.1 Entry points and app wiring

**Files**:
- `backend/main.py` — simple launcher for local dev (runs uvicorn)
- `backend/core/main.py` — FastAPI app factory and router wiring

**Key ideas**:
- `create_app()` constructs the FastAPI application.
- `CORSMiddleware` is configured via environment variables (see `backend/core/config.py`).
- Routers are included from `backend/routes/*`.

**Request logging**:
- `backend/core/main.py` adds an HTTP middleware that:
  - generates a request id
  - records duration
  - logs success/error via `structlog`


### 3.2 Configuration

**File**: `backend/core/config.py`

- Uses `python-dotenv` for local development (`load_dotenv()`), then reads environment variables.
- Uses a Pydantic `BaseModel` (`Settings`) to validate and normalize values.

Important settings:
- `CORS_ALLOW_ORIGINS` — comma-separated allowlist
- RAG controls like `RAG_CHUNK_SIZE_TOKENS`, `RAG_RETRIEVAL_TOP_K`
- LLM provider keys and models


### 3.3 Routes (API surface)

**Folder**: `backend/routes/`

- `health.py` — `GET /health`
- `status.py` — `GET /api/status`
- `upload.py` — `POST /upload` and `GET /api/uploads/{session_id}`
- `chat.py` — `POST /api/chat/stream` (SSE)
- `agent.py` — `POST /api/agent/stream` (SSE)
- `session.py` — session history + stored results + delete
- `export.py` — `POST /api/export`

All streaming endpoints use:
- `fastapi.responses.StreamingResponse`
- `media_type="text/event-stream"`
- headers to disable proxy buffering (`X-Accel-Buffering: no`)


### 3.4 SSE framing

**File**: `backend/utils/sse.py`

The server emits events as SSE frames, typically shaped like:

- `{"type":"status","value":"retrieving"}`
- `{"type":"sources","sources":[...]}`
- `{"type":"token","token":"..."}`
- `{"type":"result","mode":"quiz","data":{...}}`
- `{"type":"done"}`

The UI decodes SSE by reading the response body stream and splitting SSE blocks.


### 3.5 Ingestion (upload + extraction + persistence)

**Files**:
- `backend/routes/upload.py`
- `backend/services/ingestion_service.py`
- `backend/utils/file_utils.py`
- `backend/utils/text_utils.py`
- `backend/data/ingestion_store.json`

#### How upload works

1. Client calls `POST /upload` with `files[]` and optional `session_id`.
2. If no `session_id` is provided, the backend generates one.
3. For each file:
   - validate extension (PDF/DOCX/TXT/CSV)
   - store a queued record into the IngestionStore
4. Processing runs in a **FastAPI BackgroundTask**:
   - `process_upload_batch(payloads)`
   - extracts text depending on file type
   - cleans and normalizes text
   - stores extracted text into the ingestion record

#### Persistence model

`IngestionStore` maintains:
- `_files[file_id]` detailed metadata (`status`, `extracted_text`, etc.)
- `_sessions[session_id]` mapping to file ids

It also persists to disk in `data/ingestion_store.json` so uploads survive restarts.


### 3.6 RAG (Retrieval-Augmented Generation)

**File**: `backend/services/rag_service.py`

Implementation details:

- Builds a per-session index on-demand when a query arrives.
- Uses a *signature* of processed files (`file_id`, `processed_at`) to detect if an index is stale.

Hybrid retrieval:

1. **Vector retrieval (FAISS)**
   - Uses `sentence-transformers` embeddings
   - Index: `faiss.IndexFlatIP` (inner product similarity)

2. **Keyword retrieval (BM25)**
   - Uses `rank-bm25` over tokenized chunks

3. **Merge candidates**
   - Normalize/merge scores from both retrieval methods

4. **Rerank**
   - Uses a cross-encoder reranker model (`cross-encoder/ms-marco-MiniLM-L-6-v2` by default)

5. **Return top-k**
   - Returned as `RagResult` entries containing chunk metadata and score.

The backend includes sources in streaming responses so the UI can display citations.


### 3.7 Chat streaming

**Files**:
- `backend/routes/chat.py`
- `backend/services/chat_service.py`

The `ChatService.stream_chat()` flow:

1. Validate message
2. Append user message to session history
3. Retrieve RAG context
4. Stream tokens from the LLM
5. Persist assistant response to the session store

It emits SSE events:
- status: retrieving → generating
- sources: list of retrieved chunks
- token: each token
- done


### 3.8 Agent streaming (Explain / Quiz / Flashcards / Plan)

**Files**:
- `backend/routes/agent.py`
- `backend/services/intent_service.py`
- `backend/agents/*.py`

Agent endpoint supports modes:
- `auto` (keyword intent classification)
- `chat`
- `explain`
- `quiz`
- `flashcards`
- `plan`
- `summarize` (currently routes to chat logic)

#### Intent routing

`services/intent_service.py` uses keyword scoring. For example, a message containing "flashcards" or "key terms" maps to `flashcards` mode.

#### Agent implementations

- `ExplainerAgent` (`agents/explainer_agent.py`)
  - Streams markdown explanation tokens.
  - Supports levels: `simple | intermediate | advanced`.

- `QuizAgent` (`agents/quiz_agent.py`)
  - Generates MCQs as strict JSON.
  - Uses batching to improve JSON reliability.

- `FlashcardAgent` (`agents/flashcard_agent.py`)
  - Returns exactly N flashcards as JSON.

- `PlannerAgent` (`agents/planner_agent.py`)
  - Returns an N-day plan with tasks and durations as JSON.

The `agent` route intercepts the `result` frame and saves it to the session store.


### 3.9 LLM provider abstraction + fallback

**File**: `backend/services/llm_service.py`

- Supports OpenRouter-compatible streaming.
- Falls back to Cohere if OpenRouter hits rate limits.
- Provides:
  - `stream_completion()` → yields plain text tokens
  - `complete()` → collects tokens into one string
  - `extract_json()` → robustly extracts JSON from imperfect model responses (handles fenced blocks and balanced brace extraction)


### 3.10 Session persistence

**File**: `backend/services/session_store.py`

- Stores last N chat turns per session.
- Stores agent outputs by mode (`quiz`, `flashcards`, `plan`, `explain`).
- API surface via `routes/session.py`:
  - `GET /api/sessions/{session_id}`
  - `GET /api/sessions/{session_id}/results`
  - `DELETE /api/sessions/{session_id}`


### 3.11 Exporting outputs

**Files**:
- `backend/routes/export.py`
- `backend/services/export_service.py`

Exports supported:
- Markdown: chat / quiz / flashcards / plan
- CSV: quiz / flashcards / plan
- PDF: chat / quiz / flashcards / plan

The export service fetches the stored results from `SessionStore`, renders the chosen format, and returns it with a filename.

---

## 4) Frontend (Next.js) implementation

### 4.1 Structure

**Folder**: `frontend/src/`

- `app/` — Next.js App Router pages
  - `app/page.tsx` — landing page
  - `app/workspace/page.tsx` — workspace route
- `components/` — UI components (workspace panels, theme toggle, etc.)
- `lib/api.ts` — API client and SSE stream decoding
- `lib/session.ts` — browser-side session + UI persistence


### 4.2 API client + SSE decoding

**File**: `frontend/src/lib/api.ts`

- `API_BASE_URL` comes from `NEXT_PUBLIC_API_BASE_URL` (Railway variable)
- Implements:
  - `uploadFiles()`
  - `streamChatResponse()`
  - `streamAgentResponse()`
  - `fetchSessionHistory()`
  - `fetchSessionResults()`
  - `exportSession()`

SSE decoding is implemented by:
- reading `response.body.getReader()`
- appending to a string buffer
- splitting on SSE message boundaries
- parsing JSON from `data:` frames


### 4.3 Session and UI state persistence

**File**: `frontend/src/lib/session.ts`

The frontend keeps sessions locally so it can:
- remember which session is active
- restore UI state (active mode, selected doc, generated outputs)

This is intentionally lightweight and does not require login.


### 4.4 Workspace UI

**File**: `frontend/src/components/workspace/WorkspaceShell.tsx`

`WorkspaceShell` orchestrates:
- the active session id
- upload state and progress
- active mode (chat / explain / quiz / flashcards / plan)
- showing streaming output via the panel components

Panels:
- `ChatStreamPanel.tsx`
- `ExplainPanel.tsx`
- `QuizPanel.tsx`
- `FlashcardPanel.tsx`
- `PlannerPanel.tsx`
- `ExportButton.tsx`

---

## 5) Deployment (Railway) — two services

This repo is intended to deploy as **two Railway services**:

### Backend service

- Root directory: `backend`
- Runs via `backend/Procfile` (Gunicorn + UvicornWorker)
- Must set environment variables in Railway (do not commit secrets)

### Frontend service

- Root directory: `frontend`
- Builds via `frontend/Dockerfile`
- Must set:
  - `NEXT_PUBLIC_API_BASE_URL=https://<backend>.up.railway.app`

### CORS wiring

In backend variables:
- `CORS_ALLOW_ORIGINS=https://<frontend>.up.railway.app`
- `FRONTEND_ORIGIN=https://<frontend>.up.railway.app`

---

## 6) Implementation choices and trade-offs

- **SSE over WebSockets**: simpler deployment, works well with HTTP infra and streaming.
- **Hybrid retrieval**: vector search captures semantics, BM25 captures exact keyword matches.
- **Session-scoped indexing**: each session is isolated, so retrieval is always grounded in that session’s uploaded docs.
- **Simple persistence**: JSON disk persistence for ingestion metadata keeps the project lightweight (no DB required).
- **Provider fallback**: protects UX if one LLM provider rate-limits.

---

## 7) Known limitations / next improvements

- Ingestion metadata persists to disk, but deployments with ephemeral disks may lose stored data.
  - If you need durable storage, move `IngestionStore` and session results to a DB (Postgres/Redis) or object storage.
- Sentence-transformer model downloads can slow cold starts.
  - Consider baking models into the image or using smaller embeddings.
- Intent classifier is keyword-based.
  - Could be upgraded to an LLM-based router or a lightweight classifier.

---

## 8) File map (where to look)

Backend:
- App wiring: `backend/core/main.py`
- Settings: `backend/core/config.py`
- Upload: `backend/routes/upload.py` + `backend/services/ingestion_service.py`
- RAG: `backend/services/rag_service.py`
- Chat SSE: `backend/routes/chat.py` + `backend/services/chat_service.py`
- Agent SSE: `backend/routes/agent.py` + `backend/agents/*`
- LLM: `backend/services/llm_service.py`
- Session store: `backend/services/session_store.py`
- Export: `backend/routes/export.py` + `backend/services/export_service.py`

Frontend:
- API client: `frontend/src/lib/api.ts`
- local sessions: `frontend/src/lib/session.ts`
- workspace: `frontend/src/components/workspace/WorkspaceShell.tsx`

