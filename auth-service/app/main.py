from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import ORJSONResponse
from fastapi.staticfiles import StaticFiles

from app.api.router import api_router
from app.config import get_settings
from app.db import connect_db, db, disconnect_db
from app.middleware.security_headers import SecurityHeadersMiddleware
from app.redis_client import connect_redis, disconnect_redis
from app.services.rbac import rbac_service


async def _cleanup_expired_otp() -> None:
    now = datetime.now(timezone.utc)
    await db.otpchallenge.delete_many(where={"expiresAt": {"lt": now}})


@asynccontextmanager
async def lifespan(_app: FastAPI):
    settings = get_settings()
    settings.enforce_production_guards()
    Path(settings.upload_dir).mkdir(parents=True, exist_ok=True)
    Path("static").mkdir(exist_ok=True)
    await connect_db()
    await connect_redis()
    await rbac_service.seed_defaults()
    await _cleanup_expired_otp()
    if settings.is_production and not settings.sms_api_key:
        import logging

        logging.getLogger("uvicorn.error").warning(
            "PRODUCTION: SMS_API_KEY empty — OTP will not reach phones until configured"
        )
    yield
    await disconnect_redis()
    await disconnect_db()


def create_app() -> FastAPI:
    settings = get_settings()
    Path("static").mkdir(exist_ok=True)
    Path(settings.upload_dir).mkdir(parents=True, exist_ok=True)

    app = FastAPI(
        title=settings.app_name,
        version="1.2.0",
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
        allow_headers=["Authorization", "Content-Type", "X-Request-Id"],
    )

    @app.get("/health")
    async def health():
        return {"status": "ok", "service": settings.app_name}

    app.mount("/static", StaticFiles(directory="static"), name="static")
    app.mount("/uploads", StaticFiles(directory=settings.upload_dir), name="uploads")
    app.include_router(api_router)
    return app


app = create_app()
