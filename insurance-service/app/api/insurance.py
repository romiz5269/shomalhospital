from fastapi import APIRouter, Depends, HTTPException, Query, Response

from app.middleware.auth import AuthUser, require_admin, require_super_admin
from app.schemas.insurance import (
    InsuranceProviderCreate,
    InsuranceProviderOut,
    InsuranceProviderPublicOut,
    InsuranceProviderUpdate,
    MessageResponse,
)
from app.services.insurance import insurance_service

router = APIRouter(tags=["insurance"])


@router.get("/public", response_model=list[InsuranceProviderPublicOut])
async def list_featured_public():
    """Featured active insurances for homepage carousel — no auth."""
    return await insurance_service.list_featured_public()


@router.get("/public/all", response_model=list[InsuranceProviderPublicOut])
async def list_all_public():
    """All active insurances — no auth."""
    return await insurance_service.list_all_public()


@router.get("/", response_model=list[InsuranceProviderOut], summary="List insurances (admin)")
async def list_insurances(
    include_deleted: bool = False,
    include_inactive: bool = True,
    _: AuthUser = Depends(require_admin()),
):
    return await insurance_service.list_admin(
        include_deleted=include_deleted,
        include_inactive=include_inactive,
    )


@router.post("/", response_model=InsuranceProviderOut, summary="Upsert insurance (admin)")
async def upsert_insurance(
    payload: InsuranceProviderCreate,
    response: Response,
    admin: AuthUser = Depends(require_admin()),
):
    """If code exists → update; else create."""
    provider, created = await insurance_service.upsert(payload, actor_id=admin.id)
    response.status_code = 201 if created else 200
    response.headers["X-Upsert"] = "created" if created else "updated"
    return provider


@router.get("/{provider_id}", response_model=InsuranceProviderOut)
async def get_insurance(
    provider_id: str,
    _: AuthUser = Depends(require_admin()),
):
    return await insurance_service.get_by_id(provider_id)


@router.patch("/{provider_id}", response_model=InsuranceProviderOut)
async def update_insurance(
    provider_id: str,
    payload: InsuranceProviderUpdate,
    admin: AuthUser = Depends(require_admin()),
):
    return await insurance_service.update(provider_id, payload, actor_id=admin.id)


@router.delete(
    "/{provider_id}",
    response_model=MessageResponse,
    summary="Soft delete insurance",
)
async def soft_delete_insurance(
    provider_id: str,
    admin: AuthUser = Depends(require_admin()),
):
    await insurance_service.soft_delete(provider_id, actor_id=admin.id)
    return MessageResponse(message="بیمه غیرفعال و حذف نرم شد")


@router.delete(
    "/{provider_id}/hard",
    response_model=MessageResponse,
    summary="Hard delete (super admin only)",
)
async def hard_delete_insurance(
    provider_id: str,
    confirm: bool = Query(False, description="must be true"),
    admin: AuthUser = Depends(require_super_admin()),
):
    if not confirm:
        raise HTTPException(
            status_code=400,
            detail="برای حذف دائمی ?confirm=true لازم است",
        )
    await insurance_service.hard_delete(provider_id, actor_id=admin.id)
    return MessageResponse(message="بیمه برای همیشه حذف شد")
