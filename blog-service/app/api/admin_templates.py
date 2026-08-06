"""Page builder templates API."""
from fastapi import APIRouter

router = APIRouter(prefix="/admin/templates", tags=["cms-templates"])

TEMPLATES = [
    {"id": "classic", "name_fa": "کلاسیک شمال", "name_en": "Classic Shomal", "custom_level": 30},
    {"id": "video-hero", "name_fa": "هیرو ویدیویی", "name_en": "Video Hero", "custom_level": 45},
    {"id": "minimal", "name_fa": "مینیمال", "name_en": "Minimal", "custom_level": 15},
    {"id": "premium-glass", "name_fa": "شیشه‌ای پریمیوم", "name_en": "Premium Glass", "custom_level": 85},
    {"id": "news-focus", "name_fa": "اخبار محور", "name_en": "News Focus", "custom_level": 55},
    {"id": "services", "name_fa": "خدمات محور", "name_en": "Services Hub", "custom_level": 60},
]


@router.get("")
async def list_templates():
    return {"items": TEMPLATES}
