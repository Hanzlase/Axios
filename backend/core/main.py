from __future__ import annotations

from uuid import uuid4

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import structlog

from core.config import get_settings
from core.logging import configure_logging
from routes.agent import router as agent_router
from routes.chat import router as chat_router
from routes.export import router as export_router
from routes.health import router as health_router
from routes.session import router as session_router
from routes.status import router as status_router
from routes.upload import router as upload_router
from utils.time_utils import monotonic_ms

logger = structlog.get_logger()


def create_app() -> FastAPI:
    settings = get_settings()
    configure_logging(settings.log_level)

    app = FastAPI(
        title=settings.app_name,
        version=settings.api_version,
        description="Foundation API for Axion AI workspace.",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_allow_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(health_router)
    app.include_router(status_router)
    app.include_router(upload_router)
    app.include_router(chat_router)
    app.include_router(agent_router)
    app.include_router(session_router)
    app.include_router(export_router)

    @app.get("/", tags=["general"])
    async def root():
        return {
            "message": "Axion AI Workspace API",
            "version": settings.api_version,
            "docs": "/docs",
        }

    @app.middleware("http")
    async def request_log_middleware(request: Request, call_next):
        request_id = uuid4().hex
        start_ms = monotonic_ms()

        try:
            response = await call_next(request)
            duration_ms = monotonic_ms() - start_ms
            logger.info(
                "http_request",
                request_id=request_id,
                method=request.method,
                path=request.url.path,
                status_code=response.status_code,
                duration_ms=round(duration_ms, 2),
            )
            response.headers["X-Request-ID"] = request_id
            return response
        except Exception:
            duration_ms = monotonic_ms() - start_ms
            logger.exception(
                "http_request_error",
                request_id=request_id,
                method=request.method,
                path=request.url.path,
                duration_ms=round(duration_ms, 2),
            )
            raise

    @app.on_event("startup")
    async def on_startup() -> None:
        logger.info(
            "app_startup",
            app_name=settings.app_name,
            env=settings.env,
            version=settings.api_version,
        )

    return app


app = create_app()


if __name__ == "__main__":
    uvicorn.run("core.main:app", host="0.0.0.0", port=8000, reload=True)
