import asyncio
import json
import logging
from pathlib import Path
from typing import Optional

from app.config import QUALITY_PRESETS, MIN_CRF, MAX_CRF
from app.job_manager import job_manager
from app.schemas import JobStatus

logger = logging.getLogger("video_compressor.compressor")


class CompressionError(Exception):
    pass


async def get_video_duration_seconds(input_path: Path) -> Optional[float]:
    
    cmd = [
        "ffprobe", "-v", "error",
        "-show_entries", "format=duration",
        "-of", "json",
        str(input_path),
    ]
    proc = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    stdout, _ = await proc.communicate()
    if proc.returncode != 0:
        return None
    try:
        data = json.loads(stdout.decode() or "{}")
        return float(data["format"]["duration"])
    except (KeyError, ValueError, json.JSONDecodeError):
        return None


def resolve_crf(quality: str, custom_crf: Optional[int]) -> tuple[int, str]:
    if custom_crf is not None:
        if not (MIN_CRF <= custom_crf <= MAX_CRF):
            raise ValueError(f"custom_crf باید بین {MIN_CRF} و {MAX_CRF} باشد")
        return custom_crf, "medium"

    preset_info = QUALITY_PRESETS.get(quality)
    if preset_info is None:
        raise ValueError(f"سطح کیفیت نامعتبر است: {quality}")
    return preset_info["crf"], preset_info["preset"]


async def compress_video(job_id: str, quality: str, custom_crf: Optional[int] = None) -> None:
    
    job = job_manager.get(job_id)
    if job is None:
        logger.error("Job %s not found", job_id)
        return

    job_manager.update(job_id, status=JobStatus.processing, progress=0.0)

    try:
        crf, preset = resolve_crf(quality, custom_crf)
    except ValueError as e:
        job_manager.update(job_id, status=JobStatus.failed, error=str(e))
        return

    duration = await get_video_duration_seconds(job.input_path)

    cmd = [
        "ffmpeg", "-y",
        "-i", str(job.input_path),
        "-c:v", "libx264",
        "-crf", str(crf),
        "-preset", preset,
        "-c:a", "aac", "-b:a", "128k",
        "-movflags", "+faststart",
        "-loglevel", "error",
        "-progress", "pipe:1",
        "-nostats",
        str(job.output_path),
    ]

    try:
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )

        assert proc.stdout is not None
        while True:
            line = await proc.stdout.readline()
            if not line:
                break
            decoded = line.decode(errors="ignore").strip()
            if decoded.startswith("out_time_ms=") and duration:
                try:
                    out_time_ms = int(decoded.split("=")[1])
                    progress = min(99.0, (out_time_ms / 1000 / duration) * 100)
                    job_manager.update(job_id, progress=round(progress, 1))
                except (ValueError, ZeroDivisionError):
                    pass
            elif decoded == "progress=end":
                job_manager.update(job_id, progress=99.0)

        stderr_output = await proc.stderr.read()
        returncode = await proc.wait()

        if returncode != 0:
            error_msg = stderr_output.decode(errors="ignore").strip() or "خطای نامشخص در ffmpeg"
            job_manager.update(job_id, status=JobStatus.failed, error=error_msg)
            if job.output_path.exists():
                job.output_path.unlink(missing_ok=True)
            return

        job_manager.update(job_id, status=JobStatus.done, progress=100.0)

    except FileNotFoundError:
        job_manager.update(
            job_id, status=JobStatus.failed,
            error="ffmpeg روی سرور نصب نیست یا در PATH قرار ندارد.",
        )
    except Exception as e:  # noqa: BLE001
        logger.exception("Unexpected error while compressing job %s", job_id)
        job_manager.update(job_id, status=JobStatus.failed, error=str(e))
    finally:
        if job.input_path.exists():
            job.input_path.unlink(missing_ok=True)