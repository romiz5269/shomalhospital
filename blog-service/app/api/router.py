from fastapi import APIRouter

from app.api.admin_site import router as admin_site_router
from app.api.admin_doctors import router as admin_doctors_router
from app.api.admin_media import router as admin_media_router
from app.api.admin_templates import router as admin_templates_router
from app.api.posts import router as posts_router
from app.api.public import router as public_router

api_router = APIRouter()
api_router.include_router(public_router)
api_router.include_router(admin_site_router)
api_router.include_router(admin_templates_router)
api_router.include_router(admin_media_router)
api_router.include_router(admin_doctors_router)
api_router.include_router(posts_router, prefix="/admin/posts")
