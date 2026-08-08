import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from app.config import get_settings
from app.middleware.auth import AuthUser, require_admin
from app.schemas.cms import MessageResponse

router = APIRouter(prefix="/admin/media", tags=["admin-media"])

ALLOWED_VIDEO = {".mp4", ".webm", ".mov"}
ALLOWED_IMAGE = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
MAX_VIDEO_BYTES = 80 * 1024 * 1024
MAX_IMAGE_BYTES = 8 * 1024 * 1024


@router.post("/upload", response_model=dict)
async def upload_media(
    file: UploadFile = File(...),
    _: AuthUser = Depends(require_admin()),
):
    settings = get_settings()
    if not file.filename:
        raise HTTPException(status_code=400, detail="فایل نامعتبر است")

    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_VIDEO | ALLOWED_IMAGE:
        raise HTTPException(
            status_code=400,
            detail="فرمت مجاز: mp4, webm, mov, jpg, png, webp",
        )

    content = await file.read()
    max_size = MAX_VIDEO_BYTES if ext in ALLOWED_VIDEO else MAX_IMAGE_BYTES
    if len(content) > max_size:
        raise HTTPException(status_code=400, detail="حجم فایل بیش از حد مجاز است")

    upload_dir = settings.resolved_upload_dir
    upload_dir.mkdir(parents=True, exist_ok=True)

    safe_name = f"{uuid.uuid4().hex}{ext}"
    dest = upload_dir / safe_name
    dest.write_bytes(content)

    base = settings.public_base_url.rstrip("/")
    url = f"{base}/uploads/{safe_name}"
    media_type = "video" if ext in ALLOWED_VIDEO else "image"

    return {
        "success": True,
        "url": url,
        "media_type": media_type,
        "filename": safe_name,
    }


@router.delete("/{filename}", response_model=MessageResponse)
async def delete_media(
    filename: str,
    _: AuthUser = Depends(require_admin()),
):
    settings = get_settings()
    path = settings.resolved_upload_dir / Path(filename).name
    if path.is_file():
        path.unlink()
    return MessageResponse(message="Deleted")
