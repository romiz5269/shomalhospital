from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models import User, MaintenancePlan
from app.schemas import (
    MaintenancePlanCreate, MaintenancePlanUpdate, MaintenancePlanOut,
)
from app.services.activity import log_activity

router = APIRouter(prefix="/maintenance-plans", tags=["برنامه نگهداری"])


def _out(p):
    return MaintenancePlanOut.from_orm_compat(p)


@router.get("/", response_model=list[MaintenancePlanOut])
def list_plans(
    active_only: bool = False,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = db.query(MaintenancePlan)
    if active_only:
        q = q.filter(MaintenancePlan.is_active == True)
    return [_out(p) for p in q.order_by(MaintenancePlan.next_due_date).all()]


@router.post("/", response_model=MaintenancePlanOut, status_code=201)
def create_plan(
    data: MaintenancePlanCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    d = data.model_dump()
    d["device_id"] = d.pop("asset_id", None)
    d["section_id"] = d.pop("department_id", None)
    plan = MaintenancePlan(**d)
    db.add(plan)
    db.commit()
    db.refresh(plan)
    log_activity(db, user_id=current_user.id, user_name=current_user.full_name,
                 action="create", entity_type="maintenance_plan", entity_id=plan.id, details=plan.title)
    return _out(plan)


@router.put("/{plan_id}", response_model=MaintenancePlanOut)
def update_plan(
    plan_id: int,
    data: MaintenancePlanUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    plan = db.query(MaintenancePlan).filter(MaintenancePlan.id == plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="برنامه یافت نشد")
    updates = data.model_dump(exclude_unset=True)
    if "asset_id" in updates:
        updates["device_id"] = updates.pop("asset_id")
    if "department_id" in updates:
        updates["section_id"] = updates.pop("department_id")
    for k, v in updates.items():
        setattr(plan, k, v)
    db.commit()
    db.refresh(plan)
    log_activity(db, user_id=current_user.id, user_name=current_user.full_name,
                 action="update", entity_type="maintenance_plan", entity_id=plan.id)
    return _out(plan)


@router.post("/{plan_id}/complete", response_model=MaintenancePlanOut)
def complete_plan(
    plan_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from datetime import timedelta
    plan = db.query(MaintenancePlan).filter(MaintenancePlan.id == plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="برنامه یافت نشد")
    now = datetime.utcnow()
    plan.last_performed_at = now
    plan.next_due_date = now + timedelta(days=plan.interval_days)
    db.commit()
    db.refresh(plan)
    log_activity(db, user_id=current_user.id, user_name=current_user.full_name,
                 action="complete", entity_type="maintenance_plan", entity_id=plan.id, details=plan.title)
    return _out(plan)


@router.delete("/{plan_id}", status_code=204)
def delete_plan(
    plan_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    plan = db.query(MaintenancePlan).filter(MaintenancePlan.id == plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="برنامه یافت نشد")
    db.delete(plan)
    db.commit()
    log_activity(db, user_id=current_user.id, user_name=current_user.full_name,
                 action="delete", entity_type="maintenance_plan", entity_id=plan_id)
