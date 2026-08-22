import threading
import time
import uuid
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, Optional

from app.schemas import JobStatus


@dataclass
class Job:
    id: str
    quality: str
    original_filename: str
    input_path: Path
    output_path: Path
    status: JobStatus = JobStatus.queued
    progress: float = 0.0
    error: Optional[str] = None
    created_at: float = field(default_factory=time.time)
    updated_at: float = field(default_factory=time.time)


class JobManager:
    def __init__(self) -> None:
        self._jobs: Dict[str, Job] = {}
        self._lock = threading.Lock()

    def create_job(self, quality: str, original_filename: str,
                   input_path: Path, output_path: Path,
                   job_id: Optional[str] = None) -> Job:
        job_id = job_id or str(uuid.uuid4())
        job = Job(
            id=job_id,
            quality=quality,
            original_filename=original_filename,
            input_path=input_path,
            output_path=output_path,
        )
        with self._lock:
            self._jobs[job_id] = job
        return job

    def get(self, job_id: str) -> Optional[Job]:
        with self._lock:
            return self._jobs.get(job_id)

    def update(self, job_id: str, **kwargs) -> None:
        with self._lock:
            job = self._jobs.get(job_id)
            if job is None:
                return
            for key, value in kwargs.items():
                setattr(job, key, value)
            job.updated_at = time.time()

    def all_jobs(self):
        with self._lock:
            return list(self._jobs.values())

    def delete(self, job_id: str) -> None:
        with self._lock:
            self._jobs.pop(job_id, None)



job_manager = JobManager()