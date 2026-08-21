from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models import User, ActivityLog
from app.schemas import ActivityLogOut

router = APIRouter(prefix="/activity", tags=["لاگ فعالیت"])


@router.get("/", response_model=list[ActivityLogOut])
def list_activity(
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(ActivityLog)
    if current_user.role != "admin":
        q = q.filter(ActivityLog.user_id == current_user.id)
    return q.order_by(ActivityLog.created_at.desc()).limit(min(limit, 200)).all()
