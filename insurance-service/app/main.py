from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import ORJSONResponse

from app.api.router import api_router
from app.config import get_settings
from app.db import connect_db, disconnect_db
from app.middleware.security_headers import SecurityHeadersMiddleware
from app.redis_client import connect_redis, disconnect_redis
from app.services.insurance import insurance_service


@asynccontextmanager
async def lifespan(_app: FastAPI):
    settings = get_settings()
    settings.enforce_production_guards()
    await connect_db()
    await connect_redis()
    await insurance_service.seed_defaults()
    yield
    await disconnect_redis()
    await disconnect_db()


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title=f"{settings.hospital_name} — Insurance",
        version="1.0.0",
        default_response_class=ORJSONResponse,
        lifespan=lifespan,
        docs_url="/docs" if not settings.is_production else None,
        redoc_url=None,
        openapi_url="/openapi.json" if not settings.is_production else None,
    )

    app.add_middleware(SecurityHeadersMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "X-Request-Id", "X-User-Id"],
    )

    @app.get("/health")
    async def health():
        return {
            "status": "ok",
            "service": settings.app_name,
            "hospital": settings.hospital_name,
            "hospital_en": "Shomal Hospital",
            "port": settings.port,
        }

    app.include_router(api_router)
    return app


app = create_app()
