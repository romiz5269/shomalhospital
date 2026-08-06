from fastapi import APIRouter, Query

from app.schemas.cms import PublicSiteOut
from app.schemas.doctors import DoctorOut, PublicDoctorListResponse
from app.schemas.posts import BlogPostOut, PublicBlogPostListResponse
from app.services.cms import cms_service
from app.services.doctors import doctor_service
from app.services.posts import blog_post_service

router = APIRouter(prefix="/public", tags=["public"])


@router.get("/site", response_model=PublicSiteOut)
async def get_public_site():
    return await cms_service.get_public()


@router.get("/doctors", response_model=PublicDoctorListResponse)
async def list_public_doctors(
    featured: bool | None = Query(None),
    department_code: str | None = Query(None),
    limit: int = Query(50, ge=1, le=100),
):
    return await doctor_service.list_public(
        featured=featured,
        department_code=department_code,
        limit=limit,
    )


@router.get("/doctors/{doctor_id}", response_model=DoctorOut)
async def get_public_doctor(doctor_id: str):
    return await doctor_service.get_public(doctor_id)


@router.get("/posts", response_model=PublicBlogPostListResponse)
async def list_published_posts(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50),
    featured: bool | None = Query(None, description="filter featured posts only"),
):
    return await blog_post_service.list_public(
        page=page,
        page_size=page_size,
        featured=featured,
    )


@router.get("/posts/{slug}", response_model=BlogPostOut)
async def get_published_post(slug: str):
    return await blog_post_service.get_public_by_slug(slug)
