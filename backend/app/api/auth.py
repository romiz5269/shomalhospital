from datetime import datetime
from collections import defaultdict
import secrets
import time

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.database import get_db
from app.core.security import (
    verify_password,
    create_access_token,
    get_current_user,
    get_password_hash,
    decode_token,
    oauth2_scheme,
    require_admin,
)
from app.models import User, PasswordResetRequest
from app.schemas import Token, LoginRequest, UserOut, UserCreate, PasswordResetRequestOut, UserSessionOut
from app.services.activity import log_activity

router = APIRouter(prefix="/auth", tags=["احراز هویت"])
limiter = Limiter(key_func=get_remote_address)

_FAILED_LOGINS: dict[str, list[float]] = defaultdict(list)
_FAIL_WINDOW_SEC = 60
_FAIL_MAX = 20


def _as_remember(value) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, (list, tuple)):
        return "remember" in value
    return bool(value)


def _remember_from_bearer(token: str | None) -> bool:
    if not token:
        return False
    try:
        return _as_remember(decode_token(token).get("remember"))
    except Exception:
        return False


def _guard_login_attempts(ip: str) -> None:
    now = time.time()
    recent = [t for t in _FAILED_LOGINS[ip] if now - t < _FAIL_WINDOW_SEC]
    _FAILED_LOGINS[ip] = recent
    if len(recent) >= _FAIL_MAX:
        raise HTTPException(
            status_code=429,
            detail="تعداد تلاش ورود زیاد است. حدود یک دقیقه صبر کنید و دوباره وارد شوید.",
        )


def _record_failed_login(ip: str) -> None:
    _FAILED_LOGINS[ip].append(time.time())


def _clear_failed_login(ip: str) -> None:
    _FAILED_LOGINS.pop(ip, None)


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(min_length=6)


class SetNewPasswordRequest(BaseModel):
    new_password: str = Field(min_length=6)


class ForgotPasswordRequest(BaseModel):
    username: str = Field(min_length=1)


class ResetPasswordRequest(BaseModel):
    new_password: str = Field(min_length=6)


class ProfileUpdate(BaseModel):
    full_name: str | None = None
    username: str | None = None


def _issue_token(user: User, remember: bool = False) -> Token:
    access_token, expires_in = create_access_token(
        {"sub": user.username, "uid": user.id, "role": user.role},
        remember=remember,
    )
    return Token(
        access_token=access_token,
        expires_in=expires_in,
        must_change_password=user.must_change_password,
    )


def _log_login_failed(db: Session, username: str, ip: str, reason: str) -> None:
    log_activity(
        db,
        user_id=None,
        user_name=username or "unknown",
        action="login_failed",
        entity_type="auth",
        details=f"IP: {ip} · {reason}",
    )


def _issue_reset_code(user: User) -> str:
    code = f"{secrets.randbelow(100_000_000):08d}"
    user.password_reset_code_hash = get_password_hash(code)
    user.must_change_password = True
    user.allow_passwordless_login = False
    return code


def _clear_reset_state(user: User) -> None:
    user.must_change_password = False
    user.allow_passwordless_login = False
    user.password_reset_code_hash = None


def _authenticate(db: Session, username: str, password: str) -> User:
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=401, detail="نام کاربری یا رمز عبور اشتباه است")
    if not user.is_active:
        raise HTTPException(
            status_code=403,
            detail="حساب کاربری هنوز توسط مدیر تأیید نشده یا غیرفعال است",
        )
    if (
        password
        and user.must_change_password
        and user.password_reset_code_hash
        and verify_password(password, user.password_reset_code_hash)
    ):
        return user
    if not password or not verify_password(password, user.hashed_password):
        raise HTTPException(status_code=401, detail="نام کاربری یا رمز عبور اشتباه است")
    return user


def _complete_reset_requests(db: Session, user: User) -> None:
    pending = (
        db.query(PasswordResetRequest)
        .filter(
            PasswordResetRequest.user_id == user.id,
            PasswordResetRequest.status.in_(("pending", "approved")),
        )
        .all()
    )
    now = datetime.utcnow()
    for row in pending:
        row.status = "completed"
        row.resolved_at = now


@router.post("/token", response_model=Token)
def login_token(request: Request, form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    ip = get_remote_address(request) or "unknown"
    _guard_login_attempts(ip)
    try:
        user = _authenticate(db, form_data.username, form_data.password or "")
    except HTTPException as e:
        if e.status_code in (401, 403):
            _record_failed_login(ip)
            _log_login_failed(db, form_data.username, ip, str(e.detail))
        raise
    _clear_failed_login(ip)
    remember = bool(form_data.scopes) and "remember" in form_data.scopes
    return _issue_token(user, remember=remember)


@router.post("/login", response_model=Token)
def login(request: Request, form: LoginRequest, db: Session = Depends(get_db)):
    ip = get_remote_address(request) or "unknown"
    _guard_login_attempts(ip)
    try:
        user = _authenticate(db, form.username, form.password or "")
    except HTTPException as e:
        if e.status_code in (401, 403):
            _record_failed_login(ip)
            _log_login_failed(db, form.username, ip, str(e.detail))
        raise
    _clear_failed_login(ip)
    return _issue_token(user, remember=form.remember)


@router.post("/refresh", response_model=Token)
def refresh_token(
    token: str | None = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    if not token:
        raise HTTPException(status_code=401, detail="نشست یافت نشد")
    try:
        payload = decode_token(token)
        username = payload.get("sub")
        uid = payload.get("uid")
        remember = _as_remember(payload.get("remember", False))
    except Exception:
        raise HTTPException(status_code=401, detail="نشست منقضی شده — لطفاً دوباره وارد شوید")
    user = db.query(User).filter(User.id == uid).first() if uid else None
    if user is None:
        user = db.query(User).filter(User.username == username).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="حساب کاربری غیرفعال است")
    return _issue_token(user, remember=remember)


@router.post("/forgot-password")
@limiter.limit("5/hour")
def forgot_password(request: Request, body: ForgotPasswordRequest, db: Session = Depends(get_db)):
    username = body.username.strip()
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(
            status_code=400,
            detail="این نام کاربری در سیستم نیست.",
        )
    if not user.is_active:
        raise HTTPException(status_code=403, detail="این حساب غیرفعال است")
    existing = (
        db.query(PasswordResetRequest)
        .filter(
            PasswordResetRequest.user_id == user.id,
            PasswordResetRequest.status == "pending",
        )
        .first()
    )
    if existing:
        return {
            "ok": True,
            "message": "درخواست قبلی هنوز در انتظار تأیید مدیر است.",
        }
    row = PasswordResetRequest(
        user_id=user.id,
        username=user.username,
        full_name=user.full_name,
        status="pending",
    )
    db.add(row)
    db.commit()
    log_activity(
        db,
        user_id=user.id,
        user_name=user.full_name,
        action="password_reset_request",
        entity_type="auth",
        entity_id=user.id,
        details=f"درخواست فراموشی رمز — {user.username}",
    )
    return {
        "ok": True,
        "message": "درخواست ثبت شد.",
    }


@router.get("/password-reset-requests", response_model=list[PasswordResetRequestOut])
def list_password_reset_requests(
    status_filter: str = "pending",
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    q = db.query(PasswordResetRequest)
    if status_filter and status_filter != "all":
        q = q.filter(PasswordResetRequest.status == status_filter)
    return q.order_by(PasswordResetRequest.created_at.desc()).all()


@router.post("/password-reset-requests/{request_id}/approve")
def approve_password_reset(
    request_id: int,
    db: Session = Depends(get_db),
    actor: User = Depends(require_admin),
):
    row = db.query(PasswordResetRequest).filter(PasswordResetRequest.id == request_id).first()
    if not row or row.status != "pending":
        raise HTTPException(status_code=404, detail="درخواست ریست یافت نشد")
    user = db.query(User).filter(User.id == row.user_id).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=400, detail="حساب کاربر فعال نیست")
    user.must_change_password = True
    user.allow_passwordless_login = False
    code = _issue_reset_code(user)
    row.status = "approved"
    row.resolved_at = datetime.utcnow()
    row.resolved_by = actor.full_name
    db.commit()
    log_activity(
        db,
        user_id=actor.id,
        user_name=actor.full_name,
        action="update",
        entity_type="user",
        entity_id=user.id,
        details=f"تأیید ریست رمز {user.username}",
    )
    return {
        "ok": True,
        "reset_code": code,
        "message": f"ریست تأیید شد. کد یک‌بارمصرف را فقط به {user.full_name} بگویید. با نام کاربری و این کد وارد می‌شود و رمز جدید می‌گذارد.",
    }


@router.post("/password-reset-requests/{request_id}/reject")
def reject_password_reset(
    request_id: int,
    db: Session = Depends(get_db),
    actor: User = Depends(require_admin),
):
    row = db.query(PasswordResetRequest).filter(PasswordResetRequest.id == request_id).first()
    if not row or row.status != "pending":
        raise HTTPException(status_code=404, detail="درخواست ریست یافت نشد")
    row.status = "rejected"
    row.resolved_at = datetime.utcnow()
    row.resolved_by = actor.full_name
    db.commit()
    return {"ok": True}


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return current_user


@router.patch("/me", response_model=UserSessionOut)
def update_me(
    body: ProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    token: str | None = Depends(oauth2_scheme),
):
    if body.username is not None:
        if current_user.role != "admin":
            raise HTTPException(status_code=403, detail="فقط مدیر می‌تواند نام کاربری را عوض کند")
        new_username = body.username.strip()
        if not new_username:
            raise HTTPException(status_code=400, detail="نام کاربری خالی است")
        taken = (
            db.query(User)
            .filter(User.username == new_username, User.id != current_user.id)
            .first()
        )
        if taken:
            raise HTTPException(status_code=400, detail="این نام کاربری قبلاً ثبت شده")
        current_user.username = new_username
    if body.full_name is not None and body.full_name.strip():
        current_user.full_name = body.full_name.strip()
    db.commit()
    db.refresh(current_user)
    issued = _issue_token(current_user, remember=_remember_from_bearer(token))
    return UserSessionOut(
        id=current_user.id,
        username=current_user.username,
        email=current_user.email,
        full_name=current_user.full_name,
        role=current_user.role,
        is_active=current_user.is_active,
        must_change_password=current_user.must_change_password,
        allow_passwordless_login=current_user.allow_passwordless_login,
        access_token=issued.access_token,
        token_type=issued.token_type,
        expires_in=issued.expires_in,
    )


@router.post("/change-password", response_model=Token)
def change_password(
    body: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    token: str | None = Depends(oauth2_scheme),
):
    if not verify_password(body.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="رمز فعلی اشتباه است")
    current_user.hashed_password = get_password_hash(body.new_password)
    _clear_reset_state(current_user)
    _complete_reset_requests(db, current_user)
    db.commit()
    log_activity(
        db,
        user_id=current_user.id,
        user_name=current_user.full_name,
        action="update",
        entity_type="auth",
        details="تغییر رمز عبور",
    )
    return _issue_token(current_user, remember=_remember_from_bearer(token))


@router.post("/set-new-password", response_model=Token)
def set_new_password(
    body: SetNewPasswordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    token: str | None = Depends(oauth2_scheme),
):
    if not current_user.must_change_password:
        raise HTTPException(status_code=400, detail="برای این حساب الزام تغییر رمز وجود ندارد")
    current_user.hashed_password = get_password_hash(body.new_password)
    _clear_reset_state(current_user)
    _complete_reset_requests(db, current_user)
    db.commit()
    log_activity(
        db,
        user_id=current_user.id,
        user_name=current_user.full_name,
        action="update",
        entity_type="auth",
        details="تنظیم رمز جدید پس از ریست مدیر",
    )
    return _issue_token(current_user, remember=_remember_from_bearer(token))


@router.post("/users/{user_id}/reset-password")
def reset_password(
    user_id: int,
    body: ResetPasswordRequest,
    db: Session = Depends(get_db),
    actor: User = Depends(require_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="کاربر یافت نشد")
    user.hashed_password = get_password_hash(body.new_password)
    user.must_change_password = True
    user.allow_passwordless_login = False
    db.commit()
    log_activity(
        db,
        user_id=actor.id,
        user_name=actor.full_name,
        action="update",
        entity_type="user",
        entity_id=user.id,
        details=f"ریست رمز کاربر {user.username}",
    )
    return {"ok": True, "message": "رمز موقت تنظیم شد — کاربر در ورود بعدی باید رمز جدید بگذارد"}


@router.post("/users/{user_id}/approve-password-reset")
def approve_user_password_reset(
    user_id: int,
    db: Session = Depends(get_db),
    actor: User = Depends(require_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="کاربر یافت نشد")
    pending = (
        db.query(PasswordResetRequest)
        .filter(PasswordResetRequest.user_id == user.id, PasswordResetRequest.status == "pending")
        .all()
    )
    now = datetime.utcnow()
    if pending:
        for row in pending:
            row.status = "approved"
            row.resolved_at = now
            row.resolved_by = actor.full_name
    else:
        db.add(
            PasswordResetRequest(
                user_id=user.id,
                username=user.username,
                full_name=user.full_name,
                status="approved",
                resolved_at=now,
                resolved_by=actor.full_name,
            )
        )
    user.must_change_password = True
    user.allow_passwordless_login = False
    code = _issue_reset_code(user)
    db.commit()
    log_activity(
        db,
        user_id=actor.id,
        user_name=actor.full_name,
        action="update",
        entity_type="user",
        entity_id=user.id,
        details=f"تأیید ریست رمز {user.username}",
    )
    return {
        "ok": True,
        "reset_code": code,
        "message": f"کد یک‌بارمصرف را فقط به {user.full_name} بگویید تا با آن وارد شود و رمز جدید بگذارد.",
    }


@router.post("/signup")
def signup_disabled():
    raise HTTPException(
        status_code=403,
        detail="ثبت‌نام عمومی غیرفعال است. فقط مدیر می‌تواند حساب بسازد.",
    )


@router.post("/register", response_model=UserOut)
def register(data: UserCreate, db: Session = Depends(get_db), actor: User = Depends(require_admin)):
    if db.query(User).filter(User.username == data.username).first():
        raise HTTPException(status_code=400, detail="این نام کاربری قبلاً ثبت شده.")
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(status_code=400, detail="این ایمیل قبلاً ثبت شده.")
    role = data.role if data.role in ("admin", "technician") else "technician"
    user = User(
        username=data.username,
        email=data.email,
        full_name=data.full_name,
        hashed_password=get_password_hash(data.password),
        role=role,
        is_active=True,
        must_change_password=False,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    log_activity(
        db,
        user_id=actor.id,
        user_name=actor.full_name,
        action="create",
        entity_type="user",
        entity_id=user.id,
        details=user.username,
    )
    return user
