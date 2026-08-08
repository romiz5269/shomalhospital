from datetime import datetime, timedelta, timezone
from typing import Any

import bcrypt
from fastapi import Depends, Header, HTTPException
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.models import Admin, Staff

_settings = get_settings()
_ALG = "HS256"


def hash_password(raw: str) -> str:
    return bcrypt.hashpw(raw.encode(), bcrypt.gensalt(12)).decode()


def check_password(raw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(raw.encode(), hashed.encode())
    except ValueError:
        return False


def issue_admin_token(admin_id: str) -> str:
    return jwt.encode(
        {
            "adminId": admin_id,
            "typ": "admin",
            "exp": datetime.now(timezone.utc) + timedelta(days=7),
            "iat": datetime.now(timezone.utc),
        },
        _settings.jwt_secret,
        algorithm=_ALG,
    )


def issue_staff_token(staff_id: str) -> str:
    return jwt.encode(
        {
            "staffId": staff_id,
            "role": "staff",
            "typ": "staff",
            "exp": datetime.now(timezone.utc) + timedelta(days=30),
            "iat": datetime.now(timezone.utc),
        },
        _settings.jwt_secret,
        algorithm=_ALG,
    )


def decode_token(token: str) -> dict[str, Any]:
    return jwt.decode(token, _settings.jwt_secret, algorithms=[_ALG])


def _bearer(authorization: str | None) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "دسترسی غیرمجاز. لطفاً وارد شوید.")
    return authorization[7:]


def require_admin(
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> str:
    try:
        payload = decode_token(_bearer(authorization))
    except JWTError as exc:
        raise HTTPException(401, "توکن نامعتبر یا منقضی شده است.") from exc
    admin_id = payload.get("adminId")
    if not admin_id or not db.get(Admin, admin_id):
        raise HTTPException(401, "توکن نامعتبر یا منقضی شده است.")
    return admin_id


def require_staff(
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> str:
    try:
        payload = decode_token(_bearer(authorization))
    except JWTError as exc:
        raise HTTPException(401, "توکن نامعتبر یا منقضی شده است.") from exc
    staff_id = payload.get("staffId")
    if not staff_id or payload.get("role") != "staff" or not db.get(Staff, staff_id):
        raise HTTPException(401, "توکن نامعتبر است.")
    return staff_id
