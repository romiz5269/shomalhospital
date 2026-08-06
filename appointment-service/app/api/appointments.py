from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, Response

from app.middleware.auth import AuthUser, require_admin, require_auth, require_super_admin
from app.schemas.appointments import (
    AppointmentCreate,
    AppointmentListResponse,
    AppointmentOut,
    AppointmentUpdate,
    MeAppointmentCreate,
    MeAppointmentUpdate,
    MessageResponse,
)
from app.services.appointments import appointment_service

router = APIRouter(tags=["appointments"])


@router.get("/me", response_model=AppointmentListResponse, summary="My appointments")
async def list_my_appointments(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: str | None = None,
    user: AuthUser = Depends(require_auth),
):
    return await appointment_service.list_mine(
        user.id,
        page=page,
        page_size=page_size,
        status=status,
    )


@router.post("/me", response_model=AppointmentOut, status_code=201, summary="Book appointment")
async def book_my_appointment(
    payload: MeAppointmentCreate,
    user: AuthUser = Depends(require_auth),
):
    return await appointment_service.create_mine(user.id, payload)


@router.patch("/me/{appointment_id}", response_model=AppointmentOut, summary="Update my appointment")
async def patch_my_appointment(
    appointment_id: str,
    payload: MeAppointmentUpdate,
    user: AuthUser = Depends(require_auth),
):
    return await appointment_service.update_mine(appointment_id, user.id, payload)


@router.get("/", response_model=AppointmentListResponse, summary="List appointments (paginated)")
async def list_appointments(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    q: str | None = Query(None, description="search phone/name/department/reason"),
    patient_auth_user_id: str | None = None,
    doctor_auth_user_id: str | None = None,
    department_code: str | None = None,
    status: str | None = None,
    is_active: bool | None = None,
    scheduled_from: datetime | None = None,
    scheduled_to: datetime | None = None,
    include_deleted: bool = False,
    _: AuthUser = Depends(require_admin()),
):
    return await appointment_service.list_appointments(
        page=page,
        page_size=page_size,
        q=q,
        patient_auth_user_id=patient_auth_user_id,
        doctor_auth_user_id=doctor_auth_user_id,
        department_code=department_code,
        status=status,
        is_active=is_active,
        scheduled_from=scheduled_from,
        scheduled_to=scheduled_to,
        include_deleted=include_deleted,
    )


@router.post("/", response_model=AppointmentOut, summary="Upsert appointment (create or update)")
async def upsert_appointment(
    payload: AppointmentCreate,
    response: Response,
    admin: AuthUser = Depends(require_admin()),
):
    """اگر وجود داشت آپدیت، وگرنه ایجاد."""
    appointment, created = await appointment_service.upsert(payload, actor_id=admin.id)
    response.status_code = 201 if created else 200
    response.headers["X-Upsert"] = "created" if created else "updated"
    return appointment


@router.delete(
    "/{appointment_id}/hard",
    response_model=MessageResponse,
    summary="Hard delete (super admin only)",
)
async def hard_delete_appointment(
    appointment_id: str,
    confirm: bool = Query(False, description="must be true"),
    admin: AuthUser = Depends(require_super_admin()),
):
    if not confirm:
        raise HTTPException(
            status_code=400,
            detail="برای حذف دائمی ?confirm=true لازم است",
        )
    await appointment_service.hard_delete(appointment_id, actor_id=admin.id)
    return MessageResponse(message="نوبت برای همیشه حذف شد")


@router.get("/{appointment_id}", response_model=AppointmentOut)
async def get_appointment(
    appointment_id: str,
    _: AuthUser = Depends(require_admin()),
):
    return await appointment_service.get_by_id(appointment_id)


@router.patch("/{appointment_id}", response_model=AppointmentOut, summary="Patch appointment")
async def update_appointment(
    appointment_id: str,
    payload: AppointmentUpdate,
    admin: AuthUser = Depends(require_admin()),
):
    return await appointment_service.update(appointment_id, payload, actor_id=admin.id)


@router.delete(
    "/{appointment_id}",
    response_model=MessageResponse,
    summary="Soft delete appointment",
)
async def soft_delete_appointment(
    appointment_id: str,
    admin: AuthUser = Depends(require_admin()),
):
    """حذف نرم — فقط ادمین کل hard می‌زند."""
    await appointment_service.soft_delete(appointment_id, actor_id=admin.id)
    return MessageResponse(message="نوبت غیرفعال و حذف نرم شد")
