"""
Example: drop shared_middleware into appointment-service and protect routes.

    pip install fastapi python-jose[cryptography] redis
    # set JWT_PUBLIC_KEY_PATH=./keys/public.pem
    # set REDIS_HOST=localhost
"""

from fastapi import APIRouter, Depends

from shared_middleware import AuthUser, require_permissions, require_roles

router = APIRouter(prefix="/appointments", tags=["appointments"])


@router.get("")
async def list_appointments(
    user: AuthUser = Depends(require_permissions("appointment:read")),
):
    return {
        "ok": True,
        "user_id": user.id,
        "role": user.role,
        "permissions": user.permissions,
    }


@router.post("")
async def create_appointment(
    user: AuthUser = Depends(require_permissions("appointment:write")),
):
    return {"ok": True, "created_by": user.id}


@router.delete("/{appointment_id}")
async def cancel_as_doctor(
    appointment_id: str,
    user: AuthUser = Depends(require_roles("doctor", "admin")),
):
    return {"ok": True, "appointment_id": appointment_id, "by": user.id}
