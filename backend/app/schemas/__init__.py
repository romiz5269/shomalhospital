from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field


# Auth
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    must_change_password: bool = False


class LoginRequest(BaseModel):
    username: str
    password: str = ""
    remember: bool = False


class UserCreate(BaseModel):
    username: str
    email: EmailStr
    full_name: str
    password: str
    role: str = "technician"


class UserOut(BaseModel):
    id: int
    username: str
    email: str
    full_name: str
    role: str
    is_active: bool
    must_change_password: bool = False
    allow_passwordless_login: bool = False

    class Config:
        from_attributes = True


class UserSessionOut(UserOut):
    access_token: str
    token_type: str = "bearer"
    expires_in: int


class PasswordResetRequestOut(BaseModel):
    id: int
    user_id: int
    username: str
    full_name: str
    status: str
    created_at: datetime
    resolved_at: Optional[datetime] = None
    resolved_by: Optional[str] = None

    class Config:
        from_attributes = True


# Department
class DepartmentBase(BaseModel):
    name: str
    code: str
    floor: Optional[str] = None
    description: Optional[str] = None


class DepartmentCreate(DepartmentBase):
    pass


class DepartmentUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    floor: Optional[str] = None
    description: Optional[str] = None


class DepartmentOut(DepartmentBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


# Asset Hardware / Software nested
class AssetHardwareSchema(BaseModel):
    mb: Optional[str] = None
    cpu: Optional[str] = None
    ram: Optional[str] = None
    vga: Optional[str] = None
    power: Optional[str] = None
    hard: Optional[str] = None
    monitor_name: Optional[str] = None
    monitor_asset_code: Optional[str] = None
    printer_name: Optional[str] = None
    printer_asset_code: Optional[str] = None

    class Config:
        from_attributes = True


class AssetSoftwareSchema(BaseModel):
    os_name: Optional[str] = None
    antivirus: Optional[str] = None
    antivirus_status: Optional[str] = None
    mail_user: Optional[str] = None
    windows_key: Optional[str] = None

    class Config:
        from_attributes = True


class AssetImageOut(BaseModel):
    id: int
    stored_name: str
    original_name: str
    content_type: str = "image/jpeg"
    size_bytes: int = 0
    created_at: datetime

    class Config:
        from_attributes = True


# Asset
class AssetBase(BaseModel):
    name: str
    asset_type: str = "pc"
    serial_number: Optional[str] = None
    ip_address: Optional[str] = None
    mac_address: Optional[str] = None
    os_name: Optional[str] = None
    os_version: Optional[str] = None
    windows_key: Optional[str] = None
    windows_activated_at: Optional[datetime] = None
    assigned_to: Optional[str] = None
    location: Optional[str] = None
    brand: Optional[str] = None
    model: Optional[str] = None
    toner_type: Optional[str] = None
    notes: Optional[str] = None
    purchase_date: Optional[datetime] = None
    warranty_end_date: Optional[datetime] = None
    vendor_name: Optional[str] = None
    vendor_phone: Optional[str] = None
    asset_code: Optional[str] = None
    hostname: Optional[str] = None
    unit: Optional[str] = None
    operational_status: str = "active"
    cpu: Optional[str] = None
    ram: Optional[str] = None
    storage: Optional[str] = None
    gpu: Optional[str] = None
    monitor: Optional[str] = None
    raid: Optional[str] = None
    virtualization: Optional[str] = None
    hypervisor: Optional[str] = None
    rack: Optional[str] = None
    power_info: Optional[str] = None
    network_info: Optional[str] = None
    services_info: Optional[str] = None
    system_name_old: Optional[str] = None
    user_name_id: Optional[str] = None
    section_name: Optional[str] = None
    section_id: Optional[str] = None
    floor: Optional[str] = None
    pm_date: Optional[str] = None


class AssetCreate(AssetBase):
    hardware: Optional[AssetHardwareSchema] = None
    software: Optional[AssetSoftwareSchema] = None


class AssetUpdate(BaseModel):
    name: Optional[str] = None
    asset_type: Optional[str] = None
    serial_number: Optional[str] = None
    ip_address: Optional[str] = None
    mac_address: Optional[str] = None
    os_name: Optional[str] = None
    os_version: Optional[str] = None
    windows_key: Optional[str] = None
    windows_activated_at: Optional[datetime] = None
    assigned_to: Optional[str] = None
    location: Optional[str] = None
    brand: Optional[str] = None
    model: Optional[str] = None
    toner_type: Optional[str] = None
    notes: Optional[str] = None
    purchase_date: Optional[datetime] = None
    warranty_end_date: Optional[datetime] = None
    vendor_name: Optional[str] = None
    vendor_phone: Optional[str] = None
    asset_code: Optional[str] = None
    hostname: Optional[str] = None
    unit: Optional[str] = None
    operational_status: Optional[str] = None
    cpu: Optional[str] = None
    ram: Optional[str] = None
    storage: Optional[str] = None
    gpu: Optional[str] = None
    monitor: Optional[str] = None
    raid: Optional[str] = None
    virtualization: Optional[str] = None
    hypervisor: Optional[str] = None
    rack: Optional[str] = None
    power_info: Optional[str] = None
    network_info: Optional[str] = None
    services_info: Optional[str] = None
    system_name_old: Optional[str] = None
    user_name_id: Optional[str] = None
    section_name: Optional[str] = None
    section_id: Optional[str] = None
    floor: Optional[str] = None
    pm_date: Optional[str] = None
    hardware: Optional[AssetHardwareSchema] = None
    software: Optional[AssetSoftwareSchema] = None


class AssetOut(AssetBase):
    id: int
    created_at: datetime
    updated_at: datetime
    alert_status: Optional[str] = None
    days_until_activation: Optional[int] = None
    last_received_date: Optional[datetime] = None
    last_return_date: Optional[datetime] = None
    next_service_date: Optional[datetime] = None
    hardware: Optional[AssetHardwareSchema] = None
    software: Optional[AssetSoftwareSchema] = None
    images: list[AssetImageOut] = []

    class Config:
        from_attributes = True


# Work Case
class WorkCaseBase(BaseModel):
    title: str
    description: Optional[str] = None
    department_id: Optional[int] = None
    asset_id: Optional[int] = None
    performed_by: str
    work_type: str = "maintenance"
    status: str = "completed"
    completed_at: Optional[datetime] = None


class WorkCaseCreate(WorkCaseBase):
    pass


class WorkCaseUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    department_id: Optional[int] = None
    asset_id: Optional[int] = None
    performed_by: Optional[str] = None
    work_type: Optional[str] = None
    status: Optional[str] = None
    completed_at: Optional[datetime] = None


class WorkCaseOut(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    department_id: Optional[int] = None
    asset_id: Optional[int] = None
    performed_by: str = ""
    work_type: str = "maintenance"
    status: str = "completed"
    completed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

    @classmethod
    def from_orm_compat(cls, obj):
        data = {f: getattr(obj, f, None) for f in cls.model_fields if f not in ("asset_id", "department_id")}
        data["asset_id"] = getattr(obj, "device_id", None)
        data["department_id"] = getattr(obj, "section_id", None)
        return cls(**data)


# Reminder
class ReminderBase(BaseModel):
    title: str
    description: Optional[str] = None
    reminder_type: str = "custom"
    asset_id: Optional[int] = None
    due_date: datetime
    interval_days: Optional[int] = None
    warning_days: Optional[int] = Field(default=30, ge=0, le=365)


class ReminderCreate(ReminderBase):
    source: str = "manual"


class ReminderUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    due_date: Optional[datetime] = None
    interval_days: Optional[int] = None
    warning_days: Optional[int] = Field(default=None, ge=0, le=365)
    is_resolved: Optional[bool] = None


class ReminderOut(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    reminder_type: str = "custom"
    asset_id: Optional[int] = None
    due_date: datetime
    interval_days: Optional[int] = None
    warning_days: Optional[int] = 30
    status: str
    source: str = "auto"
    is_resolved: bool
    resolved_at: Optional[datetime] = None
    resolved_by: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

    def __init__(self, **data):
        if "device_id" in data and "asset_id" not in data:
            data["asset_id"] = data.pop("device_id")
        super().__init__(**data)

    @classmethod
    def model_validate(cls, obj, *args, **kwargs):
        if hasattr(obj, "device_id"):
            d = {}
            for f in cls.model_fields:
                if f == "asset_id":
                    d[f] = getattr(obj, "device_id", None)
                elif f == "reminder_type":
                    d[f] = getattr(obj, "reminder_type", "custom")
                    if hasattr(d[f], "value"):
                        d[f] = d[f].value
                elif f == "status":
                    val = getattr(obj, "status", "ok")
                    d[f] = val.value if hasattr(val, "value") else val
                else:
                    d[f] = getattr(obj, f, None)
            return cls(**d)
        return super().model_validate(obj, *args, **kwargs)


# Maintenance Plan (before DashboardStats)
class MaintenancePlanBase(BaseModel):
    title: str
    description: Optional[str] = None
    asset_id: Optional[int] = None
    department_id: Optional[int] = None
    interval_days: int = 90
    next_due_date: datetime
    is_active: bool = True


class MaintenancePlanCreate(MaintenancePlanBase):
    pass


class MaintenancePlanUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    asset_id: Optional[int] = None
    department_id: Optional[int] = None
    interval_days: Optional[int] = None
    next_due_date: Optional[datetime] = None
    is_active: Optional[bool] = None


class MaintenancePlanOut(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    asset_id: Optional[int] = None
    department_id: Optional[int] = None
    interval_days: int = 90
    next_due_date: datetime
    is_active: bool = True
    last_performed_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True

    @classmethod
    def from_orm_compat(cls, obj):
        data = {f: getattr(obj, f, None) for f in cls.model_fields if f not in ("asset_id", "department_id")}
        data["asset_id"] = getattr(obj, "device_id", None)
        data["department_id"] = getattr(obj, "section_id", None)
        return cls(**data)


from app.schemas.pm import PMVisitOut, InventoryItemOut


class DashboardStats(BaseModel):
    total_assets: int
    total_departments: int
    total_pm_visits: int
    critical_alerts: int
    warning_alerts: int
    ok_alerts: int
    overdue_pm: int
    inventory_pending: int
    assets_by_type: dict[str, int]
    compliance_rate: float
    recent_pm_visits: list[PMVisitOut]
    active_alerts: list[ReminderOut]
    upcoming_pm: list[PMVisitOut]
    recent_inventory: list[InventoryItemOut] = []
    repair_count: int = 0
    replace_count: int = 0


class SystemInfo(BaseModel):
    host: str
    port: int
    frontend_port: int = 3000
    network_mode: str
    network_ip: str = ""
    local_ip: str
    network_ips: list[str]
    api_url: str
    frontend_url: str


class ReportRequest(BaseModel):
    report_type: str = Field(..., description="assets | pm_visits | inventory | reminders | all")
    format: str = Field(default="xlsx", description="xlsx only")
    department_id: Optional[int] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None


class ActivityLogOut(BaseModel):
    id: int
    user_name: str
    action: str
    entity_type: str
    entity_id: Optional[int] = None
    details: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
