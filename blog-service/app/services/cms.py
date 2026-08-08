from typing import Any

from fastapi import HTTPException

from prisma import Json

from app.config import get_settings
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
    {
        "id": "about",
        "type": "about",
        "enabled": True,
        "order": 1,
        "props": {
            "title_fa": "درمانی که با آرامش شروع می‌شود",
            "title_en": "Care that begins with calm",
            "statement_title_fa": "چرا بیمارستان شمال؟",
            "statement_title_en": "Why Shomal Hospital?",
            "statement_fa": (
                "از سال ۱۳۸۲ در آمل، با تمرکز بر تخصص‌های قلب و عروق، زنان و زایمان، "
                "جراحی و اورژانس ۲۴ ساعته در خدمت مردم مازندران هستیم."
            ),
            "statement_en": (
                "Since 2003 in Amol — cardiology, obstetrics, surgery, "
                "and 24/7 emergency care for Mazandaran."
            ),
            "location_fa": "آمل، مازندران — بیمارستان فوق‌تخصصی شمال",
            "location_en": "Amol, Mazandaran — Shomal Specialty Hospital",
        },
    },
    {
        "id": "popular-doctors",
        "type": "popular_doctors",
        "enabled": True,
        "order": 2,
        "props": {
            "title_fa": "پزشکان برجسته",
            "title_en": "Featured physicians",
            "subtitle_fa": "تیم درمان",
            "subtitle_en": "Care team",
            "max_count": 6,
        },
    },
    {"id": "electronic-services", "type": "electronic_services", "enabled": True, "order": 3, "props": {}},
    {
        "id": "news",
        "type": "news",
        "enabled": True,
        "order": 4,
        "props": {
            "title_fa": "تازه‌های سلامت",
            "title_en": "Health news",
            "subtitle_fa": "اخبار و مقالات",
            "subtitle_en": "News & articles",
        },
    },
    {"id": "appointment-steps", "type": "appointment_steps", "enabled": True, "order": 5, "props": {}},
    {"id": "insurance", "type": "insurance", "enabled": True, "order": 6, "props": {}},
    {"id": "faq", "type": "faq", "enabled": True, "order": 7, "props": {}},
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


def _rewrite_media_url(url: str | None) -> str | None:
    """Keep uploaded media reachable via blog PUBLIC_BASE_URL (not gateway-only)."""
    if not url:
        return None
    # Stock Mixkit is NOT a persisted hospital upload — treat as unset
    if "mixkit.co" in url or "assets.mixkit" in url:
        return None
    marker = "/uploads/"
    if marker not in url:
        return url
    name = url.split(marker, 1)[1].split("?", 1)[0].lstrip("/")
    if not name:
        return url
    # Prefer direct blog :5005 so video works when gateway is still booting
    base = get_settings().public_base_url.rstrip("/")
    if base.endswith("/api/v1/pages"):
        base = "http://127.0.0.1:5005"
    return f"{base}{marker}{name}"


def _to_out(row) -> SiteSettingsOut:
    return SiteSettingsOut(
        hospital_name_fa=row.hospitalNameFa,
        hospital_name_en=row.hospitalNameEn,
        hero_video_url=_rewrite_media_url(row.heroVideoUrl),
        hero_poster_url=_rewrite_media_url(row.heroPosterUrl),
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
    async def _recover_hero_video(self, row) -> None:
        """If DB URL is missing/broken but an mp4 exists under uploads/, restore it.

        Survives restarts without forcing CMS re-upload.
        """
        from pathlib import Path

        upload_dir = get_settings().resolved_upload_dir
        upload_dir.mkdir(parents=True, exist_ok=True)
        base = get_settings().public_base_url.rstrip("/")
        if base.endswith("/api/v1/pages"):
            base = "http://127.0.0.1:5005"

        def file_ok(url: str | None) -> Path | None:
            if not url or "/uploads/" not in url:
                return None
            if url.startswith(("C:", "c:", "D:", "d:", "file:")):
                return None
            name = url.split("/uploads/", 1)[1].split("?", 1)[0].lstrip("/")
            if not name or ".." in name:
                return None
            path = upload_dir / Path(name).name
            return path if path.is_file() else None

        # Canonicalize existing DB URL if file still on disk (server/DB may be separate hosts)
        path = file_ok(row.heroVideoUrl)
        if path is not None:
            canonical = f"{base}/uploads/{path.name}"
            if (row.heroVideoUrl or "").strip() != canonical:
                await db.sitesettings.update(
                    where={"id": "default"},
                    data={"heroVideoUrl": canonical},
                )
            return

        bad = row.heroVideoUrl or ""
        if bad and (bad.startswith(("C:", "c:", "D:", "d:", "file:")) or "Downloads" in bad):
            await db.sitesettings.update(
                where={"id": "default"},
                data={"heroVideoUrl": None},
            )

        mp4s = sorted(
            upload_dir.glob("*.mp4"),
            key=lambda p: p.stat().st_mtime,
            reverse=True,
        )
        if not mp4s:
            return
        url = f"{base}/uploads/{mp4s[0].name}"
        await db.sitesettings.update(
            where={"id": "default"},
            data={"heroVideoUrl": url},
        )

    async def ensure_defaults(self) -> None:
        existing = await db.sitesettings.find_unique(where={"id": "default"})
        if existing:
            await self._patch_i18n(existing)
            await self._recover_hero_video(existing)
            return
        await db.sitesettings.create(
            data={
                "id": "default",
                "hospitalNameFa": "بیمارستان شمال",
                "hospitalNameEn": "Shomal Hospital",
                # Leave video empty until CMS upload — never pin Mixkit as "saved" content
                "heroVideoUrl": None,
                "heroPosterUrl": DEFAULT_HERO_POSTER,
                "heroTitleFa": "شمال، خانه‌ی سلامت شماست",
                "heroTitleEn": "Shomal — your home for health",
                "heroSubtitleFa": (
                    "بیش از دو دهه مراقبت تخصصی، با تیمی از پزشکان مجرب، "
                    "تجهیزات پیشرفته و فضایی آرام برای شما و خانواده‌تان."
                ),
                "heroSubtitleEn": (
                    "Over two decades of specialty care with expert physicians, "
                    "modern equipment, and a calm environment for your family."
                ),
                "heroBadgeFa": "مرکز فوق‌تخصصی درمان در آمل، مازندران",
                "heroBadgeEn": "Specialty care center in Amol, Mazandaran",
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
            "heroTitleFa": "شمال، خانه‌ی سلامت شماست",
            "heroTitleEn": "Shomal — your home for health",
            "heroSubtitleFa": (
                "بیش از دو دهه مراقبت تخصصی، با تیمی از پزشکان مجرب، "
                "تجهیزات پیشرفته و فضایی آرام برای شما و خانواده‌تان."
            ),
            "heroSubtitleEn": (
                "Over two decades of specialty care with expert physicians, "
                "modern equipment, and a calm environment for your family."
            ),
            "heroBadgeFa": "مرکز فوق‌تخصصی درمان در آمل، مازندران",
            "heroBadgeEn": "Specialty care center in Amol, Mazandaran",
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
