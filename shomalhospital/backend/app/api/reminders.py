from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timedelta

from app.core.database import get_db
from app.core.security import get_current_user
from app.models import User, Reminder, AlertType, AlertStatus
from app.schemas import ReminderCreate, ReminderUpdate, ReminderOut
from app.services.alerts import resolve_reminder, sync_all_reminders, compute_reminder_status, refresh_reminder_statuses
from app.services.push_notifications import push_due_reminders_for_user

router = APIRouter(prefix="/reminders", tags=["یادآورها و هشدارها"])


@router.get("/", response_model=list[ReminderOut])
def list_reminders(
    unresolved_only: bool = True,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    refresh_reminder_statuses(db)
    q = db.query(Reminder)
    if unresolved_only:
        q = q.filter(Reminder.is_resolved == False)
    items = q.order_by(Reminder.due_date).all()
    push_due_reminders_for_user(db, user.id)
    return [ReminderOut.model_validate(r) for r in items]


@router.post("/", response_model=ReminderOut, status_code=201)
def create_reminder(data: ReminderCreate, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    payload = data.model_dump()
    if "asset_id" in payload:
        payload["device_id"] = payload.pop("asset_id")
    payload["reminder_type"] = AlertType(payload["reminder_type"])
    payload["source"] = payload.get("source") or "manual"
    if not payload.get("title") or not str(payload["title"]).strip():
        payload["title"] = f"یادآوری {payload['due_date'].strftime('%Y-%m-%d %H:%M')}"
    if not payload.get("description"):
        payload["description"] = f"موعد: {payload['due_date'].strftime('%Y-%m-%d %H:%M')}"
    payload["status"] = compute_reminder_status(payload["due_date"], payload.get("warning_days"))
    reminder = Reminder(**payload)
    db.add(reminder)
    db.commit()
    db.refresh(reminder)
    return ReminderOut.model_validate(reminder)


@router.post("/test-notification")
def test_notification(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """هشدار آزمایشی — ۹۰ ثانیه بعد موعد می‌شود (برای اطمینان از کارکرد سیستم)."""
    due = datetime.utcnow() + timedelta(seconds=90)
    reminder = Reminder(
        title="تست هشدار — بیمارستان شمال",
        description="اگر این پیام را دیدید، سیستم هشدار درست کار می‌کند.",
        reminder_type=AlertType.CUSTOM,
        due_date=due,
        warning_days=0,
        source="manual",
        status=AlertStatus.OK,
    )
    db.add(reminder)
    db.commit()
    db.refresh(reminder)
    push_due_reminders_for_user(db, user.id)
    return {
        "ok": True,
        "reminder_id": reminder.id,
        "due_at": reminder.due_date.isoformat(),
        "message": "هشدار آزمایشی ثبت شد — حدود ۹۰ ثانیه دیگر باید اعلان بیاید. اعلان ویندوز را فعال کنید.",
    }


@router.get("/{reminder_id}", response_model=ReminderOut)
def get_reminder(reminder_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    reminder = db.query(Reminder).filter(Reminder.id == reminder_id).first()
    if not reminder:
        raise HTTPException(status_code=404, detail="یادآور یافت نشد")
    return ReminderOut.model_validate(reminder)


@router.put("/{reminder_id}", response_model=ReminderOut)
def update_reminder(
    reminder_id: int,
    data: ReminderUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    reminder = db.query(Reminder).filter(Reminder.id == reminder_id).first()
    if not reminder:
        raise HTTPException(status_code=404, detail="یادآور یافت نشد")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(reminder, k, v)
    reminder.status = compute_reminder_status(reminder.due_date, reminder.warning_days)
    db.commit()
    db.refresh(reminder)
    return ReminderOut.model_validate(reminder)


@router.post("/{reminder_id}/resolve", response_model=ReminderOut)
def resolve(
    reminder_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    reminder = resolve_reminder(db, reminder_id, current_user.full_name)
    if not reminder:
        raise HTTPException(status_code=404, detail="یادآور یافت نشد")
    sync_all_reminders(db)
    return ReminderOut.model_validate(reminder)


@router.delete("/{reminder_id}", status_code=204)
def delete_reminder(reminder_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    reminder = db.query(Reminder).filter(Reminder.id == reminder_id).first()
    if not reminder:
        raise HTTPException(status_code=404, detail="یادآور یافت نشد")
    db.delete(reminder)
    db.commit()
