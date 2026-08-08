from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models import Ticket, TicketCategory, TicketReply, TicketStatus, Urgency
from app.realtime import enqueue
from app.schemas import GuestCreateTicket, ReplyBody, UpdateStatusBody
from app.security import require_admin
from app.serialize import dump_reply, dump_ticket
from app.tickets_repo import apply_ticket_filters, load_ticket, next_ticket_number, reply_count_subq

router = APIRouter(prefix="/api/tickets", tags=["tickets"])


@router.post("", status_code=201)
@router.post("/", status_code=201)
def create_guest(body: GuestCreateTicket, bg: BackgroundTasks, db: Session = Depends(get_db)):
    ticket = Ticket(
        ticketNumber=next_ticket_number(db),
        subject=body.subject,
        description=body.description,
        urgency=Urgency(body.urgency),
        category=TicketCategory(body.category),
        staffName=body.staffName,
        staffDepartment=body.staffDepartment,
        staffPhone=body.staffPhone,
        staffEmail=body.staffEmail or None,
    )
    db.add(ticket)
    db.commit()
    db.refresh(ticket)
    payload = dump_ticket(ticket)
    enqueue(bg, "ticket:created", ticket.id, ticket.staffId, payload)
    return payload


@router.get("")
@router.get("/")
def list_tickets(
    status: str | None = Query(None),
    urgency: str | None = Query(None),
    search: str | None = Query(None),
    _: str = Depends(require_admin),
    db: Session = Depends(get_db),
):
    count_col = reply_count_subq().label("replies_count")
    q = apply_ticket_filters(
        db.query(Ticket, count_col),
        status=status,
        urgency=urgency,
        search=search,
    )
    rows = q.order_by(Ticket.urgency.desc(), Ticket.createdAt.desc()).all()
    return [dump_ticket(ticket, replies_count=int(cnt or 0)) for ticket, cnt in rows]


@router.get("/stats")
def stats(_: str = Depends(require_admin), db: Session = Depends(get_db)):
    return {
        "total": db.query(func.count(Ticket.id)).scalar() or 0,
        "open": db.query(func.count(Ticket.id)).filter(Ticket.status == TicketStatus.OPEN).scalar() or 0,
        "inProgress": db.query(func.count(Ticket.id))
        .filter(Ticket.status == TicketStatus.IN_PROGRESS)
        .scalar()
        or 0,
        "resolved": db.query(func.count(Ticket.id))
        .filter(Ticket.status == TicketStatus.RESOLVED)
        .scalar()
        or 0,
        "critical": db.query(func.count(Ticket.id))
        .filter(Ticket.urgency == Urgency.CRITICAL, Ticket.status != TicketStatus.CLOSED)
        .scalar()
        or 0,
    }


@router.get("/{ticket_id}")
def get_ticket(ticket_id: str, _: str = Depends(require_admin), db: Session = Depends(get_db)):
    ticket = load_ticket(db, ticket_id)
    if not ticket:
        raise HTTPException(404, "تیکت یافت نشد")
    return dump_ticket(ticket, with_replies=True)


@router.patch("/{ticket_id}/status")
def update_status(
    ticket_id: str,
    body: UpdateStatusBody,
    bg: BackgroundTasks,
    _: str = Depends(require_admin),
    db: Session = Depends(get_db),
):
    ticket = db.get(Ticket, ticket_id)
    if not ticket:
        raise HTTPException(404, "تیکت یافت نشد")
    ticket.status = TicketStatus(body.status)
    db.commit()
    db.refresh(ticket)
    payload = dump_ticket(ticket)
    enqueue(bg, "ticket:updated", ticket.id, ticket.staffId, payload)
    return payload


@router.post("/{ticket_id}/replies", status_code=201)
def add_reply(
    ticket_id: str,
    body: ReplyBody,
    bg: BackgroundTasks,
    admin_id: str = Depends(require_admin),
    db: Session = Depends(get_db),
):
    ticket = db.get(Ticket, ticket_id)
    if not ticket:
        raise HTTPException(404, "تیکت یافت نشد")

    reply = TicketReply(message=body.message, ticketId=ticket.id, adminId=admin_id)
    db.add(reply)
    if ticket.status == TicketStatus.OPEN:
        ticket.status = TicketStatus.IN_PROGRESS
    db.commit()

    reply = (
        db.query(TicketReply)
        .options(joinedload(TicketReply.admin))
        .filter(TicketReply.id == reply.id)
        .first()
    )
    db.refresh(ticket)
    reply_payload = dump_reply(reply)
    enqueue(
        bg,
        "ticket:reply",
        ticket.id,
        ticket.staffId,
        {"reply": reply_payload, "ticket": dump_ticket(ticket)},
    )
    return reply_payload


@router.delete("/{ticket_id}")
def delete_ticket(
    ticket_id: str,
    bg: BackgroundTasks,
    _: str = Depends(require_admin),
    db: Session = Depends(get_db),
):
    ticket = db.get(Ticket, ticket_id)
    if not ticket:
        raise HTTPException(404, "تیکت یافت نشد")
    staff_id, tid = ticket.staffId, ticket.id
    db.delete(ticket)
    db.commit()
    enqueue(bg, "ticket:deleted", tid, staff_id, {"ticketId": tid})
    return {"message": "تیکت با موفقیت حذف شد"}
