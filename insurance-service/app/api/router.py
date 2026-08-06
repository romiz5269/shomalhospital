from fastapi import APIRouter

from app.api.insurance import router as insurance_router

api_router = APIRouter()
api_router.include_router(insurance_router)
