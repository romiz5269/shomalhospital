from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import uuid4

from fastapi import HTTPException, status
from jose import JWTError, jwt

from app.config import get_settings


class TokenService:
    """RS256 dual-token JWT (stateless). No session claim."""

    def _now(self) -> datetime:
        return datetime.now(timezone.utc)

    def create_access_token(
        self,
        *,
        user_id: str,
        email: str | None,
        role: str,
        permissions: list[str],
    ) -> tuple[str, str, int]:
        settings = get_settings()
        jti = str(uuid4())
        expires_in = settings.jwt_access_ttl_seconds
        payload: dict[str, Any] = {
            "sub": user_id,
            "email": email or "",
            "role": role,
            "permissions": permissions,
            "jti": jti,
            "type": "access",
            "iss": settings.jwt_issuer,
            "aud": settings.jwt_audience,
            "iat": self._now(),
            "exp": self._now() + timedelta(seconds=expires_in),
        }
        token = jwt.encode(payload, settings.private_key, algorithm="RS256")
        return token, jti, expires_in

    def create_refresh_token(self, *, user_id: str) -> tuple[str, str, int]:
        settings = get_settings()
        jti = str(uuid4())
        expires_in = settings.jwt_refresh_ttl_seconds
        payload: dict[str, Any] = {
            "sub": user_id,
            "jti": jti,
            "type": "refresh",
            "iss": settings.jwt_issuer,
            "aud": settings.jwt_audience,
            "iat": self._now(),
            "exp": self._now() + timedelta(seconds=expires_in),
        }
        token = jwt.encode(payload, settings.private_key, algorithm="RS256")
        return token, jti, expires_in

    def decode(self, token: str, *, expected_type: str) -> dict[str, Any]:
        settings = get_settings()
        try:
            payload = jwt.decode(
                token,
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

        if payload.get("type") != expected_type:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Expected {expected_type} token",
            )
        return payload

    def remaining_ttl(self, payload: dict[str, Any]) -> int:
        exp = payload.get("exp")
        if not exp:
            return 60
        now = int(self._now().timestamp())
        return max(int(exp) - now, 60)


token_service = TokenService()
