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

    app_name: str = "blog-service"
    app_env: str = "development"
    debug: bool = True
    host: str = "0.0.0.0"
    port: int = 5005
    hospital_name: str = "بیمارستان شمال"

    database_url: str = Field(
        default="postgresql://blog:blog_secret@localhost:5438/shomal_blog"
    )

    redis_host: str = "localhost"
    redis_port: int = 6379
    redis_db: int = 0
    redis_password: str | None = None

    jwt_public_key_path: str = "../auth-service/keys/public.pem"
    jwt_issuer: str = "hospital-auth"
    jwt_audience: str = "hospital-gateway"

    cors_origins: str = (
        "http://localhost:4000,http://127.0.0.1:4000,http://localhost:8080,http://127.0.0.1:8080"
    )
    upload_dir: str = ""  # resolved absolute under blog-service/uploads
    # Direct blog uploads URL — homepage must not depend on gateway for video bytes
    public_base_url: str = "http://127.0.0.1:5005"

    @property
    def resolved_upload_dir(self) -> Path:
        if self.upload_dir:
            p = Path(self.upload_dir)
            return p if p.is_absolute() else (Path(__file__).resolve().parents[1] / p).resolve()
        return (Path(__file__).resolve().parents[1] / "uploads").resolve()


    @property
    def is_production(self) -> bool:
        return self.app_env.lower() == "production"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    def _resolve_public_key_path(self) -> Path:
        path = Path(self.jwt_public_key_path)
        if path.is_file():
            return path
        alt = Path(__file__).resolve().parents[1] / self.jwt_public_key_path
        if alt.is_file():
            return alt
        return path

    @property
    def public_key(self) -> str:
        path = self._resolve_public_key_path()
        return path.read_text(encoding="utf-8")

    def enforce_production_guards(self) -> None:
        if not self.is_production:
            return
        import logging

        log = logging.getLogger("uvicorn.error")
        if self.debug:
            log.warning("PRODUCTION: set DEBUG=false in .env")
        if not self._resolve_public_key_path().is_file():
            raise RuntimeError(f"Missing JWT public key: {self.jwt_public_key_path}")


@lru_cache
def get_settings() -> Settings:
    return Settings()
