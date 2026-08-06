from pydantic import BaseModel, EmailStr, Field, field_validator

from app.schemas.auth import UserPublic
from app.utils.national_id import normalize_national_id


class AdminUserUpsert(BaseModel):
    """Create if phone missing, else update (upsert)."""

    phone: str = Field(min_length=10, max_length=20)
    password: str | None = Field(default=None, min_length=8, max_length=128)
    email: EmailStr | None = None
    national_id: str | None = Field(default=None, max_length=10)
    first_name: str | None = Field(default=None, max_length=80)
    last_name: str | None = Field(default=None, max_length=80)
    role: str = Field(default="patient", max_length=64)
    is_active: bool = True
    is_verified: bool = True

    @field_validator("phone")
    @classmethod
    def normalize_phone(cls, value: str) -> str:
        digits = "".join(ch for ch in value if ch.isdigit() or ch == "+")
        if len(digits) < 10:
            raise ValueError("Invalid phone number")
        return digits

    @field_validator("national_id")
    @classmethod
    def validate_nid(cls, value: str | None) -> str | None:
        if value is None or value == "":
            return None
        return normalize_national_id(value)


class AdminUserPatch(BaseModel):
    phone: str | None = Field(default=None, min_length=10, max_length=20)
    password: str | None = Field(default=None, min_length=8, max_length=128)
    email: EmailStr | None = None
    national_id: str | None = Field(default=None, max_length=10)
    first_name: str | None = Field(default=None, max_length=80)
    last_name: str | None = Field(default=None, max_length=80)
    role: str | None = Field(default=None, max_length=64)
    is_active: bool | None = None
    is_verified: bool | None = None

    @field_validator("phone")
    @classmethod
    def normalize_phone(cls, value: str | None) -> str | None:
        if value is None:
            return None
        digits = "".join(ch for ch in value if ch.isdigit() or ch == "+")
        if len(digits) < 10:
            raise ValueError("Invalid phone number")
        return digits

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
