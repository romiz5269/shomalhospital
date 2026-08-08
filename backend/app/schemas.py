from typing import Literal

from pydantic import BaseModel, EmailStr, Field, field_validator


def _strong_password(v: str) -> str:
    if len(v) < 8:
        raise ValueError("رمز عبور باید حداقل ۸ کاراکتر باشد")
    if v.isdigit() or v.isalpha():
        raise ValueError("رمز عبور باید ترکیبی از حروف و عدد باشد")
    return v


class AdminRegister(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)

    @field_validator("password")
    @classmethod
    def password_rules(cls, v: str) -> str:
        return _strong_password(v)


class LoginBody(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class StaffRegister(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    department: str = Field(min_length=2, max_length=120)
    phone: str = Field(min_length=10, max_length=20)

    @field_validator("password")
    @classmethod
    def password_rules(cls, v: str) -> str:
        return _strong_password(v)


class GuestCreateTicket(BaseModel):
    subject: str = Field(min_length=3, max_length=200)
    description: str = Field(min_length=10, max_length=5000)
    urgency: Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"]
    category: Literal["IT", "MEDICAL_EQUIPMENT", "FACILITIES", "HR", "PHARMACY", "OTHER"]
    staffName: str = Field(min_length=2, max_length=120)
    staffDepartment: str = Field(min_length=2, max_length=120)
    staffPhone: str = Field(min_length=10, max_length=20)
    staffEmail: str | None = Field(default=None, max_length=200)


class StaffCreateTicket(BaseModel):
    subject: str = Field(min_length=3, max_length=200)
    description: str = Field(min_length=10, max_length=5000)
    urgency: Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"]
    category: Literal["IT", "MEDICAL_EQUIPMENT", "FACILITIES", "HR", "PHARMACY", "OTHER"]


class ReplyBody(BaseModel):
    message: str = Field(min_length=1, max_length=5000)


class UpdateStatusBody(BaseModel):
    status: Literal["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]
