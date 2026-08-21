from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.database import get_db
from app.models import User

settings = get_settings()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/token", auto_error=False)

SESSION_SHORT_DAYS = 7
SESSION_LONG_DAYS = 30


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def create_access_token(data: dict, remember: bool = False) -> tuple[str, int]:
    days = SESSION_LONG_DAYS if remember else SESSION_SHORT_DAYS
    expire_delta = timedelta(days=days)
    expire = datetime.utcnow() + expire_delta
    to_encode = {**data, "exp": expire, "iat": datetime.utcnow(), "remember": remember}
    token = jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)
    return token, int(expire_delta.total_seconds())


def decode_token(token: str) -> dict:
    return jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])


def get_current_user(
    token: str | None = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="نشست شما منقضی شده — لطفاً دوباره وارد شوید",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not token:
        raise credentials_exception
    try:
        payload = decode_token(token)
        username = payload.get("sub")
        uid = payload.get("uid")
        if username is None and uid is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    user = db.query(User).filter(User.id == uid).first() if uid else None
    if user is None and username:
        user = db.query(User).filter(User.username == username).first()
    if user is None or not user.is_active:
        raise credentials_exception
    return user


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="فقط مدیر سیستم مجاز است")
    return current_user
