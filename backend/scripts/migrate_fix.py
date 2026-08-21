import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from sqlalchemy import text
from app.core.database import SessionLocal

db = SessionLocal()
try:
    # Drop old department_id columns where section_id already exists
    for tbl in ["devices", "work_orders", "maint_plans", "stock_items"]:
        r = db.execute(text(
            "SELECT EXISTS (SELECT 1 FROM information_schema.columns "
            "WHERE table_name = :t AND column_name = 'department_id')"
        ), {"t": tbl})
        if r.scalar():
            print(f"  DROP {tbl}.department_id")
            db.execute(text(f'ALTER TABLE "{tbl}" DROP COLUMN department_id'))
    db.commit()

    # Create os_info
    db.execute(text("""
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
    """))
    db.execute(text("CREATE INDEX IF NOT EXISTS ix_os_info_device_id ON os_info(device_id)"))

    # Create sw_apps
    db.execute(text("""
        CREATE TABLE IF NOT EXISTS sw_apps (
            id SERIAL PRIMARY KEY,
            device_id INTEGER NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
            app_name VARCHAR(200) NOT NULL,
            version VARCHAR(100),
            license_key VARCHAR(300),
            status VARCHAR(50) DEFAULT 'active',
            notes TEXT
        )
    """))
    db.execute(text("CREATE INDEX IF NOT EXISTS ix_sw_apps_device_id ON sw_apps(device_id)"))
    db.commit()
    print("Tables os_info + sw_apps created.")

    # Migrate from asset_software
    r = db.execute(text(
        "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'asset_software')"
    ))
    if r.scalar():
        db.execute(text("""
            INSERT INTO os_info (device_id, os_name, windows_key)
            SELECT asset_id, os_name, windows_key FROM asset_software
            WHERE asset_id NOT IN (SELECT device_id FROM os_info)
        """))
        db.execute(text("""
            INSERT INTO sw_apps (device_id, app_name, version, status)
            SELECT asset_id, COALESCE(antivirus, 'AntiVirus'), antivirus_status,
                   CASE WHEN antivirus_status = 'YES' THEN 'active' ELSE 'inactive' END
            FROM asset_software
            WHERE antivirus IS NOT NULL AND antivirus != ''
        """))
        db.commit()
        print("Migrated asset_software -> os_info + sw_apps.")

    print("DONE")
except Exception as e:
    db.rollback()
    print(f"ERROR: {e}")
    raise
finally:
    db.close()
