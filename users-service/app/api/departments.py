from fastapi import APIRouter, Depends

from app.middleware.auth import AuthUser, require_admin, require_auth
from app.schemas.users import DepartmentCreate, DepartmentOut
from app.services.departments import department_service

router = APIRouter(prefix="/departments", tags=["departments"])


@router.get("", response_model=list[DepartmentOut])
async def list_departments(_: AuthUser = Depends(require_auth)):
    """لیست بخش‌های بیمارستان شمال."""
    return await department_service.list_all(active_only=True)


@router.post("", response_model=DepartmentOut, status_code=201)
async def create_department(
    payload: DepartmentCreate,
    _: AuthUser = Depends(require_admin()),
):
    return await department_service.create(payload)
