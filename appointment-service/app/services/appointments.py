from datetime import datetime, timezone

from fastapi import HTTPException

from app.db import db
from app.schemas.appointments import (
    AppointmentCreate,
    AppointmentListResponse,
    AppointmentOut,
    AppointmentUpdate,
    MeAppointmentCreate,
    MeAppointmentUpdate,
    PATIENT_CANCELLABLE,
)


def to_out(row) -> AppointmentOut:
    return AppointmentOut(
        id=row.id,
        patient_auth_user_id=row.patientAuthUserId,
        patient_phone=row.patientPhone,
        patient_name=row.patientName,
        doctor_auth_user_id=row.doctorAuthUserId,
        doctor_id=row.doctorId,
        doctor_name=row.doctorName,
        department_code=row.departmentCode,
        department_name=row.departmentName,
        scheduled_at=row.scheduledAt,
        duration_min=row.durationMin,
        status=row.status.value if hasattr(row.status, "value") else str(row.status),
        notes=row.notes,
        reason=row.reason,
        is_active=row.isActive,
        deleted_at=row.deletedAt,
        created_at=row.createdAt,
        updated_at=row.updatedAt,
    )


class AppointmentService:
    async def get_by_id(
        self, appointment_id: str, *, include_deleted: bool = False
    ) -> AppointmentOut:
        row = await db.appointment.find_unique(where={"id": appointment_id})
        if not row or (row.deletedAt and not include_deleted):
            raise HTTPException(status_code=404, detail="نوبت یافت نشد")
        return to_out(row)

    async def list_mine(
        self,
        patient_auth_user_id: str,
        *,
        page: int = 1,
        page_size: int = 20,
        status: str | None = None,
    ) -> AppointmentListResponse:
        page = max(page, 1)
        page_size = min(max(page_size, 1), 100)
        where: dict = {
            "patientAuthUserId": patient_auth_user_id,
            "deletedAt": None,
        }
        if status:
            where["status"] = status

        total = await db.appointment.count(where=where)
        rows = await db.appointment.find_many(
            where=where,
            order={"scheduledAt": "desc"},
            skip=(page - 1) * page_size,
            take=page_size,
        )
        return AppointmentListResponse(
            total=total,
            page=page,
            page_size=page_size,
            items=[to_out(r) for r in rows],
        )

    async def create_mine(
        self,
        patient_auth_user_id: str,
        payload: MeAppointmentCreate,
    ) -> AppointmentOut:
        scheduled = payload.scheduled_at
        if scheduled.tzinfo is None:
            scheduled = scheduled.replace(tzinfo=timezone.utc)
        if scheduled <= datetime.now(timezone.utc):
            raise HTTPException(status_code=400, detail="زمان نوبت باید در آینده باشد")

        row = await db.appointment.create(
            data={
                "patientAuthUserId": patient_auth_user_id,
                "patientPhone": payload.patient_phone,
                "patientName": payload.patient_name,
                "doctorAuthUserId": payload.doctor_auth_user_id,
                "doctorId": payload.doctor_id,
                "doctorName": payload.doctor_name,
                "departmentCode": payload.department_code,
                "departmentName": payload.department_name,
                "scheduledAt": payload.scheduled_at,
                "durationMin": payload.duration_min,
                "status": "pending",
                "reason": payload.reason,
                "notes": payload.notes,
                "createdById": patient_auth_user_id,
                "updatedById": patient_auth_user_id,
            }
        )
        return to_out(row)

    async def update_mine(
        self,
        appointment_id: str,
        patient_auth_user_id: str,
        payload: MeAppointmentUpdate,
    ) -> AppointmentOut:
        row = await db.appointment.find_unique(where={"id": appointment_id})
        if not row or row.deletedAt:
            raise HTTPException(status_code=404, detail="نوبت یافت نشد")
        if row.patientAuthUserId != patient_auth_user_id:
            raise HTTPException(status_code=403, detail="دسترسی به این نوبت مجاز نیست")

        raw = payload.model_dump(exclude_unset=True)
        if "status" in raw and raw["status"] == "cancelled":
            current = row.status.value if hasattr(row.status, "value") else str(row.status)
            if current not in PATIENT_CANCELLABLE:
                raise HTTPException(
                    status_code=400,
                    detail="این نوبت دیگر قابل لغو نیست",
                )

        data: dict = {"updatedById": patient_auth_user_id}
        mapping = {
            "status": "status",
            "notes": "notes",
            "reason": "reason",
        }
        for k, v in raw.items():
            col = mapping.get(k)
            if col:
                data[col] = v

        if "status" in data and data["status"] == "cancelled":
            data["isActive"] = False

        updated = await db.appointment.update(
            where={"id": appointment_id},
            data=data,
        )
        return to_out(updated)

    async def list_appointments(
        self,
        *,
        page: int = 1,
        page_size: int = 20,
        q: str | None = None,
        patient_auth_user_id: str | None = None,
        doctor_auth_user_id: str | None = None,
        department_code: str | None = None,
        status: str | None = None,
        is_active: bool | None = None,
        scheduled_from: datetime | None = None,
        scheduled_to: datetime | None = None,
        include_deleted: bool = False,
    ) -> AppointmentListResponse:
        page = max(page, 1)
        page_size = min(max(page_size, 1), 100)
        where: dict = {}
        if not include_deleted:
            where["deletedAt"] = None
        if patient_auth_user_id:
            where["patientAuthUserId"] = patient_auth_user_id
        if doctor_auth_user_id:
            where["doctorAuthUserId"] = doctor_auth_user_id
        if department_code:
            where["departmentCode"] = department_code
        if status:
            where["status"] = status
        if is_active is not None:
            where["isActive"] = is_active
        if scheduled_from or scheduled_to:
            scheduled_filter: dict = {}
            if scheduled_from:
                scheduled_filter["gte"] = scheduled_from
            if scheduled_to:
                scheduled_filter["lte"] = scheduled_to
            where["scheduledAt"] = scheduled_filter
        if q:
            where["OR"] = [
                {"patientPhone": {"contains": q}},
                {"patientName": {"contains": q}},
                {"departmentName": {"contains": q}},
                {"departmentCode": {"contains": q}},
                {"reason": {"contains": q}},
            ]

        total = await db.appointment.count(where=where)
        rows = await db.appointment.find_many(
            where=where,
            order={"scheduledAt": "desc"},
            skip=(page - 1) * page_size,
            take=page_size,
        )
        return AppointmentListResponse(
            total=total,
            page=page,
            page_size=page_size,
            items=[to_out(r) for r in rows],
        )

    async def upsert(
        self, payload: AppointmentCreate, *, actor_id: str
    ) -> tuple[AppointmentOut, bool]:
        if payload.id:
            existing = await db.appointment.find_unique(where={"id": payload.id})
            if existing:
                update = AppointmentUpdate(
                    patient_phone=payload.patient_phone,
                    patient_name=payload.patient_name,
                    doctor_auth_user_id=payload.doctor_auth_user_id,
                    doctor_id=payload.doctor_id,
                    doctor_name=payload.doctor_name,
                    department_code=payload.department_code,
                    department_name=payload.department_name,
                    scheduled_at=payload.scheduled_at,
                    duration_min=payload.duration_min,
                    status=payload.status,
                    notes=payload.notes,
                    reason=payload.reason,
                    is_active=payload.is_active,
                )
                if existing.deletedAt:
                    await db.appointment.update(
                        where={"id": existing.id},
                        data={"deletedAt": None, "updatedById": actor_id},
                    )
                updated = await self.update(existing.id, update, actor_id=actor_id)
                return updated, False

        existing = await db.appointment.find_first(
            where={
                "patientAuthUserId": payload.patient_auth_user_id,
                "scheduledAt": payload.scheduled_at,
                "deletedAt": None,
            }
        )
        if existing:
            update = AppointmentUpdate(
                patient_phone=payload.patient_phone,
                patient_name=payload.patient_name,
                doctor_auth_user_id=payload.doctor_auth_user_id,
                department_code=payload.department_code,
                department_name=payload.department_name,
                duration_min=payload.duration_min,
                status=payload.status,
                notes=payload.notes,
                reason=payload.reason,
                is_active=payload.is_active,
            )
            updated = await self.update(existing.id, update, actor_id=actor_id)
            return updated, False

        created = await self.create(payload, actor_id=actor_id)
        return created, True

    async def create(
        self, payload: AppointmentCreate, *, actor_id: str
    ) -> AppointmentOut:
        row = await db.appointment.create(
            data={
                "patientAuthUserId": payload.patient_auth_user_id,
                "patientPhone": payload.patient_phone,
                "patientName": payload.patient_name,
                "doctorAuthUserId": payload.doctor_auth_user_id,
                "doctorId": payload.doctor_id,
                "doctorName": payload.doctor_name,
                "departmentCode": payload.department_code,
                "departmentName": payload.department_name,
                "scheduledAt": payload.scheduled_at,
                "durationMin": payload.duration_min,
                "status": payload.status,
                "notes": payload.notes,
                "reason": payload.reason,
                "isActive": payload.is_active,
                "createdById": actor_id,
                "updatedById": actor_id,
            }
        )
        return to_out(row)

    async def update(
        self, appointment_id: str, payload: AppointmentUpdate, *, actor_id: str
    ) -> AppointmentOut:
        row = await db.appointment.find_unique(where={"id": appointment_id})
        if not row or row.deletedAt:
            raise HTTPException(status_code=404, detail="نوبت یافت نشد")

        data: dict = {"updatedById": actor_id}
        mapping = {
            "patient_phone": "patientPhone",
            "patient_name": "patientName",
            "doctor_auth_user_id": "doctorAuthUserId",
            "doctor_id": "doctorId",
            "doctor_name": "doctorName",
            "department_code": "departmentCode",
            "department_name": "departmentName",
            "scheduled_at": "scheduledAt",
            "duration_min": "durationMin",
            "status": "status",
            "notes": "notes",
            "reason": "reason",
            "is_active": "isActive",
        }
        raw = payload.model_dump(exclude_unset=True)
        for k, v in raw.items():
            col = mapping.get(k)
            if col:
                data[col] = v

        updated = await db.appointment.update(
            where={"id": appointment_id},
            data=data,
        )
        return to_out(updated)

    async def soft_delete(self, appointment_id: str, *, actor_id: str) -> None:
        row = await db.appointment.find_unique(where={"id": appointment_id})
        if not row or row.deletedAt:
            raise HTTPException(status_code=404, detail="نوبت یافت نشد")
        await db.appointment.update(
            where={"id": appointment_id},
            data={
                "deletedAt": datetime.now(timezone.utc),
                "isActive": False,
                "status": "cancelled",
                "updatedById": actor_id,
            },
        )

    async def hard_delete(self, appointment_id: str, *, actor_id: str) -> None:
        row = await db.appointment.find_unique(where={"id": appointment_id})
        if not row:
            raise HTTPException(status_code=404, detail="نوبت یافت نشد")
        await db.appointment.delete(where={"id": appointment_id})


appointment_service = AppointmentService()
