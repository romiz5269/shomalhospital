from datetime import datetime, timezone

from fastapi import HTTPException

from app.db import db
from app.schemas.insurance import (
    InsuranceProviderCreate,
    InsuranceProviderOut,
    InsuranceProviderPublicOut,
    InsuranceProviderUpdate,
)


def _public_out(row) -> InsuranceProviderPublicOut:
    return InsuranceProviderPublicOut(
        id=row.id,
        code=row.code,
        name_fa=row.nameFa,
        name_en=row.nameEn,
        description_fa=row.descriptionFa,
        description_en=row.descriptionEn,
        logo_url=row.logoUrl,
        website_url=row.websiteUrl,
        phone=row.phone,
        sort_order=row.sortOrder,
    )


def _out(row) -> InsuranceProviderOut:
    return InsuranceProviderOut(
        id=row.id,
        code=row.code,
        name_fa=row.nameFa,
        name_en=row.nameEn,
        description_fa=row.descriptionFa,
        description_en=row.descriptionEn,
        logo_url=row.logoUrl,
        website_url=row.websiteUrl,
        phone=row.phone,
        sort_order=row.sortOrder,
        is_active=row.isActive,
        is_featured=row.isFeatured,
        deleted_at=row.deletedAt,
        created_at=row.createdAt,
        updated_at=row.updatedAt,
        created_by_id=row.createdById,
        updated_by_id=row.updatedById,
    )


def _logo(code: str) -> str:
    """Same-origin logos served by Next public/ — survive restart, no CDN."""
    return f"/insurance-logos/{code}.svg"


# بیمه‌های طرف‌قرارداد بیمارستان شمال (آمل)
DEFAULT_INSURANCES = [
    {
        "code": "tamin",
        "name_fa": "تأمین اجتماعی",
        "name_en": "Social Security",
        "description_fa": "سازمان تأمین اجتماعی — پذیرش در بیمارستان شمال",
        "logo_url": _logo("tamin"),
        "website_url": "https://www.tamin.ir",
        "phone": "1420",
        "sort_order": 1,
        "is_featured": True,
    },
    {
        "code": "salamat",
        "name_fa": "بیمه سلامت ایرانیان",
        "name_en": "Iran Health Insurance",
        "description_fa": "بیمه سلامت — پذیرش در بیمارستان شمال",
        "logo_url": _logo("salamat"),
        "website_url": "https://ihio.gov.ir",
        "phone": "1666",
        "sort_order": 2,
        "is_featured": True,
    },
    {
        "code": "niru",
        "name_fa": "نیروهای مسلح",
        "name_en": "Armed Forces Insurance",
        "description_fa": "بیمه نیروهای مسلح — پذیرش در بیمارستان شمال",
        "logo_url": _logo("niru"),
        "website_url": "https://www.isaar.ir",
        "phone": "021",
        "sort_order": 3,
        "is_featured": True,
    },
    {
        "code": "iran",
        "name_fa": "بیمه ایران",
        "name_en": "Iran Insurance",
        "description_fa": "بیمه ایران — پذیرش در بیمارستان شمال",
        "logo_url": _logo("iran"),
        "website_url": "https://www.bimehiran.ir",
        "phone": "02188707070",
        "sort_order": 4,
        "is_featured": True,
    },
    {
        "code": "asia",
        "name_fa": "بیمه آسیا",
        "name_en": "Asia Insurance",
        "description_fa": "بیمه آسیا — پذیرش در بیمارستان شمال",
        "logo_url": _logo("asia"),
        "website_url": "https://www.bimehasia.com",
        "phone": "021",
        "sort_order": 5,
        "is_featured": True,
    },
    {
        "code": "alborz",
        "name_fa": "بیمه البرز",
        "name_en": "Alborz Insurance",
        "description_fa": "بیمه البرز — پذیرش در بیمارستان شمال",
        "logo_url": _logo("alborz"),
        "website_url": "https://www.alborzinsurance.ir",
        "phone": "021",
        "sort_order": 6,
        "is_featured": True,
    },
    {
        "code": "dana",
        "name_fa": "بیمه دانا",
        "name_en": "Dana Insurance",
        "description_fa": "بیمه دانا — پذیرش در بیمارستان شمال",
        "logo_url": _logo("dana"),
        "website_url": "https://www.dana-insurance.com",
        "phone": "021",
        "sort_order": 7,
        "is_featured": True,
    },
    {
        "code": "pasargad",
        "name_fa": "بیمه پاسارگاد",
        "name_en": "Pasargad Insurance",
        "description_fa": "بیمه پاسارگاد — پذیرش در بیمارستان شمال",
        "logo_url": _logo("pasargad"),
        "website_url": "https://www.pasargadinsurance.ir",
        "phone": "02191009000",
        "sort_order": 8,
        "is_featured": True,
    },
    {
        "code": "moalem",
        "name_fa": "بیمه معلم",
        "name_en": "Moalem Insurance",
        "description_fa": "بیمه معلم — پذیرش در بیمارستان شمال",
        "logo_url": _logo("moalem"),
        "website_url": "https://www.bimehmelal.com",
        "phone": "021",
        "sort_order": 9,
        "is_featured": True,
    },
    {
        "code": "saman",
        "name_fa": "بیمه سامان",
        "name_en": "Saman Insurance",
        "description_fa": "بیمه سامان — پذیرش در بیمارستان شمال",
        "logo_url": _logo("saman"),
        "website_url": "https://www.bimehsaman.com",
        "phone": "021",
        "sort_order": 10,
        "is_featured": True,
    },
    {
        "code": "parsian",
        "name_fa": "بیمه پارسیان",
        "name_en": "Parsian Insurance",
        "description_fa": "بیمه پارسیان — پذیرش در بیمارستان شمال",
        "logo_url": _logo("parsian"),
        "website_url": "https://www.parsianinsurance.com",
        "phone": "021",
        "sort_order": 11,
        "is_featured": True,
    },
    {
        "code": "kosar",
        "name_fa": "بیمه کوثر",
        "name_en": "Kosar Insurance",
        "description_fa": "بیمه کوثر — پذیرش در بیمارستان شمال",
        "logo_url": _logo("kosar"),
        "website_url": "https://www.kosarinsurance.com",
        "phone": "021",
        "sort_order": 12,
        "is_featured": True,
    },
]


class InsuranceService:
    async def seed_defaults(self) -> None:
        for item in DEFAULT_INSURANCES:
            existing = await db.insuranceprovider.find_unique(
                where={"code": item["code"]}
            )
            if existing:
                old = (existing.logoUrl or "").strip()
                wanted = item["logo_url"]
                # Keep real remote/custom logos uploaded by admin
                is_custom = bool(old) and old.startswith("http") and "ui-avatars.com" not in old
                # Fix wrong local filenames (SSO.svg vs tamin.svg) after seed rename
                wrong_local = old.startswith("/insurance-logos/") and old != wanted
                if (not is_custom) or wrong_local:
                    await db.insuranceprovider.update(
                        where={"code": item["code"]},
                        data={
                            "logoUrl": wanted if (not is_custom or wrong_local) else old,
                            "websiteUrl": item["website_url"],
                        },
                    )
                continue
            await db.insuranceprovider.create(
                data={
                    "code": item["code"],
                    "nameFa": item["name_fa"],
                    "nameEn": item["name_en"],
                    "descriptionFa": item["description_fa"],
                    "logoUrl": item["logo_url"],
                    "websiteUrl": item["website_url"],
                    "phone": item["phone"],
                    "sortOrder": item["sort_order"],
                    "isFeatured": item["is_featured"],
                }
            )

    async def list_featured_public(self) -> list[InsuranceProviderPublicOut]:
        rows = await db.insuranceprovider.find_many(
            where={
                "isActive": True,
                "isFeatured": True,
                "deletedAt": None,
            },
            order=[{"sortOrder": "asc"}, {"nameFa": "asc"}],
        )
        return [_public_out(r) for r in rows]

    async def list_all_public(self) -> list[InsuranceProviderPublicOut]:
        rows = await db.insuranceprovider.find_many(
            where={"isActive": True, "deletedAt": None},
            order=[{"sortOrder": "asc"}, {"nameFa": "asc"}],
        )
        return [_public_out(r) for r in rows]

    async def list_admin(
        self,
        *,
        include_deleted: bool = False,
        include_inactive: bool = True,
    ) -> list[InsuranceProviderOut]:
        where: dict = {}
        if not include_deleted:
            where["deletedAt"] = None
        if not include_inactive:
            where["isActive"] = True
        rows = await db.insuranceprovider.find_many(
            where=where,
            order=[{"sortOrder": "asc"}, {"nameFa": "asc"}],
        )
        return [_out(r) for r in rows]

    async def get_by_id(
        self, provider_id: str, *, include_deleted: bool = False
    ) -> InsuranceProviderOut:
        row = await db.insuranceprovider.find_unique(where={"id": provider_id})
        if not row or (row.deletedAt and not include_deleted):
            raise HTTPException(status_code=404, detail="بیمه یافت نشد")
        return _out(row)

    async def upsert(
        self, payload: InsuranceProviderCreate, *, actor_id: str
    ) -> tuple[InsuranceProviderOut, bool]:
        existing = await db.insuranceprovider.find_unique(
            where={"code": payload.code}
        )
        if existing:
            update = InsuranceProviderUpdate(
                name_fa=payload.name_fa,
                name_en=payload.name_en,
                description_fa=payload.description_fa,
                description_en=payload.description_en,
                logo_url=payload.logo_url,
                website_url=payload.website_url,
                phone=payload.phone,
                sort_order=payload.sort_order,
                is_active=payload.is_active,
                is_featured=payload.is_featured,
            )
            if existing.deletedAt:
                await db.insuranceprovider.update(
                    where={"id": existing.id},
                    data={
                        "deletedAt": None,
                        "isActive": payload.is_active,
                        "updatedById": actor_id,
                    },
                )
            updated = await self.update(existing.id, update, actor_id=actor_id)
            return updated, False

        row = await db.insuranceprovider.create(
            data={
                "code": payload.code,
                "nameFa": payload.name_fa,
                "nameEn": payload.name_en,
                "descriptionFa": payload.description_fa,
                "descriptionEn": payload.description_en,
                "logoUrl": payload.logo_url,
                "websiteUrl": payload.website_url,
                "phone": payload.phone,
                "sortOrder": payload.sort_order,
                "isActive": payload.is_active,
                "isFeatured": payload.is_featured,
                "createdById": actor_id,
                "updatedById": actor_id,
            }
        )
        return _out(row), True

    async def update(
        self, provider_id: str, payload: InsuranceProviderUpdate, *, actor_id: str
    ) -> InsuranceProviderOut:
        row = await db.insuranceprovider.find_unique(where={"id": provider_id})
        if not row or row.deletedAt:
            raise HTTPException(status_code=404, detail="بیمه یافت نشد")

        data: dict = {"updatedById": actor_id}
        mapping = {
            "name_fa": "nameFa",
            "name_en": "nameEn",
            "description_fa": "descriptionFa",
            "description_en": "descriptionEn",
            "logo_url": "logoUrl",
            "website_url": "websiteUrl",
            "phone": "phone",
            "sort_order": "sortOrder",
            "is_active": "isActive",
            "is_featured": "isFeatured",
        }
        for k, v in payload.model_dump(exclude_unset=True).items():
            col = mapping.get(k)
            if col is not None:
                data[col] = v

        updated = await db.insuranceprovider.update(
            where={"id": provider_id},
            data=data,
        )
        return _out(updated)

    async def soft_delete(self, provider_id: str, *, actor_id: str) -> None:
        row = await db.insuranceprovider.find_unique(where={"id": provider_id})
        if not row or row.deletedAt:
            raise HTTPException(status_code=404, detail="بیمه یافت نشد")
        await db.insuranceprovider.update(
            where={"id": provider_id},
            data={
                "deletedAt": datetime.now(timezone.utc),
                "isActive": False,
                "isFeatured": False,
                "updatedById": actor_id,
            },
        )

    async def hard_delete(self, provider_id: str, *, actor_id: str) -> None:
        row = await db.insuranceprovider.find_unique(where={"id": provider_id})
        if not row:
            raise HTTPException(status_code=404, detail="بیمه یافت نشد")
        await db.insuranceprovider.delete(where={"id": provider_id})


insurance_service = InsuranceService()
