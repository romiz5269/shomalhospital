from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "auth-service"
    app_env: str = "development"
    debug: bool = True
    host: str = "0.0.0.0"
    port: int = 5001

    database_url: str = Field(
        default="postgresql://auth:auth_secret@localhost:5434/shomal_auth"
    )

    # Same Redis as gateway (token blacklist) — not a second Redis cluster
    redis_host: str = "localhost"
    redis_port: int = 6379
    redis_db: int = 0
    redis_password: str | None = None

    jwt_private_key_path: str = "./keys/private.pem"
    jwt_public_key_path: str = "./keys/public.pem"
    # access = 7 days, refresh = 30 days
    jwt_access_ttl_seconds: int = 604800
    jwt_refresh_ttl_seconds: int = 2592000
    jwt_issuer: str = "hospital-auth"
    jwt_audience: str = "hospital-gateway"

    otp_ttl_seconds: int = 120
    otp_length: int = 6
    otp_max_attempts: int = 5
    # Only expose OTP in API response when explicitly enabled (never in production)
    otp_dev_return_code: bool = False
    # Dev only: fixed OTP (e.g. 1000). Empty = random. Ignored in production.
    otp_dev_fixed_code: str = ""

    # Production SMS (بیمارستان شمال)
    sms_provider: str = "kavenegar"
    sms_api_key: str | None = None
    sms_sender_line: str | None = None

    default_avatar_url: str = "/static/default-avatar.svg"
    upload_dir: str = "./uploads"
    max_doctor_certificates: int = 5
    max_upload_bytes: int = 5 * 1024 * 1024

    cors_origins: str = "http://localhost:3000,http://localhost:8080,http://127.0.0.1:8080"

    @property
    def is_production(self) -> bool:
        return self.app_env.lower() == "production"

    @property
    def expose_otp_code(self) -> bool:
        """OTP in JSON only when dev flag is on AND not production."""
        if self.is_production:
            return False
        return self.otp_dev_return_code

    @property
    def fixed_otp_code(self) -> str | None:
        if self.is_production:
            return None
        code = (self.otp_dev_fixed_code or "").strip()
        return code or None

    def enforce_production_guards(self) -> None:
        """Warn on unsafe production .env (OTP flags already forced off by properties)."""
        if not self.is_production:
            return
        import logging

        log = logging.getLogger("uvicorn.error")
        if self.debug:
            log.warning("PRODUCTION: set DEBUG=false in .env")
        if self.otp_dev_return_code:
            log.warning("PRODUCTION: OTP_DEV_RETURN_CODE is ignored (never returned)")
        if self.otp_dev_fixed_code:
            log.warning("PRODUCTION: OTP_DEV_FIXED_CODE is ignored")
        if not Path(self.jwt_private_key_path).is_file():
            raise RuntimeError(f"Missing JWT private key: {self.jwt_private_key_path}")
        if not Path(self.jwt_public_key_path).is_file():
            raise RuntimeError(f"Missing JWT public key: {self.jwt_public_key_path}")

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def private_key(self) -> str:
        return Path(self.jwt_private_key_path).read_text(encoding="utf-8")

    @property
    def public_key(self) -> str:
        return Path(self.jwt_public_key_path).read_text(encoding="utf-8")


@lru_cache
def get_settings() -> Settings:
    return Settings()
