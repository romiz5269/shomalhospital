from pydantic import BaseModel, Field


class DoctorProfileUpdate(BaseModel):
    biography: str | None = Field(default=None, max_length=5000)
    specialty: str | None = Field(default=None, max_length=120)
    medical_license_no: str | None = Field(default=None, max_length=64)


class DoctorCertificateOut(BaseModel):
    id: str
    title: str
    file_name: str
    file_url: str
    created_at: str


class DoctorReviewCreate(BaseModel):
    rating: int = Field(ge=1, le=5)
    comment: str | None = Field(default=None, max_length=2000)


class DoctorReviewOut(BaseModel):
    id: str
    author_id: str
    author_name: str | None
    rating: int
    comment: str | None
    created_at: str


class DoctorPublic(BaseModel):
    id: str
    user_id: str
    first_name: str | None
    last_name: str | None
    avatar_url: str
    medical_license_no: str
    biography: str | None
    specialty: str | None
    patients_accepted: int
    rating_avg: float
    rating_count: int
    certificates: list[DoctorCertificateOut] = Field(default_factory=list)
    reviews: list[DoctorReviewOut] = Field(default_factory=list)
