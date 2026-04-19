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
