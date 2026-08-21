import json
from pydantic import BaseModel

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.database import get_db
from app.core.security import get_current_user, require_admin
from app.models import User
from app.schemas import SystemInfo
from app.services.network_scan import scan_network_interfaces
from app.services.reports import get_local_ip, get_network_ips
from app.services.system_config import (
    get_config,
    set_config,
    get_network_mode,
    get_network_ip,
    refresh_cors_cache,
    CONFIG_NETWORK_MODE,
    CONFIG_NETWORK_IP,
)
from app.services.activity import log_activity

DEFAULT_CATEGORIES = [
    {"id": "pc", "label": "PC"},
    {"id": "server", "label": "سرور"},
    {"id": "printer", "label": "پرینتر"},
    {"id": "his", "label": "HIS"},
    {"id": "general", "label": "عمومی"},
]

router = APIRouter(prefix="/system", tags=["سیستم"])
settings = get_settings()
FRONTEND_PORT = 3000
BACKEND_PORT = 8001


class SetNetworkModeRequest(BaseModel):
    mode: str  # local | network
    ip: str | None = None


@router.get("/info", response_model=SystemInfo)
def system_info(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    local_ip = get_local_ip()
    network_ips = get_network_ips()
    bind_host = settings.host or "0.0.0.0"
    mode = get_network_mode(db)
    selected_ip = get_network_ip(db)
    if mode == "network" and selected_ip:
        access_ip = selected_ip
    elif settings.network_mode == "network":
        access_ip = local_ip
    else:
        access_ip = "localhost"
    api_url = f"http://{access_ip}:{settings.port}/api"
    frontend_url = f"http://{access_ip}:{FRONTEND_PORT}"
    return SystemInfo(
        host=bind_host,
        port=settings.port,
        frontend_port=FRONTEND_PORT,
        network_mode=mode if mode else settings.network_mode,
        network_ip=selected_ip,
        local_ip=local_ip,
        network_ips=network_ips,
        api_url=api_url,
        frontend_url=frontend_url,
    )


@router.get("/network-scan")
def network_scan(_: User = Depends(require_admin)):
    """Scan server network interfaces; highlight 10.1.x.x hospital range."""
    interfaces = scan_network_interfaces()
    return {"interfaces": interfaces, "count": len(interfaces)}


@router.post("/set-network-mode")
def set_network_mode(
    body: SetNetworkModeRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_admin),
):
    if body.mode not in ("local", "network"):
        raise HTTPException(status_code=400, detail="mode باید local یا network باشد")
    if body.mode == "network":
        if not body.ip:
            raise HTTPException(status_code=400, detail="IP انتخاب نشده")
        set_config(db, CONFIG_NETWORK_MODE, "network")
        set_config(db, CONFIG_NETWORK_IP, body.ip)
        refresh_cors_cache(db)
        log_activity(
            db,
            user_id=user.id,
            user_name=user.full_name,
            action="network_connect",
            entity_type="system",
            details=f"اتصال به شبکه — IP: {body.ip}",
        )
        return {
            "ok": True,
            "network_mode": "network",
            "network_ip": body.ip,
            "frontend_url": f"http://{body.ip}:{FRONTEND_PORT}",
            "api_url": f"http://{body.ip}:{BACKEND_PORT}/api",
        }
    set_config(db, CONFIG_NETWORK_MODE, "local")
    set_config(db, CONFIG_NETWORK_IP, "")
    refresh_cors_cache(db)
    log_activity(
        db,
        user_id=user.id,
        user_name=user.full_name,
        action="network_local",
        entity_type="system",
        details="بازگشت به حالت محلی",
    )
    return {
        "ok": True,
        "network_mode": "local",
        "network_ip": "",
        "frontend_url": f"http://localhost:{FRONTEND_PORT}",
        "api_url": f"http://localhost:{BACKEND_PORT}/api",
    }


@router.get("/asset-categories")
def get_asset_categories(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    raw = get_config(db, "asset_categories", "")
    if raw:
        try:
            return json.loads(raw)
        except Exception:
            pass
    return DEFAULT_CATEGORIES


class AssetCategoryItem(BaseModel):
    id: str
    label: str


@router.put("/asset-categories")
def set_asset_categories(
    items: list[AssetCategoryItem],
    db: Session = Depends(get_db),
    user: User = Depends(require_admin),
):
    set_config(db, "asset_categories", json.dumps([i.model_dump() for i in items], ensure_ascii=False))
    return [i.model_dump() for i in items]
