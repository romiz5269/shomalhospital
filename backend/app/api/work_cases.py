from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models import User, WorkCase
from app.schemas import WorkCaseCreate, WorkCaseUpdate, WorkCaseOut

router = APIRouter(prefix="/work-cases", tags=["کارها و وقایع"])


@router.get("/", response_model=list[WorkCaseOut])
def list_work_cases(
    department_id: int | None = None,
    asset_id: int | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = db.query(WorkCase)
    if department_id:
        q = q.filter(WorkCase.section_id == department_id)
    if asset_id:
        q = q.filter(WorkCase.device_id == asset_id)
    return [WorkCaseOut.from_orm_compat(c) for c in q.order_by(WorkCase.created_at.desc()).all()]


@router.get("/{case_id}", response_model=WorkCaseOut)
def get_work_case(case_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    case = db.query(WorkCase).filter(WorkCase.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="مورد کار یافت نشد")
    return WorkCaseOut.from_orm_compat(case)


@router.post("/", response_model=WorkCaseOut, status_code=201)
def create_work_case(
    data: WorkCaseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    d = data.model_dump()
    d["device_id"] = d.pop("asset_id", None)
    d["section_id"] = d.pop("department_id", None)
    case = WorkCase(**d, technician_id=current_user.id)
    if not case.completed_at and case.status == "completed":
        case.completed_at = datetime.utcnow()
    db.add(case)
    db.commit()
    db.refresh(case)
    return WorkCaseOut.from_orm_compat(case)


@router.put("/{case_id}", response_model=WorkCaseOut)
def update_work_case(
    case_id: int,
    data: WorkCaseUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    case = db.query(WorkCase).filter(WorkCase.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="مورد کار یافت نشد")
    updates = data.model_dump(exclude_unset=True)
    if "asset_id" in updates:
        updates["device_id"] = updates.pop("asset_id")
    if "department_id" in updates:
        updates["section_id"] = updates.pop("department_id")
    for k, v in updates.items():
        setattr(case, k, v)
    case.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(case)
    return WorkCaseOut.from_orm_compat(case)


@router.delete("/{case_id}", status_code=204)
def delete_work_case(case_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    case = db.query(WorkCase).filter(WorkCase.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="مورد کار یافت نشد")
    db.delete(case)
    db.commit()
