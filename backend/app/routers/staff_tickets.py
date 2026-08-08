from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Staff, Ticket, TicketCategory, TicketReply, Urgency
from app.realtime import enqueue
from app.schemas import StaffCreateTicket
from app.security import require_staff
from app.serialize import dump_ticket
from app.tickets_repo import apply_ticket_filters, load_ticket, next_ticket_number, reply_count_subq

router = APIRouter(prefix="/api/staff/tickets", tags=["staff-tickets"])


@router.get("")
@router.get("/")
def list_mine(
    search: str | None = Query(None),
    status: str | None = Query(None),
    staff_id: str = Depends(require_staff),
    db: Session = Depends(get_db),
):
    count_col = reply_count_subq().label("replies_count")
    q = apply_ticket_filters(
        db.query(Ticket, count_col),
        status=status,
        search=search,
        staff_id=staff_id,
    )
    rows = q.order_by(Ticket.createdAt.desc()).all()
    return [dump_ticket(ticket, replies_count=int(cnt or 0)) for ticket, cnt in rows]


@router.get("/track/{ticket_number}")
def track(
    ticket_number: str,
    staff_id: str = Depends(require_staff),
    db: Session = Depends(get_db),
):
    ticket = (
        db.query(Ticket)
        .filter(Ticket.ticketNumber == ticket_number, Ticket.staffId == staff_id)
        .first()
    )
    if not ticket:
        raise HTTPException(404, "تیکت با این کد پیگیری یافت نشد")
    cnt = db.query(func.count(TicketReply.id)).filter(TicketReply.ticketId == ticket.id).scalar() or 0
    return dump_ticket(ticket, replies_count=int(cnt))


@router.get("/{ticket_id}")
def detail(
    ticket_id: str,
    staff_id: str = Depends(require_staff),
    db: Session = Depends(get_db),
):
    ticket = load_ticket(db, ticket_id)
    if not ticket or ticket.staffId != staff_id:
        raise HTTPException(404, "تیکت یافت نشد")
    return dump_ticket(ticket, with_replies=True, hide_admin_email=True)


@router.post("", status_code=201)
@router.post("/", status_code=201)
def create(
    body: StaffCreateTicket,
    bg: BackgroundTasks,
    staff_id: str = Depends(require_staff),
    db: Session = Depends(get_db),
):
    staff = db.get(Staff, staff_id)
    if not staff:
        raise HTTPException(401, "کاربر یافت نشد")

    ticket = Ticket(
        ticketNumber=next_ticket_number(db),
        subject=body.subject,
        description=body.description,
        urgency=Urgency(body.urgency),
        category=TicketCategory(body.category),
        staffName=staff.name,
        staffDepartment=staff.department,
        staffPhone=staff.phone,
        staffEmail=staff.email,
        staffId=staff.id,
    )
    db.add(ticket)
    db.commit()
    db.refresh(ticket)
    payload = dump_ticket(ticket, replies_count=0)
    enqueue(bg, "ticket:created", ticket.id, staff.id, payload)
    return payload
