from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class PMChecklistTemplateOut(BaseModel):
    id: int
    name: str
    category: str
    interval_days: Optional[int] = None
    sort_order: int

    class Config:
        from_attributes = True


class PMChecklistTemplateCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    category: str = Field(default="general", max_length=50)
    interval_days: Optional[int] = None
    sort_order: int = 0


class PMChecklistTemplateUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=200)
    category: Optional[str] = Field(default=None, max_length=50)
    interval_days: Optional[int] = None
    sort_order: Optional[int] = None


class PMVisitTaskBase(BaseModel):
    task_name: str
    is_done: bool = False
    notes: Optional[str] = None


class PMVisitTaskOut(PMVisitTaskBase):
    id: int

    class Config:
        from_attributes = True


class PMVisitBase(BaseModel):
    visit_date: datetime
    return_date: Optional[datetime] = None
    next_pm_date: Optional[datetime] = None
    recipient_name: Optional[str] = None
    recipient_unit: Optional[str] = None
    asset_id: Optional[int] = None
    department_id: Optional[int] = None
    performed_by: str
    notes: Optional[str] = None
    alert_title: Optional[str] = None
    alert_description: Optional[str] = None
    alert_warning_days: Optional[int] = Field(default=30, ge=1, le=365)
    work_type: str = Field(default="pm", pattern="^(pm|adhoc)$")
    title: Optional[str] = None


class PMVisitCreate(PMVisitBase):
    tasks: list[PMVisitTaskBase] = []


class PMVisitUpdate(BaseModel):
    visit_date: Optional[datetime] = None
    return_date: Optional[datetime] = None
    next_pm_date: Optional[datetime] = None
    recipient_name: Optional[str] = None
    recipient_unit: Optional[str] = None
    asset_id: Optional[int] = None
    department_id: Optional[int] = None
    performed_by: Optional[str] = None
    notes: Optional[str] = None
    alert_title: Optional[str] = None
    alert_description: Optional[str] = None
    alert_warning_days: Optional[int] = Field(default=None, ge=1, le=365)
    work_type: Optional[str] = Field(default=None, pattern="^(pm|adhoc)$")
    title: Optional[str] = None
    tasks: Optional[list[PMVisitTaskBase]] = None


class PMVisitOut(BaseModel):
    id: int
    visit_date: datetime
    return_date: Optional[datetime] = None
    next_pm_date: Optional[datetime] = None
    recipient_name: Optional[str] = None
    recipient_unit: Optional[str] = None
    asset_id: Optional[int] = None
    department_id: Optional[int] = None
    performed_by: str = ""
    notes: Optional[str] = None
    alert_title: Optional[str] = None
    alert_description: Optional[str] = None
    alert_warning_days: Optional[int] = 30
    work_type: str = "pm"
    title: Optional[str] = None
    created_at: datetime
    tasks: list[PMVisitTaskOut] = []

    class Config:
        from_attributes = True

    @classmethod
    def from_orm_compat(cls, obj):
        """Map device_id/section_id back to asset_id/department_id for frontend."""
        data = {}
        for f in cls.model_fields:
            if f == "asset_id":
                data[f] = getattr(obj, "device_id", None)
            elif f == "department_id":
                data[f] = getattr(obj, "section_id", None)
            else:
                data[f] = getattr(obj, f, None)
        if hasattr(obj, "tasks"):
            data["tasks"] = [PMVisitTaskOut.model_validate(t) for t in obj.tasks]
        return cls(**data)


class InventoryItemBase(BaseModel):
    name: str
    category: str = "hardware"
    serial_number: Optional[str] = None
    quantity: int = 1
    received_date: datetime
    installed_date: Optional[datetime] = None
    department_id: Optional[int] = None
    purpose: Optional[str] = None
    status: str = "received"
    notes: Optional[str] = None
    asset_id: Optional[int] = None


class InventoryItemCreate(InventoryItemBase):
    pass


class InventoryItemUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    serial_number: Optional[str] = None
    quantity: Optional[int] = None
    received_date: Optional[datetime] = None
    installed_date: Optional[datetime] = None
    department_id: Optional[int] = None
    purpose: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    asset_id: Optional[int] = None


class InventoryItemOut(BaseModel):
    id: int
    name: str
    category: str = "hardware"
    serial_number: Optional[str] = None
    quantity: int = 1
    received_date: datetime
    installed_date: Optional[datetime] = None
    department_id: Optional[int] = None
    purpose: Optional[str] = None
    status: str = "received"
    notes: Optional[str] = None
    asset_id: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True

    @classmethod
    def from_orm_compat(cls, obj):
        data = {}
        for f in cls.model_fields:
            if f == "asset_id":
                data[f] = getattr(obj, "device_id", None)
            elif f == "department_id":
                data[f] = getattr(obj, "section_id", None)
            else:
                data[f] = getattr(obj, f, None)
        return cls(**data)
