# Video Compressor API (FastAPI + FFmpeg)

سرویس مستقل و ماژولار برای فشرده‌سازی ویدیو که به‌راحتی قابل اتصال به هر سیستم/وبسایت دیگری است.

## ساختار ۴ ماژول

| # | ماژول | فایل | وظیفه |
|---|-------|------|-------|
| ۱ | Upload | `app/routers/upload.py` | دریافت فایل ویدیو + سطح کیفیت انتخابی کاربر، ساخت Job |
| ۲ | Job Manager | `app/job_manager.py` | نگهداری وضعیت/درصد پیشرفت هر Job با شناسه یکتا (Job ID) |
| ۳ | Compressor | `app/compressor.py` | اجرای واقعی فشرده‌سازی با FFmpeg (به‌صورت async و در پس‌زمینه) |
| ۴ | Status / Download | `app/routers/status.py`, `app/routers/download.py` | استعلام وضعیت و دریافت مستقیم فایل خروجی |

## نصب و اجرا

```bash
pip install -r requirements.txt --break-system-packages   # یا در virtualenv بدون این فلگ
# FFmpeg باید روی سیستم نصب باشد:
#   Ubuntu/Debian: sudo apt install ffmpeg
uvicorn main:app --reload --port 8000
```

مستندات تعاملی (Swagger): `http://localhost:8000/docs`

## جریان کار (Workflow)

چون پردازش ویدیو ممکن است زمان‌بر باشد، این API به‌صورت **Async با Job ID** کار می‌کند:

```
1) فرانت‌اند شما   GET /api/v1/qualities   → گزینه‌های کیفیت را می‌گیرد و به کاربر نشان می‌دهد
2) کاربر انتخاب می‌کند (مثلا "متوسط")
3) فرانت‌اند       POST /api/v1/upload     → فایل + quality را می‌فرستد، job_id می‌گیرد
4) فرانت‌اند       GET /api/v1/status/{id} → هر ۱-۲ ثانیه پرسش می‌کند تا status=done شود
5) فرانت‌اند       GET /api/v1/download/{id} → فایل نهایی را مستقیما دریافت می‌کند
```

## اندپوینت‌ها

### `GET /api/v1/qualities`
لیست سطوح کیفیت (`keep`, `high`, `medium`, `low`) به همراه توضیح فارسی هرکدام.

### `POST /api/v1/upload`
`multipart/form-data`:
- `file`: فایل ویدیو (اجباری)
- `quality`: یکی از `keep` / `high` / `medium` / `low` (پیش‌فرض: `medium`)
- `custom_crf`: عدد ۰ تا ۵۱ برای کنترل دستی دقیق‌تر (اختیاری، در صورت ارسال بر `quality` اولویت دارد)

پاسخ (202 Accepted):
```json
{
  "job_id": "935265be-...",
  "status": "queued",
  "quality_used": "low",
  "status_url": "/api/v1/status/935265be-...",
  "download_url": "/api/v1/download/935265be-..."
}
```

### `GET /api/v1/status/{job_id}`
```json
{
  "job_id": "935265be-...",
  "status": "processing",   // queued | processing | done | failed
  "progress": 63.4,
  "quality": "low",
  "original_filename": "test_input.mp4",
  "error": null,
  "output_size_bytes": null
}
```

### `GET /api/v1/download/{job_id}`
اگر `status=done` باشد، فایل ویدیوی فشرده‌شده را مستقیما (به‌صورت stream، نه لینک) برمی‌گرداند.
در غیر این صورت خطای مناسب (409 اگر هنوز آماده نیست، 422 اگر failed شده) برمی‌گرداند.

## نمونه تست با curl

```bash
# آپلود
curl -X POST http://localhost:8000/api/v1/upload \
  -F "file=@input.mp4" -F "quality=medium"

# استعلام وضعیت (JOB_ID را از پاسخ بالا بگذارید)
curl http://localhost:8000/api/v1/status/JOB_ID

# دانلود خروجی نهایی
curl -o output.mp4 http://localhost:8000/api/v1/download/JOB_ID
```

## اتصال به سیستم/وبسایت دیگر

این پروژه کاملا مستقل است و فقط باید در دامنه/پورت خودش اجرا شود؛ سیستم دیگر شما صرفا این ۳ اندپوینت را صدا می‌زند:
1. برای هر ویدیو، `POST /upload` بزنید و `job_id` را ذخیره کنید.
2. با تایمر (مثلا هر ۲ ثانیه) `GET /status/{job_id}` را چک کنید تا `done` شود.
3. با `GET /download/{job_id}` فایل نهایی را بگیرید (یا مستقیم لینک `download_url` را به کاربر بدهید).

نکات مهم برای Production:
- **CORS**: در `main.py`، مقدار `allow_origins=["*"]` را با دامنه دقیق سایت اصلی جایگزین کنید.
- **ذخیره وضعیت Job**: در حال حاضر Job ها در حافظه (RAM) نگه داشته می‌شوند. اگر با چند Worker/Instance اجرا می‌کنید یا سرور ری‌استارت می‌شود، این اطلاعات از بین می‌رود. برای مقیاس واقعی، `job_manager.py` را با Redis یا یک دیتابیس جایگزین کنید (رابط تابع‌ها را می‌توانید عینا حفظ کنید).
- **صف پردازش**: `BackgroundTasks` فعلی برای بار کاری کم تا متوسط مناسب است؛ برای حجم بالا بهتر است از Celery/RQ + Worker جدا استفاده شود.
- **پاکسازی فایل‌ها**: فایل ورودی بعد از پردازش خودکار پاک می‌شود؛ برای فایل‌های خروجی قدیمی هم بهتر است یک Cron/Scheduled Task برای حذف دوره‌ای اضافه شود (مقدار `FILE_RETENTION_SECONDS` در `app/config.py` برای همین منظور در نظر گرفته شده و باید پیاده‌سازی جاروب‌کننده به آن اضافه شود).
- **محدودیت حجم آپلود**: در صورت نیاز، محدودیت حجم فایل را در ری‌ورس‌پروکسی (nginx) یا در کد اضافه کنید.

## سطوح کیفیت (CRF)

| کلید | CRF | توضیح |
|------|-----|-------|
| `keep`   | 18 | حفظ کیفیت اصلی، افت تقریبا نامحسوس |
| `high`   | 23 | کیفیت بالا، کاهش حجم متوسط |
| `medium` | 28 | کیفیت متوسط، کاهش حجم قابل‌توجه (پیش‌فرض) |
| `low`    | 33 | فشرده‌سازی زیاد، افت کیفیت مشهود |

عدد CRF کمتر = کیفیت بهتر و حجم بیشتر؛ عدد بیشتر = کیفیت کمتر و حجم کمتر (بازه معتبر ffmpeg: 0 تا 51).