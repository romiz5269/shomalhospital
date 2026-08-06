from fastapi import HTTPException, status

from app.db import db


class RbacService:
    async def resolve_user_access(self, user_id: str) -> tuple[list[str], list[str], list[str]]:
        """Return (roles, permissions, groups) resolved via direct roles + group roles."""
        user = await db.user.find_unique(
            where={"id": user_id},
            include={
                "roles": {"include": {"role": {"include": {"permissions": {"include": {"permission": True}}}}}},
                "groups": {
                    "include": {
                        "group": {
                            "include": {
                                "roles": {
                                    "include": {
                                        "role": {
                                            "include": {
                                                "permissions": {"include": {"permission": True}}
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
            },
        )
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

        role_names: set[str] = set()
        permission_codes: set[str] = set()
        group_names: set[str] = set()

        for ur in user.roles or []:
            role_names.add(ur.role.name)
            for rp in ur.role.permissions or []:
                permission_codes.add(rp.permission.code)

        for ug in user.groups or []:
            group_names.add(ug.group.name)
            for gr in ug.group.roles or []:
                role_names.add(gr.role.name)
                for rp in gr.role.permissions or []:
                    permission_codes.add(rp.permission.code)

        # primary role for gateway `role` claim: prefer admin > doctor > nurse > patient
        priority = ["admin", "doctor", "nurse", "staff", "patient"]
        ordered = sorted(
            role_names,
            key=lambda r: priority.index(r) if r in priority else 99,
        )
        return ordered, sorted(permission_codes), sorted(group_names)

    async def ensure_role(self, name: str, description: str | None = None):
        existing = await db.role.find_unique(where={"name": name})
        if existing:
            return existing
        return await db.role.create(data={"name": name, "description": description})

    async def ensure_permission(self, code: str, description: str | None = None):
        existing = await db.permission.find_unique(where={"code": code})
        if existing:
            return existing
        return await db.permission.create(data={"code": code, "description": description})

    async def ensure_group(self, name: str, description: str | None = None):
        existing = await db.group.find_unique(where={"name": name})
        if existing:
            return existing
        return await db.group.create(data={"name": name, "description": description})

    async def assign_role_to_user(self, user_id: str, role_name: str) -> None:
        role = await db.role.find_unique(where={"name": role_name})
        if not role:
            raise HTTPException(status_code=404, detail=f"Role '{role_name}' not found")
        await db.userrole.upsert(
            where={"userId_roleId": {"userId": user_id, "roleId": role.id}},
            data={
                "create": {"userId": user_id, "roleId": role.id},
                "update": {},
            },
        )

    async def assign_roles_to_user(self, user_id: str, role_names: list[str]) -> None:
        for name in role_names:
            await self.assign_role_to_user(user_id, name)

    async def assign_groups_to_user(self, user_id: str, group_names: list[str]) -> None:
        for name in group_names:
            group = await db.group.find_unique(where={"name": name})
            if not group:
                raise HTTPException(status_code=404, detail=f"Group '{name}' not found")
            await db.usergroup.upsert(
                where={"userId_groupId": {"userId": user_id, "groupId": group.id}},
                data={
                    "create": {"userId": user_id, "groupId": group.id},
                    "update": {},
                },
            )

    async def set_role_permissions(self, role_name: str, permission_codes: list[str]) -> None:
        role = await db.role.find_unique(where={"name": role_name})
        if not role:
            raise HTTPException(status_code=404, detail=f"Role '{role_name}' not found")
        for code in permission_codes:
            perm = await self.ensure_permission(code)
            await db.rolepermission.upsert(
                where={
                    "roleId_permissionId": {
                        "roleId": role.id,
                        "permissionId": perm.id,
                    }
                },
                data={
                    "create": {"roleId": role.id, "permissionId": perm.id},
                    "update": {},
                },
            )

    async def set_group_roles(self, group_name: str, role_names: list[str]) -> None:
        group = await db.group.find_unique(where={"name": group_name})
        if not group:
            raise HTTPException(status_code=404, detail=f"Group '{group_name}' not found")
        for role_name in role_names:
            role = await db.role.find_unique(where={"name": role_name})
            if not role:
                raise HTTPException(status_code=404, detail=f"Role '{role_name}' not found")
            await db.grouprole.upsert(
                where={"groupId_roleId": {"groupId": group.id, "roleId": role.id}},
                data={
                    "create": {"groupId": group.id, "roleId": role.id},
                    "update": {},
                },
            )

    async def seed_defaults(self) -> None:
        defaults = {
            "admin": [
                "auth:manage",
                "users:read",
                "users:write",
                "appointment:read",
                "appointment:write",
                "hiring:read",
                "hiring:write",
                "pages:read",
                "pages:write",
                "media:read",
                "media:write",
            ],
            "doctor": [
                "users:read",
                "appointment:read",
                "appointment:write",
                "media:read",
            ],
            "nurse": [
                "users:read",
                "appointment:read",
                "appointment:write",
                "media:read",
            ],
            "staff": [
                "users:read",
                "appointment:read",
                "pages:read",
                "media:read",
            ],
            "patient": [
                "appointment:read",
                "appointment:write",
                "media:read",
            ],
        }
        for role_name, codes in defaults.items():
            await self.ensure_role(role_name, description=f"Default {role_name} role")
            for code in codes:
                await self.ensure_permission(code)
            await self.set_role_permissions(role_name, codes)

        await self.ensure_group("doctors", "Doctor accounts")
        await self.ensure_group("nurses", "Nurse accounts")
        await self.ensure_group("patients", "Patient accounts")
        await self.set_group_roles("doctors", ["doctor"])
        await self.set_group_roles("nurses", ["nurse"])
        await self.set_group_roles("patients", ["patient"])


rbac_service = RbacService()
