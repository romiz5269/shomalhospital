from fastapi import APIRouter

from app.api.departments import router as departments_router
from app.api.users import router as users_router

api_router = APIRouter()
# departments BEFORE /{profile_id} catch-all on users router
api_router.include_router(departments_router)
api_router.include_router(users_router)
