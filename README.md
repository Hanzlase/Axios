# Axion — AI Workspace Foundation

> A production-grade RAG (Retrieval-Augmented Generation) workspace.  
> Upload documents → Index them → Chat with an LLM grounded in your content.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Repository Layout](#2-repository-layout)
3. [Architecture Diagram](#3-architecture-diagram)
4. [Backend Deep-Dive](#4-backend-deep-dive)
   - [Entry Point](#41-entry-point)
   - [Core Layer](#42-core-layer)
   - [Routes](#43-routes--api-surface)
   - [Services](#44-services)
   - [Utils](#45-utils)
   - [In-Memory State](#46-in-memory-state--current-limitations)
5. [Frontend Deep-Dive](#5-frontend-deep-dive)
   - [Tech Stack](#51-tech-stack)
   - [API Client](#52-api-client-srclibapits)
   - [WorkspaceShell](#53-workspaceshell)
   - [ChatStreamPanel](#54-chatstreampanel)
   - [Design System](#55-design-system)
6. [Data Flow Walkthrough](#6-data-flow-walkthrough)
7. [API Reference](#7-api-reference)
8. [Configuration & Environment Variables](#8-configuration--environment-variables)
9. [Local Development Setup](#9-local-development-setup)
10. [Known Limitations & Future Feature Hooks](#10-known-limitations--future-feature-hooks)

---

## 1. Project Overview

Axion is a **session-scoped document Q&A platform**. The core loop is:

```
User uploads files  →  Backend extracts text  →  Chunks are embedded + indexed
User asks question  →  Hybrid retrieval (vector + BM25)  →  Cross-encoder rerank
                    →  Top-K chunks injected as context  →  LLM streams answer back
```

The LLM is accessed via **OpenRouter** (OpenAI-compatible API), making it trivial to swap models. The embedding and reranking models run **locally** via `sentence-transformers`.

---

## 2. Repository Layout

```
Axion/
├── backend/                   # Python / FastAPI
│   ├── main.py                # Uvicorn entry point
│   ├── requirements.txt
│   ├── core/
│   │   ├── config.py          # Pydantic Settings (env-driven)
│   │   ├── logging.py         # structlog JSON logging
│   │   └── main.py            # FastAPI app factory + middleware
│   ├── routes/
│   │   ├── chat.py            # POST /api/chat/stream
│   │   ├── health.py          # GET  /health
│   │   ├── status.py          # GET  /api/status
│   │   └── upload.py          # POST /upload  |  GET /api/uploads/{session_id}
│   ├── services/
│   │   ├── chat_service.py    # SSE streaming + OpenRouter integration
│   │   ├── ingestion_service.py # File parsing, in-memory store
│   │   ├── rag_service.py     # Chunking, FAISS, BM25, cross-encoder rerank
│   │   └── system_service.py  # Health + status payloads
│   └── utils/
│       ├── file_utils.py      # Extension detection / validation
│       ├── sse.py             # SSE frame formatter
│       ├── text_utils.py      # Encoding normalisation + whitespace cleanup
│       └── time_utils.py      # UTC helpers + monotonic clock
│
└── frontend/                  # Next.js 16 / React 19 / TypeScript
    └── src/
        ├── app/
        │   ├── layout.tsx     # Root layout (IBM Plex fonts, CSS vars)
        │   ├── page.tsx       # Renders <WorkspaceShell />
        │   └── globals.css    # CSS custom properties + utility classes
        ├── components/
        │   └── workspace/
        │       ├── WorkspaceShell.tsx   # Main UI shell (state hub)
        │       └── ChatStreamPanel.tsx  # SSE chat + message rendering
        └── lib/
            └── api.ts         # Typed fetch/XHR wrappers for all backend endpoints
```

---

## 3. Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    Browser (Next.js)                    │
│                                                         │
│  WorkspaceShell ──────────────────────────────────────  │
│  │  • Connection monitor (health + status, 30s poll)   │
│  │  • Session selector (client-side, static for now)   │
│  │  • File ingestion UI (drag-drop / file picker)      │
│  │  • Upload progress + server status polling (1.5s)   │
│  │                                                      │
│  └── ChatStreamPanel                                    │
│       • SSE consumer (fetch + ReadableStream)           │
│       • Token buffer → batched React state updates      │
│       • ReactMarkdown + remark-gfm rendering            │
└────────────────────────┬────────────────────────────────┘
                         │ HTTP / SSE
                         ▼
┌─────────────────────────────────────────────────────────┐
│                  FastAPI Backend (:8000)                 │
│                                                         │
│  POST /upload          IngestionService                 │
│  ──────────────────►   • Validate extension             │
│                        • Parse PDF/DOCX/TXT/CSV         │
│                        • Store extracted text           │
│                        • Status: queued → processed     │
│                                                         │
│  GET  /api/uploads/    IngestionService.get_session_    │
│  {session_id}  ──────► files()  (status polling)       │
│                                                         │
│  POST /api/chat/stream ChatService                      │
│  ──────────────────►   • RagService.retrieve()          │
│                          – FAISS vector search          │
│                          – BM25 keyword search          │
│                          – RRF merge                    │
│                          – CrossEncoder rerank          │
│                        • Build context string           │
│                        • Stream OpenRouter tokens       │
│                        • SSE: status|sources|token|done │
│                                                         │
│  GET  /health          SystemService                    │
│  GET  /api/status      SystemService                    │
└─────────────────────────────────────────────────────────┘
          │ HTTP (httpx async streaming)
          ▼
┌────────────────────────┐
│  OpenRouter API        │
│  model: gpt-4o-mini    │
│  (swappable via env)   │
└────────────────────────┘
```

---

## 4. Backend Deep-Dive

### 4.1 Entry Point

**`backend/main.py`** — bare Uvicorn launcher.  
**`backend/core/main.py`** — `create_app()` factory that:
- Loads settings from env via `get_settings()`
- Configures structured JSON logging
- Registers CORS middleware (origins from config)
- Mounts all four routers
- Adds an HTTP logging middleware (request ID, method, path, status, duration)
- Logs startup event

### 4.2 Core Layer

| File | Purpose |
|---|---|
| `core/config.py` | `Settings` Pydantic model. All values read from env vars with sensible defaults. Cached via `@lru_cache`. See §8 for the full variable list. |
| `core/logging.py` | `configure_logging()` — sets up `structlog` with ISO timestamper + JSON renderer. Pipes into stdlib `logging` so uvicorn logs are also structured. |

### 4.3 Routes / API Surface

| Route | Method | Description |
|---|---|---|
| `/` | GET | Root info (name, version, docs link) |
| `/health` | GET | Liveness check with response latency |
| `/api/status` | GET | App metadata + uptime + declared capabilities |
| `/upload` | POST | Multipart upload; returns 202 + file records |
| `/api/uploads/{session_id}` | GET | Lists all files and their processing status for a session |
| `/api/chat/stream` | POST | SSE chat stream (JSON body: `session_id`, `message`, optional `top_k`) |

### 4.4 Services

#### `ingestion_service.py`

**`IngestionStore`** — thread-safe in-memory dict of file records keyed by `file_id`, with a secondary index `_sessions: dict[str, list[file_id]]`.

File lifecycle states: `queued → processing → processed | failed`

**`process_upload_batch(payloads)`** — runs in a FastAPI `BackgroundTask`:
1. Set status → `processing`
2. Call `extract_text_from_file()` — dispatches to `pypdf`, `python-docx`, plain text, or CSV reader
3. Clean text with `clean_text()` (whitespace normalisation)
4. Store `extracted_text` + set status → `processed`

> ⚠️ `extracted_text` is stored **in memory only** — it is stripped from public API responses via `_public_record()`.

#### `rag_service.py`

**`RagService`** — singleton. Models lazy-loaded on first retrieval call.

**Index build** (`_build_index`):
- Checks a **signature** (sorted `(file_id, processed_at)` tuples) — rebuilds only when files change
- Chunks text: sliding window over whitespace tokens (`chunk_size=650`, `overlap=100`)
- Encodes all chunk texts with `SentenceTransformer` → `float32` numpy arrays
- Builds **FAISS `IndexFlatIP`** (inner-product / cosine on normalised vecs)
- Builds **BM25Okapi** index from tokenised chunks

**Retrieve** (`retrieve`):
1. Encode query → FAISS search → top-14 vector candidates
2. BM25 score all chunks → top-14 keyword candidates
3. Merge with **Reciprocal Rank Fusion** (RRF, k=60)
4. Pass top candidates to `CrossEncoder` reranker → final sorted list
5. Return top-K `RagResult` objects (chunk + score + rank)

#### `chat_service.py`

**`ChatService.stream_chat()`** — async generator yielding SSE frames:

| SSE event type | When emitted |
|---|---|
| `status: retrieving` | Before RAG retrieval starts |
| `sources` | After retrieval; contains chunk metadata |
| `status: generating` | Before first LLM token |
| `token` | For each streamed token from OpenRouter |
| `error` | On exception or missing API key |
| `done` | Always last |

Calls `_stream_openrouter_tokens()` which uses `httpx.AsyncClient` with streaming. System prompt instructs the model to ground answers in retrieved context and use Markdown.

#### `system_service.py`

Lightweight helpers. Captures `_STARTED_AT` at module import for uptime calculation. Declares `capabilities` list — useful extension point.

### 4.5 Utils

| Util | Key Functions |
|---|---|
| `file_utils.py` | `SUPPORTED_EXTENSIONS = {".pdf", ".docx", ".txt", ".csv"}` · `is_supported_extension()` |
| `text_utils.py` | `normalize_text_encoding()` (tries utf-8-sig → utf-16 → latin-1) · `clean_text()` (collapse whitespace) |
| `sse.py` | `sse_payload(dict, event?)` → `"data: {json}\n\n"` string |
| `time_utils.py` | `utc_now()` · `utc_now_iso()` · `monotonic_ms()` |

### 4.6 In-Memory State & Current Limitations

All document state lives in `IngestionStore` and `RagService._session_indices` — **both are lost on server restart**. This is intentional for the foundation phase.

| Limitation | Future Hook |
|---|---|
| No persistence | Replace `IngestionStore` with SQLite/Postgres + vector store (pgvector / Chroma) |
| No auth | Add FastAPI dependency for JWT/session middleware |
| Single-process only | The FAISS index and BM25 index are not shareable across workers |
| No file size limit | Add `UploadFile` size guard in `upload.py` |
| No deduplication | Track content hash in `IngestionStore` |

---

## 5. Frontend Deep-Dive

### 5.1 Tech Stack

| Concern | Choice |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 |
| UI library | React 19 |
| Styling | Tailwind CSS v4 + CSS custom properties |
| Fonts | IBM Plex Sans + IBM Plex Mono (Google Fonts via `next/font`) |
| Markdown | `react-markdown` + `remark-gfm` |

### 5.2 API Client (`src/lib/api.ts`)

All backend communication lives here. Fully typed with exported TypeScript types that mirror the backend Pydantic models.

| Function | Transport | Notes |
|---|---|---|
| `fetchHealth()` | fetch GET | Returns `HealthResponse` |
| `fetchStatus()` | fetch GET | Returns `StatusResponse` |
| `fetchUploadStatus(sessionId)` | fetch GET | Polls file processing state |
| `uploadFiles(files, sessionId, onProgress?)` | XHR POST | XHR used for upload progress events |
| `streamChatResponse(request, callbacks)` | fetch POST + ReadableStream | Manually parses SSE frames; fires `onEvent`, `onToken`, `onDone` callbacks |

**SSE parsing**: `parseSseEvent()` handles raw `data:` lines from the stream, normalises `\r\n`, and JSON-parses the payload into a discriminated union `ChatStreamEvent`.

Base URL: `NEXT_PUBLIC_API_BASE_URL` env var, defaults to `http://localhost:8000`.

### 5.3 WorkspaceShell

The top-level client component. Owns all shared state:

| State | Type | Purpose |
|---|---|---|
| `connection` | `"checking" \| "connected" \| "disconnected"` | Backend connectivity indicator |
| `backendMeta` | `StatusResponse \| null` | Name, version, env, host, uptime |
| `healthLatency` | `number \| null` | Round-trip ms from `/health` |
| `activeSessionId` | `string` | Currently selected session |
| `documents` | `DocumentItem[]` | Sidebar document list + statuses |
| `uploadItems` | `UploadItem[]` | Staged + uploaded files with local progress |
| `isDragActive` | `boolean` | Drop-zone highlight |
| `isUploading` | `boolean` | Upload in-flight guard |
| `toasts` | `ToastMessage[]` | Auto-dismissing notifications (3.2s) |

**Key behaviours:**
- `refreshBackendState()` polls `/health` + `/api/status` every **30 seconds**
- `startStatusPolling(sessionId)` polls `/api/uploads/{sessionId}` every **1.5 seconds** after an upload, stopping automatically when no files remain in `queued` or `processing` state
- File deduplication by `name:size:extension` key
- Drag-and-drop + click-to-browse file picker with `SUPPORTED_EXTENSIONS` guard
- Upload progress tracked via XHR `onprogress` events
- `syncUploadStateWithServer()` reconciles local `UploadItem` statuses with server `UploadFileRecord` statuses and merges new files into the document sidebar

**Layout**: 3-column grid (`260px | flex-1 | 320px`) on large screens.
- Left aside: Navigation · Sessions · Documents
- Center: Active session header + File Ingestion + `ChatStreamPanel`
- Right aside: System Context (backend link, API metadata, document focus)

### 5.4 ChatStreamPanel

Isolated chat UI component, re-mounted on session change (`key={activeSessionId}`).

**Token streaming optimisation**: Incoming tokens accumulate in a `tokenBufferRef` and are flushed to React state on a **42ms timer** (`scheduleTokenFlush`). This batches rapid token events into fewer re-renders while keeping the UI feeling live.

**Auto-scroll**: `autoScrollEnabled` is set to `false` when the user scrolls up more than 72px from the bottom. A "Jump to latest" button re-enables it.

**Message rendering**:
- User messages → plain `<pre>`-wrapped text, dark bubble
- Assistant messages → `ReactMarkdown` with GFM (tables, code blocks, lists), light bubble
- Source citation shown as a compact badge below each assistant message

**Stream state machine**: `idle → retrieving → generating → idle`

### 5.5 Design System

Defined in `globals.css` via CSS custom properties:

| Variable | Value |
|---|---|
| `--ax-bg` | `#f5f5f4` (warm off-white) |
| `--ax-surface` | `#ffffff` |
| `--ax-surface-subtle` | `#fafaf9` |
| `--ax-border` | `rgba(24,24,27, 0.12)` |
| `--ax-text` | `#111827` |
| `--ax-shadow` | Layered box-shadow |

Utility classes:
- `.ax-panel` — white card with border, radius `0.95rem`, shadow
- `.fade-in` — 180ms ease-out opacity + 3px Y slide
- `.skeleton` — animated shimmer gradient for loading states

---

## 6. Data Flow Walkthrough

### Upload Flow

```
User drops file(s)
  └─► addFilesToQueue()         filter unsupported, deduplicate, set status="ready"
        └─► onUpload()
              └─► uploadFiles() [XHR POST /upload]
                    ├─ progress events → setUploadProgress()
                    └─ 202 response → syncUploadStateWithServer()
                                       startStatusPolling(session_id)
                                         └─► every 1.5s: GET /api/uploads/{session_id}
                                               └─► syncUploadStateWithServer()
                                                     stops when no pending files
```

### Chat Flow

```
User submits message
  └─► onSubmit()
        ├─ append user message + empty assistant placeholder to messages[]
        └─► streamChatResponse() [POST /api/chat/stream]
              │  SSE: status="retrieving"  → setStreamState("retrieving")
              │  SSE: sources=[...]        → attach sources to assistant message
              │  SSE: status="generating" → setStreamState("generating"), hide skeleton
              │  SSE: token="..."          → tokenBufferRef += token, scheduleTokenFlush()
              │                              (flush batched every 42ms to messages[])
              └─ SSE: done / stream end   → flushTokenBuffer(), setIsStreaming(false)
```

---

## 7. API Reference

### `GET /health`
```json
{ "status": "ok", "timestamp": "2026-04-17T...", "service": "axion-api", "response_ms": 0.12 }
```

### `GET /api/status`
```json
{
  "name": "Axion AI Workspace API", "version": "1.0.0", "env": "development",
  "uptime_seconds": 3600, "host": "myhost",
  "capabilities": ["document-workspace", "status-observability", "rag-ready"]
}
```

### `POST /upload`
- **Body**: `multipart/form-data` — `files[]` + optional `session_id`
- **Response 202**:
```json
{
  "status": "accepted", "session_id": "abc123",
  "accepted_count": 2, "rejected_count": 0,
  "files": [{ "file_id": "...", "filename": "...", "status": "queued", "size_bytes": 12345, ... }],
  "rejected_files": []
}
```

### `GET /api/uploads/{session_id}`
```json
{ "session_id": "abc123", "count": 2, "files": [ /* UploadFileRecord[] */ ] }
```

**`UploadFileRecord` statuses**: `queued | processing | processed | failed`

### `POST /api/chat/stream`
- **Body**: `{ "session_id": "...", "message": "...", "top_k": 5 }`
- **Response**: `text/event-stream`

SSE event types (JSON in `data:` field):

| type | Extra fields | Meaning |
|---|---|---|
| `status` | `value: "retrieving" \| "generating"` | Pipeline phase |
| `sources` | `sources: ChatSource[]` | Retrieved chunks metadata |
| `token` | `token: string` | Streamed LLM token |
| `error` | `message: string` | Error detail |
| `done` | — | Stream complete |

---

## 8. Configuration & Environment Variables

All variables are optional — defaults work for local development except `OPENROUTER_API_KEY`.

| Variable | Default | Description |
|---|---|---|
| `APP_NAME` | `Axion AI Workspace API` | App display name |
| `APP_ENV` | `development` | `development \| staging \| production` |
| `API_VERSION` | `1.0.0` | Reported in `/api/status` |
| `LOG_LEVEL` | `INFO` | Python logging level |
| `REQUEST_TIMEOUT_SECONDS` | `30` | Global request timeout |
| `FRONTEND_ORIGIN` | `http://localhost:3000` | Used in OpenRouter HTTP-Referer header |
| `CORS_ALLOW_ORIGINS` | `http://localhost:3000` | Comma-separated list |
| `RAG_CHUNK_SIZE_TOKENS` | `650` | Tokens per chunk (clamped 500–800) |
| `RAG_CHUNK_OVERLAP_TOKENS` | `100` | Overlap between chunks (clamped 50–200) |
| `RAG_EMBEDDING_MODEL` | `sentence-transformers/all-MiniLM-L6-v2` | HuggingFace model ID |
| `RAG_RERANKER_MODEL` | `cross-encoder/ms-marco-MiniLM-L-6-v2` | CrossEncoder model ID |
| `RAG_RETRIEVAL_TOP_K` | `5` | Final results returned (clamped 1–12) |
| `RAG_VECTOR_CANDIDATES` | `14` | FAISS candidates before merge |
| `RAG_KEYWORD_CANDIDATES` | `14` | BM25 candidates before merge |
| `OPENROUTER_API_KEY` | *(empty)* | **Required for LLM responses** |
| `OPENROUTER_MODEL` | `openai/gpt-4o-mini` | Any OpenRouter model slug |
| `OPENROUTER_BASE_URL` | `https://openrouter.ai/api/v1` | OpenRouter endpoint |
| `NEXT_PUBLIC_API_BASE_URL` | `http://localhost:8000` | Frontend → backend URL |

---

## 9. Local Development Setup

### Backend

```bash
cd backend

# Create and activate virtual environment
python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # macOS/Linux

pip install -r requirements.txt

# Set your OpenRouter key (optional — fallback message shown if missing)
$env:OPENROUTER_API_KEY = "sk-or-..."   # PowerShell
# export OPENROUTER_API_KEY="sk-or-..." # bash

python main.py
# Runs on http://localhost:8000
# Interactive docs: http://localhost:8000/docs
```

### Frontend

```bash
cd frontend
npm install
npm run dev
# Runs on http://localhost:3000
```

### Environment File (optional)

Create `frontend/.env.local`:
```
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

---

## 10. Known Limitations & Future Feature Hooks

### Persistence
- **Now**: All data is in-memory (`IngestionStore`, `RagService._session_indices`). Restart = data loss.
- **Hook**: Replace `IngestionStore` with a repository pattern backed by SQLite or Postgres. Persist embeddings to a vector store (pgvector, ChromaDB, Qdrant). The `_build_index` signature mechanism is already designed for cache invalidation.

### Session Management
- **Now**: Sessions are static constants in `WorkspaceShell.tsx` (`SESSIONS` array). The backend treats `session_id` as an opaque string.
- **Hook**: Add `POST /api/sessions` and `GET /api/sessions` routes. Store sessions in DB. The frontend session selector is already wired to `activeSessionId` state.

### Authentication & Multi-tenancy
- **Now**: No auth. All sessions are globally visible.
- **Hook**: Add a FastAPI auth dependency (JWT or API key). Scope `IngestionStore` and `RagService` lookups by `user_id`.

### Document Focus Panel
- **Now**: The right sidebar "Document Focus" section is a placeholder (`"Context panel is staged for references, citations, and chunk previews."`).
- **Hook**: On document select, fetch chunk previews from a new `GET /api/documents/{file_id}/chunks` endpoint and render them.

### File Management
- **Now**: No delete, no re-upload, no size limit.
- **Hook**: Add `DELETE /upload/{file_id}` route. Guard uploads with a `Content-Length` check. Invalidate RAG index signature on delete.

### Streaming Abort
- **Now**: The frontend has no cancel button for in-flight streams.
- **Hook**: Thread an `AbortController` signal into `streamChatResponse()`. The backend `stream_chat` generator will naturally exit on client disconnect.

### Model Selection UI
- **Now**: Model is set server-side via `OPENROUTER_MODEL` env var.
- **Hook**: Add a model picker to the right sidebar. Pass `model` in the `ChatStreamRequest` body. Override `self._settings.openrouter_model` per-request.

### Chat History Persistence
- **Now**: Messages live in React state; cleared on page refresh or session switch.
- **Hook**: Store `ChatMessage[]` per session in a DB table. Add `GET /api/sessions/{session_id}/messages` endpoint.

### Capabilities Field
- **Now**: `system_service.py` returns a static `capabilities` list.
- **Hook**: Compute dynamically — e.g. include `"rag-ready"` only if at least one session has processed files.
