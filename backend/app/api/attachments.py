import uuid
import re
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.database import get_db
from app.core.security import require_admin
from app.models import User, Attachment

router = APIRouter(prefix="/attachments", tags=["پیوست‌ها"])
settings = get_settings()

ALLOWED_ENTITY = {"asset", "pm_visit"}
_BACKEND_ROOT = Path(__file__).resolve().parent.parent.parent


def _upload_dir() -> Path:
    p = _BACKEND_ROOT / settings.upload_dir
    p.mkdir(parents=True, exist_ok=True)
    return p


@router.get("/")
def list_attachments(
    entity_type: str = Query(...),
    entity_id: int = Query(...),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    if entity_type not in ALLOWED_ENTITY:
        raise HTTPException(status_code=400, detail="نوع موجودیت نامعتبر")
    rows = (
        db.query(Attachment)
        .filter(Attachment.entity_type == entity_type, Attachment.entity_id == entity_id)
        .order_by(Attachment.created_at.desc())
        .all()
    )
    return [
        {
            "id": r.id,
            "original_name": r.original_name,
            "content_type": r.content_type,
            "size_bytes": r.size_bytes,
            "uploaded_by": r.uploaded_by,
            "created_at": r.created_at,
        }
        for r in rows
    ]


@router.post("/")
async def upload_attachment(
    entity_type: str = Query(...),
    entity_id: int = Query(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(require_admin),
):
    if entity_type not in ALLOWED_ENTITY:
        raise HTTPException(status_code=400, detail="نوع موجودیت نامعتبر")
    if not file.filename:
        raise HTTPException(status_code=400, detail="نام فایل نامعتبر است")
    max_bytes = settings.max_upload_mb * 1024 * 1024
    content = await file.read()
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="فایل خالی است")
    if len(content) > max_bytes:
        raise HTTPException(status_code=400, detail=f"حداکثر حجم {settings.max_upload_mb} مگابایت")
    ext = Path(file.filename).suffix.lower()
    if not re.fullmatch(r"\.[a-z0-9]{1,10}", ext or ""):
        ext = ""
    stored = f"{uuid.uuid4().hex}{ext}"
    path = (_upload_dir() / stored).resolve()
    if not str(path).startswith(str(_upload_dir().resolve())):
        raise HTTPException(status_code=400, detail="مسیر فایل نامعتبر است")
    path.write_bytes(content)
    row = Attachment(
        entity_type=entity_type,
        entity_id=entity_id,
        stored_name=stored,
        original_name=file.filename,
        content_type=file.content_type or "application/octet-stream",
        size_bytes=len(content),
        uploaded_by=user.full_name,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return {"id": row.id, "original_name": row.original_name}


@router.get("/{attachment_id}/download")
def download_attachment(
    attachment_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    row = db.query(Attachment).filter(Attachment.id == attachment_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="فایل یافت نشد")
    path = (_upload_dir() / Path(row.stored_name).name).resolve()
    if not str(path).startswith(str(_upload_dir().resolve())) or not path.exists():
        raise HTTPException(status_code=404, detail="فایل روی دیسک یافت نشد")
    return FileResponse(path, filename=row.original_name, media_type=row.content_type)


@router.delete("/{attachment_id}", status_code=204)
def delete_attachment(
    attachment_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    row = db.query(Attachment).filter(Attachment.id == attachment_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="فایل یافت نشد")
    path = (_upload_dir() / Path(row.stored_name).name).resolve()
    if str(path).startswith(str(_upload_dir().resolve())) and path.exists():
        path.unlink()
        path.unlink()
    db.delete(row)
    db.commit()
