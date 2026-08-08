import enum
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Index, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.ids import new_id


class Urgency(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class TicketCategory(str, enum.Enum):
    IT = "IT"
    MEDICAL_EQUIPMENT = "MEDICAL_EQUIPMENT"
    FACILITIES = "FACILITIES"
    HR = "HR"
    PHARMACY = "PHARMACY"
    OTHER = "OTHER"


class TicketStatus(str, enum.Enum):
    OPEN = "OPEN"
    IN_PROGRESS = "IN_PROGRESS"
    RESOLVED = "RESOLVED"
    CLOSED = "CLOSED"


class Admin(Base):
    __tablename__ = "Admin"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_id)
    email: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    password: Mapped[str] = mapped_column(String, nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    createdAt: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updatedAt: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    replies: Mapped[list["TicketReply"]] = relationship(back_populates="admin")


class Staff(Base):
    __tablename__ = "Staff"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_id)
    email: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    password: Mapped[str] = mapped_column(String, nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    department: Mapped[str] = mapped_column(String, nullable=False)
    phone: Mapped[str] = mapped_column(String, nullable=False)
    createdAt: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updatedAt: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    tickets: Mapped[list["Ticket"]] = relationship(back_populates="staff")


class Ticket(Base):
    __tablename__ = "Ticket"
    __table_args__ = (
        Index("Ticket_status_idx", "status"),
        Index("Ticket_urgency_idx", "urgency"),
        Index("Ticket_createdAt_idx", "createdAt"),
        Index("Ticket_staffId_idx", "staffId"),
        Index("Ticket_ticketNumber_idx", "ticketNumber"),
    )

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_id)
    ticketNumber: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    subject: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    urgency: Mapped[Urgency] = mapped_column(
        Enum(Urgency, name="Urgency", create_constraint=False, native_enum=True),
        default=Urgency.MEDIUM,
        nullable=False,
    )
    category: Mapped[TicketCategory] = mapped_column(
        Enum(TicketCategory, name="TicketCategory", create_constraint=False, native_enum=True),
        default=TicketCategory.OTHER,
        nullable=False,
    )
    status: Mapped[TicketStatus] = mapped_column(
        Enum(TicketStatus, name="TicketStatus", create_constraint=False, native_enum=True),
        default=TicketStatus.OPEN,
        nullable=False,
    )
    staffName: Mapped[str] = mapped_column(String, nullable=False)
    staffDepartment: Mapped[str] = mapped_column(String, nullable=False)
    staffPhone: Mapped[str] = mapped_column(String, nullable=False)
    staffEmail: Mapped[str | None] = mapped_column(String, nullable=True)
    staffId: Mapped[str | None] = mapped_column(
        String, ForeignKey("Staff.id", ondelete="SET NULL"), nullable=True
    )
    createdAt: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updatedAt: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    staff: Mapped[Staff | None] = relationship(back_populates="tickets")
    replies: Mapped[list["TicketReply"]] = relationship(
        back_populates="ticket", cascade="all, delete-orphan"
    )


class TicketReply(Base):
    __tablename__ = "TicketReply"
    __table_args__ = (Index("TicketReply_ticketId_idx", "ticketId"),)

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_id)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    ticketId: Mapped[str] = mapped_column(
        String, ForeignKey("Ticket.id", ondelete="CASCADE"), nullable=False
    )
    adminId: Mapped[str] = mapped_column(
        String, ForeignKey("Admin.id", ondelete="CASCADE"), nullable=False
    )
    createdAt: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    ticket: Mapped[Ticket] = relationship(back_populates="replies")
    admin: Mapped[Admin] = relationship(back_populates="replies")
