from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models import User, Department
from app.schemas import DepartmentCreate, DepartmentUpdate, DepartmentOut

router = APIRouter(prefix="/departments", tags=["واحدها"])


@router.get("/", response_model=list[DepartmentOut])
def list_departments(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return db.query(Department).order_by(Department.name).all()


@router.get("/{dept_id}", response_model=DepartmentOut)
def get_department(dept_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    dept = db.query(Department).filter(Department.id == dept_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="واحد یافت نشد")
    return dept


@router.post("/", response_model=DepartmentOut, status_code=201)
def create_department(data: DepartmentCreate, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    dept = Department(**data.model_dump())
    db.add(dept)
    db.commit()
    db.refresh(dept)
    return dept


@router.put("/{dept_id}", response_model=DepartmentOut)
def update_department(dept_id: int, data: DepartmentUpdate, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    dept = db.query(Department).filter(Department.id == dept_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="واحد یافت نشد")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(dept, k, v)
    db.commit()
    db.refresh(dept)
    return dept


@router.delete("/{dept_id}", status_code=204)
def delete_department(dept_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    dept = db.query(Department).filter(Department.id == dept_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="واحد یافت نشد")
    db.delete(dept)
    db.commit()
