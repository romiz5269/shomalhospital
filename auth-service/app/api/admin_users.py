from fastapi import APIRouter, Depends, HTTPException, Query, Response

from app.middleware.auth import AuthUser, require_admin, require_super_admin
from app.schemas.admin_users import AdminUserListResponse, AdminUserPatch, AdminUserUpsert
from app.schemas.auth import MessageResponse, UserPublic
from app.services.admin_users import admin_user_service

router = APIRouter(prefix="/admin/users", tags=["admin-users"])


@router.get("", response_model=AdminUserListResponse, summary="List users (paginated)")
async def list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    q: str | None = Query(None, description="search phone/name/national_id/email"),
    role: str | None = Query(None),
    is_active: bool | None = Query(None),
    is_verified: bool | None = Query(None),
    _: AuthUser = Depends(require_admin()),
):
    data = await admin_user_service.list_users(
        page=page,
        page_size=page_size,
        q=q,
        role=role,
        is_active=is_active,
        is_verified=is_verified,
    )
    return AdminUserListResponse(**data)


@router.post("", response_model=UserPublic, summary="Upsert user (create or update by phone)")
async def upsert_user(
    payload: AdminUserUpsert,
    response: Response,
    _: AuthUser = Depends(require_admin()),
):
    user, created = await admin_user_service.upsert(payload)
    response.status_code = 201 if created else 200
    response.headers["X-Upsert"] = "created" if created else "updated"
    return user


@router.get("/{user_id}", response_model=UserPublic, summary="Get user")
async def get_user(user_id: str, _: AuthUser = Depends(require_admin())):
    return await admin_user_service.get(user_id)


@router.patch("/{user_id}", response_model=UserPublic, summary="Patch user")
async def patch_user(
    user_id: str,
    payload: AdminUserPatch,
    _: AuthUser = Depends(require_admin()),
):
    return await admin_user_service.patch(user_id, payload)


@router.delete(
    "/{user_id}",
    response_model=MessageResponse,
    summary="Soft delete (deactivate)",
)
async def soft_delete_user(
    user_id: str,
    _: AuthUser = Depends(require_admin()),
):
    """سایت / ادمین: فقط غیرفعال — soft delete."""
    await admin_user_service.soft_delete(user_id)
    return MessageResponse(message="User soft-deleted (is_active=false)")


@router.delete(
    "/{user_id}/hard",
    response_model=MessageResponse,
    summary="Hard delete (super admin only)",
)
async def hard_delete_user(
    user_id: str,
    confirm: bool = Query(False, description="must be true"),
    _: AuthUser = Depends(require_super_admin()),
):
    """فقط ادمین کل + ?confirm=true"""
    if not confirm:
        raise HTTPException(
            status_code=400,
            detail="برای حذف دائمی ?confirm=true لازم است",
        )
    await admin_user_service.hard_delete(user_id)
    return MessageResponse(message="User permanently deleted")
