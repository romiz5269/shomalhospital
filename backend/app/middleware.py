import asyncio
import time
from collections import defaultdict, deque

from fastapi import Request
from starlette.datastructures import MutableHeaders
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response
from starlette.types import ASGIApp, Receive, Scope, Send

from app.config import get_settings

_cfg = get_settings()


class SecurityHeadersMiddleware:
    def __init__(self, app: ASGIApp):
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        async def send_with_headers(message):
            if message["type"] == "http.response.start":
                headers = MutableHeaders(scope=message)
                headers.setdefault("x-content-type-options", "nosniff")
                headers.setdefault("x-frame-options", "DENY")
                headers.setdefault("referrer-policy", "no-referrer")
                headers.setdefault("cache-control", "no-store")
            await send(message)

        await self.app(scope, receive, send_with_headers)


class RequestTimeoutMiddleware(BaseHTTPMiddleware):
    """Fail loud instead of letting a stuck handler pin the worker forever."""

    def __init__(self, app, timeout: float | None = None):
        super().__init__(app)
        self.timeout = timeout or float(_cfg.request_timeout_sec)

    async def dispatch(self, request: Request, call_next):
        try:
            return await asyncio.wait_for(call_next(request), timeout=self.timeout)
        except asyncio.TimeoutError:
            return Response(
                content='{"error":"درخواست طولانی شد. دوباره تلاش کنید."}',
                status_code=504,
                media_type="application/json",
            )


class RateLimitMiddleware:
    def __init__(self, app: ASGIApp):
        self.app = app
        self._hits: dict[str, deque[float]] = defaultdict(deque)
        self._redis = None
        if _cfg.redis_url:
            try:
                import redis

                self._redis = redis.Redis.from_url(
                    _cfg.redis_url,
                    decode_responses=True,
                    socket_connect_timeout=1,
                    socket_timeout=1,
                )
                self._redis.ping()
            except Exception:
                self._redis = None

    def _client_ip(self, scope: Scope) -> str:
        headers = {k.decode().lower(): v.decode() for k, v in scope.get("headers", [])}
        forwarded = headers.get("x-forwarded-for")
        if forwarded:
            return forwarded.split(",")[0].strip()
        client = scope.get("client")
        return client[0] if client else "unknown"

    def _limit_for(self, path: str) -> int:
        if path.startswith("/api/auth/") or path.startswith("/api/staff-auth/"):
            return _cfg.auth_rate_limit_per_min
        return _cfg.rate_limit_per_min

    def _allow_memory(self, key: str, limit: int) -> bool:
        now = time.time()
        window = self._hits[key]
        while window and now - window[0] > 60:
            window.popleft()
        if len(window) >= limit:
            return False
        window.append(now)
        return True

    def _allow_redis(self, key: str, limit: int) -> bool:
        assert self._redis is not None
        pipe = self._redis.pipeline()
        pipe.incr(key)
        pipe.expire(key, 60)
        count, _ = pipe.execute()
        return int(count) <= limit

    async def __call__(self, scope: Scope, receive: Receive, send: Send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        path = scope.get("path", "")
        method = scope.get("method", "GET")
        if path in {"/api/health", "/docs", "/openapi.json", "/redoc"} or method == "OPTIONS":
            await self.app(scope, receive, send)
            return

        ip = self._client_ip(scope)
        limit = self._limit_for(path)
        segment = path.split("/")[2] if path.startswith("/api/") and len(path.split("/")) > 2 else "x"
        bucket = f"rl:{ip}:{segment}"

        try:
            ok = self._allow_redis(bucket, limit) if self._redis else self._allow_memory(bucket, limit)
        except Exception:
            ok = self._allow_memory(bucket, limit)

        if not ok:
            body = '{"error":"تعداد درخواست‌ها زیاد است. کمی صبر کنید."}'.encode("utf-8")
            await send(
                {
                    "type": "http.response.start",
                    "status": 429,
                    "headers": [
                        (b"content-type", b"application/json; charset=utf-8"),
                        (b"content-length", str(len(body)).encode()),
                    ],
                }
            )
            await send({"type": "http.response.body", "body": body})
            return

        await self.app(scope, receive, send)
