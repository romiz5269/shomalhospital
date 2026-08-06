from fastapi import APIRouter, Depends

from app.middleware.auth import AuthUser, require_admin
from app.schemas.cms import (
    HomepageBlocksUpdate,
    MessageResponse,
    SiteSettingsOut,
    SiteSettingsUpdate,
)
from app.services.cms import cms_service

router = APIRouter(prefix="/admin/site", tags=["admin-cms"])


@router.get("", response_model=SiteSettingsOut)
async def get_site_settings(_: AuthUser = Depends(require_admin())):
    return await cms_service.get_admin()


@router.patch("", response_model=SiteSettingsOut)
async def update_site_settings(
    payload: SiteSettingsUpdate,
    _: AuthUser = Depends(require_admin()),
):
    return await cms_service.update_settings(payload)


@router.put("/blocks", response_model=SiteSettingsOut)
async def update_homepage_blocks(
    payload: HomepageBlocksUpdate,
    _: AuthUser = Depends(require_admin()),
):
    return await cms_service.update_blocks(payload.blocks)
