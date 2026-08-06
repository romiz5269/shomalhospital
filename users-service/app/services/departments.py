from fastapi import HTTPException

from app.db import db
from app.schemas.users import DepartmentCreate, DepartmentOut


def _out(d) -> DepartmentOut:
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


# بخش‌های پیش‌فرض بیمارستان شمال (ساری / مازندران)
DEFAULT_DEPARTMENTS = [
    ("ER", "اورژانس", "Emergency", "همکف"),
    ("INT", "داخلی", "Internal Medicine", "طبقه ۱"),
    ("SUR", "جراحی", "Surgery", "طبقه ۲"),
    ("PED", "اطفال", "Pediatrics", "طبقه ۱"),
    ("OBG", "زنان و زایمان", "Obstetrics & Gynecology", "طبقه ۲"),
    ("CRD", "قلب و عروق", "Cardiology", "طبقه ۳"),
    ("RAD", "رادیولوژی", "Radiology", "همکف"),
    ("LAB", "آزمایشگاه", "Laboratory", "همکف"),
    ("PHR", "داروخانه", "Pharmacy", "همکف"),
    ("ICU", "مراقبت‌های ویژه", "ICU", "طبقه ۳"),
    ("OPD", "درمانگاه سرپایی", "Outpatient", "همکف"),
    ("ADM", "پذیرش و مدارک پزشکی", "Admission", "همکف"),
]


class DepartmentService:
    async def seed_defaults(self) -> None:
        for code, name_fa, name_en, floor in DEFAULT_DEPARTMENTS:
            existing = await db.department.find_unique(where={"code": code})
            if existing:
                continue
            await db.department.create(
                data={
                    "code": code,
                    "nameFa": name_fa,
                    "nameEn": name_en,
                    "floor": floor,
                    "description": f"بخش {name_fa} — بیمارستان شمال",
                }
            )

    async def list_all(self, *, active_only: bool = True) -> list[DepartmentOut]:
        where = {"isActive": True} if active_only else {}
        rows = await db.department.find_many(where=where, order={"nameFa": "asc"})
        return [_out(r) for r in rows]

    async def create(self, payload: DepartmentCreate) -> DepartmentOut:
        existing = await db.department.find_unique(where={"code": payload.code})
        if existing:
            raise HTTPException(status_code=409, detail="کد بخش تکراری است")
        row = await db.department.create(
            data={
                "code": payload.code.upper(),
                "nameFa": payload.name_fa,
                "nameEn": payload.name_en,
                "description": payload.description,
                "floor": payload.floor,
                "phoneExt": payload.phone_ext,
            }
        )
        return _out(row)


department_service = DepartmentService()
