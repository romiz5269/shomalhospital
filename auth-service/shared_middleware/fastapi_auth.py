"""
Reusable JWT RBAC middleware for hospital microservices.

Env:
  JWT_PUBLIC_KEY or JWT_PUBLIC_KEY_PATH
  JWT_ISSUER (default hospital-auth)
  JWT_AUDIENCE (default hospital-gateway)
  REDIS_HOST / REDIS_PORT — optional, for gateway blacklist checks
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from functools import lru_cache
from pathlib import Path
from typing import Any, Callable

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

_bearer = HTTPBearer(auto_error=False)


@dataclass
class AuthUser:
    id: str
    email: str
    role: str
    permissions: list[str] = field(default_factory=list)
    jti: str = ""
    raw: dict[str, Any] = field(default_factory=dict)


def _load_public_key() -> str:
    path = os.getenv("JWT_PUBLIC_KEY_PATH")
    if path and Path(path).exists():
        return Path(path).read_text(encoding="utf-8")
    raw = os.getenv("JWT_PUBLIC_KEY", "")
    if not raw:
        raise RuntimeError("JWT_PUBLIC_KEY or JWT_PUBLIC_KEY_PATH must be set")
    key = raw.strip()
    if (key.startswith('"') and key.endswith('"')) or (
        key.startswith("'") and key.endswith("'")
    ):
        key = key[1:-1]
    return key.replace("\\n", "\n")


@lru_cache
def _settings() -> dict[str, str]:
    return {
        "public_key": _load_public_key(),
        "issuer": os.getenv("JWT_ISSUER", "hospital-auth"),
        "audience": os.getenv("JWT_AUDIENCE", "hospital-gateway"),
    }


_redis = None


async def _get_redis():
    global _redis
    if _redis is not None:
        return _redis
    host = os.getenv("REDIS_HOST")
    if not host:
        return None
    try:
        from redis.asyncio import Redis

        _redis = Redis(
            host=host,
            port=int(os.getenv("REDIS_PORT", "6379")),
            password=os.getenv("REDIS_PASSWORD") or None,
            decode_responses=True,
        )
        await _redis.ping()
        return _redis
    except Exception:
        _redis = False  # type: ignore[assignment]
        return None


def get_token_payload(token: str) -> dict[str, Any]:
    conf = _settings()
    try:
        return jwt.decode(
            token,
            conf["public_key"],
            algorithms=["RS256"],
            audience=conf["audience"],
            issuer=conf["issuer"],
            options={"require_exp": True, "require_sub": True},
        )
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        ) from exc


async def require_auth(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> AuthUser:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=401, detail="Unauthorized")

    payload = get_token_payload(credentials.credentials)
    if payload.get("type") != "access":
        raise HTTPException(status_code=401, detail="Expected access token")

    jti = payload.get("jti")
    if not jti:
        raise HTTPException(status_code=401, detail="Malformed access token")

    redis = await _get_redis()
    if redis:
        if await redis.exists(f"auth:bl:jti:{jti}"):
            raise HTTPException(status_code=401, detail="Token revoked")

    header_user = request.headers.get("x-user-id")
    user_id = str(payload["sub"])
    if header_user and header_user != user_id:
        raise HTTPException(status_code=401, detail="Identity header mismatch")

    user = AuthUser(
        id=user_id,
        email=str(payload.get("email") or ""),
        role=str(payload.get("role") or ""),
        permissions=list(payload.get("permissions") or []),
        jti=str(jti),
        raw=payload,
    )
    request.state.user = user
    return user


def require_roles(*roles: str) -> Callable:
    allowed = set(roles)

    async def _checker(user: AuthUser = Depends(require_auth)) -> AuthUser:
        if user.role in allowed or "auth:manage" in user.permissions:
            return user
        raise HTTPException(status_code=403, detail="Forbidden: role mismatch")

    return _checker


def require_permissions(*codes: str) -> Callable:
    required = set(codes)

    async def _checker(user: AuthUser = Depends(require_auth)) -> AuthUser:
        if "auth:manage" in user.permissions:
            return user
        missing = sorted(required - set(user.permissions))
        if missing:
            raise HTTPException(
                status_code=403,
                detail=f"Forbidden: missing permissions {missing}",
            )
        return user

    return _checker
