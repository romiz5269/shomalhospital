import hashlib
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException

from app.config import get_settings
from app.db import db


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


class RefreshTokenStore:
    async def save(self, *, user_id: str, jti: str, raw_token: str) -> None:
        settings = get_settings()
        await db.refreshtoken.create(
            data={
                "userId": user_id,
                "jti": jti,
                "tokenHash": _hash_token(raw_token),
                "expiresAt": datetime.now(timezone.utc)
                + timedelta(seconds=settings.jwt_refresh_ttl_seconds),
            }
        )

    async def revoke_jti(self, jti: str) -> None:
        row = await db.refreshtoken.find_unique(where={"jti": jti})
        if not row:
            return
        await db.refreshtoken.update(
            where={"id": row.id},
            data={"revokedAt": datetime.now(timezone.utc)},
        )

    async def revoke_all_for_user(self, user_id: str) -> list[str]:
        rows = await db.refreshtoken.find_many(
            where={"userId": user_id, "revokedAt": None}
        )
        now = datetime.now(timezone.utc)
        jtis: list[str] = []
        for row in rows:
            await db.refreshtoken.update(
                where={"id": row.id},
                data={"revokedAt": now},
            )
            jtis.append(row.jti)
        return jtis

    async def consume_valid(self, *, jti: str, raw_token: str, user_id: str) -> None:
        row = await db.refreshtoken.find_unique(where={"jti": jti})
        if not row or row.userId != user_id:
            raise HTTPException(status_code=401, detail="Refresh token unknown")
        if row.revokedAt is not None:
            raise HTTPException(status_code=401, detail="Refresh token revoked")
        expires = row.expiresAt
        if expires.tzinfo is None:
            expires = expires.replace(tzinfo=timezone.utc)
        if expires < datetime.now(timezone.utc):
            raise HTTPException(status_code=401, detail="Refresh token expired")
        if row.tokenHash != _hash_token(raw_token):
            raise HTTPException(status_code=401, detail="Refresh token invalid")
        await self.revoke_jti(jti)


refresh_token_store = RefreshTokenStore()
