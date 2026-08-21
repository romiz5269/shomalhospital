import json
from datetime import datetime
from pathlib import Path

from cryptography.hazmat.primitives.serialization import Encoding, PublicFormat
from py_vapid import Vapid
from py_vapid.utils import b64urlencode
from pywebpush import WebPushException, webpush
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models import PushSubscription, Reminder, AlertStatus

_vapid: Vapid | None = None
_KEY_FILE = Path(__file__).resolve().parent.parent / "vapid_private.pem"


def _load_vapid() -> Vapid:
    global _vapid
    if _vapid is not None:
        return _vapid
    settings = get_settings()
    v = Vapid()
    if settings.vapid_private_key:
        v.from_pem(settings.vapid_private_key.encode())
    elif _KEY_FILE.exists():
        v.from_pem(_KEY_FILE.read_bytes())
    else:
        v.generate_keys()
        _KEY_FILE.write_bytes(v.private_pem())
    _vapid = v
    return v


def get_vapid_public_key() -> str:
    v = _load_vapid()
    raw = v.public_key.public_bytes(Encoding.X962, PublicFormat.UncompressedPoint)
    return b64urlencode(raw)


def send_web_push(sub: PushSubscription, title: str, body: str) -> bool:
    settings = get_settings()
    vapid = _load_vapid()
    try:
        webpush(
            subscription_info={
                "endpoint": sub.endpoint,
                "keys": {"p256dh": sub.p256dh, "auth": sub.auth},
            },
            data=json.dumps({"title": title, "body": body}, ensure_ascii=False),
            vapid_private_key=vapid.private_pem(),
            vapid_claims={"sub": settings.vapid_claims_email},
        )
        return True
    except WebPushException:
        return False


def push_due_reminders_for_user(db: Session, user_id: int) -> int:
    from app.services.alerts import compute_reminder_status

    subs = db.query(PushSubscription).filter(PushSubscription.user_id == user_id).all()
    if not subs:
        return 0
    now = datetime.utcnow()
    sent = 0
    reminders = db.query(Reminder).filter(Reminder.is_resolved == False).all()
    for r in reminders:
        status = compute_reminder_status(r.due_date, r.warning_days)
        if status == AlertStatus.OK:
            continue
        body = r.description or f"موعد: {r.due_date.strftime('%Y-%m-%d %H:%M')}"
        for sub in subs:
            if send_web_push(sub, r.title, body):
                sent += 1
    return sent
