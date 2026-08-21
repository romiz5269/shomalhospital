from contextlib import asynccontextmanager

from apscheduler.schedulers.background import BackgroundScheduler
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

from app.core.config import get_settings
from app.core.database import engine, Base, SessionLocal, wait_for_db
from app.core.security import get_password_hash
from app.models import User
from app.services.alerts import sync_all_reminders
from app.api import (
    auth,
    departments,
    assets,
    work_cases,
    reminders,
    dashboard,
    reports,
    maintenance_plans,
    search,
    activity,
    pm_visits,
    inventory,
    users,
    attachments,
    system,
    push,
    it_overview,
)
from app.api.auth import limiter
from app.services.pm_checklist import seed_checklist_templates
from app.services.migrate import migrate_schema
from app.services.system_config import list_cors_origins, refresh_cors_cache

settings = get_settings()
scheduler = BackgroundScheduler()


def _scheduled_sync():
    db = SessionLocal()
    try:
        sync_all_reminders(db)
    finally:
        db.close()


def seed_data(db):
    existing_admin = db.query(User).filter(User.role == "admin").first()
    if existing_admin:
        return
    named = db.query(User).filter(User.username == "admin").first()
    if named:
        named.role = "admin"
        named.is_active = True
        db.commit()
        return
    admin = User(
        username="admin",
        email="admin@north-hospital.local",
        full_name="مدیر سیستم",
        hashed_password=get_password_hash("admin123"),
        role="admin",
        is_active=True,
        must_change_password=False,
        allow_passwordless_login=False,
    )
    db.add(admin)
    db.commit()


class DynamicCORSMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if request.url.path in ("/api/health", "/health"):
            return await call_next(request)
        origins = list_cors_origins(settings.cors_origins)
        origin = request.headers.get("origin")
        if request.method == "OPTIONS":
            response = Response(status_code=204)
        else:
            response = await call_next(request)
        if origin and origin in origins:
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Credentials"] = "true"
            response.headers["Access-Control-Allow-Methods"] = "*"
            response.headers["Access-Control-Allow-Headers"] = "*"
        return response


@asynccontextmanager
async def lifespan(app: FastAPI):
    wait_for_db()
    Base.metadata.create_all(bind=engine)
    migrate_schema()
    db = SessionLocal()
    try:
        seed_data(db)
        seed_checklist_templates(db)
        refresh_cors_cache(db)
    finally:
        db.close()
    if not settings.debug:
        import logging
        if settings.secret_key == "change-this-secret-key-in-production" or "change-this" in settings.secret_key.lower():
            logging.warning("PRODUCTION: SECRET_KEY را در .env تغییر دهید!")
    scheduler.add_job(_scheduled_sync, "interval", hours=6, id="sync_reminders", replace_existing=True)
    scheduler.start()
    yield
    scheduler.shutdown()


app = FastAPI(
    title=settings.app_name,
    description="سیستم سرویس سیستم بخش IT بیمارستان شمال",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs" if settings.debug else None,
    redoc_url="/redoc" if settings.debug else None,
    openapi_url="/openapi.json" if settings.debug else None,
)

def _persian_rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=429,
        content={"detail": "تعداد درخواست زیاد است. کمی صبر کنید و دوباره تلاش کنید."},
    )


app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _persian_rate_limit_handler)
app.add_middleware(SlowAPIMiddleware)
app.add_middleware(DynamicCORSMiddleware)

app.include_router(auth.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(departments.router, prefix="/api")
app.include_router(assets.router, prefix="/api")
app.include_router(work_cases.router, prefix="/api")
app.include_router(reminders.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")
app.include_router(reports.router, prefix="/api")
app.include_router(maintenance_plans.router, prefix="/api")
app.include_router(search.router, prefix="/api")
app.include_router(activity.router, prefix="/api")
app.include_router(pm_visits.router, prefix="/api")
app.include_router(inventory.router, prefix="/api")
app.include_router(attachments.router, prefix="/api")
app.include_router(system.router, prefix="/api")
app.include_router(push.router, prefix="/api")
app.include_router(it_overview.router, prefix="/api")


import os as _os
from fastapi.staticfiles import StaticFiles as _StaticFiles
_img_dir = _os.path.join(_os.path.dirname(_os.path.dirname(__file__)), "uploads", "asset_images")
_os.makedirs(_img_dir, exist_ok=True)
app.mount("/uploads/asset_images", _StaticFiles(directory=_img_dir), name="asset_images")


@app.get("/api/health")
async def health():
    return {"status": "ok", "app": settings.app_name}
