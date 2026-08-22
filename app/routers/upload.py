
import shutil
import uuid
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, File, Form, HTTPException, UploadFile
from fastapi.responses import JSONResponse

from app.compressor import compress_video
from app.config import (
    ALLOWED_CONTENT_TYPES_PREFIX,
    OUTPUT_DIR,
    QUALITY_PRESETS,
    UPLOAD_DIR,
)
from app.job_manager import job_manager
from app.schemas import QualityLevel, QualityPresetInfo, UploadResponse

router = APIRouter(tags=["Upload"])


@router.get("/qualities", response_model=list[QualityPresetInfo])
async def list_quality_presets():
    
    return [
        QualityPresetInfo(key=key, crf=info["crf"], label=info["label"], description=info["description"])
        for key, info in QUALITY_PRESETS.items()
    ]


@router.post("/upload", response_model=UploadResponse, status_code=202)
async def upload_video(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(..., description="فایل ویدیو برای فشرده‌سازی"),
    quality: QualityLevel = Form(
        QualityLevel.medium,
        description="سطح کیفیت خروجی: keep / high / medium / low",
    ),
    custom_crf: Optional[int] = Form(
        None,
        description="در صورت نیاز به کنترل دقیق‌تر، مقدار CRF دلخواه بین 0 تا 51 (اختیاری، اگر ست شود بر quality اولویت دارد)",
    ),
):
    if not file.content_type or not file.content_type.startswith(ALLOWED_CONTENT_TYPES_PREFIX):
        raise HTTPException(status_code=400, detail="فایل ارسالی باید از نوع ویدیو باشد.")

    job_uuid = str(uuid.uuid4())
    suffix = Path(file.filename or "input.mp4").suffix or ".mp4"
    input_path = UPLOAD_DIR / f"{job_uuid}{suffix}"
    output_path = OUTPUT_DIR / f"{job_uuid}_compressed.mp4"

    try:
        with input_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    finally:
        await file.close()

    if input_path.stat().st_size == 0:
        input_path.unlink(missing_ok=True)
        raise HTTPException(status_code=400, detail="فایل آپلود شده خالی است.")

    job = job_manager.create_job(
        job_id=job_uuid,
        quality=quality.value,
        original_filename=file.filename or "input.mp4",
        input_path=input_path,
        output_path=output_path,
    )

    background_tasks.add_task(compress_video, job.id, quality.value, custom_crf)

    return UploadResponse(
        job_id=job.id,
        status=job.status,
        quality_used=quality.value,
        status_url=f"/api/v1/status/{job.id}",
        download_url=f"/api/v1/download/{job.id}",
    )