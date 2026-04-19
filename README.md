# <img alt="Axion" width="30" height="30" src="https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/sparkles.svg" /> AXION

<p align="center"><strong>Transform Documents Into Structured Outputs</strong></p>

<p align="center">
  <a href="#quickstart">Quickstart</a>
  &nbsp;•&nbsp;
  <a href="#features">Features</a>
  &nbsp;•&nbsp;
  <a href="#architecture">Architecture</a>
  &nbsp;•&nbsp;
  <a href="#configuration">Configuration</a>
  &nbsp;•&nbsp;
  <a href="#api">API</a>
  &nbsp;•&nbsp;
  <a href="#deploy-railway">Deploy (Railway)</a>
</p>

<p align="center">
  <a href="#live-demo"><img alt="Live Demo" src="https://img.shields.io/badge/LIVE%20DEMO-Coming%20Soon-111827?style=for-the-badge" /></a>
  <a href="/workspace"><img alt="Open Workspace" src="https://img.shields.io/badge/WORKSPACE-/workspace-0ea5e9?style=for-the-badge" /></a>
  <a href="#"><img alt="Status" src="https://img.shields.io/badge/STATUS-Active-16a34a?style=for-the-badge" /></a>
  <a href="./LICENSE"><img alt="License" src="https://img.shields.io/badge/LICENSE-Project-6b7280?style=for-the-badge" /></a>
</p>

<p align="center">
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-App%20Router-000000?style=flat-square" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.x-3178c6?style=flat-square" />
  <img alt="FastAPI" src="https://img.shields.io/badge/FastAPI-SSE-05998b?style=flat-square" />
  <img alt="Python" src="https://img.shields.io/badge/Python-3.10+-3776ab?style=flat-square" />
</p>

<hr />

## <img alt="What" width="18" height="18" src="https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/target.svg" /> What is Axion?

Axion is a local-first RAG workspace (Retrieval-Augmented Generation): upload documents, retrieve evidence from your session, and generate structured outputs such as **explanations**, **quizzes**, **flashcards**, and **study plans**.

<hr />

## <img alt="Features" width="18" height="18" src="https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/sparkle.svg" /> Features

<ul>
  <li><strong>Grounded answers:</strong> hybrid retrieval (vector + BM25) with reranking.</li>
  <li><strong>Structured modes:</strong> chat, explain, quiz, flashcards, plan (auto-routed).</li>
  <li><strong>Citations:</strong> sources returned alongside generation.</li>
  <li><strong>Streaming UX:</strong> SSE token streaming to the UI.</li>
  <li><strong>Local-first:</strong> session-scoped document context.</li>
</ul>

<hr />

## <img alt="Quickstart" width="18" height="18" src="https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/rocket.svg" /> Quickstart

### Prerequisites

<ul>
  <li><strong>Node.js</strong> 18+</li>
  <li><strong>Python</strong> 3.10+</li>
</ul>

### Backend (FastAPI)

```powershell
cd "backend"
python -m pip install -r requirements.txt
python main.py
```

<ul>
  <li>API: <code>http://localhost:8000</code></li>
  <li>Docs: <code>http://localhost:8000/docs</code></li>
</ul>

### Frontend (Next.js)

```powershell
cd "frontend"
npm install
npm run dev
```

<ul>
  <li>Web: <code>http://localhost:3000</code></li>
</ul>

<hr />

## <img alt="Build" width="18" height="18" src="https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/hammer.svg" /> Build

### Frontend

```powershell
cd "frontend"
npm run build
```

### Backend (compile check)

```powershell
cd "backend"
python -m py_compile main.py
```

<hr />

## <img alt="Deploy" width="18" height="18" src="https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/cloud.svg" /> Deploy (Railway)

This repo is set up to deploy as <strong>two Railway services</strong> in one Railway project:

<ul>
  <li><strong>backend</strong> (FastAPI) — root directory: <code>backend</code></li>
  <li><strong>frontend</strong> (Next.js) — root directory: <code>frontend</code></li>
</ul>

### Option A (recommended): two services

#### 1) Deploy backend service

<ul>
  <li>Create a Railway project → <strong>New Service</strong> → <strong>GitHub Repo</strong></li>
  <li>Set the service <strong>Root Directory</strong> to <code>backend</code></li>
  <li>Railway will start via <code>backend/Procfile</code> and bind to <code>$PORT</code></li>
</ul>

Backend variables (Railway → Variables):
<ul>
  <li><code>APP_ENV=production</code></li>
  <li><code>LOG_LEVEL=INFO</code></li>
  <li><code>OPENROUTER_API_KEY</code> (optional)</li>
  <li><code>COHERE_API_KEY</code> (optional)</li>
  <li><code>CORS_ALLOW_ORIGINS</code> (set after frontend deploy)</li>
</ul>

#### 2) Deploy frontend service

<ul>
  <li>Create a second Railway service from the same repo</li>
  <li>Set the service <strong>Root Directory</strong> to <code>frontend</code></li>
  <li>The frontend uses a Docker build (see <code>frontend/Dockerfile</code>)</li>
</ul>

Frontend variables:
<ul>
  <li><code>NEXT_PUBLIC_API_BASE_URL</code> = your backend public URL (example: <code>https://YOUR-BACKEND.up.railway.app</code>)</li>
</ul>

#### 3) Final CORS wiring

After the frontend is deployed, copy its public URL and set:
<ul>
  <li><code>FRONTEND_ORIGIN</code></li>
  <li><code>CORS_ALLOW_ORIGINS</code></li>
</ul>

to the frontend URL (example: <code>https://YOUR-FRONTEND.up.railway.app</code>) in the backend service.

### Option B: single service (frontend + backend in one container)

This repo also supports running **both** the FastAPI backend and the Next.js frontend inside **one Railway service**.

**How it works**

- The container starts the backend on `127.0.0.1:8000`.
- The container starts the Next.js server on Railway’s public `$PORT`.
- The frontend calls the backend using `NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000` (defaulted automatically by the container).

**Railway setup**

1. Create **one** Railway service from the repo.
2. In the service settings, ensure it builds with the repo root `Dockerfile`.
3. Set variables:
   - `OPENROUTER_API_KEY` (optional if using Cohere fallback)
   - `COHERE_API_KEY`
   - `CORS_ALLOW_ORIGINS` (set to your Railway public URL, e.g. `https://<your-app>.up.railway.app`)
   - `FRONTEND_ORIGIN` (same as above)

Notes:
- Single-service deployments are simpler, but you lose independent scaling and deploys.

<hr />

## <img alt="Architecture" width="18" height="18" src="https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/workflow.svg" /> Architecture

```text
Browser (Next.js)
  └─ SSE stream consumer
      └─ FastAPI backend
          ├─ /upload (ingestion)
          ├─ RAG retrieve (FAISS + BM25 + rerank)
          └─ /api/*/stream (generation)
```

<hr />

## <img alt="Configuration" width="18" height="18" src="https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/settings.svg" /> Configuration

Create <code>backend/.env</code> to override defaults.

<table>
  <thead>
    <tr>
      <th align="left">Variable</th>
      <th align="left">Description</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><code>OPENROUTER_API_KEY</code></td>
      <td>Primary LLM key (OpenAI-compatible).</td>
    </tr>
    <tr>
      <td><code>COHERE_API_KEY</code></td>
      <td>Fallback LLM key (used when the primary provider is limited/unavailable).</td>
    </tr>
    <tr>
      <td><code>ALLOW_ORIGINS</code></td>
      <td>CORS allow-list (comma-separated). Include <code>http://localhost:3000</code> for local dev.</td>
    </tr>
    <tr>
      <td><code>LOG_LEVEL</code></td>
      <td>Backend log level (example: <code>INFO</code>).</td>
    </tr>
  </tbody>
</table>

<hr />

## <img alt="API" width="18" height="18" src="https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/network.svg" /> API

<ul>
  <li><code>POST /upload</code>: upload session documents.</li>
  <li><code>GET /api/uploads/{session_id}</code>: list session files + status.</li>
  <li><code>POST /api/chat/stream</code>: SSE stream for chat.</li>
  <li><code>POST /api/agent/stream</code>: SSE stream for agent modes.</li>
  <li><code>GET /health</code>: liveness check.</li>
</ul>

<hr />

## <img alt="License" width="18" height="18" src="https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/scale.svg" /> License

See <code>LICENSE</code> (if provided).
