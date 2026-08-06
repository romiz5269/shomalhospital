from datetime import date, datetime

from pydantic import BaseModel, Field, field_validator

from app.utils.national_id import normalize_national_id


PERSON_TYPES = ("patient", "staff", "doctor", "nurse")
GENDERS = ("male", "female", "other")
BLOOD_TYPES = ("A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-")
INSURANCE_TYPES = ("tamin", "salamat", "armed", "free", "other")


class DepartmentOut(BaseModel):
    id: str
    code: str
    name_fa: str
    name_en: str | None = None
    description: str | None = None
    floor: str | None = None
    phone_ext: str | None = None
    is_active: bool


class DepartmentCreate(BaseModel):
    code: str = Field(min_length=2, max_length=32)
    name_fa: str = Field(min_length=2, max_length=120)
    name_en: str | None = Field(default=None, max_length=120)
    description: str | None = Field(default=None, max_length=500)
    floor: str | None = Field(default=None, max_length=40)
    phone_ext: str | None = Field(default=None, max_length=20)


class UserProfileOut(BaseModel):
    id: str
    auth_user_id: str
    phone: str
    national_id: str | None
    email: str | None
    first_name: str | None
    last_name: str | None
    father_name: str | None
    gender: str | None
    birth_date: date | None
    blood_type: str | None
    file_number: str | None
    person_type: str
    department_id: str | None
    department: DepartmentOut | None = None
    job_title: str | None
    insurance_type: str | None
    insurance_number: str | None
    address: str | None
    city: str | None
    province: str | None
    postal_code: str | None
    emergency_name: str | None
    emergency_phone: str | None
    avatar_url: str | None
    notes: str | None
    is_active: bool
    deleted_at: datetime | None
    created_at: datetime
    updated_at: datetime


class UserCreate(BaseModel):
    """Admin creates a hospital directory profile linked to an auth user id."""

    auth_user_id: str = Field(min_length=8, max_length=64)
    phone: str = Field(min_length=10, max_length=20)
    national_id: str | None = Field(default=None, max_length=10)
    email: str | None = None
    first_name: str | None = Field(default=None, max_length=80)
    last_name: str | None = Field(default=None, max_length=80)
    father_name: str | None = Field(default=None, max_length=80)
    gender: str | None = None
    birth_date: date | None = None
    blood_type: str | None = None
    file_number: str | None = Field(default=None, max_length=40)
    person_type: str = Field(default="patient", max_length=32)
    department_id: str | None = None
    job_title: str | None = Field(default=None, max_length=120)
    insurance_type: str | None = None
    insurance_number: str | None = Field(default=None, max_length=64)
    address: str | None = Field(default=None, max_length=500)
    city: str | None = Field(default="ساری", max_length=80)
    province: str | None = Field(default="مازندران", max_length=80)
    postal_code: str | None = Field(default=None, max_length=20)
    emergency_name: str | None = Field(default=None, max_length=80)
    emergency_phone: str | None = Field(default=None, max_length=20)
    notes: str | None = Field(default=None, max_length=2000)
    is_active: bool = True

    @field_validator("phone")
    @classmethod
    def normalize_phone(cls, value: str) -> str:
        digits = "".join(ch for ch in value if ch.isdigit() or ch == "+")
        if len(digits) < 10:
            raise ValueError("شماره موبایل نامعتبر است")
        return digits

    @field_validator("national_id")
    @classmethod
    def validate_nid(cls, value: str | None) -> str | None:
        if value is None or value == "":
            return None
        return normalize_national_id(value)

    @field_validator("person_type")
    @classmethod
    def validate_person_type(cls, value: str) -> str:
        if value not in PERSON_TYPES:
            raise ValueError(f"person_type باید یکی از {PERSON_TYPES} باشد")
        return value

    @field_validator("gender")
    @classmethod
    def validate_gender(cls, value: str | None) -> str | None:
        if value is None:
            return None
        if value not in GENDERS:
            raise ValueError(f"gender باید یکی از {GENDERS} باشد")
        return value

    @field_validator("blood_type")
    @classmethod
    def validate_blood(cls, value: str | None) -> str | None:
        if value is None:
            return None
        if value not in BLOOD_TYPES:
            raise ValueError(f"blood_type نامعتبر است")
        return value

    @field_validator("insurance_type")
    @classmethod
    def validate_insurance(cls, value: str | None) -> str | None:
        if value is None:
            return None
        if value not in INSURANCE_TYPES:
            raise ValueError(f"insurance_type باید یکی از {INSURANCE_TYPES} باشد")
        return value


class UserUpdate(BaseModel):
    phone: str | None = Field(default=None, min_length=10, max_length=20)
    national_id: str | None = Field(default=None, max_length=10)
    email: str | None = None
    first_name: str | None = Field(default=None, max_length=80)
    last_name: str | None = Field(default=None, max_length=80)
    father_name: str | None = Field(default=None, max_length=80)
    gender: str | None = None
    birth_date: date | None = None
    blood_type: str | None = None
    file_number: str | None = Field(default=None, max_length=40)
    person_type: str | None = Field(default=None, max_length=32)
    department_id: str | None = None
    job_title: str | None = Field(default=None, max_length=120)
    insurance_type: str | None = None
    insurance_number: str | None = Field(default=None, max_length=64)
    address: str | None = Field(default=None, max_length=500)
    city: str | None = Field(default=None, max_length=80)
    province: str | None = Field(default=None, max_length=80)
    postal_code: str | None = Field(default=None, max_length=20)
    emergency_name: str | None = Field(default=None, max_length=80)
    emergency_phone: str | None = Field(default=None, max_length=20)
    notes: str | None = Field(default=None, max_length=2000)
    is_active: bool | None = None
    avatar_url: str | None = None

    @field_validator("phone")
    @classmethod
    def normalize_phone(cls, value: str | None) -> str | None:
        if value is None:
            return None
        digits = "".join(ch for ch in value if ch.isdigit() or ch == "+")
        if len(digits) < 10:
            raise ValueError("شماره موبایل نامعتبر است")
        return digits

    @field_validator("national_id")
    @classmethod
    def validate_nid(cls, value: str | None) -> str | None:
        if value is None or value == "":
            return None
        return normalize_national_id(value)

    @field_validator("person_type")
    @classmethod
    def validate_person_type(cls, value: str | None) -> str | None:
        if value is None:
            return None
        if value not in PERSON_TYPES:
            raise ValueError(f"person_type باید یکی از {PERSON_TYPES} باشد")
        return value

    @field_validator("gender")
    @classmethod
    def validate_gender(cls, value: str | None) -> str | None:
        if value is None:
            return None
        if value not in GENDERS:
            raise ValueError(f"gender باید یکی از {GENDERS} باشد")
        return value

    @field_validator("blood_type")
    @classmethod
    def validate_blood(cls, value: str | None) -> str | None:
        if value is None:
            return None
        if value not in BLOOD_TYPES:
            raise ValueError("blood_type نامعتبر است")
        return value

    @field_validator("insurance_type")
    @classmethod
    def validate_insurance(cls, value: str | None) -> str | None:
        if value is None:
            return None
        if value not in INSURANCE_TYPES:
            raise ValueError(f"insurance_type باید یکی از {INSURANCE_TYPES} باشد")
        return value


class MeUpdate(BaseModel):
    """Self-service: limited fields only."""

    phone: str | None = Field(default=None, min_length=10, max_length=20)
    first_name: str | None = Field(default=None, max_length=80)
    last_name: str | None = Field(default=None, max_length=80)
    father_name: str | None = Field(default=None, max_length=80)
    gender: str | None = None
    birth_date: date | None = None
    blood_type: str | None = None
    email: str | None = None
    address: str | None = Field(default=None, max_length=500)
    city: str | None = Field(default=None, max_length=80)
    province: str | None = Field(default=None, max_length=80)
    postal_code: str | None = Field(default=None, max_length=20)
    emergency_name: str | None = Field(default=None, max_length=80)
    emergency_phone: str | None = Field(default=None, max_length=20)
    insurance_type: str | None = None
    insurance_number: str | None = Field(default=None, max_length=64)
    national_id: str | None = Field(default=None, max_length=10)

    @field_validator("phone")
    @classmethod
    def normalize_phone(cls, value: str | None) -> str | None:
        if value is None:
            return None
        digits = "".join(ch for ch in value if ch.isdigit() or ch == "+")
        if len(digits) < 10:
            raise ValueError("شماره موبایل نامعتبر است")
        return digits

    @field_validator("national_id")
    @classmethod
    def validate_nid(cls, value: str | None) -> str | None:
        if value is None or value == "":
            return None
        return normalize_national_id(value)

    @field_validator("gender")
    @classmethod
    def validate_gender(cls, value: str | None) -> str | None:
        if value is None:
            return None
        if value not in GENDERS:
            raise ValueError(f"gender باید یکی از {GENDERS} باشد")
        return value

    @field_validator("blood_type")
    @classmethod
    def validate_blood(cls, value: str | None) -> str | None:
        if value is None:
            return None
        if value not in BLOOD_TYPES:
            raise ValueError("blood_type نامعتبر است")
        return value

    @field_validator("insurance_type")
    @classmethod
    def validate_insurance(cls, value: str | None) -> str | None:
        if value is None:
            return None
        if value not in INSURANCE_TYPES:
            raise ValueError(f"insurance_type باید یکی از {INSURANCE_TYPES} باشد")
        return value


class UserListResponse(BaseModel):
    total: int
    page: int
    page_size: int
    items: list[UserProfileOut]


class MessageResponse(BaseModel):
    success: bool = True
    message: str


class AdminNoteCreate(BaseModel):
    body: str = Field(min_length=1, max_length=2000)


class AdminNoteOut(BaseModel):
    id: str
    user_id: str
    author_id: str
    body: str
    created_at: datetime
