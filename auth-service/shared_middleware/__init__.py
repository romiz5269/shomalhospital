"""
Copy this package into every new FastAPI microservice.

Usage:
    from shared_middleware import require_auth, require_roles, require_permissions

    @router.get("/appointments")
    async def list_appointments(user=Depends(require_permissions("appointment:read"))):
        ...
"""

from shared_middleware.fastapi_auth import (
    AuthUser,
    get_token_payload,
    require_auth,
    require_permissions,
    require_roles,
)

__all__ = [
    "AuthUser",
    "get_token_payload",
    "require_auth",
    "require_roles",
    "require_permissions",
]
