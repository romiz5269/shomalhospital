from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Admin
from app.schemas import AdminRegister, LoginBody
from app.security import check_password, hash_password, issue_admin_token, require_admin
from app.serialize import dump_admin

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", status_code=201)
def register(body: AdminRegister, db: Session = Depends(get_db)):
    if db.query(Admin).filter(Admin.email == body.email).first():
        raise HTTPException(409, "این ایمیل قبلاً ثبت شده است.")
    admin = Admin(name=body.name, email=body.email, password=hash_password(body.password))
    db.add(admin)
    db.commit()
    db.refresh(admin)
    return {"admin": dump_admin(admin), "token": issue_admin_token(admin.id)}


@router.post("/login")
def login(body: LoginBody, db: Session = Depends(get_db)):
    admin = db.query(Admin).filter(Admin.email == body.email).first()
    if not admin or not check_password(body.password, admin.password):
        raise HTTPException(401, "ایمیل یا رمز عبور اشتباه است.")
    return {
        "admin": {"id": admin.id, "name": admin.name, "email": admin.email},
        "token": issue_admin_token(admin.id),
    }


@router.get("/me")
def me(admin_id: str = Depends(require_admin), db: Session = Depends(get_db)):
    admin = db.get(Admin, admin_id)
    if not admin:
        raise HTTPException(401, "کاربر یافت نشد")
    return dump_admin(admin)
