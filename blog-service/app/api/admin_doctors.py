from fastapi import APIRouter, Depends, Query

from app.middleware.auth import AuthUser, require_admin
from app.schemas.cms import MessageResponse
from app.schemas.doctors import (
    DoctorCreate,
    DoctorListResponse,
    DoctorOut,
    DoctorUpdate,
)
from app.services.doctors import doctor_service

router = APIRouter(prefix="/admin/doctors", tags=["admin-doctors"])


@router.get("", response_model=DoctorListResponse)
async def list_doctors_admin(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    q: str | None = None,
    department_code: str | None = None,
    include_deleted: bool = False,
    _: AuthUser = Depends(require_admin()),
):
    return await doctor_service.list_admin(
        page=page,
        page_size=page_size,
        q=q,
        department_code=department_code,
        include_deleted=include_deleted,
    )


@router.post("", response_model=DoctorOut, status_code=201)
async def create_doctor(
    payload: DoctorCreate,
    _: AuthUser = Depends(require_admin()),
):
    return await doctor_service.create(payload)


@router.patch("/{doctor_id}", response_model=DoctorOut)
async def update_doctor(
    doctor_id: str,
    payload: DoctorUpdate,
    _: AuthUser = Depends(require_admin()),
):
    return await doctor_service.update(doctor_id, payload)


@router.delete("/{doctor_id}", response_model=MessageResponse)
async def delete_doctor(
    doctor_id: str,
    _: AuthUser = Depends(require_admin()),
):
    await doctor_service.soft_delete(doctor_id)
    return MessageResponse(message="Doctor soft-deleted")
