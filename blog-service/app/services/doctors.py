from fastapi import HTTPException

from app.db import db
from app.schemas.doctors import (
    DoctorCreate,
    DoctorListResponse,
    DoctorOut,
    DoctorUpdate,
    PublicDoctorListResponse,
)


def _to_out(row) -> DoctorOut:
    return DoctorOut(
        id=row.id,
        name_fa=row.nameFa,
        name_en=row.nameEn,
        specialty_fa=row.specialtyFa,
        specialty_en=row.specialtyEn,
        department_code=row.departmentCode,
        image_url=row.imageUrl,
        bio_fa=row.bioFa,
        bio_en=row.bioEn,
        is_active=row.isActive,
        is_featured=row.isFeatured,
        sort_order=row.sortOrder,
        deleted_at=row.deletedAt,
        created_at=row.createdAt,
        updated_at=row.updatedAt,
    )


class DoctorService:
    async def list_public(
        self,
        *,
        featured: bool | None = None,
        department_code: str | None = None,
        limit: int = 50,
    ) -> PublicDoctorListResponse:
        where: dict = {"isActive": True, "deletedAt": None}
        if featured is not None:
            where["isFeatured"] = featured
        if department_code:
            where["departmentCode"] = department_code

        total = await db.doctor.count(where=where)
        rows = await db.doctor.find_many(
            where=where,
            order=[{"sortOrder": "asc"}, {"nameFa": "asc"}],
            take=min(limit, 100),
        )
        return PublicDoctorListResponse(
            total=total,
            items=[_to_out(r) for r in rows],
        )

    async def get_public(self, doctor_id: str) -> DoctorOut:
        row = await db.doctor.find_unique(where={"id": doctor_id})
        if not row or row.deletedAt or not row.isActive:
            raise HTTPException(status_code=404, detail="پزشک یافت نشد")
        return _to_out(row)

    async def list_admin(
        self,
        *,
        page: int = 1,
        page_size: int = 20,
        q: str | None = None,
        include_deleted: bool = False,
    ) -> DoctorListResponse:
        page = max(page, 1)
        page_size = min(max(page_size, 1), 100)
        where: dict = {}
        if not include_deleted:
            where["deletedAt"] = None
        if q:
            where["OR"] = [
                {"nameFa": {"contains": q, "mode": "insensitive"}},
                {"nameEn": {"contains": q, "mode": "insensitive"}},
                {"specialtyFa": {"contains": q, "mode": "insensitive"}},
            ]

        total = await db.doctor.count(where=where)
        rows = await db.doctor.find_many(
            where=where,
            order=[{"sortOrder": "asc"}, {"nameFa": "asc"}],
            skip=(page - 1) * page_size,
            take=page_size,
        )
        return DoctorListResponse(
            total=total,
            page=page,
            page_size=page_size,
            items=[_to_out(r) for r in rows],
        )

    async def create(self, payload: DoctorCreate) -> DoctorOut:
        row = await db.doctor.create(
            data={
                "nameFa": payload.name_fa,
                "nameEn": payload.name_en,
                "specialtyFa": payload.specialty_fa,
                "specialtyEn": payload.specialty_en,
                "departmentCode": payload.department_code,
                "imageUrl": payload.image_url,
                "bioFa": payload.bio_fa,
                "bioEn": payload.bio_en,
                "isActive": payload.is_active,
                "isFeatured": payload.is_featured,
                "sortOrder": payload.sort_order,
            }
        )
        return _to_out(row)

    async def update(self, doctor_id: str, payload: DoctorUpdate) -> DoctorOut:
        row = await db.doctor.find_unique(where={"id": doctor_id})
        if not row or row.deletedAt:
            raise HTTPException(status_code=404, detail="پزشک یافت نشد")

        raw = payload.model_dump(exclude_unset=True)
        mapping = {
            "name_fa": "nameFa",
            "name_en": "nameEn",
            "specialty_fa": "specialtyFa",
            "specialty_en": "specialtyEn",
            "department_code": "departmentCode",
            "image_url": "imageUrl",
            "bio_fa": "bioFa",
            "bio_en": "bioEn",
            "is_active": "isActive",
            "is_featured": "isFeatured",
            "sort_order": "sortOrder",
        }
        data = {mapping[k]: v for k, v in raw.items() if k in mapping}
        updated = await db.doctor.update(where={"id": doctor_id}, data=data)
        return _to_out(updated)

    async def soft_delete(self, doctor_id: str) -> None:
        row = await db.doctor.find_unique(where={"id": doctor_id})
        if not row or row.deletedAt:
            raise HTTPException(status_code=404, detail="پزشک یافت نشد")
        from datetime import datetime, timezone

        await db.doctor.update(
            where={"id": doctor_id},
            data={"deletedAt": datetime.now(timezone.utc), "isActive": False},
        )


doctor_service = DoctorService()
