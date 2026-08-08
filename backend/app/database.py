from collections.abc import Generator

from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import get_settings

cfg = get_settings()

engine = create_engine(
    cfg.db_url,
    pool_pre_ping=True,
    pool_size=cfg.db_pool_size,
    max_overflow=cfg.db_max_overflow,
    pool_timeout=cfg.db_pool_timeout,
    pool_recycle=900,
    connect_args={"connect_timeout": 5},
)


@event.listens_for(engine, "connect")
def _on_connect(dbapi_conn, _):
    cur = dbapi_conn.cursor()
    cur.execute("SET statement_timeout = 15000")
    cur.execute("SET lock_timeout = 5000")
    cur.close()


SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def ping_db() -> bool:
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception:
        return False
