#!/usr/bin/env sh
set -eu

# Single-service mode:
# - Backend listens on 8000 (internal)
# - Frontend listens on $PORT (public)

: "${PORT:=3000}"
: "${BACKEND_PORT:=8000}"

# Ensure frontend calls backend via internal URL
# (Next.js expects this at build-time for client env vars; but we can also set it at runtime for server actions.
# The frontend code uses NEXT_PUBLIC_API_BASE_URL; for single-container, keep it pointing at the backend internal port.)
export NEXT_PUBLIC_API_BASE_URL="${NEXT_PUBLIC_API_BASE_URL:-http://127.0.0.1:${BACKEND_PORT}}"

# Start backend
cd /app/backend
export PORT="${BACKEND_PORT}"
python -m uvicorn core.main:app --host 0.0.0.0 --port "${BACKEND_PORT}" &

# Start frontend (Next.js standalone)
cd /app/frontend/.next/standalone
# Standalone server serves /public and /.next/static from these paths:
export NODE_ENV=production
# Ensure the standalone server can find static assets
export PORT="${PORT}"
# Some Next runtime checks honor HOSTNAME
export HOSTNAME="0.0.0.0"

node server.js
