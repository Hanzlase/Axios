from __future__ import annotations

from functools import lru_cache
import os

from dotenv import load_dotenv
from pydantic import BaseModel
from pydantic import field_validator


load_dotenv()

class Settings(BaseModel):
    app_name: str = "Axion AI Workspace API"
    env: str = "development"  # development|staging|production
    api_version: str = "1.0.0"
    log_level: str = "INFO"
    request_timeout_seconds: int = 30

    # Frontend + CORS
    frontend_origin: str = "http://localhost:3000"
    cors_allow_origins: list[str] = ["http://localhost:3000"]

    # RAG
    rag_chunk_size_tokens: int = 650
    rag_chunk_overlap_tokens: int = 100
    rag_embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2"
    rag_reranker_model: str = "cross-encoder/ms-marco-MiniLM-L-6-v2"
    rag_retrieval_top_k: int = 5
    rag_vector_candidates: int = 14
    rag_keyword_candidates: int = 14

    # OpenRouter
    openrouter_api_key: str = ""
    openrouter_model: str = "nvidia/nemotron-3-super-120b-a12b:free"
    openrouter_base_url: str = "https://openrouter.ai/api/v1"
    openrouter_site_url: str = "http://localhost:3000"
    openrouter_site_name: str = "Axion Workspace"

    # Cohere (fallback)
    cohere_api_key: str = ""
    # Fast + good default for chat. Adjust via COHERE_MODEL.
    cohere_model: str = "command-r"
    cohere_base_url: str = "https://api.cohere.com/v2"

    # Preferred LLM provider order for streaming chat.
    # Supported: openrouter, cohere
    llm_fallback_order: list[str] = ["openrouter", "cohere"]

    @field_validator("cors_allow_origins", mode="before")
    @classmethod
    def parse_origins(cls, value: str | list[str]) -> list[str]:
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value

    @field_validator("llm_fallback_order", mode="before")
    @classmethod
    def parse_llm_fallback_order(cls, value: str | list[str]) -> list[str]:
        if isinstance(value, str):
            return [item.strip() for item in value.split(",") if item.strip()]
        return value

    @field_validator("log_level", mode="before")
    @classmethod
    def normalize_log_level(cls, value: str) -> str:
        return value.upper()

    @field_validator("rag_chunk_size_tokens", mode="after")
    @classmethod
    def validate_chunk_size(cls, value: int) -> int:
        return min(max(value, 500), 800)

    @field_validator("rag_chunk_overlap_tokens", mode="after")
    @classmethod
    def validate_chunk_overlap(cls, value: int) -> int:
        return min(max(value, 50), 200)

    @field_validator("rag_retrieval_top_k", mode="after")
    @classmethod
    def validate_top_k(cls, value: int) -> int:
        return min(max(value, 1), 12)

    @classmethod
    def from_env(cls) -> "Settings":
        return cls(
            app_name=os.getenv("APP_NAME", cls.model_fields["app_name"].default),
            env=os.getenv("APP_ENV", cls.model_fields["env"].default),
            api_version=os.getenv(
                "API_VERSION",
                cls.model_fields["api_version"].default,
            ),
            log_level=os.getenv("LOG_LEVEL", cls.model_fields["log_level"].default),
            request_timeout_seconds=int(
                os.getenv(
                    "REQUEST_TIMEOUT_SECONDS",
                    str(cls.model_fields["request_timeout_seconds"].default),
                )
            ),
            frontend_origin=os.getenv(
                "FRONTEND_ORIGIN",
                cls.model_fields["frontend_origin"].default,
            ),
            cors_allow_origins=os.getenv(
                "CORS_ALLOW_ORIGINS",
                ",".join(cls.model_fields["cors_allow_origins"].default),
            ),
            rag_chunk_size_tokens=int(
                os.getenv(
                    "RAG_CHUNK_SIZE_TOKENS",
                    str(cls.model_fields["rag_chunk_size_tokens"].default),
                )
            ),
            rag_chunk_overlap_tokens=int(
                os.getenv(
                    "RAG_CHUNK_OVERLAP_TOKENS",
                    str(cls.model_fields["rag_chunk_overlap_tokens"].default),
                )
            ),
            rag_embedding_model=os.getenv(
                "RAG_EMBEDDING_MODEL",
                cls.model_fields["rag_embedding_model"].default,
            ),
            rag_reranker_model=os.getenv(
                "RAG_RERANKER_MODEL",
                cls.model_fields["rag_reranker_model"].default,
            ),
            rag_retrieval_top_k=int(
                os.getenv(
                    "RAG_RETRIEVAL_TOP_K",
                    str(cls.model_fields["rag_retrieval_top_k"].default),
                )
            ),
            rag_vector_candidates=int(
                os.getenv(
                    "RAG_VECTOR_CANDIDATES",
                    str(cls.model_fields["rag_vector_candidates"].default),
                )
            ),
            rag_keyword_candidates=int(
                os.getenv(
                    "RAG_KEYWORD_CANDIDATES",
                    str(cls.model_fields["rag_keyword_candidates"].default),
                )
            ),
            openrouter_api_key=os.getenv(
                "OPENROUTER_API_KEY",
                cls.model_fields["openrouter_api_key"].default,
            ),
            openrouter_model=os.getenv(
                "OPENROUTER_MODEL",
                cls.model_fields["openrouter_model"].default,
            ),
            openrouter_base_url=os.getenv(
                "OPENROUTER_BASE_URL",
                cls.model_fields["openrouter_base_url"].default,
            ),
            openrouter_site_url=os.getenv(
                "OPENROUTER_SITE_URL",
                cls.model_fields["openrouter_site_url"].default,
            ),
            openrouter_site_name=os.getenv(
                "OPENROUTER_SITE_NAME",
                cls.model_fields["openrouter_site_name"].default,
            ),
            cohere_api_key=os.getenv(
                "COHERE_API_KEY",
                cls.model_fields["cohere_api_key"].default,
            ),
            cohere_model=os.getenv(
                "COHERE_MODEL",
                cls.model_fields["cohere_model"].default,
            ),
            cohere_base_url=os.getenv(
                "COHERE_BASE_URL",
                cls.model_fields["cohere_base_url"].default,
            ),
            llm_fallback_order=os.getenv(
                "LLM_FALLBACK_ORDER",
                ",".join(cls.model_fields["llm_fallback_order"].default),
            ),
        )


@lru_cache
def get_settings() -> Settings:
    return Settings.from_env()
