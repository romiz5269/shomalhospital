from datetime import datetime

from pydantic import BaseModel, Field, field_validator

APPOINTMENT_STATUSES = ("pending", "confirmed", "cancelled", "completed", "no_show")
PATIENT_CANCELLABLE = ("pending", "confirmed")
PATIENT_PATCHABLE_STATUSES = ("cancelled",)


class AppointmentOut(BaseModel):
    id: str
    patient_auth_user_id: str
    patient_phone: str | None
    patient_name: str | None
    doctor_auth_user_id: str | None
    doctor_id: str | None
    doctor_name: str | None
    department_code: str | None
    department_name: str | None
    scheduled_at: datetime
    duration_min: int
    status: str
    notes: str | None
    reason: str | None
    is_active: bool
    deleted_at: datetime | None
    created_at: datetime
    updated_at: datetime


class AppointmentCreate(BaseModel):
    """Admin upsert — create or update by patient + scheduled time."""

    id: str | None = Field(default=None, min_length=8, max_length=64)
    patient_auth_user_id: str = Field(min_length=8, max_length=64)
    patient_phone: str | None = Field(default=None, max_length=20)
    patient_name: str | None = Field(default=None, max_length=120)
    doctor_auth_user_id: str | None = Field(default=None, max_length=64)
    doctor_id: str | None = Field(default=None, max_length=64)
    doctor_name: str | None = Field(default=None, max_length=120)
    department_code: str | None = Field(default=None, max_length=32)
    department_name: str | None = Field(default=None, max_length=120)
    scheduled_at: datetime
    duration_min: int = Field(default=30, ge=5, le=480)
    status: str = Field(default="pending", max_length=32)
    notes: str | None = Field(default=None, max_length=2000)
    reason: str | None = Field(default=None, max_length=500)
    is_active: bool = True

    @field_validator("patient_phone")
    @classmethod
    def normalize_phone(cls, value: str | None) -> str | None:
        if value is None or value == "":
            return None
        digits = "".join(ch for ch in value if ch.isdigit() or ch == "+")
        if len(digits) < 10:
            raise ValueError("شماره موبایل نامعتبر است")
        return digits

    @field_validator("status")
    @classmethod
    def validate_status(cls, value: str) -> str:
        if value not in APPOINTMENT_STATUSES:
            raise ValueError(f"status باید یکی از {APPOINTMENT_STATUSES} باشد")
        return value


class AppointmentUpdate(BaseModel):
    patient_phone: str | None = Field(default=None, max_length=20)
    patient_name: str | None = Field(default=None, max_length=120)
    doctor_auth_user_id: str | None = Field(default=None, max_length=64)
    doctor_id: str | None = Field(default=None, max_length=64)
    doctor_name: str | None = Field(default=None, max_length=120)
    department_code: str | None = Field(default=None, max_length=32)
    department_name: str | None = Field(default=None, max_length=120)
    scheduled_at: datetime | None = None
    duration_min: int | None = Field(default=None, ge=5, le=480)
    status: str | None = Field(default=None, max_length=32)
    notes: str | None = Field(default=None, max_length=2000)
    reason: str | None = Field(default=None, max_length=500)
    is_active: bool | None = None

    @field_validator("patient_phone")
    @classmethod
    def normalize_phone(cls, value: str | None) -> str | None:
        if value is None:
            return None
        digits = "".join(ch for ch in value if ch.isdigit() or ch == "+")
        if len(digits) < 10:
            raise ValueError("شماره موبایل نامعتبر است")
        return digits

    @field_validator("status")
    @classmethod
    def validate_status(cls, value: str | None) -> str | None:
        if value is None:
            return None
        if value not in APPOINTMENT_STATUSES:
            raise ValueError(f"status باید یکی از {APPOINTMENT_STATUSES} باشد")
        return value


class MeAppointmentCreate(BaseModel):
    """Patient books their own appointment."""

    scheduled_at: datetime
    duration_min: int = Field(default=30, ge=5, le=480)
    doctor_auth_user_id: str | None = Field(default=None, max_length=64)
    doctor_id: str | None = Field(default=None, max_length=64)
    doctor_name: str | None = Field(default=None, max_length=120)
    department_code: str | None = Field(default=None, max_length=32)
    department_name: str | None = Field(default=None, max_length=120)
    reason: str | None = Field(default=None, max_length=500)
    notes: str | None = Field(default=None, max_length=2000)
    patient_phone: str | None = Field(default=None, max_length=20)
    patient_name: str | None = Field(default=None, max_length=120)

    @field_validator("patient_phone")
    @classmethod
    def normalize_phone(cls, value: str | None) -> str | None:
        if value is None or value == "":
            return None
        digits = "".join(ch for ch in value if ch.isdigit() or ch == "+")
        if len(digits) < 10:
            raise ValueError("شماره موبایل نامعتبر است")
        return digits


class MeAppointmentUpdate(BaseModel):
    """Patient can cancel or add notes to their own appointment."""

    status: str | None = Field(default=None, max_length=32)
    notes: str | None = Field(default=None, max_length=2000)
    reason: str | None = Field(default=None, max_length=500)

    @field_validator("status")
    @classmethod
    def validate_status(cls, value: str | None) -> str | None:
        if value is None:
            return None
        if value not in PATIENT_PATCHABLE_STATUSES:
            raise ValueError("بیمار فقط می‌تواند نوبت را لغو کند")
        return value


class AppointmentListResponse(BaseModel):
    total: int
    page: int
    page_size: int
    items: list[AppointmentOut]


class MessageResponse(BaseModel):
    success: bool = True
    message: str
