
from fastapi import APIRouter, HTTPException

from app.job_manager import job_manager
from app.schemas import JobStatusResponse

router = APIRouter(tags=["Status"])


@router.get("/status/{job_id}", response_model=JobStatusResponse)
async def get_status(job_id: str):
    job = job_manager.get(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job پیدا نشد.")

    output_size = job.output_path.stat().st_size if job.output_path.exists() else None

    return JobStatusResponse(
        job_id=job.id,
        status=job.status,
        progress=job.progress,
        quality=job.quality,
        original_filename=job.original_filename,
        error=job.error,
        output_size_bytes=output_size,
    )