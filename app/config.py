from pathlib import Path
import logging
logging.basicConfig(level=logging.INFO)
logger=logging.getLogger(__name__)


BASE_DIR = Path(__file__).resolve().parent.parent
UPLOAD_DIR = BASE_DIR / "storage" / "uploads"
OUTPUT_DIR = BASE_DIR / "storage" / "outputs"

UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
logger.info("UPLOAD_DIR ok")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

QUALITY_PRESETS = {
    "keep": {
        "crf": 18,
        "preset": "medium",
        "label": "حفظ کیفیت اصلی",
        "description": "افت کیفیت تقریبا محسوس نیست، فقط حجم کمی کاهش می‌یابد.",
    },
    "high": {
        "crf": 23,
        "preset": "medium",
        "label": "کیفیت بالا",
        "description": "کاهش حجم متوسط، کیفیت در حد استاندارد وب حفظ می‌شود.",
    },
    "medium": {
        "crf": 28,
        "preset": "fast",
        "label": "کیفیت متوسط",
        "description": "کاهش حجم قابل توجه، برای اکثر کاربردهای وب مناسب است.",
    },
    "low": {
        "crf": 33,
        "preset": "fast",
        "label": "کیفیت پایین (فشرده‌سازی زیاد)",
        "description": "بیشترین کاهش حجم، افت کیفیت مشهود است.",
    },
}

DEFAULT_QUALITY = "medium"

MIN_CRF = 0
MAX_CRF = 51

ALLOWED_CONTENT_TYPES_PREFIX = "video/"

# پاکسازی خودکار فایل‌های قدیمی‌تر از این مقدار (ثانیه) - پیش‌فرض ۲ ساعت
FILE_RETENTION_SECONDS = 2 * 60 * 60