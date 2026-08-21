"""Rename tables to readable English names + split asset_software into os_info + sw_apps."""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import text
from app.core.database import SessionLocal

RENAMES = [
    ("asset_hardware", "hw_specs"),
    ("asset_images", "hw_images"),
    ("asset_upgrades", "hw_upgrades"),
    ("assets", "devices"),
    ("attachments", "file_attachments"),
    ("departments", "sections"),
    ("inventory_items", "stock_items"),
    ("maintenance_plans", "maint_plans"),
    ("password_reset_requests", "pwd_resets"),
    ("pm_checklist_templates", "checklist_templates"),
    ("pm_visit_tasks", "visit_tasks"),
    ("pm_visits", "service_visits"),
    ("push_subscriptions", "push_subs"),
    ("reminders", "alerts"),
    ("system_config", "app_config"),
    ("work_cases", "work_orders"),
]

NEW_TABLES = [
    # os_info: OS details per device
    """CREATE TABLE IF NOT EXISTS os_info (
        id SERIAL PRIMARY KEY,
        device_id INTEGER NOT NULL UNIQUE REFERENCES devices(id) ON DELETE CASCADE,
        os_name VARCHAR(200),
        os_version VARCHAR(200),
        windows_key VARCHAR(200),
        windows_activated_at TIMESTAMP,
        license_type VARCHAR(100),
        notes TEXT
    )""",
    "CREATE INDEX IF NOT EXISTS ix_os_info_device_id ON os_info(device_id)",
    # sw_apps: installed software per device (1:N)
    """CREATE TABLE IF NOT EXISTS sw_apps (
        id SERIAL PRIMARY KEY,
        device_id INTEGER NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
        app_name VARCHAR(200) NOT NULL,
        version VARCHAR(100),
        license_key VARCHAR(300),
        status VARCHAR(50) DEFAULT 'active',
        notes TEXT
    )""",
    "CREATE INDEX IF NOT EXISTS ix_sw_apps_device_id ON sw_apps(device_id)",
]

MIGRATE_OS = """
INSERT INTO os_info (device_id, os_name, windows_key)
SELECT asset_id, os_name, windows_key FROM asset_software
WHERE asset_id NOT IN (SELECT device_id FROM os_info)
ON CONFLICT DO NOTHING
"""

MIGRATE_APPS = """
INSERT INTO sw_apps (device_id, app_name, version, status)
SELECT asset_id, 
       COALESCE(antivirus, 'AntiVirus'),
       antivirus_status,
       CASE WHEN antivirus_status = 'YES' THEN 'active' ELSE 'inactive' END
FROM asset_software
WHERE antivirus IS NOT NULL AND antivirus != ''
  AND asset_id NOT IN (SELECT device_id FROM sw_apps WHERE app_name LIKE '%ntiVirus%')
ON CONFLICT DO NOTHING
"""


def table_exists(db, name):
    r = db.execute(text("SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = :n)"), {"n": name})
    return r.scalar()


if __name__ == "__main__":
    db = SessionLocal()
    try:
        # Step 1: Rename tables (skip if already done)
        for old, new in RENAMES:
            if table_exists(db, old) and not table_exists(db, new):
                print(f"  RENAME {old} -> {new}")
                db.execute(text(f'ALTER TABLE "{old}" RENAME TO "{new}"'))
            elif table_exists(db, new):
                print(f"  SKIP {old} -> {new} (already exists)")
            else:
                print(f"  SKIP {old} (not found)")
        db.commit()
        print("Renames done.")

        # Step 2: Fix FK references - rename column asset_id -> device_id where needed
        fk_renames = [
            ("hw_specs", "asset_id", "device_id"),
            ("hw_images", "asset_id", "device_id"),
            ("hw_upgrades", "asset_id", "device_id"),
        ]
        for tbl, old_col, new_col in fk_renames:
            if table_exists(db, tbl):
                # Check if old column exists
                r = db.execute(text(
                    "SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = :t AND column_name = :c)"
                ), {"t": tbl, "c": old_col})
                if r.scalar():
                    print(f"  RENAME COLUMN {tbl}.{old_col} -> {new_col}")
                    db.execute(text(f'ALTER TABLE "{tbl}" RENAME COLUMN "{old_col}" TO "{new_col}"'))
        db.commit()

        # Rename FK columns on main tables too
        device_fk_tables = [
            ("stock_items", "asset_id", "device_id"),
            ("service_visits", "asset_id", "device_id"),
            ("alerts", "asset_id", "device_id"),
            ("maint_plans", "asset_id", "device_id"),
            ("work_orders", "asset_id", "device_id"),
        ]
        for tbl, old_col, new_col in device_fk_tables:
            if table_exists(db, tbl):
                r = db.execute(text(
                    "SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = :t AND column_name = :c)"
                ), {"t": tbl, "c": old_col})
                if r.scalar():
                    print(f"  RENAME COLUMN {tbl}.{old_col} -> {new_col}")
                    db.execute(text(f'ALTER TABLE "{tbl}" RENAME COLUMN "{old_col}" TO "{new_col}"'))
        db.commit()

        # visit_tasks: visit_id stays (service_visits)
        # service_visits: department_id -> section_id rename
        if table_exists(db, "service_visits"):
            r = db.execute(text(
                "SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'service_visits' AND column_name = 'department_id')"
            ))
            if r.scalar():
                print("  RENAME COLUMN service_visits.department_id -> section_id")
                db.execute(text('ALTER TABLE "service_visits" RENAME COLUMN "department_id" TO "section_id"'))

        # devices: department_id -> section_id
        if table_exists(db, "devices"):
            r = db.execute(text(
                "SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'devices' AND column_name = 'department_id')"
            ))
            if r.scalar():
                print("  RENAME COLUMN devices.department_id -> section_id")
                db.execute(text('ALTER TABLE "devices" RENAME COLUMN "department_id" TO "section_id"'))

        # work_orders: department_id -> section_id
        if table_exists(db, "work_orders"):
            r = db.execute(text(
                "SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'work_orders' AND column_name = 'department_id')"
            ))
            if r.scalar():
                print("  RENAME COLUMN work_orders.department_id -> section_id")
                db.execute(text('ALTER TABLE "work_orders" RENAME COLUMN "department_id" TO "section_id"'))

        # maint_plans: department_id -> section_id
        if table_exists(db, "maint_plans"):
            r = db.execute(text(
                "SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'maint_plans' AND column_name = 'department_id')"
            ))
            if r.scalar():
                print("  RENAME COLUMN maint_plans.department_id -> section_id")
                db.execute(text('ALTER TABLE "maint_plans" RENAME COLUMN "department_id" TO "section_id"'))

        # stock_items: department_id -> section_id
        if table_exists(db, "stock_items"):
            r = db.execute(text(
                "SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stock_items' AND column_name = 'department_id')"
            ))
            if r.scalar():
                print("  RENAME COLUMN stock_items.department_id -> section_id")
                db.execute(text('ALTER TABLE "stock_items" RENAME COLUMN "department_id" TO "section_id"'))

        db.commit()
        print("Column renames done.")

        # Step 3: Create os_info + sw_apps tables
        for stmt in NEW_TABLES:
            db.execute(text(stmt))
        db.commit()
        print("New tables created.")

        # Step 4: Migrate data from old asset_software
        if table_exists(db, "asset_software"):
            db.execute(text(MIGRATE_OS))
            db.execute(text(MIGRATE_APPS))
            db.commit()
            print("Data migrated from asset_software to os_info + sw_apps.")
        else:
            print("asset_software not found (already renamed/dropped).")

        print("ALL DONE.")
    except Exception as e:
        db.rollback()
        print(f"ERROR: {e}")
        raise
    finally:
        db.close()
