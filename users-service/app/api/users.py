from fastapi import APIRouter, Depends, HTTPException, Query, Response

from app.middleware.auth import AuthUser, require_admin, require_auth, require_super_admin
from app.schemas.users import (
    AdminNoteCreate,
    AdminNoteOut,
    MessageResponse,
    MeUpdate,
    UserCreate,
    UserListResponse,
    UserProfileOut,
    UserUpdate,
)
from app.services.users import user_service

router = APIRouter(tags=["users"])


@router.get("/me", response_model=UserProfileOut)
async def get_me(user: AuthUser = Depends(require_auth)):
    return await user_service.ensure_self_profile(
        auth_user_id=user.id,
        email=user.email or None,
    )


@router.patch("/me", response_model=UserProfileOut)
async def patch_me(payload: MeUpdate, user: AuthUser = Depends(require_auth)):
    return await user_service.update_me(user.id, payload)


@router.get("/", response_model=UserListResponse, summary="List users (paginated)")
async def list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    q: str | None = Query(None, description="search name/phone/national id/file"),
    person_type: str | None = None,
    department_id: str | None = None,
    is_active: bool | None = None,
    include_deleted: bool = False,
    _: AuthUser = Depends(require_admin()),
):
    return await user_service.list_users(
        page=page,
        page_size=page_size,
        q=q,
        person_type=person_type,
        department_id=department_id,
        is_active=is_active,
        include_deleted=include_deleted,
    )


@router.post("/", response_model=UserProfileOut, summary="Upsert user (create or update)")
async def upsert_user(
    payload: UserCreate,
    response: Response,
    admin: AuthUser = Depends(require_admin()),
):
    """اگر وجود داشت آپدیت، وگرنه ایجاد."""
    user, created = await user_service.upsert(payload, actor_id=admin.id)
    response.status_code = 201 if created else 200
    response.headers["X-Upsert"] = "created" if created else "updated"
    return user


@router.delete(
    "/{profile_id}/hard",
    response_model=MessageResponse,
    summary="Hard delete (super admin only)",
)
async def hard_delete_user(
    profile_id: str,
    confirm: bool = Query(False, description="must be true"),
    admin: AuthUser = Depends(require_super_admin()),
):
    if not confirm:
        raise HTTPException(
            status_code=400,
            detail="برای حذف دائمی ?confirm=true لازم است",
        )
    await user_service.hard_delete(profile_id, actor_id=admin.id)
    return MessageResponse(message="کاربر برای همیشه حذف شد")


@router.post("/{profile_id}/activate", response_model=UserProfileOut)
async def activate_user(
    profile_id: str,
    admin: AuthUser = Depends(require_admin()),
):
    return await user_service.set_active(profile_id, is_active=True, actor_id=admin.id)


@router.post("/{profile_id}/deactivate", response_model=UserProfileOut)
async def deactivate_user(
    profile_id: str,
    admin: AuthUser = Depends(require_admin()),
):
    return await user_service.set_active(profile_id, is_active=False, actor_id=admin.id)


@router.get("/{profile_id}/notes", response_model=list[AdminNoteOut])
async def list_notes(profile_id: str, _: AuthUser = Depends(require_admin())):
    return await user_service.list_notes(profile_id)


@router.post("/{profile_id}/notes", response_model=AdminNoteOut, status_code=201)
async def add_note(
    profile_id: str,
    payload: AdminNoteCreate,
    admin: AuthUser = Depends(require_admin()),
):
    return await user_service.add_note(
        profile_id, author_id=admin.id, body=payload.body
    )


@router.get("/{profile_id}", response_model=UserProfileOut)
async def get_user(profile_id: str, _: AuthUser = Depends(require_admin())):
    return await user_service.get_by_id(profile_id)


@router.patch("/{profile_id}", response_model=UserProfileOut, summary="Patch user")
async def update_user(
    profile_id: str,
    payload: UserUpdate,
    admin: AuthUser = Depends(require_admin()),
):
    return await user_service.update(profile_id, payload, actor_id=admin.id)


@router.delete(
    "/{profile_id}",
    response_model=MessageResponse,
    summary="Soft delete user",
)
async def soft_delete_user(
    profile_id: str,
    admin: AuthUser = Depends(require_admin()),
):
    """حذف نرم برای سایت/نوبت/مدارک — فقط ادمین کل hard می‌زند."""
    await user_service.soft_delete(profile_id, actor_id=admin.id)
    return MessageResponse(message="کاربر غیرفعال و حذف نرم شد")
