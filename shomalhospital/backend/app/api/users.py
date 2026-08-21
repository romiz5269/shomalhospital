from pydantic import BaseModel, EmailStr, Field
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import require_admin, get_password_hash
from app.models import User, PasswordResetRequest, PushSubscription, ActivityLog, PMVisit, WorkCase
from app.schemas import UserOut
from app.services.activity import log_activity

router = APIRouter(prefix="/users", tags=["کاربران"])


class UserUpdate(BaseModel):
    full_name: str | None = None
    email: EmailStr | None = None
    username: str | None = None
    is_active: bool | None = None
    role: str | None = None


class AdminCreateUser(BaseModel):
    username: str
    email: EmailStr
    full_name: str
    password: str = Field(min_length=6)
    role: str = "technician"


def _active_admin_count(db: Session) -> int:
    return db.query(User).filter(User.role == "admin", User.is_active.is_(True)).count()


@router.get("/", response_model=list[UserOut])
def list_users(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    return db.query(User).order_by(User.username).all()


@router.post("/", response_model=UserOut, status_code=201)
def create_user(
    data: AdminCreateUser,
    db: Session = Depends(get_db),
    actor: User = Depends(require_admin),
):
    if db.query(User).filter(User.username == data.username).first():
        raise HTTPException(status_code=400, detail="نام کاربری تکراری است")
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(status_code=400, detail="ایمیل تکراری است")
    role = data.role if data.role in ("admin", "technician") else "technician"
    user = User(
        username=data.username,
        email=data.email,
        full_name=data.full_name,
        hashed_password=get_password_hash(data.password),
        role=role,
        is_active=True,
        must_change_password=False,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    log_activity(
        db,
        user_id=actor.id,
        user_name=actor.full_name,
        action="create",
        entity_type="user",
        entity_id=user.id,
        details=user.username,
    )
    return user


@router.patch("/{user_id}", response_model=UserOut)
def update_user(
    user_id: int,
    data: UserUpdate,
    db: Session = Depends(get_db),
    actor: User = Depends(require_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="کاربر یافت نشد")
    if user.id == actor.id and data.is_active is False:
        raise HTTPException(status_code=400, detail="نمی‌توانید خودتان را غیرفعال کنید")
    if data.role is not None:
        if data.role not in ("admin", "technician"):
            raise HTTPException(status_code=400, detail="نقش باید admin یا technician باشد")
        if user.role == "admin" and data.role != "admin" and _active_admin_count(db) <= 1:
            raise HTTPException(status_code=400, detail="نمی‌توان آخرین مدیر را از نقش مدیر خارج کرد")
    if data.is_active is False and user.role == "admin" and _active_admin_count(db) <= 1:
        raise HTTPException(status_code=400, detail="نمی‌توان آخرین مدیر را غیرفعال کرد")
    if data.username is not None:
        new_username = data.username.strip()
        if not new_username:
            raise HTTPException(status_code=400, detail="نام کاربری خالی است")
        taken = db.query(User).filter(User.username == new_username, User.id != user.id).first()
        if taken:
            raise HTTPException(status_code=400, detail="نام کاربری تکراری است")
        user.username = new_username
    payload = data.model_dump(exclude_unset=True, exclude={"username"})
    for k, v in payload.items():
        setattr(user, k, v)
    db.commit()
    db.refresh(user)
    log_activity(
        db,
        user_id=actor.id,
        user_name=actor.full_name,
        action="update",
        entity_type="user",
        entity_id=user.id,
        details=user.username,
    )
    return user


@router.delete("/{user_id}", status_code=204)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    actor: User = Depends(require_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="کاربر یافت نشد")
    if user.id == actor.id:
        raise HTTPException(status_code=400, detail="نمی‌توانید حساب خودتان را حذف کنید")
    if user.role == "admin" and _active_admin_count(db) <= 1:
        raise HTTPException(status_code=400, detail="نمی‌توان آخرین مدیر را حذف کرد")
    db.query(PasswordResetRequest).filter(PasswordResetRequest.user_id == user.id).delete()
    db.query(PushSubscription).filter(PushSubscription.user_id == user.id).delete()
    db.query(ActivityLog).filter(ActivityLog.user_id == user.id).update({ActivityLog.user_id: None})
    db.query(PMVisit).filter(PMVisit.technician_id == user.id).update({PMVisit.technician_id: None})
    db.query(WorkCase).filter(WorkCase.technician_id == user.id).update({WorkCase.technician_id: None})
    username = user.username
    db.delete(user)
    db.commit()
    log_activity(
        db,
        user_id=actor.id,
        user_name=actor.full_name,
        action="delete",
        entity_type="user",
        entity_id=user_id,
        details=username,
    )
