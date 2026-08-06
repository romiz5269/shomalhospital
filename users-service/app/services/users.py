from datetime import date, datetime, timezone

from fastapi import HTTPException

from app.db import db
from app.schemas.users import (
    AdminNoteOut,
    DepartmentOut,
    MeUpdate,
    UserCreate,
    UserListResponse,
    UserProfileOut,
    UserUpdate,
)


def _dept_out(d) -> DepartmentOut | None:
    if not d:
        return None
    return DepartmentOut(
        id=d.id,
        code=d.code,
        name_fa=d.nameFa,
        name_en=d.nameEn,
        description=d.description,
        floor=d.floor,
        phone_ext=d.phoneExt,
        is_active=d.isActive,
    )


def _birth(d: date | datetime | None) -> date | None:
    if d is None:
        return None
    if isinstance(d, datetime):
        return d.date()
    return d


def to_out(row) -> UserProfileOut:
    return UserProfileOut(
        id=row.id,
        auth_user_id=row.authUserId,
        phone=row.phone,
        national_id=row.nationalId,
        email=row.email,
        first_name=row.firstName,
        last_name=row.lastName,
        father_name=row.fatherName,
        gender=row.gender,
        birth_date=_birth(row.birthDate),
        blood_type=row.bloodType,
        file_number=row.fileNumber,
        person_type=row.personType,
        department_id=row.departmentId,
        department=_dept_out(getattr(row, "department", None)),
        job_title=row.jobTitle,
        insurance_type=row.insuranceType,
        insurance_number=row.insuranceNumber,
        address=row.address,
        city=row.city,
        province=row.province,
        postal_code=row.postalCode,
        emergency_name=row.emergencyName,
        emergency_phone=row.emergencyPhone,
        avatar_url=row.avatarUrl,
        notes=row.notes,
        is_active=row.isActive,
        deleted_at=row.deletedAt,
        created_at=row.createdAt,
        updated_at=row.updatedAt,
    )


class UserService:
    async def _audit(
        self, *, actor_id: str, action: str, subject_id: str | None, detail: str | None = None
    ) -> None:
        await db.auditlog.create(
            data={
                "actorId": actor_id,
                "action": action,
                "subjectId": subject_id,
                "detail": detail,
            }
        )

    async def _next_file_number(self) -> str:
        """شماره پرونده: SHN-YYYY-#####"""
        year = datetime.now(timezone.utc).year
        prefix = f"SHN-{year}-"
        latest = await db.userprofile.find_first(
            where={"fileNumber": {"startswith": prefix}},
            order={"fileNumber": "desc"},
        )
        seq = 1
        if latest and latest.fileNumber:
            try:
                seq = int(latest.fileNumber.rsplit("-", 1)[-1]) + 1
            except ValueError:
                seq = 1
        return f"{prefix}{seq:05d}"

    async def get_by_id(self, profile_id: str, *, include_deleted: bool = False):
        row = await db.userprofile.find_unique(
            where={"id": profile_id},
            include={"department": True},
        )
        if not row or (row.deletedAt and not include_deleted):
            raise HTTPException(status_code=404, detail="کاربر یافت نشد")
        return to_out(row)

    async def get_by_auth_user_id(self, auth_user_id: str):
        row = await db.userprofile.find_unique(
            where={"authUserId": auth_user_id},
            include={"department": True},
        )
        if not row or row.deletedAt:
            raise HTTPException(status_code=404, detail="پروفایل یافت نشد")
        return to_out(row)

    async def ensure_self_profile(
        self,
        *,
        auth_user_id: str,
        phone: str | None = None,
        email: str | None = None,
        first_name: str | None = None,
        last_name: str | None = None,
    ) -> UserProfileOut:
        """Create thin profile on first /me if missing."""
        existing = await db.userprofile.find_unique(where={"authUserId": auth_user_id})
        if existing and not existing.deletedAt:
            refreshed = await db.userprofile.find_unique(
                where={"id": existing.id}, include={"department": True}
            )
            return to_out(refreshed)

        if existing and existing.deletedAt:
            raise HTTPException(status_code=403, detail="حساب کاربری حذف شده است")

        file_number = await self._next_file_number()
        row = await db.userprofile.create(
            data={
                "authUserId": auth_user_id,
                "phone": phone or f"unknown-{auth_user_id[:8]}",
                "email": email or None,
                "firstName": first_name,
                "lastName": last_name,
                "personType": "patient",
                "fileNumber": file_number,
                "city": "ساری",
                "province": "مازندران",
                "createdById": auth_user_id,
            },
            include={"department": True},
        )
        await self._audit(
            actor_id=auth_user_id,
            action="self_profile_created",
            subject_id=row.id,
        )
        return to_out(row)

    async def update_me(self, auth_user_id: str, payload: MeUpdate) -> UserProfileOut:
        await self.ensure_self_profile(auth_user_id=auth_user_id)
        data: dict = {"updatedById": auth_user_id}
        mapping = {
            "phone": "phone",
            "first_name": "firstName",
            "last_name": "lastName",
            "father_name": "fatherName",
            "gender": "gender",
            "birth_date": "birthDate",
            "blood_type": "bloodType",
            "email": "email",
            "address": "address",
            "city": "city",
            "province": "province",
            "postal_code": "postalCode",
            "emergency_name": "emergencyName",
            "emergency_phone": "emergencyPhone",
            "insurance_type": "insuranceType",
            "insurance_number": "insuranceNumber",
            "national_id": "nationalId",
        }
        raw = payload.model_dump(exclude_unset=True)
        for k, v in raw.items():
            col = mapping.get(k)
            if col:
                data[col] = v

        if "phone" in data and data["phone"]:
            owner = await db.userprofile.find_unique(where={"phone": data["phone"]})
            if owner and owner.authUserId != auth_user_id:
                raise HTTPException(status_code=409, detail="شماره موبایل قبلاً ثبت شده است")

        if "nationalId" in data and data["nationalId"]:
            owner = await db.userprofile.find_unique(
                where={"nationalId": data["nationalId"]}
            )
            if owner and owner.authUserId != auth_user_id:
                raise HTTPException(status_code=409, detail="کد ملی قبلاً ثبت شده است")

        row = await db.userprofile.update(
            where={"authUserId": auth_user_id},
            data=data,
            include={"department": True},
        )
        await self._audit(
            actor_id=auth_user_id, action="self_update", subject_id=row.id
        )
        return to_out(row)

    async def list_users(
        self,
        *,
        page: int = 1,
        page_size: int = 20,
        q: str | None = None,
        person_type: str | None = None,
        department_id: str | None = None,
        is_active: bool | None = None,
        include_deleted: bool = False,
    ) -> UserListResponse:
        page = max(page, 1)
        page_size = min(max(page_size, 1), 100)
        where: dict = {}
        if not include_deleted:
            where["deletedAt"] = None
        if person_type:
            where["personType"] = person_type
        if department_id:
            where["departmentId"] = department_id
        if is_active is not None:
            where["isActive"] = is_active
        if q:
            where["OR"] = [
                {"phone": {"contains": q}},
                {"firstName": {"contains": q}},
                {"lastName": {"contains": q}},
                {"nationalId": {"contains": q}},
                {"fileNumber": {"contains": q}},
            ]

        total = await db.userprofile.count(where=where)
        rows = await db.userprofile.find_many(
            where=where,
            include={"department": True},
            order={"createdAt": "desc"},
            skip=(page - 1) * page_size,
            take=page_size,
        )
        return UserListResponse(
            total=total,
            page=page,
            page_size=page_size,
            items=[to_out(r) for r in rows],
        )

    async def upsert(self, payload: UserCreate, *, actor_id: str) -> tuple[UserProfileOut, bool]:
        """If auth_user_id (or phone) exists → update; else create."""
        existing = await db.userprofile.find_unique(
            where={"authUserId": payload.auth_user_id}
        )
        if not existing:
            by_phone = await db.userprofile.find_unique(where={"phone": payload.phone})
            if by_phone:
                existing = by_phone

        if existing:
            # restore if soft-deleted + patch fields
            data = UserUpdate(
                phone=payload.phone,
                national_id=payload.national_id,
                email=payload.email,
                first_name=payload.first_name,
                last_name=payload.last_name,
                father_name=payload.father_name,
                gender=payload.gender,
                birth_date=payload.birth_date,
                blood_type=payload.blood_type,
                file_number=payload.file_number,
                person_type=payload.person_type,
                department_id=payload.department_id,
                job_title=payload.job_title,
                insurance_type=payload.insurance_type,
                insurance_number=payload.insurance_number,
                address=payload.address,
                city=payload.city,
                province=payload.province,
                postal_code=payload.postal_code,
                emergency_name=payload.emergency_name,
                emergency_phone=payload.emergency_phone,
                notes=payload.notes,
                is_active=payload.is_active,
            )
            if existing.deletedAt:
                await db.userprofile.update(
                    where={"id": existing.id},
                    data={
                        "deletedAt": None,
                        "authUserId": payload.auth_user_id,
                        "isActive": True,
                        "updatedById": actor_id,
                    },
                )
            updated = await self.update(existing.id, data, actor_id=actor_id)
            await self._audit(
                actor_id=actor_id, action="admin_upsert_update", subject_id=existing.id
            )
            return updated, False

        created = await self.create(payload, actor_id=actor_id)
        return created, True

    async def create(self, payload: UserCreate, *, actor_id: str) -> UserProfileOut:
        existing = await db.userprofile.find_unique(
            where={"authUserId": payload.auth_user_id}
        )
        if existing and not existing.deletedAt:
            raise HTTPException(
                status_code=409, detail="پروفایل برای این auth_user_id وجود دارد"
            )
        if existing and existing.deletedAt:
            return await self._restore_and_update(existing.id, payload, actor_id)

        if payload.national_id:
            owner = await db.userprofile.find_unique(
                where={"nationalId": payload.national_id}
            )
            if owner:
                raise HTTPException(status_code=409, detail="کد ملی قبلاً ثبت شده است")

        if payload.department_id:
            dept = await db.department.find_unique(where={"id": payload.department_id})
            if not dept:
                raise HTTPException(status_code=400, detail="بخش نامعتبر است")

        file_number = payload.file_number or await self._next_file_number()
        if payload.file_number:
            clash = await db.userprofile.find_unique(
                where={"fileNumber": payload.file_number}
            )
            if clash:
                raise HTTPException(status_code=409, detail="شماره پرونده تکراری است")

        row = await db.userprofile.create(
            data={
                "authUserId": payload.auth_user_id,
                "phone": payload.phone,
                "nationalId": payload.national_id,
                "email": payload.email,
                "firstName": payload.first_name,
                "lastName": payload.last_name,
                "fatherName": payload.father_name,
                "gender": payload.gender,
                "birthDate": (
                    datetime.combine(payload.birth_date, datetime.min.time())
                    if payload.birth_date
                    else None
                ),
                "bloodType": payload.blood_type,
                "fileNumber": file_number,
                "personType": payload.person_type,
                "departmentId": payload.department_id,
                "jobTitle": payload.job_title,
                "insuranceType": payload.insurance_type,
                "insuranceNumber": payload.insurance_number,
                "address": payload.address,
                "city": payload.city,
                "province": payload.province,
                "postalCode": payload.postal_code,
                "emergencyName": payload.emergency_name,
                "emergencyPhone": payload.emergency_phone,
                "notes": payload.notes,
                "isActive": payload.is_active,
                "createdById": actor_id,
                "updatedById": actor_id,
            },
            include={"department": True},
        )
        await self._audit(
            actor_id=actor_id, action="admin_create", subject_id=row.id, detail=payload.phone
        )
        return to_out(row)

    async def _restore_and_update(
        self, profile_id: str, payload: UserCreate, actor_id: str
    ) -> UserProfileOut:
        row = await db.userprofile.update(
            where={"id": profile_id},
            data={
                "deletedAt": None,
                "isActive": payload.is_active,
                "phone": payload.phone,
                "nationalId": payload.national_id,
                "email": payload.email,
                "firstName": payload.first_name,
                "lastName": payload.last_name,
                "personType": payload.person_type,
                "updatedById": actor_id,
            },
            include={"department": True},
        )
        await self._audit(
            actor_id=actor_id, action="admin_restore", subject_id=row.id
        )
        return to_out(row)

    async def update(
        self, profile_id: str, payload: UserUpdate, *, actor_id: str
    ) -> UserProfileOut:
        row = await db.userprofile.find_unique(where={"id": profile_id})
        if not row or row.deletedAt:
            raise HTTPException(status_code=404, detail="کاربر یافت نشد")

        data: dict = {"updatedById": actor_id}
        mapping = {
            "phone": "phone",
            "national_id": "nationalId",
            "email": "email",
            "first_name": "firstName",
            "last_name": "lastName",
            "father_name": "fatherName",
            "gender": "gender",
            "birth_date": "birthDate",
            "blood_type": "bloodType",
            "file_number": "fileNumber",
            "person_type": "personType",
            "department_id": "departmentId",
            "job_title": "jobTitle",
            "insurance_type": "insuranceType",
            "insurance_number": "insuranceNumber",
            "address": "address",
            "city": "city",
            "province": "province",
            "postal_code": "postalCode",
            "emergency_name": "emergencyName",
            "emergency_phone": "emergencyPhone",
            "notes": "notes",
            "is_active": "isActive",
            "avatar_url": "avatarUrl",
        }
        raw = payload.model_dump(exclude_unset=True)
        for k, v in raw.items():
            col = mapping.get(k)
            if not col:
                continue
            if k == "birth_date" and v is not None:
                data[col] = datetime.combine(v, datetime.min.time())
            else:
                data[col] = v

        if "nationalId" in data and data["nationalId"]:
            owner = await db.userprofile.find_unique(
                where={"nationalId": data["nationalId"]}
            )
            if owner and owner.id != profile_id:
                raise HTTPException(status_code=409, detail="کد ملی قبلاً ثبت شده است")

        if "fileNumber" in data and data["fileNumber"]:
            owner = await db.userprofile.find_unique(
                where={"fileNumber": data["fileNumber"]}
            )
            if owner and owner.id != profile_id:
                raise HTTPException(status_code=409, detail="شماره پرونده تکراری است")

        if "departmentId" in data and data["departmentId"]:
            dept = await db.department.find_unique(where={"id": data["departmentId"]})
            if not dept:
                raise HTTPException(status_code=400, detail="بخش نامعتبر است")

        updated = await db.userprofile.update(
            where={"id": profile_id},
            data=data,
            include={"department": True},
        )
        await self._audit(actor_id=actor_id, action="admin_update", subject_id=profile_id)
        return to_out(updated)

    async def soft_delete(self, profile_id: str, *, actor_id: str) -> None:
        row = await db.userprofile.find_unique(where={"id": profile_id})
        if not row or row.deletedAt:
            raise HTTPException(status_code=404, detail="کاربر یافت نشد")
        await db.userprofile.update(
            where={"id": profile_id},
            data={
                "deletedAt": datetime.now(timezone.utc),
                "isActive": False,
                "updatedById": actor_id,
            },
        )
        await self._audit(actor_id=actor_id, action="admin_soft_delete", subject_id=profile_id)

    async def hard_delete(self, profile_id: str, *, actor_id: str) -> None:
        row = await db.userprofile.find_unique(where={"id": profile_id})
        if not row:
            raise HTTPException(status_code=404, detail="کاربر یافت نشد")
        await self._audit(
            actor_id=actor_id,
            action="admin_hard_delete",
            subject_id=None,
            detail=f"deleted profile {profile_id} auth={row.authUserId}",
        )
        await db.userprofile.delete(where={"id": profile_id})

    async def set_active(
        self, profile_id: str, *, is_active: bool, actor_id: str
    ) -> UserProfileOut:
        row = await db.userprofile.find_unique(where={"id": profile_id})
        if not row or row.deletedAt:
            raise HTTPException(status_code=404, detail="کاربر یافت نشد")
        updated = await db.userprofile.update(
            where={"id": profile_id},
            data={"isActive": is_active, "updatedById": actor_id},
            include={"department": True},
        )
        await self._audit(
            actor_id=actor_id,
            action="admin_activate" if is_active else "admin_deactivate",
            subject_id=profile_id,
        )
        return to_out(updated)

    async def add_note(
        self, profile_id: str, *, author_id: str, body: str
    ) -> AdminNoteOut:
        row = await db.userprofile.find_unique(where={"id": profile_id})
        if not row or row.deletedAt:
            raise HTTPException(status_code=404, detail="کاربر یافت نشد")
        note = await db.adminnote.create(
            data={"userId": profile_id, "authorId": author_id, "body": body}
        )
        await self._audit(
            actor_id=author_id, action="admin_note", subject_id=profile_id
        )
        return AdminNoteOut(
            id=note.id,
            user_id=note.userId,
            author_id=note.authorId,
            body=note.body,
            created_at=note.createdAt,
        )

    async def list_notes(self, profile_id: str) -> list[AdminNoteOut]:
        rows = await db.adminnote.find_many(
            where={"userId": profile_id}, order={"createdAt": "desc"}
        )
        return [
            AdminNoteOut(
                id=n.id,
                user_id=n.userId,
                author_id=n.authorId,
                body=n.body,
                created_at=n.createdAt,
            )
            for n in rows
        ]


user_service = UserService()
