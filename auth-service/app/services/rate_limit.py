"""In-memory + Redis rate limits for auth endpoints (gateway-compatible)."""

from fastapi import HTTPException, Request, status

from app.redis_client import get_redis


async def _hit(key: str, limit: int, window_seconds: int) -> None:
    redis = get_redis()
    count = await redis.incr(key)
    if count == 1:
        await redis.expire(key, window_seconds)
    if count > limit:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many requests. Please try again later.",
        )


def client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client:
        return request.client.host
    return "unknown"


async def limit_login(phone: str) -> None:
    await _hit(f"auth:rl:login:{phone}", limit=50, window_seconds=60)


async def limit_otp(phone: str) -> None:
    await _hit(f"auth:rl:otp:{phone}", limit=5, window_seconds=60)


async def limit_signup(request: Request, phone: str) -> None:
    ip = client_ip(request)
    await _hit(f"auth:rl:signup:ip:{ip}", limit=10, window_seconds=3600)
    await _hit(f"auth:rl:signup:phone:{phone}", limit=3, window_seconds=3600)
