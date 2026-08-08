from fastapi import HTTPException

from app.config import get_settings
from app.db import db
from app.redis_client import blacklist_jtis
from app.schemas.auth import (
    AuthResponse,
    GatewayRedisHint,
    LoginPasswordRequest,
    RevokeItem,
    SignupRequest,
    SignupResponse,
    TokenPair,
    UserPublic,
)
from app.services.otp import otp_service
from app.services.password import hash_password, verify_password
from app.services.rbac import rbac_service
from app.services.refresh_token import refresh_token_store
from app.services.token import token_service


class AuthService:
    def _avatar(self, avatar_url: str | None) -> str:
        settings = get_settings()
        return avatar_url or settings.default_avatar_url

    async def _to_public(self, user_id: str) -> UserPublic:
        user = await db.user.find_unique(
            where={"id": user_id},
            include={"doctorProfile": True},
        )
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        roles, permissions, groups = await rbac_service.resolve_user_access(user_id)
        return UserPublic(
            id=user.id,
            phone=user.phone,
            national_id=user.nationalId,
            email=user.email,
            first_name=user.firstName,
            last_name=user.lastName,
            avatar_url=self._avatar(user.avatarUrl),
            is_active=user.isActive,
            is_verified=user.isVerified,
            roles=roles,
            permissions=permissions,
            groups=groups,
            doctor_profile_id=user.doctorProfile.id if user.doctorProfile else None,
        )

    async def _issue_tokens(
        self, *, user_id: str, auto_login: bool = False
    ) -> AuthResponse:
        user = await db.user.find_unique(where={"id": user_id})
        if not user or not user.isActive:
            raise HTTPException(status_code=403, detail="User is inactive")

        roles, permissions, _groups = await rbac_service.resolve_user_access(user_id)
        primary_role = roles[0] if roles else "patient"

        access, _ajti, access_ttl = token_service.create_access_token(
            user_id=user_id,
            email=user.email,
            role=primary_role,
            permissions=permissions,
        )
        refresh, rjti, refresh_ttl = token_service.create_refresh_token(user_id=user_id)
        await refresh_token_store.save(user_id=user_id, jti=rjti, raw_token=refresh)

        return AuthResponse(
            user=await self._to_public(user_id),
            tokens=TokenPair(
                access_token=access,
                refresh_token=refresh,
                expires_in=access_ttl,
                refresh_expires_in=refresh_ttl,
            ),
            auto_login=auto_login,
        )

    async def signup(self, payload: SignupRequest) -> SignupResponse:
        existing = await db.user.find_unique(where={"phone": payload.phone})
        if existing:
            # phone + correct password → auto login
            if (
                payload.password
                and existing.passwordHash
                and verify_password(payload.password, existing.passwordHash)
            ):
                if not existing.isActive:
                    raise HTTPException(status_code=403, detail="User is inactive")
                auth = await self._issue_tokens(user_id=existing.id, auto_login=True)
                return SignupResponse(
                    message="Already registered — logged in automatically.",
                    auto_login=True,
                    user=auth.user,
                    tokens=auth.tokens,
                )
            raise HTTPException(
                status_code=409,
                detail="Phone already registered. Use login or provide the correct password.",
            )

        if payload.national_id:
            national_owner = await db.user.find_unique(
                where={"nationalId": payload.national_id}
            )
            if national_owner:
                raise HTTPException(status_code=409, detail="National ID already registered")

        if payload.email:
            email_owner = await db.user.find_unique(where={"email": payload.email})
            if email_owner:
                raise HTTPException(status_code=409, detail="Email already registered")

        panel = (payload.panel or "patient").strip().lower()
        if panel == "console":
            role_name = "admin"
        elif panel == "cms":
            role_name = "cms"
        else:
            # Public signup: only patient/doctor — never elevate from client role claim
            role_name = payload.role if payload.role in ("patient", "doctor") else "patient"

        role = await db.role.find_unique(where={"name": role_name})
        if not role:
            await rbac_service.seed_defaults()
            role = await db.role.find_unique(where={"name": role_name})
        if not role:
            raise HTTPException(status_code=400, detail=f"Unknown role '{role_name}'")

        if role_name == "doctor":
            assert payload.medical_license_no
            license_owner = await db.doctorprofile.find_unique(
                where={"medicalLicenseNo": payload.medical_license_no}
            )
            if license_owner:
                raise HTTPException(
                    status_code=409, detail="Medical license already registered"
                )

        user = await db.user.create(
            data={
                "phone": payload.phone,
                "nationalId": payload.national_id,
                "email": payload.email,
                "firstName": payload.first_name,
                "lastName": payload.last_name,
                "passwordHash": hash_password(payload.password) if payload.password else None,
                "isVerified": False,
            }
        )
        await rbac_service.assign_role_to_user(user.id, role_name)

        if role_name == "patient":
            await rbac_service.assign_groups_to_user(user.id, ["patients"])
        elif role_name == "doctor":
            await rbac_service.assign_groups_to_user(user.id, ["doctors"])
            await db.doctorprofile.create(
                data={
                    "userId": user.id,
                    "medicalLicenseNo": payload.medical_license_no or "",
                    "biography": payload.biography,
                    "specialty": payload.specialty,
                }
            )

        otp = await otp_service.issue(payload.phone, purpose="signup")
        settings = get_settings()
        if panel == "console":
            msg = "Signup created. Verify OTP to activate admin access."
        elif panel == "cms":
            msg = "Signup created. Verify OTP, then wait for system admin approval."
        else:
            msg = "Signup created. Verify phone OTP, then wait for admin approval."
        return SignupResponse(
            message=msg,
            auto_login=False,
            otp_code=otp.code if settings.expose_otp_code else None,
        )

    async def request_otp(self, phone: str, purpose: str) -> tuple[str, str | None]:
        settings = get_settings()
        user = await db.user.find_unique(where={"phone": phone})

        # Login: same message always — prevents phone enumeration
        if purpose == "login":
            otp_code = None
            if user and user.isActive:
                otp = await otp_service.issue(phone, purpose=purpose)
                otp_code = otp.code if settings.expose_otp_code else None
            return ("If the number is registered, OTP was sent.", otp_code)

        if purpose in ("signup", "verify") and not user:
            raise HTTPException(status_code=404, detail="User not found")
        if user and not user.isActive:
            raise HTTPException(status_code=403, detail="User is inactive")

        otp = await otp_service.issue(phone, purpose=purpose)
        return (
            "OTP sent.",
            otp.code if settings.expose_otp_code else None,
        )

    async def verify_otp(
        self,
        *,
        phone: str,
        code: str,
        purpose: str,
    ):
        from app.schemas.auth import MessageResponse

        await otp_service.verify(phone, code, purpose=purpose)
        user = await db.user.find_unique(where={"phone": phone})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        roles, _, _ = await rbac_service.resolve_user_access(user.id)

        # Console/system-admin signup: OTP activates immediately (no approval).
        if purpose == "signup" and "admin" in roles:
            await db.user.update(where={"id": user.id}, data={"isVerified": True})
            return await self._issue_tokens(user_id=user.id)

        # Patient / CMS signup: phone OK, wait for system-admin approval.
        if purpose == "signup":
            return MessageResponse(
                success=True,
                message="PENDING_ADMIN_APPROVAL",
            )

        if purpose == "verify" and not user.isVerified:
            await db.user.update(where={"id": user.id}, data={"isVerified": True})

        if purpose == "login" and not user.isVerified:
            # System admins never blocked by approval gate
            if "admin" not in roles:
                raise HTTPException(
                    status_code=403,
                    detail="Account not verified — awaiting admin approval",
                )

        return await self._issue_tokens(user_id=user.id)

    async def login_password(self, payload: LoginPasswordRequest) -> AuthResponse:
        user = await db.user.find_unique(where={"phone": payload.phone})
        if not user or not user.passwordHash:
            raise HTTPException(status_code=401, detail="Invalid credentials")
        if not verify_password(payload.password, user.passwordHash):
            raise HTTPException(status_code=401, detail="Invalid credentials")
        if not user.isActive:
            raise HTTPException(status_code=403, detail="User is inactive")
        roles, _, _ = await rbac_service.resolve_user_access(user.id)
        # Main system-admin accounts skip approval; CMS/patients need isVerified
        if not user.isVerified and "admin" not in roles:
            raise HTTPException(status_code=403, detail="Account not verified")
        return await self._issue_tokens(user_id=user.id)

    async def refresh(self, refresh_token: str) -> tuple[AuthResponse, GatewayRedisHint]:
        payload = token_service.decode(refresh_token, expected_type="refresh")
        jti = payload.get("jti")
        user_id = str(payload.get("sub"))
        if not jti:
            raise HTTPException(status_code=401, detail="Malformed refresh token")

        await refresh_token_store.consume_valid(
            jti=jti, raw_token=refresh_token, user_id=user_id
        )
        hint = GatewayRedisHint(
            items=[
                RevokeItem(
                    jti=str(jti),
                    ttl_seconds=token_service.remaining_ttl(payload),
                    kind="refresh",
                )
            ]
        )
        await blacklist_jtis([item.model_dump() for item in hint.items])
        return await self._issue_tokens(user_id=user_id), hint

    async def logout(
        self, *, access_token: str, refresh_token: str | None = None
    ) -> GatewayRedisHint:
        items: list[RevokeItem] = []
        access = token_service.decode(access_token, expected_type="access")
        ajti = access.get("jti")
        if ajti:
            items.append(
                RevokeItem(
                    jti=str(ajti),
                    ttl_seconds=token_service.remaining_ttl(access),
                    kind="access",
                )
            )

        if refresh_token:
            try:
                refresh = token_service.decode(refresh_token, expected_type="refresh")
                rjti = refresh.get("jti")
                if rjti:
                    await refresh_token_store.revoke_jti(str(rjti))
                    items.append(
                        RevokeItem(
                            jti=str(rjti),
                            ttl_seconds=token_service.remaining_ttl(refresh),
                            kind="refresh",
                        )
                    )
            except HTTPException:
                pass
        else:
            user_id = str(access.get("sub"))
            for rjti in await refresh_token_store.revoke_all_for_user(user_id):
                items.append(
                    RevokeItem(
                        jti=rjti,
                        ttl_seconds=get_settings().jwt_refresh_ttl_seconds,
                        kind="refresh",
                    )
                )

        hint = GatewayRedisHint(items=items)
        await blacklist_jtis([item.model_dump() for item in items])
        return hint

    async def me(self, user_id: str) -> UserPublic:
        return await self._to_public(user_id)

    async def set_national_id(self, user_id: str, national_id: str) -> UserPublic:
        owner = await db.user.find_unique(where={"nationalId": national_id})
        if owner and owner.id != user_id:
            raise HTTPException(status_code=409, detail="National ID already registered")
        await db.user.update(
            where={"id": user_id},
            data={"nationalId": national_id},
        )
        return await self._to_public(user_id)


auth_service = AuthService()
