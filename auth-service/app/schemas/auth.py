from typing import Annotated

from pydantic import BaseModel, BeforeValidator, EmailStr, Field, field_validator, model_validator

from app.utils.national_id import normalize_national_id
from app.utils.phone import normalize_otp_code, normalize_phone as normalize_ir_phone


def _phone_before(value: object) -> str:
    return normalize_ir_phone(str(value or ""))


# Normalize Persian/Arabic digits BEFORE min_length checks
PhoneStr = Annotated[str, BeforeValidator(_phone_before), Field(min_length=10, max_length=15)]


class SignupRequest(BaseModel):
    phone: PhoneStr
    email: EmailStr | None = None
    national_id: str | None = Field(default=None, max_length=10)
    first_name: str | None = Field(default=None, max_length=80)
    last_name: str | None = Field(default=None, max_length=80)
    password: str | None = Field(default=None, min_length=8, max_length=128)
    role: str = Field(default="patient", max_length=64)
    # patient | console (system admin, auto-approve) | cms (needs admin approval)
    panel: str = Field(default="patient", pattern="^(patient|console|cms)$")
    # doctor-only
    medical_license_no: str | None = Field(default=None, max_length=64)
    biography: str | None = Field(default=None, max_length=5000)
    specialty: str | None = Field(default=None, max_length=120)

    @field_validator("national_id")
    @classmethod
    def validate_national_id(cls, value: str | None) -> str | None:
        if value is None or value == "":
            return None
        return normalize_national_id(value)

    @model_validator(mode="after")
    def role_requirements(self):
        if self.role == "doctor" and not self.medical_license_no:
            raise ValueError("medical_license_no is required for doctor signup")
        return self


class NationalIdUpdate(BaseModel):
    national_id: str = Field(min_length=10, max_length=10)

    @field_validator("national_id")
    @classmethod
    def validate_national_id(cls, value: str) -> str:
        return normalize_national_id(value)


class OtpRequest(BaseModel):
    phone: PhoneStr
    purpose: str = Field(default="login", pattern="^(login|signup|verify)$")


class OtpVerifyRequest(BaseModel):
    phone: PhoneStr
    code: str = Field(min_length=6, max_length=6)
    purpose: str = Field(default="login", pattern="^(login|signup|verify)$")

    @field_validator("code", mode="before")
    @classmethod
    def normalize_code(cls, value: object) -> str:
        return normalize_otp_code(str(value or ""))


class LoginPasswordRequest(BaseModel):
    phone: PhoneStr
    password: str = Field(min_length=8, max_length=128)


class RefreshRequest(BaseModel):
    refresh_token: str


class LogoutRequest(BaseModel):
    refresh_token: str | None = None


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "Bearer"
    expires_in: int
    refresh_expires_in: int


class RevokeItem(BaseModel):
    jti: str
    ttl_seconds: int
    kind: str  # access | refresh


class GatewayRedisHint(BaseModel):
    """
    Gateway Redis (shared, no prefix):
      SET auth:bl:jti:{jti} 1 EX {ttl_seconds}
    """

    action: str = "blacklist_jtis"
    items: list[RevokeItem] = Field(default_factory=list)


class UserPublic(BaseModel):
    id: str
    phone: str
    national_id: str | None
    email: str | None
    first_name: str | None
    last_name: str | None
    avatar_url: str
    is_active: bool
    is_verified: bool
    roles: list[str]
    permissions: list[str]
    groups: list[str]
    doctor_profile_id: str | None = None


class AuthResponse(BaseModel):
    user: UserPublic
    tokens: TokenPair
    auto_login: bool = False


class MessageResponse(BaseModel):
    success: bool = True
    message: str
    otp_code: str | None = None
    gateway_redis: GatewayRedisHint | None = None


class SignupResponse(BaseModel):
    success: bool = True
    message: str
    auto_login: bool = False
    otp_code: str | None = None
    user: UserPublic | None = None
    tokens: TokenPair | None = None
