import json
from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models import User, Asset, AssetType, Reminder, AlertStatus, ActivityLog
from app.schemas.it import ITOverviewOut, InfraStatusItem, ITInfrastructureUpdate
from app.services.alerts import refresh_reminder_statuses, compute_asset_alert
from app.services.system_config import get_config, set_config

router = APIRouter(prefix="/it-overview", tags=["مرکز IT"])

DEFAULT_INFRA = [
    {"key": "network", "label": "شبکه", "status": "ok", "detail": "Normal"},
    {"key": "backup", "label": "Backup", "status": "ok", "detail": "آخرین Backup موفق"},
    {"key": "internet", "label": "اینترنت", "status": "ok", "detail": "Online"},
    {"key": "storage", "label": "Storage", "status": "ok", "detail": "Healthy"},
    {"key": "database", "label": "Database", "status": "ok", "detail": "Healthy"},
]

PROBLEM_STATUSES = {"faulty", "repair", "missing"}
OFFLINE_STATUSES = {"inactive", "offline", "retired"}


def _load_infra(db: Session) -> list[InfraStatusItem]:
    raw = get_config(db, "it_infrastructure")
    if raw:
        try:
            data = json.loads(raw)
            return [InfraStatusItem(**x) for x in data]
        except (json.JSONDecodeError, TypeError, ValueError):
            pass
    return [InfraStatusItem(**x) for x in DEFAULT_INFRA]


def _classify_asset(asset: Asset) -> str:
    st = (asset.operational_status or "active").lower()
    if st in OFFLINE_STATUSES:
        return "offline"
    if st in PROBLEM_STATUSES:
        return "problem"
    alert, _ = compute_asset_alert(asset)
    if alert in ("critical", "warning"):
        return "problem"
    return "healthy"


def _count_assets(assets: list[Asset]) -> tuple[int, int, int, int]:
    total = len(assets)
    healthy = problem = offline = 0
    for a in assets:
        c = _classify_asset(a)
        if c == "healthy":
            healthy += 1
        elif c == "offline":
            offline += 1
        else:
            problem += 1
    return total, healthy, problem, offline


def _count_services(assets: list[Asset]) -> tuple[int, int]:
    active = down = 0
    for a in assets:
        if not a.services_info:
            continue
        for line in a.services_info.replace(",", "\n").split("\n"):
            name = line.strip()
            if not name:
                continue
            if name.lower().startswith("down:") or name.startswith("🔴"):
                down += 1
            else:
                active += 1
    return active, down


@router.get("/", response_model=ITOverviewOut)
def get_it_overview(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    refresh_reminder_statuses(db)
    all_assets = db.query(Asset).all()
    pcs = [a for a in all_assets if (a.asset_type.value if hasattr(a.asset_type, "value") else a.asset_type) == "pc"]
    servers = [a for a in all_assets if (a.asset_type.value if hasattr(a.asset_type, "value") else a.asset_type) == "server"]
    network = [a for a in all_assets if (a.asset_type.value if hasattr(a.asset_type, "value") else a.asset_type) == "network"]

    sys_t, sys_h, sys_p, sys_o = _count_assets(pcs)
    srv_t, srv_h, srv_p, _ = _count_assets(servers)
    net_t, net_h, _, _ = _count_assets(network)

    reminders = db.query(Reminder).filter(Reminder.is_resolved == False).all()
    open_issues = len(reminders)
    critical_issues = sum(1 for r in reminders if r.status == AlertStatus.CRITICAL)

    active_svc, down_svc = _count_services(servers)

    events_q = db.query(ActivityLog)
    if current_user.role != "admin":
        events_q = events_q.filter(ActivityLog.user_id == current_user.id)
    events = events_q.order_by(ActivityLog.created_at.desc()).limit(12).all()
    recent_events = [
        {
            "id": e.id,
            "user_name": e.user_name,
            "action": e.action,
            "entity_type": e.entity_type,
            "details": e.details,
            "created_at": e.created_at.isoformat(),
        }
        for e in events
    ]

    return ITOverviewOut(
        systems_total=sys_t,
        systems_healthy=sys_h,
        systems_problem=sys_p,
        systems_offline=sys_o,
        servers_total=srv_t,
        servers_healthy=srv_h,
        servers_problem=srv_p,
        network_total=net_t,
        network_healthy=net_h,
        open_issues=open_issues,
        critical_issues=critical_issues,
        active_services=active_svc,
        down_services=down_svc,
        infrastructure=_load_infra(db),
        recent_events=recent_events,
    )


@router.put("/infrastructure", response_model=list[InfraStatusItem])
def update_infrastructure(
    body: ITInfrastructureUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    data = [item.model_dump() for item in body.infrastructure]
    set_config(db, "it_infrastructure", json.dumps(data, ensure_ascii=False))
    return body.infrastructure
