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
# Backend runtime (python only)
###########
FROM python:3.10-slim AS backend-runtime
WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Backend deps
COPY backend/requirements.txt /app/backend/requirements.txt
RUN pip install --no-cache-dir -r /app/backend/requirements.txt

# Backend code
COPY --from=backend-builder /app/backend /app/backend


###########
# Final runtime (node only) + embedded backend runtime
# This keeps the final image smaller than installing node into a python base.
###########
FROM node:20-bookworm-slim AS runtime
WORKDIR /app

# Copy python runtime + site-packages from backend-runtime
COPY --from=backend-runtime /usr/local /usr/local
COPY --from=backend-runtime /app/backend /app/backend

# Frontend standalone output
COPY --from=frontend-builder /app/frontend/public /app/frontend/public
COPY --from=frontend-builder /app/frontend/.next/standalone /app/frontend/.next/standalone
COPY --from=frontend-builder /app/frontend/.next/static /app/frontend/.next/static

# Startup script
COPY railway-start.sh /app/railway-start.sh
RUN chmod +x /app/railway-start.sh

EXPOSE 8080
CMD ["/app/railway-start.sh"]
