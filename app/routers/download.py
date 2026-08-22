"""
ماژول دریافت خروجی (Download)

پس از اتمام موفق پردازش، این ماژول فایل ویدیوی فشرده‌شده را مستقیما
(به‌صورت Response دودویی/فایل) برمی‌گرداند - نه فقط یک لینک.
"""
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from app.job_manager import job_manager
from app.schemas import JobStatus

router = APIRouter(tags=["Download"])


@router.get("/download/{job_id}")
async def download_video(job_id: str):
    job = job_manager.get(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job پیدا نشد.")

    if job.status == JobStatus.failed:
        raise HTTPException(status_code=422, detail=f"پردازش با خطا مواجه شد: {job.error}")

    if job.status != JobStatus.done:
        raise HTTPException(
            status_code=409,
            detail=f"فایل هنوز آماده نیست. وضعیت فعلی: {job.status.value} ({job.progress}%)",
        )

    if not job.output_path.exists():
        raise HTTPException(status_code=410, detail="فایل خروجی دیگر روی سرور موجود نیست.")

    return FileResponse(
        path=job.output_path,
        media_type="video/mp4",
        filename=f"compressed_{job.original_filename.rsplit('.', 1)[0]}.mp4",
    )