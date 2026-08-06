from fastapi import APIRouter, Depends, File, Form, UploadFile

from app.middleware.auth import AuthUser, require_auth, require_permissions, require_roles
from app.schemas.doctor import DoctorProfileUpdate, DoctorPublic, DoctorReviewCreate
from app.services.doctor import doctor_service

router = APIRouter(prefix="/doctors", tags=["doctors"])


@router.get("", response_model=list[DoctorPublic])
async def list_doctors():
    return await doctor_service.list_public()


@router.get("/{doctor_id}", response_model=DoctorPublic)
async def get_doctor(doctor_id: str):
    return await doctor_service.get_public(doctor_id)


@router.patch("/me", response_model=DoctorPublic)
async def update_my_profile(
    payload: DoctorProfileUpdate,
    user: AuthUser = Depends(require_roles("doctor")),
):
    return await doctor_service.update_mine(user.id, payload)


@router.post("/me/certificates")
async def upload_certificate(
    title: str = Form(...),
    file: UploadFile = File(...),
    user: AuthUser = Depends(require_roles("doctor")),
):
    return await doctor_service.upload_certificate(
        user_id=user.id, title=title, file=file
    )


@router.post("/{doctor_id}/reviews", response_model=DoctorPublic)
async def review_doctor(
    doctor_id: str,
    payload: DoctorReviewCreate,
    user: AuthUser = Depends(require_auth),
):
    return await doctor_service.add_review(
        doctor_id=doctor_id, author_id=user.id, payload=payload
    )


@router.post("/{doctor_id}/patients-accepted", response_model=DoctorPublic)
async def bump_patients(
    doctor_id: str,
    _: AuthUser = Depends(require_permissions("appointment:write")),
):
    """Called by appointment service after a visit is completed."""
    return await doctor_service.increment_patients(doctor_id)
