from pydantic import BaseModel

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models import User, PushSubscription
from app.services.push_notifications import get_vapid_public_key, push_due_reminders_for_user

router = APIRouter(prefix="/push", tags=["Web Push"])


class PushSubscribeBody(BaseModel):
    endpoint: str
    keys: dict


@router.get("/vapid-public-key")
def vapid_public_key(_: User = Depends(get_current_user)):
    return {"public_key": get_vapid_public_key()}


@router.post("/subscribe")
def subscribe(
    body: PushSubscribeBody,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    keys = body.keys or {}
    p256dh = keys.get("p256dh", "")
    auth = keys.get("auth", "")
    existing = (
        db.query(PushSubscription)
        .filter(PushSubscription.user_id == user.id, PushSubscription.endpoint == body.endpoint)
        .first()
    )
    if existing:
        existing.p256dh = p256dh
        existing.auth = auth
    else:
        db.add(
            PushSubscription(
                user_id=user.id,
                endpoint=body.endpoint,
                p256dh=p256dh,
                auth=auth,
            )
        )
    db.commit()
    return {"ok": True}


@router.delete("/subscribe")
def unsubscribe(
    body: PushSubscribeBody,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    db.query(PushSubscription).filter(
        PushSubscription.user_id == user.id,
        PushSubscription.endpoint == body.endpoint,
    ).delete()
    db.commit()
    return {"ok": True}


@router.post("/notify-due")
def notify_due(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    count = push_due_reminders_for_user(db, user.id)
    return {"sent": count}
