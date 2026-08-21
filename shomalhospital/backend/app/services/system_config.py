from sqlalchemy.orm import Session
import threading

from app.models import SystemConfig

CONFIG_NETWORK_MODE = "network_mode"
CONFIG_NETWORK_IP = "network_ip"

_cors_lock = threading.Lock()
_cors_network_origins: list[str] = []


def get_config(db: Session, key: str, default: str = "") -> str:
    row = db.query(SystemConfig).filter(SystemConfig.key == key).first()
    return row.value if row else default


def set_config(db: Session, key: str, value: str) -> None:
    row = db.query(SystemConfig).filter(SystemConfig.key == key).first()
    if row:
        row.value = value
    else:
        db.add(SystemConfig(key=key, value=value))
    db.commit()


def get_network_mode(db: Session) -> str:
    return get_config(db, CONFIG_NETWORK_MODE, "local")


def get_network_ip(db: Session) -> str:
    return get_config(db, CONFIG_NETWORK_IP, "")


def refresh_cors_cache(db: Session) -> None:
    extra: list[str] = []
    mode = get_network_mode(db)
    ip = get_network_ip(db)
    if mode == "network" and ip:
        extra = [f"http://{ip}:3000", f"http://{ip}:8001"]
    with _cors_lock:
        global _cors_network_origins
        _cors_network_origins = extra


def list_cors_origins(static_origins: str) -> list[str]:
    origins = set()
    for o in static_origins.split(","):
        o = o.strip()
        if o:
            origins.add(o)
    origins.add("http://localhost:3000")
    origins.add("http://127.0.0.1:3000")
    with _cors_lock:
        origins.update(_cors_network_origins)
    return sorted(origins)


def get_dynamic_cors_origins(db: Session, static_origins: str) -> list[str]:
    refresh_cors_cache(db)
    return list_cors_origins(static_origins)
