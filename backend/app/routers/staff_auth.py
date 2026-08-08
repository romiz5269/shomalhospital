from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Staff
from app.schemas import LoginBody, StaffRegister
from app.security import check_password, hash_password, issue_staff_token, require_staff
from app.serialize import dump_staff

router = APIRouter(prefix="/api/staff-auth", tags=["staff-auth"])


@router.post("/register", status_code=201)
def register(body: StaffRegister, db: Session = Depends(get_db)):
    if db.query(Staff).filter(Staff.email == body.email).first():
        raise HTTPException(409, "این ایمیل قبلاً ثبت شده است.")
    staff = Staff(
        name=body.name,
        email=body.email,
        password=hash_password(body.password),
        department=body.department,
        phone=body.phone,
    )
    db.add(staff)
    db.commit()
    db.refresh(staff)
    return {"staff": dump_staff(staff), "token": issue_staff_token(staff.id)}


@router.post("/login")
def login(body: LoginBody, db: Session = Depends(get_db)):
    staff = db.query(Staff).filter(Staff.email == body.email).first()
    if not staff or not check_password(body.password, staff.password):
        raise HTTPException(401, "ایمیل یا رمز عبور اشتباه است.")
    return {
        "staff": {
            "id": staff.id,
            "name": staff.name,
            "email": staff.email,
            "department": staff.department,
            "phone": staff.phone,
        },
        "token": issue_staff_token(staff.id),
    }


@router.get("/me")
def me(staff_id: str = Depends(require_staff), db: Session = Depends(get_db)):
    staff = db.get(Staff, staff_id)
    if not staff:
        raise HTTPException(401, "کاربر یافت نشد")
    return dump_staff(staff)
