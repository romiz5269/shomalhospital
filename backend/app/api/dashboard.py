from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, selectinload

from app.core.database import get_db
from app.core.security import get_current_user
from app.core.config import get_settings
from app.models import User, Asset, Department, Reminder, PMVisit, InventoryItem, AlertStatus
from app.schemas import DashboardStats, ReminderOut
from app.schemas.pm import PMVisitOut, InventoryItemOut
from app.services.alerts import refresh_reminder_statuses, compute_asset_alert

router = APIRouter(tags=["داشبورد"])
settings = get_settings()


@router.get("/dashboard", response_model=DashboardStats)
def dashboard(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    refresh_reminder_statuses(db)

    alerts = db.query(Reminder).filter(Reminder.is_resolved == False).all()
    critical = sum(1 for a in alerts if a.status == AlertStatus.CRITICAL)
    warning = sum(1 for a in alerts if a.status == AlertStatus.WARNING)
    ok = sum(1 for a in alerts if a.status == AlertStatus.OK)

    visits = (
        db.query(PMVisit)
        .options(selectinload(PMVisit.tasks))
        .order_by(PMVisit.visit_date.desc())
        .all()
    )
    total_pm = len(visits)
    repair_count = sum(1 for v in visits if (v.work_type or "pm") == "pm")
    replace_count = db.query(InventoryItem).count()
    inventory_pending = db.query(InventoryItem).filter(
        InventoryItem.status.in_(["received", "pending_install"])
    ).count()
    all_inventory = (
        db.query(InventoryItem)
        .order_by(InventoryItem.received_date.desc())
        .all()
    )

    now = datetime.utcnow()
    overdue_pm = db.query(PMVisit).filter(
        PMVisit.next_pm_date.isnot(None),
        PMVisit.next_pm_date < now,
    ).count()
    upcoming = (
        db.query(PMVisit)
        .options(selectinload(PMVisit.tasks))
        .filter(PMVisit.next_pm_date.isnot(None))
        .order_by(PMVisit.next_pm_date)
        .limit(8)
        .all()
    )

    assets = db.query(Asset).all()
    assets_by_type: dict[str, int] = {}
    healthy = 0
    for a in assets:
        t = a.asset_type.value if hasattr(a.asset_type, "value") else str(a.asset_type)
        assets_by_type[t] = assets_by_type.get(t, 0) + 1
        status, _ = compute_asset_alert(a)
        if status == "ok":
            healthy += 1
    compliance_rate = round((healthy / len(assets) * 100) if assets else 100, 1)

    return DashboardStats(
        total_assets=len(assets),
        total_departments=db.query(Department).count(),
        total_pm_visits=total_pm,
        critical_alerts=critical,
        warning_alerts=warning,
        ok_alerts=ok,
        overdue_pm=overdue_pm,
        inventory_pending=inventory_pending,
        assets_by_type=assets_by_type,
        compliance_rate=compliance_rate,
        recent_pm_visits=[PMVisitOut.model_validate(v) for v in visits],
        active_alerts=[ReminderOut.model_validate(a) for a in alerts],
        upcoming_pm=[PMVisitOut.model_validate(p) for p in upcoming],
        recent_inventory=[InventoryItemOut.model_validate(i) for i in all_inventory],
        repair_count=repair_count,
        replace_count=replace_count,
    )
