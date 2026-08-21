from sqlalchemy import text
from app.core.database import SessionLocal


def exists_table(db, t: str) -> bool:
    return bool(
        db.execute(
            text("SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name=:t)"),
            {"t": t},
        ).scalar()
    )


def main():
    db = SessionLocal()
    try:
        if not (exists_table(db, "hw_images") and exists_table(db, "photes")):
            print("required table missing")
            return
        db.execute(
            text(
                """
                INSERT INTO photes (device_id, stored_name, original_name, content_type, size_bytes, created_at)
                SELECT h.device_id, h.stored_name, h.original_name, h.content_type, h.size_bytes, h.created_at
                FROM hw_images h
                WHERE NOT EXISTS (SELECT 1 FROM photes p WHERE p.stored_name = h.stored_name)
                """
            )
        )
        db.commit()
        old_count = db.execute(text("SELECT count(*) FROM hw_images")).scalar()
        new_count = db.execute(text("SELECT count(*) FROM photes")).scalar()
        print(f"hw_images={old_count}, photes={new_count}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
