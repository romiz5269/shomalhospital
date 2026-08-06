from typing import Any

from fastapi import HTTPException

from prisma import Json

from app.db import db
from app.schemas.cms import HomepageBlock, PublicSiteOut, SiteSettingsOut, SiteSettingsUpdate

DEFAULT_HERO_VIDEO = (
    "https://assets.mixkit.co/videos/preview/mixkit-team-of-doctors-in-a-hospital-corridor-42774-large.mp4"
)
DEFAULT_HERO_POSTER = (
    "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=1920&q=80"
)

DEFAULT_BLOCKS: list[dict[str, Any]] = [
    {"id": "hero", "type": "hero", "enabled": True, "order": 0, "props": {}},
    {"id": "appointment-steps", "type": "appointment_steps", "enabled": True, "order": 1, "props": {}},
    {"id": "electronic-services", "type": "electronic_services", "enabled": True, "order": 2, "props": {}},
    {
        "id": "stats",
        "type": "stats",
        "enabled": True,
        "order": 3,
        "props": {
            "title_fa": "آمار بیمارستان شمال",
            "title_en": "Shomal Hospital at a Glance",
            "subtitle_fa": "مرجع درمان شمال کشور با بیش از دو دهه تجربه",
            "subtitle_en": "Northern Iran's trusted healthcare reference",
            "beds": 180,
            "doctors": 95,
            "departments": 12,
            "years": 25,
            "label_beds_fa": "تخت فعال",
            "label_beds_en": "Active Beds",
            "label_doctors_fa": "پزشک متخصص",
            "label_doctors_en": "Specialists",
            "label_departments_fa": "بخش درمانی",
            "label_departments_en": "Departments",
            "label_years_fa": "سال تجربه",
            "label_years_en": "Years Experience",
        },
    },
    {"id": "insurance", "type": "insurance", "enabled": True, "order": 4, "props": {}},
    {
        "id": "popular-doctors",
        "type": "popular_doctors",
        "enabled": True,
        "order": 5,
        "props": {
            "title_fa": "پزشکان برتر بیمارستان شمال",
            "title_en": "Leading Physicians",
            "subtitle_fa": "تیم متخصص ما آماده ارائه بهترین خدمات درمانی",
            "subtitle_en": "Our expert team delivers exceptional care",
            "max_count": 6,
        },
    },
    {
        "id": "about",
        "type": "about",
        "enabled": True,
        "order": 6,
        "props": {
            "title_fa": "بیمارستان شمال؛ مرجع تخصصی سلامت و درمان",
            "title_en": "Shomal Hospital — Specialty Care",
            "statement_title_fa": "بیانیه بیمارستان شمال",
            "statement_title_en": "Our Mission",
            "statement_fa": (
                "ما باور داریم مراقبت از بیمار، احترام به کرامت انسانی و ارائه "
                "خدمات تخصصی بدون تبعیض، رسالت اصلی بیمارستان شمال است."
            ),
            "statement_en": (
                "Compassionate care, human dignity, and equitable specialty "
                "services define our mission at Shomal Hospital."
            ),
            "location_fa": "آمل، مازندران — بیمارستان شمال",
            "location_en": "Amol, Mazandaran — Shomal Hospital",
        },
    },
    {
        "id": "news",
        "type": "news",
        "enabled": True,
        "order": 7,
        "props": {
            "title_fa": "اخبار و رویدادهای بیمارستان شمال",
            "title_en": "News & Events",
            "subtitle_fa": "آخرین اخبار، رویدادها و مطالب آموزشی",
            "subtitle_en": "Latest news, events and health education",
        },
    },
    {"id": "faq", "type": "faq", "enabled": True, "order": 8, "props": {}},
]


def _parse_blocks(raw: Any) -> list[HomepageBlock]:
    if not raw:
        return []
    if isinstance(raw, list):
        blocks = []
        for item in raw:
            if isinstance(item, dict):
                blocks.append(HomepageBlock(**item))
        return sorted(blocks, key=lambda b: b.order)
    return []


def _to_out(row) -> SiteSettingsOut:
    return SiteSettingsOut(
        hospital_name_fa=row.hospitalNameFa,
        hospital_name_en=row.hospitalNameEn,
        hero_video_url=row.heroVideoUrl,
        hero_poster_url=row.heroPosterUrl,
        hero_title_fa=row.heroTitleFa,
        hero_title_en=row.heroTitleEn,
        hero_subtitle_fa=row.heroSubtitleFa,
        hero_subtitle_en=row.heroSubtitleEn,
        hero_badge_fa=row.heroBadgeFa,
        hero_badge_en=row.heroBadgeEn,
        phone=row.phone,
        address_fa=row.addressFa,
        address_en=row.addressEn,
        homepage_blocks=_parse_blocks(row.homepageBlocks),
    )


class CmsService:
    async def ensure_defaults(self) -> None:
        existing = await db.sitesettings.find_unique(where={"id": "default"})
        if existing:
            await self._patch_i18n(existing)
            return
        await db.sitesettings.create(
            data={
                "id": "default",
                "hospitalNameFa": "بیمارستان شمال",
                "hospitalNameEn": "Shomal Hospital",
                "heroVideoUrl": DEFAULT_HERO_VIDEO,
                "heroPosterUrl": DEFAULT_HERO_POSTER,
                "heroTitleFa": "در ستایش زندگی...",
                "heroTitleEn": "In Celebration of Life...",
                "heroSubtitleFa": (
                    "بیمارستان تخصصی و فوق‌تخصصی شمال؛ مرجع درمان در شمال کشور "
                    "با تجهیزات پیشرفته، کادر مجرب و خدمات ۲۴ ساعته."
                ),
                "heroSubtitleEn": (
                    "Shomal Hospital — a leading specialty center in northern Iran "
                    "with advanced equipment, expert staff, and 24/7 care."
                ),
                "heroBadgeFa": "بیمارستان تخصصی شمال — آمل، مازندران",
                "heroBadgeEn": "Shomal Hospital — Amol, Mazandaran",
                "phone": "011-4422",
                "addressFa": "آمل، مازندران — بلوار آیت‌الله مطهری، بیمارستان شمال",
                "addressEn": "Shomal Hospital, Motahari Blvd, Amol, Mazandaran",
                "homepageBlocks": Json(DEFAULT_BLOCKS),
            }
        )

    async def _patch_i18n(self, row) -> None:
        """Merge missing English CMS fields into existing site settings."""
        defaults_by_id = {b["id"]: b for b in DEFAULT_BLOCKS}
        blocks = row.homepageBlocks if isinstance(row.homepageBlocks, list) else []
        changed = False
        patched_blocks = []
        for item in blocks:
            if not isinstance(item, dict):
                patched_blocks.append(item)
                continue
            block_id = item.get("id")
            props = dict(item.get("props") or {})
            if block_id and block_id in defaults_by_id:
                for key, val in (defaults_by_id[block_id].get("props") or {}).items():
                    if key.endswith("_en") and not props.get(key):
                        props[key] = val
                        changed = True
            if props != item.get("props"):
                item = {**item, "props": props}
            patched_blocks.append(item)

        data: dict[str, Any] = {}
        if not row.heroTitleEn:
            data["heroTitleEn"] = "In Celebration of Life..."
            changed = True
        if not row.heroSubtitleEn:
            data["heroSubtitleEn"] = (
                "Shomal Hospital — a leading specialty center in northern Iran "
                "with advanced equipment, expert staff, and 24/7 care."
            )
            changed = True
        if not row.hospitalNameEn:
            data["hospitalNameEn"] = "Shomal Hospital"
            changed = True
        # Force Amol branding + contact (legacy Sari / wrong phone)
        amol_defaults = {
            "addressFa": "آمل، مازندران — بلوار آیت‌الله مطهری، بیمارستان شمال",
            "addressEn": "Shomal Hospital, Motahari Blvd, Amol, Mazandaran",
            "heroBadgeFa": "بیمارستان تخصصی شمال — آمل، مازندران",
            "heroBadgeEn": "Shomal Hospital — Amol, Mazandaran",
            "phone": "011-4422",
            "hospitalNameFa": "بیمارستان شمال",
            "hospitalNameEn": "Shomal Hospital",
            "heroTitleFa": "در ستایش زندگی...",
            "heroSubtitleFa": (
                "بیمارستان تخصصی و فوق‌تخصصی شمال در آمل؛ مرجع درمان شمال کشور "
                "با تجهیزات پیشرفته، کادر مجرب و خدمات ۲۴ ساعته."
            ),
        }
        for field, new_val in amol_defaults.items():
            current = getattr(row, field, None) or ""
            needs = (
                not current
                or "ساری" in str(current)
                or "Sari" in str(current)
                or (field == "phone" and ("3322" in str(current) or current != new_val))
                or (field.startswith("address") and "آمل" not in str(current) and "Amol" not in str(current))
                or (field.startswith("heroBadge") and "آمل" not in str(current) and "Amol" not in str(current))
            )
            if needs and current != new_val:
                data[field] = new_val
                changed = True
        if changed:
            if patched_blocks:
                data["homepageBlocks"] = Json(patched_blocks)
            await db.sitesettings.update(where={"id": "default"}, data=data)

    async def _get_row(self):
        await self.ensure_defaults()
        row = await db.sitesettings.find_unique(where={"id": "default"})
        if not row:
            raise HTTPException(status_code=500, detail="Site settings unavailable")
        return row

    async def get_admin(self) -> SiteSettingsOut:
        return _to_out(await self._get_row())

    async def get_public(self) -> PublicSiteOut:
        row = await self._get_row()
        out = _to_out(row)
        enabled = [b for b in out.homepage_blocks if b.enabled]
        return PublicSiteOut(**{**out.model_dump(), "homepage_blocks": enabled})

    async def update_settings(self, payload: SiteSettingsUpdate) -> SiteSettingsOut:
        raw = payload.model_dump(exclude_unset=True)
        if not raw:
            return await self.get_admin()
        mapping = {
            "hospital_name_fa": "hospitalNameFa",
            "hospital_name_en": "hospitalNameEn",
            "hero_video_url": "heroVideoUrl",
            "hero_poster_url": "heroPosterUrl",
            "hero_title_fa": "heroTitleFa",
            "hero_title_en": "heroTitleEn",
            "hero_subtitle_fa": "heroSubtitleFa",
            "hero_subtitle_en": "heroSubtitleEn",
            "hero_badge_fa": "heroBadgeFa",
            "hero_badge_en": "heroBadgeEn",
            "phone": "phone",
            "address_fa": "addressFa",
            "address_en": "addressEn",
        }
        data = {mapping[k]: v for k, v in raw.items() if k in mapping}
        row = await db.sitesettings.update(where={"id": "default"}, data=data)
        return _to_out(row)

    async def update_blocks(self, blocks: list[HomepageBlock]) -> SiteSettingsOut:
        normalized = sorted(blocks, key=lambda b: b.order)
        for i, block in enumerate(normalized):
            block.order = i
        payload = [b.model_dump() for b in normalized]
        row = await db.sitesettings.update(
            where={"id": "default"},
            data={"homepageBlocks": Json(payload)},
        )
        return _to_out(row)


cms_service = CmsService()
