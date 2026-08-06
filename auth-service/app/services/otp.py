import hashlib
import logging
import secrets
import sys
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path

from fastapi import HTTPException, status

from app.config import get_settings
from app.db import db

logger = logging.getLogger("uvicorn.error")


def _print_otp_to_server_terminal(phone: str, purpose: str, code: str) -> None:
    """Dev only: visible in start.ps1 terminal. Never in production."""
    settings = get_settings()
    if settings.is_production:
        return
    lines = [
        "",
        "############################################################",
        f"  OTP CODE: {code}",
        f"  phone:    {phone}",
        f"  purpose:  {purpose}",
        "  -> copy this into the test script terminal",
        "############################################################",
        "",
    ]
    text = "\n".join(lines)
    print(text, file=sys.stderr, flush=True)
    print(text, file=sys.stdout, flush=True)
    logger.warning("OTP CODE=%s phone=%s purpose=%s", code, phone, purpose)
    try:
        Path("otp-last.txt").write_text(
            f"code={code}\nphone={phone}\npurpose={purpose}\n",
            encoding="utf-8",
        )
    except OSError:
        pass


@dataclass
class OtpIssueResult:
    code: str
    ttl_seconds: int


def _hash_code(code: str) -> str:
    return hashlib.sha256(code.encode("utf-8")).hexdigest()


class OtpService:
    """OTP stored in Postgres — Redis stays only in the gateway."""

    def _generate_code(self) -> str:
        settings = get_settings()
        # Random 6-digit OTP — printed in start.ps1 terminal (never fixed unless env set)
        fixed = settings.fixed_otp_code
        if fixed:
            return fixed
        return "".join(secrets.choice("0123456789") for _ in range(settings.otp_length))

    async def issue(self, phone: str, purpose: str = "login") -> OtpIssueResult:
        settings = get_settings()
        now = datetime.now(timezone.utc)

        recent = await db.otpchallenge.find_first(
            where={
                "phone": phone,
                "purpose": purpose,
                "consumedAt": None,
                "expiresAt": {"gt": now},
            },
            order={"createdAt": "desc"},
        )
        if recent:
            created = recent.createdAt
            if created.tzinfo is None:
                created = created.replace(tzinfo=timezone.utc)
            age = (now - created).total_seconds()
            if age < 15:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="OTP recently sent. Please wait a few seconds.",
                )

        code = self._generate_code()
        await db.otpchallenge.create(
            data={
                "phone": phone,
                "purpose": purpose,
                "codeHash": _hash_code(code),
                "expiresAt": now + timedelta(seconds=settings.otp_ttl_seconds),
            }
        )

        from app.services.sms import get_sms_sender

        await get_sms_sender().send_otp(phone, code, purpose)
        _print_otp_to_server_terminal(phone, purpose, code)
        return OtpIssueResult(code=code, ttl_seconds=settings.otp_ttl_seconds)

    async def verify(self, phone: str, code: str, purpose: str = "login") -> None:
        settings = get_settings()
        now = datetime.now(timezone.utc)
        row = await db.otpchallenge.find_first(
            where={
                "phone": phone,
                "purpose": purpose,
                "consumedAt": None,
                "expiresAt": {"gt": now},
            },
            order={"createdAt": "desc"},
        )
        if not row:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="OTP expired or not found.",
            )

        if row.attempts >= settings.otp_max_attempts:
            await db.otpchallenge.update(
                where={"id": row.id},
                data={"consumedAt": now},
            )
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many invalid OTP attempts.",
            )

        if row.codeHash != _hash_code(code.strip()):
            await db.otpchallenge.update(
                where={"id": row.id},
                data={"attempts": row.attempts + 1},
            )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid OTP code.",
            )

        await db.otpchallenge.update(
            where={"id": row.id},
            data={"consumedAt": now},
        )


otp_service = OtpService()
