from typing import Any

from pydantic import BaseModel, Field


class HomepageBlock(BaseModel):
    id: str
    type: str
    enabled: bool = True
    order: int = 0
    props: dict[str, Any] = Field(default_factory=dict)


class SiteSettingsOut(BaseModel):
    hospital_name_fa: str
    hospital_name_en: str
    hero_video_url: str | None
    hero_poster_url: str | None
    hero_title_fa: str
    hero_title_en: str
    hero_subtitle_fa: str | None
    hero_subtitle_en: str | None
    hero_badge_fa: str | None
    hero_badge_en: str | None
    phone: str | None
    address_fa: str | None
    address_en: str | None
    homepage_blocks: list[HomepageBlock]


class PublicSiteOut(BaseModel):
    hospital_name_fa: str
    hospital_name_en: str
    hero_video_url: str | None
    hero_poster_url: str | None
    hero_title_fa: str
    hero_title_en: str
    hero_subtitle_fa: str | None
    hero_subtitle_en: str | None
    hero_badge_fa: str | None
    hero_badge_en: str | None
    phone: str | None
    address_fa: str | None
    address_en: str | None
    homepage_blocks: list[HomepageBlock]


class SiteSettingsUpdate(BaseModel):
    hospital_name_fa: str | None = None
    hospital_name_en: str | None = None
    hero_video_url: str | None = None
    hero_poster_url: str | None = None
    hero_title_fa: str | None = None
    hero_title_en: str | None = None
    hero_subtitle_fa: str | None = None
    hero_subtitle_en: str | None = None
    hero_badge_fa: str | None = None
    hero_badge_en: str | None = None
    phone: str | None = None
    address_fa: str | None = None
    address_en: str | None = None


class HomepageBlocksUpdate(BaseModel):
    blocks: list[HomepageBlock]


class MessageResponse(BaseModel):
    success: bool = True
    message: str
