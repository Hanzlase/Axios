# Root Dockerfile: runs both backend (FastAPI) and frontend (Next.js) in a single Railway service
# This is not the recommended production setup, but matches the "single service" requirement.

###########
# Frontend build
###########
FROM node:20-bookworm-slim AS frontend-builder
WORKDIR /app/frontend

# Install deps
COPY frontend/package*.json ./
RUN npm ci

# Build
COPY frontend ./
RUN npm run build


###########
# Backend build
###########
FROM python:3.10-slim AS backend-builder
WORKDIR /app/backend

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY backend ./


###########
# Runtime
###########
FROM python:3.10-slim AS runtime
WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# OS deps needed by node runtime + curl for healthchecks
RUN apt-get update \
  && apt-get install -y --no-install-recommends nodejs npm curl \
  && rm -rf /var/lib/apt/lists/*

# Backend deps
COPY backend/requirements.txt /app/backend/requirements.txt
RUN pip install --no-cache-dir -r /app/backend/requirements.txt

# Backend code
COPY --from=backend-builder /app/backend /app/backend

# Frontend standalone output
# Next.js standalone output is produced under .next/standalone and includes its own server.js + node_modules subset
COPY --from=frontend-builder /app/frontend/public /app/frontend/public
COPY --from=frontend-builder /app/frontend/.next/standalone /app/frontend/.next/standalone
COPY --from=frontend-builder /app/frontend/.next/static /app/frontend/.next/static

# Startup script
COPY railway-start.sh /app/railway-start.sh
RUN chmod +x /app/railway-start.sh

# Railway provides $PORT for the public service port. We'll bind Next.js to $PORT.
EXPOSE 8080

CMD ["/app/railway-start.sh"]
