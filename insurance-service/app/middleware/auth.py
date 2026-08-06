from dataclasses import dataclass, field
from typing import Any, Callable

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

from app.config import get_settings
from app.redis_client import get_redis

_bearer = HTTPBearer(auto_error=False)


@dataclass
class AuthUser:
    id: str
    email: str
    role: str
    permissions: list[str] = field(default_factory=list)
    jti: str = ""
    raw: dict[str, Any] = field(default_factory=dict)

    @property
    def is_admin(self) -> bool:
        if self.role == "admin":
            return True
        perms = set(self.permissions)
        return bool(
            perms
            & {
                "auth:manage",
                "users:manage",
                "users:write",
                "insurance:manage",
                "insurance:write",
            }
        )

    @property
    def is_super_admin(self) -> bool:
        """Master admin — hard delete only."""
        return self.role == "admin" or "auth:manage" in self.permissions


async def require_auth(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> AuthUser:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=401, detail="Unauthorized")

    settings = get_settings()
    try:
        payload = jwt.decode(
            credentials.credentials,
            settings.public_key,
            algorithms=["RS256"],
            audience=settings.jwt_audience,
            issuer=settings.jwt_issuer,
            options={"require_exp": True, "require_sub": True},
        )
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        ) from exc

    if payload.get("type") != "access":
        raise HTTPException(status_code=401, detail="Expected access token")

    jti = payload.get("jti")
    if not jti:
        raise HTTPException(status_code=401, detail="Malformed access token")

    redis = get_redis()
    if redis is not None and await redis.exists(f"auth:bl:jti:{jti}"):
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


def require_admin() -> Callable:
    async def _checker(user: AuthUser = Depends(require_auth)) -> AuthUser:
        if user.is_admin:
            return user
        raise HTTPException(status_code=403, detail="Admin access required")

    return _checker


def require_super_admin() -> Callable:
    async def _checker(user: AuthUser = Depends(require_auth)) -> AuthUser:
        if user.is_super_admin:
            return user
        raise HTTPException(
            status_code=403,
            detail="Super admin required for hard delete",
        )

    return _checker
