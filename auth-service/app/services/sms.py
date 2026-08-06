"""SMS delivery hook for OTP — replace with provider (Kavenegar / Ghasedak / etc.)."""

from __future__ import annotations

import logging
from typing import Protocol

from app.config import get_settings

logger = logging.getLogger("auth.sms")


class SmsSender(Protocol):
    async def send_otp(self, phone: str, code: str, purpose: str) -> None: ...


class LogOnlySmsSender:
    """Dev helper — does not send SMS."""

    async def send_otp(self, phone: str, code: str, purpose: str) -> None:
        logger.info("SMS skipped (dev) phone=%s purpose=%s", phone, purpose)


class ProductionSmsSender:
    """
    Production sender.
    Set SMS_API_KEY + SMS_PROVIDER in env, then wire real HTTP call here.
    Until configured, logs error (OTP still stored hashed in DB).
    """

    async def send_otp(self, phone: str, code: str, purpose: str) -> None:
        settings = get_settings()
        if not settings.sms_api_key:
            logger.error(
                "OTP created but SMS_API_KEY is empty — configure SMS for production. phone=%s purpose=%s",
                phone,
                purpose,
            )
            return
        # TODO: call hospital SMS provider (Kavenegar/Ghasedak/...)
        # Example body: template OTP for بیمارستان شمال
        logger.info(
            "SMS dispatch queued provider=%s phone=%s purpose=%s",
            settings.sms_provider,
            phone,
            purpose,
        )


def get_sms_sender() -> SmsSender:
    settings = get_settings()
    if settings.is_production:
        return ProductionSmsSender()
    return LogOnlySmsSender()
