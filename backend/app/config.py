from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

_BASE = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(_BASE / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    database_url: str
    jwt_secret: str
    port: int = 4000
    cors_origin: str = "http://localhost:3000,http://localhost:3001"
    redis_url: str = "redis://localhost:6379/0"
    db_pool_size: int = 10
    db_max_overflow: int = 20
    db_pool_timeout: int = 8
    request_timeout_sec: int = 20
    rate_limit_per_min: int = 120
    auth_rate_limit_per_min: int = 20

    @property
    def db_url(self) -> str:
        url = self.database_url.split("?", 1)[0]
        if url.startswith("postgresql://"):
            return url.replace("postgresql://", "postgresql+psycopg2://", 1)
        return url

    @property
    def cors_list(self) -> list[str]:
        return [x.strip() for x in self.cors_origin.split(",") if x.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
