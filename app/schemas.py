from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field


class QualityLevel(str, Enum):
    keep = "keep"
    high = "high"
    medium = "medium"
    low = "low"


class JobStatus(str, Enum):
    queued = "queued"
    processing = "processing"
    done = "done"
    failed = "failed"


class UploadResponse(BaseModel):
    job_id: str
    status: JobStatus
    quality_used: str
    status_url: str
    download_url: str


class JobStatusResponse(BaseModel):
    job_id: str
    status: JobStatus
    progress: float = Field(ge=0, le=100)
    quality: str
    original_filename: Optional[str] = None
    error: Optional[str] = None
    input_size_bytes: Optional[int] = None
    output_size_bytes: Optional[int] = None


class QualityPresetInfo(BaseModel):
    key: str
    crf: int
    label: str
    description: str


class ErrorResponse(BaseModel):
    detail: str