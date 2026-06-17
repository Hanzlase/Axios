<div align="center">

<br/>

```
 █████╗ ██╗  ██╗██╗ ██████╗ ███████╗
██╔══██╗╚██╗██╔╝██║██╔═══██╗██╔════╝
███████║ ╚███╔╝ ██║██║   ██║███████╗
██╔══██║ ██╔██╗ ██║██║   ██║╚════██║
██║  ██║██╔╝ ██╗██║╚██████╔╝███████║
╚═╝  ╚═╝╚═╝  ╚═╝╚═╝ ╚═════╝ ╚══════╝
```

### **Transform Documents Into Structured Intelligence**

*Upload. Retrieve. Generate.*

<br/>

[![Live Demo](https://img.shields.io/badge/🌐%20LIVE%20DEMO-axios0.up.railway.app-0f172a?style=for-the-badge&logo=railway&logoColor=white)](https://axios0.up.railway.app/)
[![Status](https://img.shields.io/badge/STATUS-ACTIVE-16a34a?style=for-the-badge)](#)
[![License](https://img.shields.io/badge/LICENSE-Project-6b7280?style=for-the-badge)](./LICENSE)

<br/>

![Next.js](https://img.shields.io/badge/Next.js_15-App_Router-000000?style=flat-square&logo=nextdotjs)
![TypeScript](https://img.shields.io/badge/TypeScript_5.x-3178c6?style=flat-square&logo=typescript&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-SSE_Streaming-05998b?style=flat-square&logo=fastapi&logoColor=white)
![Python](https://img.shields.io/badge/Python_3.10+-3776ab?style=flat-square&logo=python&logoColor=white)

<br/>

---

</div>

## ⚡ What is Axios?

**Axios** is a local-first RAG (Retrieval-Augmented Generation) workspace that turns your raw documents into structured, actionable knowledge — instantly.

Upload any document. Axios retrieves the right evidence using **hybrid search**, then generates precisely what you need: detailed explanations, interactive quizzes, spaced-repetition flashcards, or complete study plans — all grounded in *your* content, not hallucinations.

<br/>

---

## 🚀 Features

| | Feature | Description |
|---|---|---|
| 🔍 | **Hybrid Retrieval** | Vector search + BM25 keyword matching + neural reranking for maximum recall precision |
| 🧠 | **Structured Modes** | Auto-routed generation: `chat`, `explain`, `quiz`, `flashcards`, `plan` |
| 📎 | **Grounded Citations** | Every response ships with source references — no black-box answers |
| ⚡ | **Streaming UX** | Real-time SSE token streaming — output appears as it's generated |
| 🔒 | **Local-First** | Session-scoped document context — your documents never leave your session |
| 🌐 | **Production-Ready** | Railway-deployable, Docker-supported, CORS-configured two-service architecture |

<br/>

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     AXIOS PIPELINE                          │
└─────────────────────────────────────────────────────────────┘

  📄 Document Upload
       │
       ▼
  ┌─────────────┐     ┌──────────────┐     ┌──────────────┐
  │  Ingestion  │────▶│  FAISS Index │     │  BM25 Index  │
  │  + Chunking │     │  (Vectors)   │     │  (Keywords)  │
  └─────────────┘     └──────┬───────┘     └──────┬───────┘
                             │                    │
                             └─────────┬──────────┘
                                       │ Hybrid Retrieve
                                       ▼
                              ┌─────────────────┐
                              │  Neural Rerank  │  (Cohere)
                              └────────┬────────┘
                                       │
                                       ▼
                         ┌─────────────────────────┐
                         │   LLM Generation        │
                         │  (OpenRouter / Cohere)  │
                         └────────────┬────────────┘
                                      │ SSE Stream
                                      ▼
                            ┌─────────────────┐
                            │  Next.js UI     │
                            │  (React + SSE)  │
                            └─────────────────┘
```

<br/>

---

## ⚙️ Quickstart

### Prerequisites

- **Node.js** 18+
- **Python** 3.10+

### 1 — Clone

```bash
git clone https://github.com/Hanzlase/Axios.git
cd axios
```

### 2 — Backend (FastAPI)

```bash
cd backend
pip install -r requirements.txt
python main.py
```

> API live at → `http://localhost:8000`  
> Swagger docs → `http://localhost:8000/docs`

### 3 — Frontend (Next.js)

```bash
cd frontend
npm install
npm run dev
```

> App live at → `http://localhost:3000`

### 4 — Environment

Create `backend/.env`:

```env
OPENROUTER_API_KEY=your_key_here
COHERE_API_KEY=your_key_here
ALLOW_ORIGINS=http://localhost:3000
LOG_LEVEL=INFO
```

<br/>

---

## 🌍 Deploy on Railway

Axios deploys as **two independent Railway services** — backend and frontend — in one Railway project.

```
Railway Project
├── backend-service   (FastAPI)   ← Root: /backend
└── frontend-service  (Next.js)   ← Root: /frontend
```

### Step 1 — Deploy Backend

1. Railway → **New Project** → **Deploy from GitHub**
2. Set Root Directory: `backend`
3. Railway starts the API via `backend/Procfile` on `$PORT`

**Backend environment variables:**

```env
APP_ENV=production
LOG_LEVEL=INFO
OPENROUTER_API_KEY=<your_key>
COHERE_API_KEY=<your_key>
CORS_ALLOW_ORIGINS=<frontend_url>       # Set after frontend deploy
FRONTEND_ORIGIN=<frontend_url>          # Set after frontend deploy
```

Verify deployment:
- `https://<backend>.up.railway.app/health`
- `https://<backend>.up.railway.app/docs`

### Step 2 — Deploy Frontend

1. In the same project → **New Service** → GitHub repo
2. Set Root Directory: `frontend`
3. Builds via `frontend/Dockerfile`

**Frontend environment variables:**

```env
NEXT_PUBLIC_API_BASE_URL=https://<backend>.up.railway.app
```

### Step 3 — Wire CORS

After frontend deploys, copy its public URL and update the **backend** service:

```env
CORS_ALLOW_ORIGINS=https://<frontend>.up.railway.app
FRONTEND_ORIGIN=https://<frontend>.up.railway.app
```

Trigger a backend redeploy. You're live. 🎉

<br/>

---

## 📡 API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/upload` | Upload session documents for ingestion |
| `GET` | `/api/uploads/{session_id}` | List session files and processing status |
| `POST` | `/api/chat/stream` | SSE stream — conversational chat mode |
| `POST` | `/api/agent/stream` | SSE stream — structured agent modes (quiz, explain, flashcards, plan) |
| `GET` | `/health` | Liveness probe |

<br/>

---

## 🔧 Configuration Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENROUTER_API_KEY` | Optional | Primary LLM provider (OpenAI-compatible) |
| `COHERE_API_KEY` | Optional | Fallback LLM + reranking provider |
| `ALLOW_ORIGINS` | Yes (prod) | CORS allowlist (comma-separated URLs) |
| `FRONTEND_ORIGIN` | Yes (prod) | Trusted frontend origin |
| `APP_ENV` | Optional | `development` or `production` |
| `LOG_LEVEL` | Optional | Log verbosity — `DEBUG`, `INFO`, `WARNING` |

<br/>

---

## 🛠️ Build

```bash
# Frontend production build
cd frontend && npm run build

# Backend syntax check
cd backend && python -m py_compile main.py
```

<br/>

---

<div align="center">

**Axios** — Built with FastAPI, Next.js, FAISS, and BM25.  
Deployed on [Railway](https://railway.app) · Live at [axios0.up.railway.app](https://axios0.up.railway.app/)

<br/>

*Built by [Hanzla](https://github.com/Hanzlase)*

</div>
