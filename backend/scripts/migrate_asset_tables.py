"""One-shot migration: create asset_hardware, asset_software, asset_images tables
and add new columns to assets. Also migrates existing data."""

import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import text
from app.core.database import SessionLocal, engine

DDL = [
    # New columns on assets
    "ALTER TABLE assets ADD COLUMN IF NOT EXISTS system_name_old VARCHAR(200)",
    "ALTER TABLE assets ADD COLUMN IF NOT EXISTS user_name_id VARCHAR(200)",
    "ALTER TABLE assets ADD COLUMN IF NOT EXISTS section_name VARCHAR(200)",
    "ALTER TABLE assets ADD COLUMN IF NOT EXISTS section_id VARCHAR(50)",
    "ALTER TABLE assets ADD COLUMN IF NOT EXISTS floor VARCHAR(50)",
    "ALTER TABLE assets ADD COLUMN IF NOT EXISTS pm_date VARCHAR(50)",
    # asset_hardware
    """CREATE TABLE IF NOT EXISTS asset_hardware (
        id SERIAL PRIMARY KEY,
        asset_id INTEGER NOT NULL UNIQUE REFERENCES assets(id) ON DELETE CASCADE,
        mb VARCHAR(200),
        cpu VARCHAR(200),
        ram VARCHAR(200),
        vga VARCHAR(200),
        power VARCHAR(200),
        hard VARCHAR(200),
        monitor_name VARCHAR(200),
        monitor_asset_code VARCHAR(100),
        printer_name VARCHAR(200),
        printer_asset_code VARCHAR(100)
    )""",
    "CREATE INDEX IF NOT EXISTS ix_asset_hardware_asset_id ON asset_hardware(asset_id)",
    # asset_software
    """CREATE TABLE IF NOT EXISTS asset_software (
        id SERIAL PRIMARY KEY,
        asset_id INTEGER NOT NULL UNIQUE REFERENCES assets(id) ON DELETE CASCADE,
        os_name VARCHAR(200),
        antivirus VARCHAR(200),
        antivirus_status VARCHAR(50),
        mail_user VARCHAR(200),
        windows_key VARCHAR(200)
    )""",
    "CREATE INDEX IF NOT EXISTS ix_asset_software_asset_id ON asset_software(asset_id)",
    # asset_images
    """CREATE TABLE IF NOT EXISTS asset_images (
        id SERIAL PRIMARY KEY,
        asset_id INTEGER NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
        stored_name VARCHAR(300) NOT NULL,
        original_name VARCHAR(300) NOT NULL,
        content_type VARCHAR(100) DEFAULT 'image/jpeg',
        size_bytes INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
    )""",
    "CREATE INDEX IF NOT EXISTS ix_asset_images_asset_id ON asset_images(asset_id)",
]

MIGRATE_HW = """
INSERT INTO asset_hardware (asset_id, cpu, ram, vga, hard)
SELECT id, cpu, ram, gpu, storage FROM assets
WHERE id NOT IN (SELECT asset_id FROM asset_hardware)
  AND (cpu IS NOT NULL OR ram IS NOT NULL OR gpu IS NOT NULL OR storage IS NOT NULL)
"""

MIGRATE_SW = """
INSERT INTO asset_software (asset_id, os_name, windows_key)
SELECT id, os_name, windows_key FROM assets
WHERE id NOT IN (SELECT asset_id FROM asset_software)
  AND (os_name IS NOT NULL OR windows_key IS NOT NULL)
"""

if __name__ == "__main__":
    db = SessionLocal()
    try:
        for stmt in DDL:
            db.execute(text(stmt))
        db.commit()
        print("Tables created / columns added.")

        db.execute(text(MIGRATE_HW))
        db.execute(text(MIGRATE_SW))
        db.commit()
        print("Existing data migrated to asset_hardware / asset_software.")
    except Exception as e:
        db.rollback()
        print(f"Error: {e}")
        raise
    finally:
        db.close()
    print("Done.")
