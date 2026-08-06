from fastapi import APIRouter, Depends, HTTPException, Query, Response

from app.middleware.auth import AuthUser, require_admin, require_super_admin
from app.schemas.posts import (
    BlogPostCreate,
    BlogPostListResponse,
    BlogPostOut,
    BlogPostUpdate,
    MessageResponse,
)
from app.services.posts import blog_post_service

router = APIRouter(tags=["blog"])


@router.get("/", response_model=BlogPostListResponse, summary="List posts (admin)")
async def list_posts(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    q: str | None = Query(None, description="search title/slug/category"),
    category: str | None = None,
    is_published: bool | None = None,
    is_featured: bool | None = None,
    include_deleted: bool = False,
    _: AuthUser = Depends(require_admin()),
):
    return await blog_post_service.list_admin(
        page=page,
        page_size=page_size,
        q=q,
        category=category,
        is_published=is_published,
        is_featured=is_featured,
        include_deleted=include_deleted,
    )


@router.post("/", response_model=BlogPostOut, summary="Upsert post by slug")
async def upsert_post(
    payload: BlogPostCreate,
    response: Response,
    admin: AuthUser = Depends(require_admin()),
):
    post, created = await blog_post_service.upsert(payload, actor_id=admin.id)
    response.status_code = 201 if created else 200
    response.headers["X-Upsert"] = "created" if created else "updated"
    return post


@router.delete(
    "/{post_id}/hard",
    response_model=MessageResponse,
    summary="Hard delete (super admin only)",
)
async def hard_delete_post(
    post_id: str,
    confirm: bool = Query(False, description="must be true"),
    _: AuthUser = Depends(require_super_admin()),
):
    if not confirm:
        raise HTTPException(
            status_code=400,
            detail="Hard delete requires ?confirm=true",
        )
    await blog_post_service.hard_delete(post_id)
    return MessageResponse(message="Post permanently deleted")


@router.get("/{post_id}", response_model=BlogPostOut)
async def get_post(post_id: str, _: AuthUser = Depends(require_admin())):
    return await blog_post_service.get_by_id(post_id)


@router.patch("/{post_id}", response_model=BlogPostOut, summary="Update post")
async def update_post(
    post_id: str,
    payload: BlogPostUpdate,
    admin: AuthUser = Depends(require_admin()),
):
    return await blog_post_service.update(post_id, payload, actor_id=admin.id)


@router.delete(
    "/{post_id}",
    response_model=MessageResponse,
    summary="Soft delete post",
)
async def soft_delete_post(
    post_id: str,
    _: AuthUser = Depends(require_admin()),
):
    await blog_post_service.soft_delete(post_id)
    return MessageResponse(message="Post soft-deleted")
