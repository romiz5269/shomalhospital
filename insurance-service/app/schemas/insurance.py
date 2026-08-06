from datetime import datetime

from pydantic import BaseModel, Field, field_validator


class InsuranceProviderPublicOut(BaseModel):
    id: str
    code: str
    name_fa: str
    name_en: str | None = None
    description_fa: str | None = None
    description_en: str | None = None
    logo_url: str | None = None
    website_url: str | None = None
    phone: str | None = None
    sort_order: int


class InsuranceProviderOut(InsuranceProviderPublicOut):
    is_active: bool
    is_featured: bool
    deleted_at: datetime | None = None
    created_at: datetime
    updated_at: datetime
    created_by_id: str | None = None
    updated_by_id: str | None = None


class InsuranceProviderCreate(BaseModel):
    code: str = Field(min_length=2, max_length=32)
    name_fa: str = Field(min_length=2, max_length=120)
    name_en: str | None = Field(default=None, max_length=120)
    description_fa: str | None = Field(default=None, max_length=1000)
    description_en: str | None = Field(default=None, max_length=1000)
    logo_url: str | None = Field(default=None, max_length=500)
    website_url: str | None = Field(default=None, max_length=500)
    phone: str | None = Field(default=None, max_length=20)
    sort_order: int = Field(default=0, ge=0)
    is_active: bool = True
    is_featured: bool = False

    @field_validator("code")
    @classmethod
    def normalize_code(cls, value: str) -> str:
        return value.strip().lower()


class InsuranceProviderUpdate(BaseModel):
    name_fa: str | None = Field(default=None, min_length=2, max_length=120)
    name_en: str | None = Field(default=None, max_length=120)
    description_fa: str | None = Field(default=None, max_length=1000)
    description_en: str | None = Field(default=None, max_length=1000)
    logo_url: str | None = Field(default=None, max_length=500)
    website_url: str | None = Field(default=None, max_length=500)
    phone: str | None = Field(default=None, max_length=20)
    sort_order: int | None = Field(default=None, ge=0)
    is_active: bool | None = None
    is_featured: bool | None = None


class MessageResponse(BaseModel):
    success: bool = True
    message: str
