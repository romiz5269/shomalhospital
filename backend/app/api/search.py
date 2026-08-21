from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.core.database import get_db
from app.core.security import get_current_user
from app.models import User, Asset, Reminder, PMVisit, InventoryItem

router = APIRouter(prefix="/search", tags=["جستجو"])


@router.get("/")
def search(
    q: str = Query(..., min_length=1),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    term = f"%{q.strip()}%"
    assets = (
        db.query(Asset)
        .filter(
            or_(
                Asset.name.ilike(term),
                Asset.serial_number.ilike(term),
                Asset.ip_address.ilike(term),
                Asset.brand.ilike(term),
                Asset.model.ilike(term),
                Asset.assigned_to.ilike(term),
                Asset.location.ilike(term),
            )
        )
        .limit(20)
        .all()
    )
    pm_visits = (
        db.query(PMVisit)
        .filter(
            or_(
                PMVisit.recipient_name.ilike(term),
                PMVisit.recipient_unit.ilike(term),
                PMVisit.performed_by.ilike(term),
                PMVisit.notes.ilike(term),
            )
        )
        .order_by(PMVisit.visit_date.desc())
        .limit(20)
        .all()
    )
    inventory = (
        db.query(InventoryItem)
        .filter(
            or_(
                InventoryItem.name.ilike(term),
                InventoryItem.serial_number.ilike(term),
                InventoryItem.purpose.ilike(term),
                InventoryItem.notes.ilike(term),
            )
        )
        .limit(20)
        .all()
    )
    reminders = (
        db.query(Reminder)
        .filter(
            or_(Reminder.title.ilike(term), Reminder.description.ilike(term)),
            Reminder.is_resolved == False,
        )
        .limit(10)
        .all()
    )

    asset_map = {a.id: a.name for a in db.query(Asset).all()}

    return {
        "assets": [
            {"id": a.id, "name": a.name, "type": a.asset_type.value, "serial": a.serial_number}
            for a in assets
        ],
        "pm_visits": [
            {
                "id": v.id,
                "label": v.recipient_name or v.performed_by or f"عیب‌یابی #{v.id}",
                "unit": v.recipient_unit or "",
                "asset_name": asset_map.get(v.device_id) if v.device_id else "",
            }
            for v in pm_visits
        ],
        "inventory": [
            {"id": i.id, "name": i.name, "status": i.status, "category": i.category}
            for i in inventory
        ],
        "reminders": [
            {"id": r.id, "title": r.title, "status": r.status.value}
            for r in reminders
        ],
    }
