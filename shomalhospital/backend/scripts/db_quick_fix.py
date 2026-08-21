from sqlalchemy import text
from app.core.database import SessionLocal


def has_col(db, table: str, col: str) -> bool:
    return bool(
        db.execute(
            text(
                "SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name=:t AND column_name=:c)"
            ),
            {"t": table, "c": col},
        ).scalar()
    )


def main():
    db = SessionLocal()
    try:
        # service_visits mismatch
        if not has_col(db, "service_visits", "section_id") and has_col(db, "service_visits", "department_id"):
            db.execute(text("ALTER TABLE service_visits RENAME COLUMN department_id TO section_id"))

        # ORM expects section_id on these tables too
        for table in ("work_orders", "maint_plans", "stock_items"):
            if not has_col(db, table, "section_id"):
                db.execute(text(f"ALTER TABLE {table} ADD COLUMN section_id INTEGER"))

        # make sure split tables exist
        db.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS os_info (
                    id SERIAL PRIMARY KEY,
                    device_id INTEGER NOT NULL UNIQUE REFERENCES devices(id) ON DELETE CASCADE,
                    os_name VARCHAR(200),
                    os_version VARCHAR(200),
                    windows_key VARCHAR(200),
                    windows_activated_at TIMESTAMP,
                    license_type VARCHAR(100),
                    notes TEXT
                )
                """
            )
        )
        db.execute(text("CREATE INDEX IF NOT EXISTS ix_os_info_device_id ON os_info(device_id)"))
        db.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS sw_apps (
                    id SERIAL PRIMARY KEY,
                    device_id INTEGER NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
                    app_name VARCHAR(200) NOT NULL,
                    version VARCHAR(100),
                    license_key VARCHAR(300),
                    status VARCHAR(50) DEFAULT 'active',
                    notes TEXT
                )
                """
            )
        )
        db.execute(text("CREATE INDEX IF NOT EXISTS ix_sw_apps_device_id ON sw_apps(device_id)"))

        # optional migration from old asset_software if still around
        exists_old = bool(
            db.execute(
                text("SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='asset_software')")
            ).scalar()
        )
        if exists_old:
            db.execute(
                text(
                    """
                    INSERT INTO os_info (device_id, os_name, windows_key)
                    SELECT asset_id, os_name, windows_key
                    FROM asset_software
                    ON CONFLICT (device_id) DO NOTHING
                    """
                )
            )

        db.commit()
        print("DB quick fix applied")
    finally:
        db.close()


if __name__ == "__main__":
    main()
