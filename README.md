# Axion

<p align="left">
  <span style="display:inline-flex;align-items:center;gap:8px;">
    <img alt="Axion" width="22" height="22" src="https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/sparkles.svg" />
    <strong>AI Workspace</strong>
  </span>
</p>

<p>
  <strong>Axion</strong> is a local-first RAG workspace (Retrieval-Augmented Generation): upload documents, build session-scoped context, and generate structured outputs (chat, explain, quiz, flashcards, plan) with citations.
</p>

<hr />

## <img alt="Overview" width="18" height="18" src="https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/layout-grid.svg" /> Overview

<ul>
  <li><strong>Frontend:</strong> Next.js (App Router) + TypeScript</li>
  <li><strong>Backend:</strong> FastAPI + SSE streaming</li>
  <li><strong>RAG:</strong> SentenceTransformers embeddings + FAISS + BM25 + reranking</li>
  <li><strong>LLM:</strong> Provider fallback (stream-first, with a non-stream guarantee path)</li>
</ul>

<hr />

## <img alt="Repository" width="18" height="18" src="https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/folder-tree.svg" /> Repository layout

```text
Axion/
  backend/                  FastAPI services and agents
  frontend/                 Next.js UI
  README.md
```

<hr />

## <img alt="Quickstart" width="18" height="18" src="https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/rocket.svg" /> Quickstart

### Prerequisites

<ul>
  <li><strong>Node.js</strong> 18+</li>
  <li><strong>Python</strong> 3.10+</li>
</ul>

### 1) Backend (FastAPI)

```powershell
cd "backend"
python -m pip install -r requirements.txt
python main.py
```

Backend default:
<ul>
  <li><code>http://localhost:8000</code></li>
  <li>Docs: <code>http://localhost:8000/docs</code></li>
</ul>

### 2) Frontend (Next.js)

```powershell
cd "frontend"
npm install
npm run dev
```

Frontend default:
<ul>
  <li><code>http://localhost:3000</code></li>
</ul>

<hr />

## <img alt="Build" width="18" height="18" src="https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/hammer.svg" /> Build

### Frontend

```powershell
cd "frontend"
npm run build
```

### Backend (sanity compile)

```powershell
cd "backend"
python -m py_compile main.py
```

<hr />

## <img alt="Configuration" width="18" height="18" src="https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/settings.svg" /> Configuration

Create a <code>backend/.env</code> file if you want to override defaults.

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
      <td>Primary LLM provider key (OpenAI-compatible).</td>
    </tr>
    <tr>
      <td><code>COHERE_API_KEY</code></td>
      <td>Fallback provider key (used when primary is unavailable / limited).</td>
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

## <img alt="API" width="18" height="18" src="https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/network.svg" /> API notes

<ul>
  <li><code>POST /upload</code> uploads files into a session.</li>
  <li><code>POST /api/chat/stream</code> streams grounded answers with SSE frames (<code>status</code>, <code>sources</code>, <code>token</code>, <code>done</code>).</li>
  <li><code>POST /api/agent/stream</code> streams agent-mode outputs (<code>auto</code>, <code>chat</code>, <code>explain</code>, <code>quiz</code>, <code>flashcards</code>, <code>plan</code>).</li>
</ul>

<hr />

## <img alt="Troubleshooting" width="18" height="18" src="https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/life-buoy.svg" /> Troubleshooting

<ul>
  <li><strong>No answers:</strong> verify at least one provider key is set (<code>OPENROUTER_API_KEY</code> or <code>COHERE_API_KEY</code>).</li>
  <li><strong>CORS issues:</strong> ensure <code>ALLOW_ORIGINS</code> includes your frontend origin.</li>
  <li><strong>Cold start:</strong> first retrieval can take longer due to model loading (embeddings / reranker).</li>
</ul>

<hr />

## <img alt="License" width="18" height="18" src="https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/scale.svg" /> License

See repository license (if provided).
