from datetime import datetime, timedelta
from sqlalchemy.orm import Session

from app.models import Asset, Reminder, AlertStatus, AlertType, PMVisit, InventoryItem, AssetType

WINDOWS_ACTIVATION_DAYS = 180
PM_DEFAULT_INTERVAL_DAYS = 90
INVENTORY_PENDING_DAYS = 14
WARNING_DAYS_BEFORE = 30


def compute_reminder_status(due_date: datetime, warning_days: int | None) -> AlertStatus:
    """وضعیت هشدار با دقت تاریخ و ساعت."""
    now = datetime.utcnow()
    warning = warning_days if warning_days is not None else WARNING_DAYS_BEFORE
    if due_date <= now:
        return AlertStatus.CRITICAL
    if warning <= 0:
        return AlertStatus.OK
    if (due_date - now).total_seconds() <= warning * 86400:
        return AlertStatus.WARNING
    return AlertStatus.OK


def refresh_reminder_statuses(db: Session) -> None:
    changed = False
    for r in db.query(Reminder).filter(Reminder.is_resolved == False):
        new_status = compute_reminder_status(r.due_date, r.warning_days)
        if r.status != new_status:
            r.status = new_status
            changed = True
    if changed:
        db.commit()


def _effective_activation_date(asset: Asset) -> datetime | None:
    """از تاریخ ثبت یا فعال‌سازی برای محاسبه خودکار استفاده می‌کند."""
    if asset.windows_activated_at:
        return asset.windows_activated_at
    if asset.asset_type in (AssetType.PC, AssetType.SERVER) and asset.created_at:
        return asset.created_at
    return None


def compute_asset_alert(asset: Asset) -> tuple[str, int | None]:
    activated = _effective_activation_date(asset)
    if not activated:
        return "ok", None
    due = activated + timedelta(days=WINDOWS_ACTIVATION_DAYS)
    days_left = (due - datetime.utcnow()).days
    if days_left < 0:
        return "critical", days_left
    if days_left <= WARNING_DAYS_BEFORE:
        return "warning", days_left
    return "ok", days_left


def _upsert_reminder(
    db: Session,
    *,
    reminder_type: AlertType,
    asset_id: int | None,
    title: str,
    description: str,
    due_date: datetime,
    interval_days: int | None,
    alert_status: AlertStatus,
) -> None:
    if alert_status == AlertStatus.OK:
        return
    q = db.query(Reminder).filter(
        Reminder.reminder_type == reminder_type,
        Reminder.is_resolved == False,
        Reminder.source == "auto",
    )
    if asset_id is not None:
        q = q.filter(Reminder.device_id == asset_id)
    else:
        q = q.filter(Reminder.device_id.is_(None), Reminder.title == title)
    existing = q.first()
    if existing:
        existing.due_date = due_date
        existing.status = alert_status
        existing.title = title
        existing.description = description
        existing.interval_days = interval_days
    else:
        db.add(
            Reminder(
                title=title,
                description=description,
                reminder_type=reminder_type,
                device_id=asset_id,
                due_date=due_date,
                interval_days=interval_days,
                status=alert_status,
                source="auto",
            )
        )


def sync_windows_reminders(db: Session) -> None:
    assets = db.query(Asset).filter(Asset.asset_type.in_([AssetType.PC, AssetType.SERVER])).all()
    for asset in assets:
        activated = _effective_activation_date(asset)
        if not activated:
            continue
        status, days_left = compute_asset_alert(asset)
        due_date = activated + timedelta(days=WINDOWS_ACTIVATION_DAYS)
        alert_status = AlertStatus.OK
        if status == "critical":
            alert_status = AlertStatus.CRITICAL
        elif status == "warning":
            alert_status = AlertStatus.WARNING

        unit = asset.location or asset.assigned_to or "—"
        title = f"موعد اکتیو ویندوز — {unit} — {asset.name}"
        desc = f"ثبت/فعال‌سازی: {activated.date().isoformat()} | سریال: {asset.serial_number or '—'} | IP: {asset.ip_address or '—'}"
        if days_left is not None and days_left < 0:
            desc += f" | {abs(days_left)} روز گذشته از موعد ۱۸۰ روزه"
        elif days_left is not None:
            desc += f" | {days_left} روز تا موعد"

        _upsert_reminder(
            db,
            reminder_type=AlertType.WINDOWS_ACTIVATION,
            asset_id=asset.id,
            title=title,
            description=desc,
            due_date=due_date,
            interval_days=WINDOWS_ACTIVATION_DAYS,
            alert_status=alert_status,
        )


def sync_pm_reminders(db: Session) -> None:
    assets = db.query(Asset).all()
    now = datetime.utcnow()
    for asset in assets:
        latest = (
            db.query(PMVisit)
            .filter(PMVisit.device_id == asset.id, PMVisit.work_type == "pm")
            .order_by(PMVisit.visit_date.desc())
            .first()
        )
        if not latest or not latest.next_pm_date:
            continue

        due_date = latest.next_pm_date
        warning_days = latest.alert_warning_days if latest.alert_warning_days else WARNING_DAYS_BEFORE

        if latest.alert_description:
            desc = latest.alert_description
        else:
            desc = f"دریافت: {latest.visit_date.date().isoformat()}"
            if latest.return_date:
                desc += f" · تحویل: {latest.return_date.date().isoformat()}"
            desc += f" · انجام‌دهنده: {latest.performed_by}"
            if latest.recipient_unit:
                desc += f" · واحد: {latest.recipient_unit}"

        if latest.alert_title:
            title = latest.alert_title
        else:
            unit = latest.recipient_unit or asset.location or asset.assigned_to or "—"
            title = f"موعد تعمیرات — {unit} — {asset.name}"

        days_left = (due_date - now).days
        seconds_left = (due_date - now).total_seconds()
        if seconds_left <= 0:
            alert_status = AlertStatus.CRITICAL
            if not latest.alert_description:
                desc += f" | موعد گذشته"
        elif warning_days <= 0:
            continue
        elif days_left <= warning_days:
            alert_status = AlertStatus.WARNING
            if not latest.alert_description:
                desc += f" | {days_left} روز تا موعد تعمیرات"
        else:
            continue

        _upsert_reminder(
            db,
            reminder_type=AlertType.MAINTENANCE,
            asset_id=asset.id,
            title=title,
            description=desc,
            due_date=due_date,
            interval_days=warning_days,
            alert_status=alert_status,
        )


def sync_inventory_reminders(db: Session) -> None:
    items = db.query(InventoryItem).filter(InventoryItem.status.in_(["received", "pending_install"])).all()
    now = datetime.utcnow()
    for item in items:
        days_since = (now - item.received_date).days
        if days_since < INVENTORY_PENDING_DAYS:
            continue
        due_date = item.received_date + timedelta(days=INVENTORY_PENDING_DAYS)
        alert_status = AlertStatus.CRITICAL if days_since > INVENTORY_PENDING_DAYS * 2 else AlertStatus.WARNING
        desc = f"دریافت: {item.received_date.date().isoformat()} | {days_since} روز در انتظار نصب"
        if item.purpose:
            desc += f" | کاربرد: {item.purpose}"

        _upsert_reminder(
            db,
            reminder_type=AlertType.CUSTOM,
            asset_id=None,
            title=f"نصب نشده — {item.name}",
            description=desc,
            due_date=due_date,
            interval_days=None,
            alert_status=alert_status,
        )


def sync_warranty_reminders(db: Session) -> None:
    assets = db.query(Asset).filter(Asset.warranty_end_date.isnot(None)).all()
    now = datetime.utcnow()
    for asset in assets:
        due_date = asset.warranty_end_date
        days_left = (due_date - now).days
        if days_left > WARNING_DAYS_BEFORE:
            continue
        if days_left < 0:
            alert_status = AlertStatus.CRITICAL
            desc = f"گارانتی {abs(days_left)} روز پیش تمام شده"
        else:
            alert_status = AlertStatus.WARNING
            desc = f"{days_left} روز تا پایان گارانتی"
        if asset.vendor_name:
            desc += f" | تأمین‌کننده: {asset.vendor_name}"
        if asset.vendor_phone:
            desc += f" | {asset.vendor_phone}"
        _upsert_reminder(
            db,
            reminder_type=AlertType.LICENSE,
            asset_id=asset.id,
            title=f"پایان گارانتی — {asset.name}",
            description=desc,
            due_date=due_date,
            interval_days=WARNING_DAYS_BEFORE,
            alert_status=alert_status,
        )


def sync_all_reminders(db: Session) -> None:
    sync_windows_reminders(db)
    sync_pm_reminders(db)
    sync_inventory_reminders(db)
    sync_warranty_reminders(db)
    db.commit()


def resolve_reminder(db: Session, reminder_id: int, resolved_by: str) -> Reminder | None:
    reminder = db.query(Reminder).filter(Reminder.id == reminder_id).first()
    if not reminder:
        return None
    reminder.is_resolved = True
    reminder.resolved_at = datetime.utcnow()
    reminder.resolved_by = resolved_by
    reminder.status = AlertStatus.OK

    if reminder.reminder_type == AlertType.WINDOWS_ACTIVATION and reminder.device_id:
        asset = db.query(Asset).filter(Asset.id == reminder.device_id).first()
        if asset:
            asset.windows_activated_at = datetime.utcnow()

    # Recurring manual reminders
    if reminder.source == "manual" and reminder.interval_days:
        next_due = reminder.due_date + timedelta(days=reminder.interval_days)
        db.add(
            Reminder(
                title=reminder.title,
                description=reminder.description,
                reminder_type=reminder.reminder_type,
                device_id=reminder.device_id,
                due_date=next_due,
                interval_days=reminder.interval_days,
                warning_days=reminder.warning_days,
                source="manual",
                status=AlertStatus.OK,
            )
        )

    db.commit()
    db.refresh(reminder)
    return reminder
