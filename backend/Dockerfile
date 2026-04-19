# =============================================================================
# Stage 1 — builder
# Install all Python dependencies into an isolated virtual environment.
# Build tools (gcc, g++, etc.) are only present in this stage and are never
# carried into the final image.
# =============================================================================
FROM python:3.13-slim AS builder

WORKDIR /app

# Install OS-level build dependencies required by native extensions
# (faiss-cpu, sentence-transformers, and their transitive deps).
RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential \
        gcc \
        g++ \
    && rm -rf /var/lib/apt/lists/*

# Create a virtual environment so we can copy it cleanly to the runtime stage.
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Upgrade pip once, then install all dependencies.
# --no-cache-dir keeps the layer lean; the pip cache is discarded with the
# builder stage anyway.
COPY requirements.txt .
RUN pip install --upgrade pip --no-cache-dir \
    && pip install --no-cache-dir -r requirements.txt

# =============================================================================
# Stage 2 — runtime
# Minimal image that contains only what is needed to run the application.
# No build tools, no pip cache, no compiler artefacts.
# =============================================================================
FROM python:3.13-slim AS runtime

WORKDIR /app

# Install only the shared libraries that native extensions link against at
# runtime (OpenBLAS / LAPACK used by faiss / numpy).
RUN apt-get update && apt-get install -y --no-install-recommends \
        libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Copy the fully-built virtual environment from the builder stage.
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Copy application source code.
COPY . .

# Expose the default port (Railway / other platforms override via $PORT).
EXPOSE 8000

# Run gunicorn with uvicorn workers — mirrors the Procfile exactly.
CMD ["sh", "-c", "gunicorn -k uvicorn.workers.UvicornWorker core.main:app --bind 0.0.0.0:${PORT:-8000} --workers 1 --threads 8 --timeout 120"]
