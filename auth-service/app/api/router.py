from fastapi import APIRouter

from app.api.admin_users import router as admin_users_router
from app.api.auth import router as auth_router
from app.api.doctors import router as doctors_router
from app.api.rbac import router as rbac_router

api_router = APIRouter()
api_router.include_router(auth_router)
api_router.include_router(admin_users_router)
api_router.include_router(doctors_router)
api_router.include_router(rbac_router)
