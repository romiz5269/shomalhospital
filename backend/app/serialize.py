from datetime import datetime
from typing import Any

from app.models import Ticket, TicketReply


def _dt(value: datetime | None) -> str | None:
    if value is None:
        return None
    text = value.isoformat()
    if value.tzinfo is None:
        return f"{text}Z"
    return text.replace("+00:00", "Z")


def _enum(value: Any) -> Any:
    return getattr(value, "value", value)


def dump_ticket(
    ticket: Ticket,
    *,
    replies_count: int | None = None,
    with_replies: bool = False,
    hide_admin_email: bool = False,
) -> dict[str, Any]:
    data = {
        "id": ticket.id,
        "ticketNumber": ticket.ticketNumber,
        "subject": ticket.subject,
        "description": ticket.description,
        "urgency": _enum(ticket.urgency),
        "category": _enum(ticket.category),
        "status": _enum(ticket.status),
        "staffName": ticket.staffName,
        "staffDepartment": ticket.staffDepartment,
        "staffPhone": ticket.staffPhone,
        "staffEmail": ticket.staffEmail,
        "staffId": ticket.staffId,
        "createdAt": _dt(ticket.createdAt),
        "updatedAt": _dt(ticket.updatedAt),
    }
    if replies_count is not None:
        data["_count"] = {"replies": replies_count}
    if with_replies:
        ordered = sorted(ticket.replies, key=lambda r: r.createdAt or datetime.min)
        data["replies"] = [dump_reply(r, include_email=not hide_admin_email) for r in ordered]
    return data


def dump_reply(reply: TicketReply, *, include_email: bool = True) -> dict[str, Any]:
    admin = {"id": reply.admin.id, "name": reply.admin.name}
    if include_email:
        admin["email"] = reply.admin.email
    return {
        "id": reply.id,
        "message": reply.message,
        "ticketId": reply.ticketId,
        "adminId": reply.adminId,
        "createdAt": _dt(reply.createdAt),
        "admin": admin,
    }


def dump_admin(admin) -> dict[str, Any]:
    return {
        "id": admin.id,
        "name": admin.name,
        "email": admin.email,
        "createdAt": _dt(admin.createdAt),
    }


def dump_staff(staff) -> dict[str, Any]:
    return {
        "id": staff.id,
        "name": staff.name,
        "email": staff.email,
        "department": staff.department,
        "phone": staff.phone,
        "createdAt": _dt(staff.createdAt),
    }
