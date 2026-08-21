from datetime import datetime

from app.models import Asset, PMVisit


def build_pm_alert_title(visit: PMVisit, asset: Asset | None) -> str:
    unit = visit.recipient_unit or (asset.location if asset else None) or (asset.assigned_to if asset else None) or "—"
    name = asset.name if asset else (visit.recipient_name or "—")
    return f"موعد تعمیرات — {unit} — {name}"


def build_pm_alert_description(visit: PMVisit, asset: Asset | None, due_date: datetime | None = None) -> str:
    parts: list[str] = []
    parts.append(f"دریافت: {visit.visit_date.strftime('%Y-%m-%d %H:%M')}")
    if visit.return_date:
        parts.append(f"تحویل: {visit.return_date.strftime('%Y-%m-%d %H:%M')}")
    if visit.performed_by:
        parts.append(f"انجام‌دهنده: {visit.performed_by}")
    if visit.recipient_unit:
        parts.append(f"واحد: {visit.recipient_unit}")
    if asset:
        if asset.ip_address:
            parts.append(f"IP: {asset.ip_address}")
        if asset.serial_number:
            parts.append(f"سریال: {asset.serial_number}")
    if due_date:
        now = datetime.utcnow()
        if due_date <= now:
            parts.append("وضعیت: موعد گذشته")
        else:
            delta = due_date - now
            if delta.days == 0:
                parts.append("وضعیت: موعد امروز")
            else:
                parts.append(f"مانده: {delta.days} روز")
    return " · ".join(parts)


def apply_pm_alert_defaults(
    *,
    alert_title: str | None,
    alert_description: str | None,
    visit: PMVisit,
    asset: Asset | None,
    next_pm_date: datetime | None,
) -> tuple[str | None, str | None]:
    if (visit.work_type or "pm") != "pm" or not next_pm_date:
        return alert_title, alert_description
    title = alert_title.strip() if alert_title and alert_title.strip() else build_pm_alert_title(visit, asset)
    desc = alert_description.strip() if alert_description and alert_description.strip() else build_pm_alert_description(
        visit, asset, next_pm_date
    )
    return title, desc
