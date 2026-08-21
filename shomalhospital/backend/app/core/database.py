import time
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from app.core.config import get_settings

settings = get_settings()
connect_args = {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}
engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,
    pool_recycle=1800,
    pool_size=15,
    max_overflow=30,
    pool_timeout=10,
    connect_args=connect_args,
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def wait_for_db(max_retries: int = 30, delay: float = 2.0) -> None:
    """Wait until PostgreSQL is ready (Docker startup)."""
    if settings.database_url.startswith("sqlite"):
        return
    for attempt in range(max_retries):
        try:
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            return
        except Exception:
            if attempt == max_retries - 1:
                raise
            time.sleep(delay)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
