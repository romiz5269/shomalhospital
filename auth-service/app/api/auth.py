from datetime import datetime, timezone

from fastapi import APIRouter, Depends, File, Request, UploadFile
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.middleware.auth import AuthUser, require_auth
from app.schemas.auth import (
    AuthResponse,
    LoginPasswordRequest,
    LogoutRequest,
    MessageResponse,
    NationalIdUpdate,
    OtpRequest,
    OtpVerifyRequest,
    RefreshRequest,
    SignupRequest,
    SignupResponse,
    UserPublic,
)
from app.services.auth import auth_service
from app.services.doctor import doctor_service
from app.services.rate_limit import limit_login, limit_otp, limit_signup

router = APIRouter(tags=["auth"])
_bearer = HTTPBearer(auto_error=False)


@router.post("/signup", response_model=SignupResponse)
async def signup(payload: SignupRequest, request: Request):
    await limit_signup(request, payload.phone)
    return await auth_service.signup(payload)


@router.post("/otp/request", response_model=MessageResponse)
async def otp_request(payload: OtpRequest, request: Request):
    await limit_otp(payload.phone)
    message, otp_code = await auth_service.request_otp(payload.phone, payload.purpose)
    return MessageResponse(message=message, otp_code=otp_code)


@router.post("/otp/verify", response_model=AuthResponse)
async def otp_verify(payload: OtpVerifyRequest):
    return await auth_service.verify_otp(
        phone=payload.phone,
        code=payload.code,
        purpose=payload.purpose,
    )


@router.post("/login", response_model=AuthResponse)
async def login_password(payload: LoginPasswordRequest, request: Request):
    await limit_login(payload.phone)
    return await auth_service.login_password(payload)


@router.post("/refresh")
async def refresh(payload: RefreshRequest):
    auth, hint = await auth_service.refresh(payload.refresh_token)
    return {
        **auth.model_dump(),
        "gateway_redis": hint.model_dump(),
    }


@router.post("/logout", response_model=MessageResponse)
async def logout(
    body: LogoutRequest = LogoutRequest(),
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
):
    if credentials is None:
        return MessageResponse(success=False, message="Missing access token")
    hint = await auth_service.logout(
        access_token=credentials.credentials,
        refresh_token=body.refresh_token,
    )
    return MessageResponse(message="Logged out", gateway_redis=hint)


@router.get("/me", response_model=UserPublic)
async def me(user: AuthUser = Depends(require_auth)):
    return await auth_service.me(user.id)


@router.patch("/me/national-id", response_model=UserPublic)
async def set_national_id(
    payload: NationalIdUpdate,
    user: AuthUser = Depends(require_auth),
):
    """Set national ID after login — not required for login/signup."""
    return await auth_service.set_national_id(user.id, payload.national_id)


@router.post("/me/avatar", response_model=UserPublic)
async def upload_avatar(
    file: UploadFile = File(...),
    user: AuthUser = Depends(require_auth),
):
    await doctor_service.set_avatar(user.id, file)
    return await auth_service.me(user.id)
