from datetime import datetime
from sqlalchemy import String, Boolean, DateTime, Text, Integer, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
import enum

from app.core.database import Base


class AssetType(str, enum.Enum):
    PC = "pc"
    SERVER = "server"
    PRINTER = "printer"
    NETWORK = "network"
    OTHER = "other"


class AssetStatus(str, enum.Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    OFFLINE = "offline"
    FAULTY = "faulty"
    REPAIR = "repair"
    RETIRED = "retired"
    MISSING = "missing"


class AlertStatus(str, enum.Enum):
    OK = "ok"
    WARNING = "warning"
    CRITICAL = "critical"


class AlertType(str, enum.Enum):
    WINDOWS_ACTIVATION = "windows_activation"
    MAINTENANCE = "maintenance"
    LICENSE = "license"
    CUSTOM = "custom"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    username: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    full_name: Mapped[str] = mapped_column(String(200))
    hashed_password: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(50), default="technician")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    must_change_password: Mapped[bool] = mapped_column(Boolean, default=False)
    allow_passwordless_login: Mapped[bool] = mapped_column(Boolean, default=False)
    password_reset_code_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Department(Base):
    __tablename__ = "sections"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(200), unique=True)
    code: Mapped[str] = mapped_column(String(50), unique=True)
    floor: Mapped[str | None] = mapped_column(String(50), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    assets: Mapped[list["Asset"]] = relationship(back_populates="department")
    work_cases: Mapped[list["WorkCase"]] = relationship(back_populates="department")


class Asset(Base):
    __tablename__ = "devices"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(200))
    asset_type: Mapped[AssetType] = mapped_column(SAEnum(AssetType), default=AssetType.PC)
    serial_number: Mapped[str | None] = mapped_column(String(200), nullable=True)
    ip_address: Mapped[str | None] = mapped_column(String(50), nullable=True)
    mac_address: Mapped[str | None] = mapped_column(String(50), nullable=True)
    assigned_to: Mapped[str | None] = mapped_column(String(200), nullable=True)
    location: Mapped[str | None] = mapped_column(String(200), nullable=True)
    brand: Mapped[str | None] = mapped_column(String(100), nullable=True)
    model: Mapped[str | None] = mapped_column(String(100), nullable=True)
    toner_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    purchase_date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    warranty_end_date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    vendor_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    vendor_phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    section_id: Mapped[int | None] = mapped_column(ForeignKey("sections.id"), nullable=True)
    asset_code: Mapped[str | None] = mapped_column(String(100), nullable=True)
    hostname: Mapped[str | None] = mapped_column(String(200), nullable=True)
    unit: Mapped[str | None] = mapped_column(String(200), nullable=True)
    operational_status: Mapped[str] = mapped_column(String(30), default="active")
    system_name_old: Mapped[str | None] = mapped_column(String(200), nullable=True)
    user_name_id: Mapped[str | None] = mapped_column(String(200), nullable=True)
    section_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    floor: Mapped[str | None] = mapped_column(String(50), nullable=True)
    pm_date: Mapped[str | None] = mapped_column(String(50), nullable=True)
    # Legacy columns
    os_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    os_version: Mapped[str | None] = mapped_column(String(100), nullable=True)
    windows_key: Mapped[str | None] = mapped_column(String(200), nullable=True)
    windows_activated_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    cpu: Mapped[str | None] = mapped_column(String(200), nullable=True)
    ram: Mapped[str | None] = mapped_column(String(100), nullable=True)
    storage: Mapped[str | None] = mapped_column(String(200), nullable=True)
    gpu: Mapped[str | None] = mapped_column(String(200), nullable=True)
    monitor: Mapped[str | None] = mapped_column(String(200), nullable=True)
    raid: Mapped[str | None] = mapped_column(String(200), nullable=True)
    virtualization: Mapped[str | None] = mapped_column(String(100), nullable=True)
    hypervisor: Mapped[str | None] = mapped_column(String(100), nullable=True)
    rack: Mapped[str | None] = mapped_column(String(100), nullable=True)
    power_info: Mapped[str | None] = mapped_column(String(200), nullable=True)
    network_info: Mapped[str | None] = mapped_column(Text, nullable=True)
    services_info: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    department: Mapped["Department | None"] = relationship(back_populates="assets", foreign_keys=[section_id])
    work_cases: Mapped[list["WorkCase"]] = relationship(back_populates="asset")
    reminders: Mapped[list["Reminder"]] = relationship(back_populates="asset")
    maintenance_plans: Mapped[list["MaintenancePlan"]] = relationship(back_populates="asset")
    pm_visits: Mapped[list["PMVisit"]] = relationship(back_populates="asset")
    upgrades: Mapped[list["AssetUpgrade"]] = relationship(back_populates="asset", cascade="all, delete-orphan")
    hardware: Mapped["AssetHardware | None"] = relationship(back_populates="asset", uselist=False, cascade="all, delete-orphan")
    os_info: Mapped["OSInfo | None"] = relationship(back_populates="device", uselist=False, cascade="all, delete-orphan")
    sw_apps: Mapped[list["SoftwareApp"]] = relationship(back_populates="device", cascade="all, delete-orphan")
    images: Mapped[list["AssetImage"]] = relationship(back_populates="asset", cascade="all, delete-orphan")


class AssetHardware(Base):
    __tablename__ = "hw_specs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    device_id: Mapped[int] = mapped_column(ForeignKey("devices.id"), unique=True, index=True)
    mb: Mapped[str | None] = mapped_column(String(200), nullable=True)
    cpu: Mapped[str | None] = mapped_column(String(200), nullable=True)
    ram: Mapped[str | None] = mapped_column(String(200), nullable=True)
    vga: Mapped[str | None] = mapped_column(String(200), nullable=True)
    power: Mapped[str | None] = mapped_column(String(200), nullable=True)
    hard: Mapped[str | None] = mapped_column(String(200), nullable=True)
    monitor_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    monitor_asset_code: Mapped[str | None] = mapped_column(String(100), nullable=True)
    printer_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    printer_asset_code: Mapped[str | None] = mapped_column(String(100), nullable=True)

    asset: Mapped["Asset"] = relationship(back_populates="hardware")


class OSInfo(Base):
    __tablename__ = "os_info"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    device_id: Mapped[int] = mapped_column(ForeignKey("devices.id"), unique=True, index=True)
    os_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    os_version: Mapped[str | None] = mapped_column(String(200), nullable=True)
    windows_key: Mapped[str | None] = mapped_column(String(200), nullable=True)
    windows_activated_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    license_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    device: Mapped["Asset"] = relationship(back_populates="os_info")


class SoftwareApp(Base):
    __tablename__ = "sw_apps"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    device_id: Mapped[int] = mapped_column(ForeignKey("devices.id"), index=True)
    app_name: Mapped[str] = mapped_column(String(200))
    version: Mapped[str | None] = mapped_column(String(100), nullable=True)
    license_key: Mapped[str | None] = mapped_column(String(300), nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="active")
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    device: Mapped["Asset"] = relationship(back_populates="sw_apps")


class AssetImage(Base):
    __tablename__ = "photes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    device_id: Mapped[int] = mapped_column(ForeignKey("devices.id"), index=True)
    stored_name: Mapped[str] = mapped_column(String(300))
    original_name: Mapped[str] = mapped_column(String(300))
    content_type: Mapped[str] = mapped_column(String(100), default="image/jpeg")
    size_bytes: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    asset: Mapped["Asset"] = relationship(back_populates="images")


class AssetUpgrade(Base):
    __tablename__ = "hw_upgrades"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    device_id: Mapped[int] = mapped_column(ForeignKey("devices.id"), index=True)
    title: Mapped[str] = mapped_column(String(300))
    component: Mapped[str | None] = mapped_column(String(100), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    upgraded_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    upgraded_by: Mapped[str] = mapped_column(String(200))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    asset: Mapped["Asset"] = relationship(back_populates="upgrades")


class PMChecklistTemplate(Base):
    __tablename__ = "checklist_templates"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(200))
    category: Mapped[str] = mapped_column(String(50), default="general")
    interval_days: Mapped[int | None] = mapped_column(Integer, nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)


class PMVisit(Base):
    __tablename__ = "service_visits"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    visit_date: Mapped[datetime] = mapped_column(DateTime)
    return_date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    next_pm_date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    recipient_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    recipient_unit: Mapped[str | None] = mapped_column(String(200), nullable=True)
    device_id: Mapped[int | None] = mapped_column(ForeignKey("devices.id"), nullable=True)
    section_id: Mapped[int | None] = mapped_column(ForeignKey("sections.id"), nullable=True)
    performed_by: Mapped[str] = mapped_column(String(200))
    technician_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    alert_title: Mapped[str | None] = mapped_column(String(300), nullable=True)
    alert_description: Mapped[str | None] = mapped_column(Text, nullable=True)
    alert_warning_days: Mapped[int | None] = mapped_column(Integer, nullable=True, default=30)
    work_type: Mapped[str] = mapped_column(String(20), default="pm")
    title: Mapped[str | None] = mapped_column(String(300), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    asset: Mapped["Asset | None"] = relationship(back_populates="pm_visits")
    tasks: Mapped[list["PMVisitTask"]] = relationship(back_populates="visit", cascade="all, delete-orphan")


class PMVisitTask(Base):
    __tablename__ = "visit_tasks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    visit_id: Mapped[int] = mapped_column(ForeignKey("service_visits.id"))
    task_name: Mapped[str] = mapped_column(String(200))
    is_done: Mapped[bool] = mapped_column(Boolean, default=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    visit: Mapped["PMVisit"] = relationship(back_populates="tasks")


class InventoryItem(Base):
    __tablename__ = "stock_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(300))
    category: Mapped[str] = mapped_column(String(100), default="hardware")
    serial_number: Mapped[str | None] = mapped_column(String(200), nullable=True)
    quantity: Mapped[int] = mapped_column(Integer, default=1)
    received_date: Mapped[datetime] = mapped_column(DateTime)
    installed_date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    section_id: Mapped[int | None] = mapped_column(ForeignKey("sections.id"), nullable=True)
    purpose: Mapped[str | None] = mapped_column(String(300), nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="received")
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    device_id: Mapped[int | None] = mapped_column(ForeignKey("devices.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class WorkCase(Base):
    __tablename__ = "work_orders"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(300))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    section_id: Mapped[int | None] = mapped_column(ForeignKey("sections.id"), nullable=True)
    device_id: Mapped[int | None] = mapped_column(ForeignKey("devices.id"), nullable=True)
    performed_by: Mapped[str] = mapped_column(String(200))
    technician_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    work_type: Mapped[str] = mapped_column(String(100), default="maintenance")
    status: Mapped[str] = mapped_column(String(50), default="completed")
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    department: Mapped["Department | None"] = relationship(back_populates="work_cases")
    asset: Mapped["Asset | None"] = relationship(back_populates="work_cases")


class Reminder(Base):
    __tablename__ = "alerts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(300))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    reminder_type: Mapped[AlertType] = mapped_column(SAEnum(AlertType), default=AlertType.CUSTOM)
    device_id: Mapped[int | None] = mapped_column(ForeignKey("devices.id"), nullable=True)
    due_date: Mapped[datetime] = mapped_column(DateTime)
    interval_days: Mapped[int | None] = mapped_column(Integer, nullable=True)
    warning_days: Mapped[int | None] = mapped_column(Integer, nullable=True, default=30)
    source: Mapped[str] = mapped_column(String(20), default="auto")
    status: Mapped[AlertStatus] = mapped_column(SAEnum(AlertStatus), default=AlertStatus.OK)
    is_resolved: Mapped[bool] = mapped_column(Boolean, default=False)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    resolved_by: Mapped[str | None] = mapped_column(String(200), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    asset: Mapped["Asset | None"] = relationship(back_populates="reminders")


class PushSubscription(Base):
    __tablename__ = "push_subs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    endpoint: Mapped[str] = mapped_column(Text)
    p256dh: Mapped[str] = mapped_column(String(300))
    auth: Mapped[str] = mapped_column(String(200))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class MaintenancePlan(Base):
    __tablename__ = "maint_plans"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(300))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    device_id: Mapped[int | None] = mapped_column(ForeignKey("devices.id"), nullable=True)
    section_id: Mapped[int | None] = mapped_column(ForeignKey("sections.id"), nullable=True)
    interval_days: Mapped[int] = mapped_column(Integer, default=90)
    next_due_date: Mapped[datetime] = mapped_column(DateTime)
    last_performed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    asset: Mapped["Asset | None"] = relationship(back_populates="maintenance_plans")


class ActivityLog(Base):
    """Kept for backward compat reads; new logs go to MongoDB."""
    __tablename__ = "activity_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    user_name: Mapped[str] = mapped_column(String(200))
    action: Mapped[str] = mapped_column(String(100))
    entity_type: Mapped[str] = mapped_column(String(50))
    entity_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    details: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class SystemConfig(Base):
    __tablename__ = "app_config"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    key: Mapped[str] = mapped_column(String(100), unique=True)
    value: Mapped[str] = mapped_column(Text)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class PasswordResetRequest(Base):
    __tablename__ = "pwd_resets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    username: Mapped[str] = mapped_column(String(100))
    full_name: Mapped[str] = mapped_column(String(200))
    status: Mapped[str] = mapped_column(String(20), default="pending", index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    resolved_by: Mapped[str | None] = mapped_column(String(200), nullable=True)


class Attachment(Base):
    __tablename__ = "file_attachments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    entity_type: Mapped[str] = mapped_column(String(50))
    entity_id: Mapped[int] = mapped_column(Integer, index=True)
    stored_name: Mapped[str] = mapped_column(String(300))
    original_name: Mapped[str] = mapped_column(String(300))
    content_type: Mapped[str] = mapped_column(String(100), default="application/octet-stream")
    size_bytes: Mapped[int] = mapped_column(Integer, default=0)
    uploaded_by: Mapped[str] = mapped_column(String(200))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
