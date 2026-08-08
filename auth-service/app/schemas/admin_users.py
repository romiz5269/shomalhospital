from pydantic import BaseModel, EmailStr, Field, field_validator

from app.schemas.auth import PhoneStr, UserPublic
from app.utils.national_id import normalize_national_id
from app.utils.phone import normalize_phone as normalize_ir_phone


class AdminUserUpsert(BaseModel):
    """Create if phone missing, else update (upsert)."""

    phone: PhoneStr
    password: str | None = Field(default=None, min_length=8, max_length=128)
    email: EmailStr | None = None
    national_id: str | None = Field(default=None, max_length=10)
    first_name: str | None = Field(default=None, max_length=80)
    last_name: str | None = Field(default=None, max_length=80)
    role: str = Field(default="patient", max_length=64)
    is_active: bool = True
    is_verified: bool = True

    @field_validator("national_id")
    @classmethod
    def validate_nid(cls, value: str | None) -> str | None:
        if value is None or value == "":
            return None
        return normalize_national_id(value)


class AdminUserPatch(BaseModel):
    phone: PhoneStr | None = None
    password: str | None = Field(default=None, min_length=8, max_length=128)
    email: EmailStr | None = None
    national_id: str | None = Field(default=None, max_length=10)
    first_name: str | None = Field(default=None, max_length=80)
    last_name: str | None = Field(default=None, max_length=80)
    role: str | None = Field(default=None, max_length=64)
    is_active: bool | None = None
    is_verified: bool | None = None

    @field_validator("phone", mode="before")
    @classmethod
    def normalize_phone(cls, value: object) -> str | None:
        if value is None or value == "":
            return None
        return normalize_ir_phone(str(value))

    @field_validator("national_id")
    @classmethod
    def validate_nid(cls, value: str | None) -> str | None:
        if value is None or value == "":
            return None
        return normalize_national_id(value)


class AdminUserListResponse(BaseModel):
    total: int
    page: int
    page_size: int
    items: list[UserPublic]
