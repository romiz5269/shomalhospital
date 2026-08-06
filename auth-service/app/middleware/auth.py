from dataclasses import dataclass
from typing import Callable

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.redis_client import get_redis
from app.services.token import token_service

_bearer = HTTPBearer(auto_error=False)


@dataclass
class AuthUser:
    id: str
    email: str
    role: str
    permissions: list[str]
    jti: str

    @property
    def is_admin(self) -> bool:
        if self.role == "admin":
            return True
        return bool(
            set(self.permissions) & {"auth:manage", "users:manage", "users:write"}
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
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized"
        )

    payload = token_service.decode(credentials.credentials, expected_type="access")
    jti = payload.get("jti")
    if not jti:
        raise HTTPException(status_code=401, detail="Malformed access token")

    redis = get_redis()
    if await redis.exists(f"auth:bl:jti:{jti}"):
        raise HTTPException(status_code=401, detail="Token revoked")

    user = AuthUser(
        id=str(payload["sub"]),
        email=str(payload.get("email") or ""),
        role=str(payload.get("role") or ""),
        permissions=list(payload.get("permissions") or []),
        jti=str(jti),
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
