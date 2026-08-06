from datetime import datetime

from pydantic import BaseModel, Field


class DoctorOut(BaseModel):
    id: str
    name_fa: str
    name_en: str | None
    specialty_fa: str
    specialty_en: str | None
    department_code: str | None
    image_url: str | None
    bio_fa: str | None
    bio_en: str | None
    is_active: bool
    is_featured: bool
    sort_order: int
    deleted_at: datetime | None
    created_at: datetime
    updated_at: datetime


class DoctorCreate(BaseModel):
    name_fa: str = Field(min_length=2, max_length=120)
    name_en: str | None = Field(default=None, max_length=120)
    specialty_fa: str = Field(min_length=2, max_length=120)
    specialty_en: str | None = Field(default=None, max_length=120)
    department_code: str | None = Field(default=None, max_length=32)
    image_url: str | None = Field(default=None, max_length=500)
    bio_fa: str | None = Field(default=None, max_length=2000)
    bio_en: str | None = Field(default=None, max_length=2000)
    is_active: bool = True
    is_featured: bool = False
    sort_order: int = 0


class DoctorUpdate(BaseModel):
    name_fa: str | None = Field(default=None, min_length=2, max_length=120)
    name_en: str | None = Field(default=None, max_length=120)
    specialty_fa: str | None = Field(default=None, min_length=2, max_length=120)
    specialty_en: str | None = Field(default=None, max_length=120)
    department_code: str | None = Field(default=None, max_length=32)
    image_url: str | None = Field(default=None, max_length=500)
    bio_fa: str | None = Field(default=None, max_length=2000)
    bio_en: str | None = Field(default=None, max_length=2000)
    is_active: bool | None = None
    is_featured: bool | None = None
    sort_order: int | None = None


class DoctorListResponse(BaseModel):
    total: int
    page: int
    page_size: int
    items: list[DoctorOut]


class PublicDoctorListResponse(BaseModel):
    total: int
    items: list[DoctorOut]
