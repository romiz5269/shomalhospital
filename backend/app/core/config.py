from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    app_name: str = "بیمارستان شمال - سرویس سیستم"
    database_url: str = "postgresql://pm_user:pm_pass@localhost:5432/north_hospital_pm"
    secret_key: str = "change-this-secret-key-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 480
    host: str = "0.0.0.0"
    port: int = 8001
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000"
    network_mode: str = "local"  # local | network
    debug: bool = False
    upload_dir: str = "uploads"
    max_upload_mb: int = 10
    vapid_public_key: str = ""
    vapid_private_key: str = ""
    vapid_claims_email: str = "mailto:admin@north-hospital.local"
    ad_enabled: bool = False
    ad_server: str = ""
    ad_domain: str = ""
    ad_base_dn: str = ""
    ad_bind_user: str = ""
    ad_bind_password: str = ""
    ad_search_ous: str = ""  # OU=Computers,OU=IT,DC=...;OU=Clients,DC=...
    network_scan_subnet: str = ""  # خالی = تشخیص خودکار از IP محلی

    class Config:
        env_file = ".env"


@lru_cache
def get_settings() -> Settings:
    return Settings()
