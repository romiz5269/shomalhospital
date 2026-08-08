import random
from datetime import datetime, timezone

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, joinedload

from app.models import Ticket, TicketReply


def next_ticket_number(db: Session) -> str:
    for _ in range(20):
        stamp = datetime.now(timezone.utc).strftime("%Y%m%d")
        candidate = f"TKT-{stamp}-{random.randint(0, 9999):04d}"
        exists = db.query(Ticket.id).filter(Ticket.ticketNumber == candidate).first()
        if not exists:
            return candidate
    raise RuntimeError("could not allocate ticket number")


def reply_count_subq():
    return (
        select(func.count(TicketReply.id))
        .where(TicketReply.ticketId == Ticket.id)
        .correlate(Ticket)
        .scalar_subquery()
    )


def load_ticket(db: Session, ticket_id: str) -> Ticket | None:
    return (
        db.query(Ticket)
        .options(joinedload(Ticket.replies).joinedload(TicketReply.admin))
        .filter(Ticket.id == ticket_id)
        .first()
    )


def apply_ticket_filters(q, *, status=None, urgency=None, search=None, staff_id=None):
    from app.models import TicketStatus, Urgency

    if staff_id:
        q = q.filter(Ticket.staffId == staff_id)
    if status:
        q = q.filter(Ticket.status == TicketStatus(status))
    if urgency:
        q = q.filter(Ticket.urgency == Urgency(urgency))
    if search:
        pattern = f"%{search}%"
        clauses = [
            Ticket.subject.ilike(pattern),
            Ticket.ticketNumber.ilike(pattern),
        ]
        if staff_id is None:
            clauses.append(Ticket.staffName.ilike(pattern))
        q = q.filter(or_(*clauses))
    return q
