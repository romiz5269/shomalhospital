"""Shared Redis client — same instance as gateway (blacklist keys)."""

from redis.asyncio import ConnectionPool, Redis

from app.config import get_settings

_pool: ConnectionPool | None = None
_redis: Redis | None = None


async def connect_redis() -> Redis:
    global _pool, _redis
    if _redis is not None:
        return _redis

    settings = get_settings()
    _pool = ConnectionPool(
        host=settings.redis_host,
        port=settings.redis_port,
        db=settings.redis_db,
        password=settings.redis_password or None,
        max_connections=50,
        decode_responses=True,
        socket_connect_timeout=5,
        socket_timeout=5,
        retry_on_timeout=True,
        health_check_interval=30,
    )
    _redis = Redis(connection_pool=_pool)
    await _redis.ping()
    return _redis


async def disconnect_redis() -> None:
    global _pool, _redis
    if _redis is not None:
        await _redis.aclose()
        _redis = None
    if _pool is not None:
        await _pool.disconnect()
        _pool = None


def get_redis() -> Redis:
    if _redis is None:
        raise RuntimeError("Redis is not connected")
    return _redis


async def blacklist_jtis(items: list[dict]) -> None:
    """Write auth:bl:jti:* keys for gateway + other Python services."""
    if not items:
        return
    redis = get_redis()
    pipe = redis.pipeline()
    for item in items:
        jti = item["jti"]
        ttl = max(int(item.get("ttl_seconds", 60)), 60)
        pipe.set(f"auth:bl:jti:{jti}", "1", ex=ttl)
    await pipe.execute()
