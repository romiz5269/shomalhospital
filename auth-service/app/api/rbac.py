from fastapi import APIRouter, Depends

from app.db import db
from app.middleware.auth import AuthUser, require_permissions
from app.schemas.rbac import (
    AssignGroupsRequest,
    AssignPermissionsRequest,
    AssignRolesRequest,
    GroupCreate,
    GroupOut,
    PermissionCreate,
    PermissionOut,
    RoleCreate,
    RoleOut,
)
from app.services.rbac import rbac_service

router = APIRouter(prefix="/rbac", tags=["rbac"])


@router.post("/permissions", response_model=PermissionOut)
async def create_permission(
    payload: PermissionCreate,
    _: AuthUser = Depends(require_permissions("auth:manage")),
):
    perm = await rbac_service.ensure_permission(payload.code, payload.description)
    return PermissionOut(id=perm.id, code=perm.code, description=perm.description)


@router.get("/permissions", response_model=list[PermissionOut])
async def list_permissions(_: AuthUser = Depends(require_permissions("auth:manage"))):
    rows = await db.permission.find_many(order={"code": "asc"})
    return [PermissionOut(id=r.id, code=r.code, description=r.description) for r in rows]


@router.post("/roles", response_model=RoleOut)
async def create_role(
    payload: RoleCreate,
    _: AuthUser = Depends(require_permissions("auth:manage")),
):
    role = await rbac_service.ensure_role(payload.name, payload.description)
    if payload.permission_codes:
        await rbac_service.set_role_permissions(payload.name, payload.permission_codes)
    refreshed = await db.role.find_unique(
        where={"id": role.id},
        include={"permissions": {"include": {"permission": True}}},
    )
    codes = [rp.permission.code for rp in (refreshed.permissions or [])] if refreshed else []
    return RoleOut(id=role.id, name=role.name, description=role.description, permissions=codes)


@router.get("/roles", response_model=list[RoleOut])
async def list_roles(_: AuthUser = Depends(require_permissions("auth:manage"))):
    rows = await db.role.find_many(
        include={"permissions": {"include": {"permission": True}}},
        order={"name": "asc"},
    )
    return [
        RoleOut(
            id=r.id,
            name=r.name,
            description=r.description,
            permissions=[rp.permission.code for rp in (r.permissions or [])],
        )
        for r in rows
    ]


@router.post("/roles/{role_name}/permissions", response_model=RoleOut)
async def attach_permissions(
    role_name: str,
    payload: AssignPermissionsRequest,
    _: AuthUser = Depends(require_permissions("auth:manage")),
):
    await rbac_service.set_role_permissions(role_name, payload.permission_codes)
    role = await db.role.find_unique(
        where={"name": role_name},
        include={"permissions": {"include": {"permission": True}}},
    )
    assert role
    return RoleOut(
        id=role.id,
        name=role.name,
        description=role.description,
        permissions=[rp.permission.code for rp in (role.permissions or [])],
    )


@router.post("/groups", response_model=GroupOut)
async def create_group(
    payload: GroupCreate,
    _: AuthUser = Depends(require_permissions("auth:manage")),
):
    group = await rbac_service.ensure_group(payload.name, payload.description)
    if payload.role_names:
        await rbac_service.set_group_roles(payload.name, payload.role_names)
    refreshed = await db.group.find_unique(
        where={"id": group.id},
        include={"roles": {"include": {"role": True}}},
    )
    return GroupOut(
        id=group.id,
        name=group.name,
        description=group.description,
        roles=[gr.role.name for gr in (refreshed.roles or [])] if refreshed else [],
    )


@router.get("/groups", response_model=list[GroupOut])
async def list_groups(_: AuthUser = Depends(require_permissions("auth:manage"))):
    rows = await db.group.find_many(
        include={"roles": {"include": {"role": True}}},
        order={"name": "asc"},
    )
    return [
        GroupOut(
            id=g.id,
            name=g.name,
            description=g.description,
            roles=[gr.role.name for gr in (g.roles or [])],
        )
        for g in rows
    ]


@router.post("/users/{user_id}/roles")
async def assign_user_roles(
    user_id: str,
    payload: AssignRolesRequest,
    _: AuthUser = Depends(require_permissions("auth:manage")),
):
    await rbac_service.assign_roles_to_user(user_id, payload.role_names)
    roles, permissions, groups = await rbac_service.resolve_user_access(user_id)
    return {"user_id": user_id, "roles": roles, "permissions": permissions, "groups": groups}


@router.post("/users/{user_id}/groups")
async def assign_user_groups(
    user_id: str,
    payload: AssignGroupsRequest,
    _: AuthUser = Depends(require_permissions("auth:manage")),
):
    await rbac_service.assign_groups_to_user(user_id, payload.group_names)
    roles, permissions, groups = await rbac_service.resolve_user_access(user_id)
    return {"user_id": user_id, "roles": roles, "permissions": permissions, "groups": groups}
