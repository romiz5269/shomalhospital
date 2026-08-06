from redis.asyncio import ConnectionPool, Redis

from app.config import get_settings

_pool: ConnectionPool | None = None
_redis: Redis | None = None


async def connect_redis() -> Redis | None:
    global _pool, _redis
    if _redis is not None:
        return _redis
    settings = get_settings()
    try:
        _pool = ConnectionPool(
            host=settings.redis_host,
            port=settings.redis_port,
            db=settings.redis_db,
            password=settings.redis_password or None,
            max_connections=20,
            decode_responses=True,
            socket_connect_timeout=3,
            socket_timeout=3,
        )
        _redis = Redis(connection_pool=_pool)
        await _redis.ping()
        return _redis
    except Exception:
        _redis = None
        return None


async def disconnect_redis() -> None:
    global _pool, _redis
    if _redis is not None:
        await _redis.aclose()
        _redis = None
    if _pool is not None:
        await _pool.disconnect()
        _pool = None


def get_redis() -> Redis | None:
    return _redis
