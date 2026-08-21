from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, selectinload

from app.core.database import get_db
from app.core.security import get_current_user
from app.models import User, PMVisit, PMVisitTask, PMChecklistTemplate, Asset
from app.schemas.pm import (
    PMVisitCreate,
    PMVisitUpdate,
    PMVisitOut,
    PMChecklistTemplateOut,
    PMChecklistTemplateCreate,
    PMChecklistTemplateUpdate,
)
from app.services.activity import log_activity
from app.services.alerts import sync_all_reminders
from app.services.pm_alert_helpers import apply_pm_alert_defaults

router = APIRouter(prefix="/pm-visits", tags=["عیب‌یابی و تعمیرات"])


def _visit_out(v: PMVisit) -> PMVisitOut:
    return PMVisitOut.from_orm_compat(v)


@router.get("/checklist-templates", response_model=list[PMChecklistTemplateOut])
def list_templates(
    category: str | None = None,
    all_categories: bool = Query(False, alias="all_categories"),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = db.query(PMChecklistTemplate).order_by(PMChecklistTemplate.sort_order, PMChecklistTemplate.id)
    if category and not all_categories:
        q = q.filter(PMChecklistTemplate.category.in_([category, "general"]))
    return q.all()


@router.post("/checklist-templates", response_model=PMChecklistTemplateOut, status_code=201)
def create_template(
    data: PMChecklistTemplateCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if db.query(PMChecklistTemplate).filter(PMChecklistTemplate.name == data.name).first():
        raise HTTPException(status_code=400, detail="این مورد چک‌لیست قبلاً ثبت شده")
    sort = data.sort_order
    if sort <= 0:
        last = db.query(PMChecklistTemplate).order_by(PMChecklistTemplate.sort_order.desc()).first()
        sort = (last.sort_order + 1) if last else 1
    item = PMChecklistTemplate(name=data.name.strip(), category=data.category, interval_days=data.interval_days, sort_order=sort)
    db.add(item)
    db.commit()
    db.refresh(item)
    log_activity(db, user_id=current_user.id, user_name=current_user.full_name, action="create", entity_type="checklist", entity_id=item.id, details=item.name)
    return item


@router.put("/checklist-templates/{template_id}", response_model=PMChecklistTemplateOut)
def update_template(
    template_id: int,
    data: PMChecklistTemplateUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    item = db.query(PMChecklistTemplate).filter(PMChecklistTemplate.id == template_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="مورد چک‌لیست یافت نشد")
    for k, v in data.model_dump(exclude_unset=True).items():
        if k == "name" and isinstance(v, str):
            v = v.strip()
        setattr(item, k, v)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/checklist-templates/{template_id}", status_code=204)
def delete_template(template_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    item = db.query(PMChecklistTemplate).filter(PMChecklistTemplate.id == template_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="مورد چک‌لیست یافت نشد")
    db.delete(item)
    db.commit()


@router.get("/", response_model=list[PMVisitOut])
def list_visits(
    asset_id: int | None = None,
    department_id: int | None = None,
    work_type: str | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = db.query(PMVisit).options(selectinload(PMVisit.tasks))
    if asset_id:
        q = q.filter(PMVisit.device_id == asset_id)
    if department_id:
        q = q.filter(PMVisit.section_id == department_id)
    if work_type and work_type != "all":
        q = q.filter(PMVisit.work_type == work_type)
    return [_visit_out(v) for v in q.order_by(PMVisit.visit_date.desc()).all()]


@router.get("/{visit_id}", response_model=PMVisitOut)
def get_visit(visit_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    visit = db.query(PMVisit).options(selectinload(PMVisit.tasks)).filter(PMVisit.id == visit_id).first()
    if not visit:
        raise HTTPException(status_code=404, detail="سرویس سیستم یافت نشد")
    return _visit_out(visit)


@router.post("/", response_model=PMVisitOut, status_code=201)
def create_visit(
    data: PMVisitCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    visit = PMVisit(
        visit_date=data.visit_date,
        return_date=data.return_date,
        next_pm_date=data.next_pm_date,
        recipient_name=data.recipient_name,
        recipient_unit=data.recipient_unit,
        device_id=data.asset_id,
        section_id=data.department_id,
        performed_by=data.performed_by,
        technician_id=current_user.id,
        notes=data.notes,
        alert_title=data.alert_title,
        alert_description=data.alert_description,
        alert_warning_days=data.alert_warning_days or 30,
        work_type=data.work_type or "pm",
        title=data.title,
    )
    asset = db.query(Asset).filter(Asset.id == data.asset_id).first() if data.asset_id else None
    title, desc = apply_pm_alert_defaults(
        alert_title=visit.alert_title,
        alert_description=visit.alert_description,
        visit=visit,
        asset=asset,
        next_pm_date=visit.next_pm_date,
    )
    visit.alert_title = title
    visit.alert_description = desc
    db.add(visit)
    db.flush()

    for task in data.tasks:
        db.add(PMVisitTask(visit_id=visit.id, task_name=task.task_name, is_done=task.is_done, notes=task.notes))

    if data.asset_id and data.next_pm_date and (data.work_type or "pm") == "pm":
        if asset:
            asset.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(visit)
    log_activity(db, user_id=current_user.id, user_name=current_user.full_name,
                 action="create", entity_type="pm_visit", entity_id=visit.id,
                 details=f"سرویس سیستم — {data.recipient_name or '—'} — {data.visit_date.date()}")
    sync_all_reminders(db)
    return _visit_out(visit)


@router.put("/{visit_id}", response_model=PMVisitOut)
def update_visit(
    visit_id: int,
    data: PMVisitUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    visit = db.query(PMVisit).options(selectinload(PMVisit.tasks)).filter(PMVisit.id == visit_id).first()
    if not visit:
        raise HTTPException(status_code=404, detail="سرویس سیستم یافت نشد")
    updates = data.model_dump(exclude_unset=True, exclude={"tasks"})
    # Map frontend field names to DB column names
    if "asset_id" in updates:
        updates["device_id"] = updates.pop("asset_id")
    if "department_id" in updates:
        updates["section_id"] = updates.pop("department_id")
    for k, v in updates.items():
        setattr(visit, k, v)
    if data.tasks is not None:
        db.query(PMVisitTask).filter(PMVisitTask.visit_id == visit_id).delete()
        for task in data.tasks:
            db.add(PMVisitTask(visit_id=visit.id, task_name=task.task_name, is_done=task.is_done, notes=task.notes))
    asset = db.query(Asset).filter(Asset.id == visit.device_id).first() if visit.device_id else None
    title, desc = apply_pm_alert_defaults(
        alert_title=visit.alert_title,
        alert_description=visit.alert_description,
        visit=visit,
        asset=asset,
        next_pm_date=visit.next_pm_date,
    )
    visit.alert_title = title
    visit.alert_description = desc
    db.commit()
    db.refresh(visit)
    sync_all_reminders(db)
    return _visit_out(visit)


@router.delete("/{visit_id}", status_code=204)
def delete_visit(visit_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    visit = db.query(PMVisit).filter(PMVisit.id == visit_id).first()
    if not visit:
        raise HTTPException(status_code=404, detail="سرویس سیستم یافت نشد")
    db.delete(visit)
    db.commit()
    sync_all_reminders(db)
