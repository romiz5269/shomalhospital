from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

from fastapi import HTTPException, UploadFile

from app.config import get_settings
from app.db import db
from app.schemas.doctor import (
    DoctorCertificateOut,
    DoctorProfileUpdate,
    DoctorPublic,
    DoctorReviewCreate,
    DoctorReviewOut,
)


class DoctorService:
    def _avatar(self, url: str | None) -> str:
        return url or get_settings().default_avatar_url

    async def _get_profile_or_404(self, doctor_id: str):
        profile = await db.doctorprofile.find_unique(
            where={"id": doctor_id},
            include={
                "user": True,
                "certificates": {"order_by": {"createdAt": "desc"}},
                "reviews": {
                    "order_by": {"createdAt": "desc"},
                    "include": {"author": True},
                },
            },
        )
        if not profile:
            raise HTTPException(status_code=404, detail="Doctor not found")
        return profile

    def _to_public(self, profile) -> DoctorPublic:
        return DoctorPublic(
            id=profile.id,
            user_id=profile.userId,
            first_name=profile.user.firstName,
            last_name=profile.user.lastName,
            avatar_url=self._avatar(profile.user.avatarUrl),
            medical_license_no=profile.medicalLicenseNo,
            biography=profile.biography,
            specialty=profile.specialty,
            patients_accepted=profile.patientsAccepted,
            rating_avg=float(profile.ratingAvg),
            rating_count=profile.ratingCount,
            certificates=[
                DoctorCertificateOut(
                    id=c.id,
                    title=c.title,
                    file_name=c.fileName,
                    file_url=c.fileUrl,
                    created_at=c.createdAt.isoformat(),
                )
                for c in (profile.certificates or [])
            ],
            reviews=[
                DoctorReviewOut(
                    id=r.id,
                    author_id=r.authorId,
                    author_name=(
                        " ".join(
                            x
                            for x in [r.author.firstName, r.author.lastName]
                            if x
                        ).strip()
                        or None
                    ),
                    rating=r.rating,
                    comment=r.comment,
                    created_at=r.createdAt.isoformat(),
                )
                for r in (profile.reviews or [])
            ],
        )

    async def get_public(self, doctor_id: str) -> DoctorPublic:
        return self._to_public(await self._get_profile_or_404(doctor_id))

    async def list_public(self) -> list[DoctorPublic]:
        rows = await db.doctorprofile.find_many(
            include={
                "user": True,
                "certificates": True,
                "reviews": {"include": {"author": True}},
            },
            order={"ratingAvg": "desc"},
        )
        return [self._to_public(r) for r in rows]

    async def update_mine(self, user_id: str, payload: DoctorProfileUpdate) -> DoctorPublic:
        profile = await db.doctorprofile.find_unique(where={"userId": user_id})
        if not profile:
            raise HTTPException(status_code=404, detail="Doctor profile not found")

        data = {}
        if payload.biography is not None:
            data["biography"] = payload.biography
        if payload.specialty is not None:
            data["specialty"] = payload.specialty
        if payload.medical_license_no is not None:
            data["medicalLicenseNo"] = payload.medical_license_no

        if data:
            await db.doctorprofile.update(where={"id": profile.id}, data=data)
        return await self.get_public(profile.id)

    async def increment_patients(self, doctor_id: str, by: int = 1) -> DoctorPublic:
        profile = await db.doctorprofile.find_unique(where={"id": doctor_id})
        if not profile:
            raise HTTPException(status_code=404, detail="Doctor not found")
        await db.doctorprofile.update(
            where={"id": doctor_id},
            data={"patientsAccepted": profile.patientsAccepted + by},
        )
        return await self.get_public(doctor_id)

    async def upload_certificate(
        self,
        *,
        user_id: str,
        title: str,
        file: UploadFile,
    ) -> DoctorCertificateOut:
        settings = get_settings()
        profile = await db.doctorprofile.find_unique(
            where={"userId": user_id},
            include={"certificates": True},
        )
        if not profile:
            raise HTTPException(status_code=404, detail="Doctor profile not found")

        count = len(profile.certificates or [])
        if count >= settings.max_doctor_certificates:
            raise HTTPException(
                status_code=400,
                detail=f"Certificate limit reached ({settings.max_doctor_certificates})",
            )

        content = await file.read()
        if len(content) > settings.max_upload_bytes:
            raise HTTPException(status_code=400, detail="File too large (max 5MB)")

        allowed = {
            "application/pdf",
            "image/jpeg",
            "image/png",
            "image/webp",
        }
        if file.content_type and file.content_type not in allowed:
            raise HTTPException(status_code=400, detail="Unsupported file type")

        upload_root = Path(settings.upload_dir) / "certificates" / profile.id
        upload_root.mkdir(parents=True, exist_ok=True)
        ext = Path(file.filename or "file.bin").suffix or ".bin"
        stored = f"{uuid4().hex}{ext}"
        path = upload_root / stored
        path.write_bytes(content)
        file_url = f"/uploads/certificates/{profile.id}/{stored}"

        row = await db.doctorcertificate.create(
            data={
                "doctorId": profile.id,
                "title": title,
                "fileName": file.filename or stored,
                "fileUrl": file_url,
            }
        )
        return DoctorCertificateOut(
            id=row.id,
            title=row.title,
            file_name=row.fileName,
            file_url=row.fileUrl,
            created_at=row.createdAt.isoformat(),
        )

    async def set_avatar(self, user_id: str, file: UploadFile) -> str:
        settings = get_settings()
        content = await file.read()
        if len(content) > settings.max_upload_bytes:
            raise HTTPException(status_code=400, detail="File too large (max 5MB)")
        if file.content_type not in {"image/jpeg", "image/png", "image/webp"}:
            raise HTTPException(status_code=400, detail="Avatar must be an image")

        upload_root = Path(settings.upload_dir) / "avatars"
        upload_root.mkdir(parents=True, exist_ok=True)
        ext = Path(file.filename or "avatar.png").suffix or ".png"
        stored = f"{user_id}{ext}"
        (upload_root / stored).write_bytes(content)
        url = f"/uploads/avatars/{stored}"
        await db.user.update(where={"id": user_id}, data={"avatarUrl": url})
        return url

    async def add_review(
        self, *, doctor_id: str, author_id: str, payload: DoctorReviewCreate
    ) -> DoctorPublic:
        profile = await db.doctorprofile.find_unique(where={"id": doctor_id})
        if not profile:
            raise HTTPException(status_code=404, detail="Doctor not found")
        if profile.userId == author_id:
            raise HTTPException(status_code=400, detail="Cannot review yourself")

        existing = await db.doctorreview.find_unique(
            where={"doctorId_authorId": {"doctorId": doctor_id, "authorId": author_id}}
        )
        if existing:
            await db.doctorreview.update(
                where={"id": existing.id},
                data={
                    "rating": payload.rating,
                    "comment": payload.comment,
                    "updatedAt": datetime.now(timezone.utc),
                },
            )
        else:
            await db.doctorreview.create(
                data={
                    "doctorId": doctor_id,
                    "authorId": author_id,
                    "rating": payload.rating,
                    "comment": payload.comment,
                }
            )

        reviews = await db.doctorreview.find_many(where={"doctorId": doctor_id})
        count = len(reviews)
        avg = sum(r.rating for r in reviews) / count if count else 0
        await db.doctorprofile.update(
            where={"id": doctor_id},
            data={"ratingAvg": avg, "ratingCount": count},
        )
        return await self.get_public(doctor_id)


doctor_service = DoctorService()
