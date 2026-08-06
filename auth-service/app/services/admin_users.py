from fastapi import HTTPException

from app.db import db
from app.schemas.admin_users import AdminUserPatch, AdminUserUpsert
from app.schemas.auth import UserPublic
from app.services.auth import auth_service
from app.services.password import hash_password
from app.services.rbac import rbac_service


class AdminUserService:
    async def list_users(
        self,
        *,
        page: int = 1,
        page_size: int = 20,
        q: str | None = None,
        role: str | None = None,
        is_active: bool | None = None,
        is_verified: bool | None = None,
    ) -> dict:
        page = max(page, 1)
        page_size = min(max(page_size, 1), 100)
        where: dict = {}
        if is_active is not None:
            where["isActive"] = is_active
        if is_verified is not None:
            where["isVerified"] = is_verified
        if q:
            where["OR"] = [
                {"phone": {"contains": q}},
                {"firstName": {"contains": q}},
                {"lastName": {"contains": q}},
                {"nationalId": {"contains": q}},
                {"email": {"contains": q}},
            ]

        # role filter via relation
        if role:
            where["roles"] = {"some": {"role": {"name": role}}}

        total = await db.user.count(where=where)
        rows = await db.user.find_many(
            where=where,
            order={"createdAt": "desc"},
            skip=(page - 1) * page_size,
            take=page_size,
        )
        items: list[UserPublic] = []
        for row in rows:
            items.append(await auth_service._to_public(row.id))
        return {
            "total": total,
            "page": page,
            "page_size": page_size,
            "items": items,
        }

    async def get(self, user_id: str) -> UserPublic:
        user = await db.user.find_unique(where={"id": user_id})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return await auth_service._to_public(user_id)

    async def upsert(self, payload: AdminUserUpsert) -> tuple[UserPublic, bool]:
        existing = await db.user.find_unique(where={"phone": payload.phone})
        role = await db.role.find_unique(where={"name": payload.role})
        if not role:
            raise HTTPException(status_code=400, detail=f"Unknown role '{payload.role}'")

        if payload.national_id:
            owner = await db.user.find_unique(where={"nationalId": payload.national_id})
            if owner and (not existing or owner.id != existing.id):
                raise HTTPException(status_code=409, detail="National ID already registered")

        if payload.email:
            owner = await db.user.find_unique(where={"email": payload.email})
            if owner and (not existing or owner.id != existing.id):
                raise HTTPException(status_code=409, detail="Email already registered")

        if existing:
            data: dict = {
                "email": payload.email,
                "nationalId": payload.national_id,
                "firstName": payload.first_name,
                "lastName": payload.last_name,
                "isActive": payload.is_active,
                "isVerified": payload.is_verified,
            }
            if payload.password:
                data["passwordHash"] = hash_password(payload.password)
            await db.user.update(where={"id": existing.id}, data=data)
            await rbac_service.assign_role_to_user(existing.id, payload.role)
            return await auth_service._to_public(existing.id), False

        if not payload.password:
            raise HTTPException(
                status_code=400, detail="password is required when creating a user"
            )

        user = await db.user.create(
            data={
                "phone": payload.phone,
                "email": payload.email,
                "nationalId": payload.national_id,
                "firstName": payload.first_name,
                "lastName": payload.last_name,
                "passwordHash": hash_password(payload.password),
                "isActive": payload.is_active,
                "isVerified": payload.is_verified,
            }
        )
        await rbac_service.assign_role_to_user(user.id, payload.role)
        if payload.role == "patient":
            await rbac_service.assign_groups_to_user(user.id, ["patients"])
        elif payload.role == "doctor":
            await rbac_service.assign_groups_to_user(user.id, ["doctors"])
        return await auth_service._to_public(user.id), True

    async def patch(self, user_id: str, payload: AdminUserPatch) -> UserPublic:
        user = await db.user.find_unique(where={"id": user_id})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        raw = payload.model_dump(exclude_unset=True)
        data: dict = {}
        mapping = {
            "phone": "phone",
            "email": "email",
            "national_id": "nationalId",
            "first_name": "firstName",
            "last_name": "lastName",
            "is_active": "isActive",
            "is_verified": "isVerified",
        }
        for k, v in raw.items():
            if k == "password":
                if v:
                    data["passwordHash"] = hash_password(v)
                continue
            if k == "role":
                continue
            col = mapping.get(k)
            if col:
                data[col] = v

        if "phone" in data and data["phone"] != user.phone:
            clash = await db.user.find_unique(where={"phone": data["phone"]})
            if clash:
                raise HTTPException(status_code=409, detail="Phone already registered")

        if "nationalId" in data and data["nationalId"]:
            clash = await db.user.find_unique(where={"nationalId": data["nationalId"]})
            if clash and clash.id != user_id:
                raise HTTPException(status_code=409, detail="National ID already registered")

        if data:
            await db.user.update(where={"id": user_id}, data=data)

        if payload.role is not None:
            role = await db.role.find_unique(where={"name": payload.role})
            if not role:
                raise HTTPException(status_code=400, detail=f"Unknown role '{payload.role}'")
            await rbac_service.assign_role_to_user(user_id, payload.role)

        return await auth_service._to_public(user_id)

    async def soft_delete(self, user_id: str) -> None:
        user = await db.user.find_unique(where={"id": user_id})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        await db.user.update(
            where={"id": user_id},
            data={"isActive": False},
        )

    async def hard_delete(self, user_id: str) -> None:
        user = await db.user.find_unique(where={"id": user_id})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        await db.user.delete(where={"id": user_id})


admin_user_service = AdminUserService()
