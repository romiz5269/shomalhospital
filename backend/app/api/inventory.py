from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models import User, InventoryItem
from app.schemas.pm import InventoryItemCreate, InventoryItemUpdate, InventoryItemOut
from app.services.activity import log_activity
from app.services.alerts import sync_all_reminders

router = APIRouter(prefix="/inventory", tags=["کالای جدید"])


@router.get("/", response_model=list[InventoryItemOut])
def list_items(status: str | None = None, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    q = db.query(InventoryItem)
    if status:
        q = q.filter(InventoryItem.status == status)
    return [InventoryItemOut.from_orm_compat(i) for i in q.order_by(InventoryItem.received_date.desc()).all()]


@router.post("/", response_model=InventoryItemOut, status_code=201)
def create_item(
    data: InventoryItemCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    d = data.model_dump()
    d["device_id"] = d.pop("asset_id", None)
    d["section_id"] = d.pop("department_id", None)
    item = InventoryItem(**d)
    db.add(item)
    db.commit()
    db.refresh(item)
    log_activity(db, user_id=current_user.id, user_name=current_user.full_name,
                 action="create", entity_type="inventory", entity_id=item.id, details=item.name)
    sync_all_reminders(db)
    return InventoryItemOut.from_orm_compat(item)


@router.put("/{item_id}", response_model=InventoryItemOut)
def update_item(
    item_id: int,
    data: InventoryItemUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    item = db.query(InventoryItem).filter(InventoryItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="کالا یافت نشد")
    updates = data.model_dump(exclude_unset=True)
    if "asset_id" in updates:
        updates["device_id"] = updates.pop("asset_id")
    if "department_id" in updates:
        updates["section_id"] = updates.pop("department_id")
    for k, v in updates.items():
        setattr(item, k, v)
    db.commit()
    db.refresh(item)
    return InventoryItemOut.from_orm_compat(item)


@router.delete("/{item_id}", status_code=204)
def delete_item(item_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    item = db.query(InventoryItem).filter(InventoryItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="کالا یافت نشد")
    db.delete(item)
    db.commit()
