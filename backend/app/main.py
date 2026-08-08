import logging
import time
from contextlib import asynccontextmanager
from datetime import datetime, timezone

import socketio
from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.config import get_settings
from app.database import Base, engine, ping_db
from app.init_db import ensure_enums
from app.middleware import RateLimitMiddleware, RequestTimeoutMiddleware, SecurityHeadersMiddleware
from app.realtime import sio
from app.routers import auth, staff_auth, staff_tickets, tickets

settings = get_settings()
log = logging.getLogger("hospital.api")


def _bootstrap_db(retries: int = 30, delay: float = 1.0) -> bool:
    """Bring schema up; retry instead of dying on a brief DB blip."""
    last: Exception | None = None
    for attempt in range(1, retries + 1):
        try:
            ensure_enums()
            from app import models  # noqa: F401

            Base.metadata.create_all(bind=engine)
            if attempt > 1:
                log.info("database ready after %s attempts", attempt)
            return True
        except Exception as exc:  # noqa: BLE001 — boot must never crash the process
            last = exc
            log.warning("database bootstrap attempt %s/%s failed: %s", attempt, retries, exc)
            time.sleep(delay)
    log.error("database bootstrap failed after %s attempts: %s", retries, last)
    return False


@asynccontextmanager
async def lifespan(_: FastAPI):
    _bootstrap_db()
    yield


app = FastAPI(
    title="Hospital Tickets",
    version="2.2.0",
    lifespan=lifespan,
    redirect_slashes=False,
)

app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RequestTimeoutMiddleware)
app.add_middleware(RateLimitMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    max_age=600,
)


def _err(detail) -> dict:
    return detail if isinstance(detail, dict) else {"error": str(detail)}


@app.exception_handler(HTTPException)
async def on_http_error(_: Request, exc: HTTPException):
    return JSONResponse(status_code=exc.status_code, content=_err(exc.detail))


@app.exception_handler(StarletteHTTPException)
async def on_starlette_error(_: Request, exc: StarletteHTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content=_err(exc.detail or "مسیر یافت نشد"),
    )


@app.exception_handler(RequestValidationError)
async def on_validation(_: Request, exc: RequestValidationError):
    msgs: list[str] = []
    for err in exc.errors():
        loc = ".".join(str(x) for x in err.get("loc", []) if x != "body")
        msg = err.get("msg", "نامعتبر")
        msgs.append(f"{loc}: {msg}" if loc else msg)
    detail = msgs[0] if len(msgs) == 1 else "؛ ".join(msgs[:3]) if msgs else "اطلاعات نامعتبر"
    return JSONResponse(status_code=400, content={"error": detail})


@app.exception_handler(Exception)
async def on_unexpected(_: Request, exc: Exception):
    log.exception("unhandled error: %s", exc)
    return JSONResponse(status_code=500, content={"error": "خطای داخلی سرور"})


@app.get("/api/health")
def health():
    db_ok = ping_db()
    return {
        "status": "ok" if db_ok else "degraded",
        "db": db_ok,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


app.include_router(auth.router)
app.include_router(staff_auth.router)
app.include_router(tickets.router)
app.include_router(staff_tickets.router)

socket_app = socketio.ASGIApp(sio, other_asgi_app=app)
