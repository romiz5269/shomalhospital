from sqlalchemy import text
from app.core.database import SessionLocal


def table_exists(db, table_name: str) -> bool:
    return bool(
        db.execute(
            text("SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name=:t)"),
            {"t": table_name},
        ).scalar()
    )


def main():
    db = SessionLocal()
    try:
        if table_exists(db, "hw_images") and not table_exists(db, "photes"):
            db.execute(text("ALTER TABLE hw_images RENAME TO photes"))
            db.commit()
            print("Renamed hw_images -> photes")
        else:
            print("No rename needed")

        # safety: ensure index on device_id
        db.execute(text("CREATE INDEX IF NOT EXISTS ix_photes_device_id ON photes(device_id)"))
        db.commit()
        print("photes index ensured")
    finally:
        db.close()


if __name__ == "__main__":
    main()
