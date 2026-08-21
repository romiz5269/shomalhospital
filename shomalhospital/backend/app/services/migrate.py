from sqlalchemy import inspect, text

from app.core.database import engine


def migrate_schema() -> None:
    """Add new columns/tables to existing DB without Alembic."""
    insp = inspect(engine)
    tables = insp.get_table_names()
    _drop_enterprise_tables(tables)
    tables = inspect(engine).get_table_names()

    if "users" in tables:
        cols = {c["name"] for c in insp.get_columns("users")}
        user_alters = []
        if "must_change_password" not in cols:
            user_alters.append("ADD COLUMN must_change_password BOOLEAN DEFAULT FALSE")
        if "allow_passwordless_login" not in cols:
            user_alters.append("ADD COLUMN allow_passwordless_login BOOLEAN DEFAULT FALSE")
        if "password_reset_code_hash" not in cols:
            user_alters.append("ADD COLUMN password_reset_code_hash VARCHAR(255)")
        if user_alters:
            with engine.begin() as conn:
                for clause in user_alters:
                    conn.execute(text(f"ALTER TABLE users {clause}"))

    if "assets" in tables:
        cols = {c["name"] for c in insp.get_columns("assets")}
        alters = []
        if "brand" not in cols:
            alters.append("ADD COLUMN brand VARCHAR(100)")
        if "model" not in cols:
            alters.append("ADD COLUMN model VARCHAR(100)")
        if "toner_type" not in cols:
            alters.append("ADD COLUMN toner_type VARCHAR(100)")
        if "purchase_date" not in cols:
            alters.append("ADD COLUMN purchase_date TIMESTAMP")
        if "warranty_end_date" not in cols:
            alters.append("ADD COLUMN warranty_end_date TIMESTAMP")
        if "vendor_name" not in cols:
            alters.append("ADD COLUMN vendor_name VARCHAR(200)")
        if "vendor_phone" not in cols:
            alters.append("ADD COLUMN vendor_phone VARCHAR(50)")
        asset_cols = {
            "asset_code": "VARCHAR(100)",
            "hostname": "VARCHAR(200)",
            "unit": "VARCHAR(200)",
            "operational_status": "VARCHAR(30) DEFAULT 'active'",
            "cpu": "VARCHAR(200)",
            "ram": "VARCHAR(100)",
            "storage": "VARCHAR(200)",
            "gpu": "VARCHAR(200)",
            "monitor": "VARCHAR(200)",
            "raid": "VARCHAR(200)",
            "virtualization": "VARCHAR(100)",
            "hypervisor": "VARCHAR(100)",
            "rack": "VARCHAR(100)",
            "power_info": "VARCHAR(200)",
            "network_info": "TEXT",
            "services_info": "TEXT",
        }
        for col, typedef in asset_cols.items():
            if col not in cols:
                alters.append(f"ADD COLUMN {col} {typedef}")
        if alters:
            with engine.begin() as conn:
                for clause in alters:
                    conn.execute(text(f"ALTER TABLE assets {clause}"))

    if "pm_visits" in tables:
        cols = {c["name"] for c in insp.get_columns("pm_visits")}
        alters = []
        if "return_date" not in cols:
            alters.append("ADD COLUMN return_date TIMESTAMP")
        if "recipient_name" not in cols:
            alters.append("ADD COLUMN recipient_name VARCHAR(200)")
        if "recipient_unit" not in cols:
            alters.append("ADD COLUMN recipient_unit VARCHAR(200)")
        if "alert_title" not in cols:
            alters.append("ADD COLUMN alert_title VARCHAR(300)")
        if "alert_description" not in cols:
            alters.append("ADD COLUMN alert_description TEXT")
        if "alert_warning_days" not in cols:
            alters.append("ADD COLUMN alert_warning_days INTEGER DEFAULT 30")
        if "work_type" not in cols:
            alters.append("ADD COLUMN work_type VARCHAR(20) DEFAULT 'pm'")
        if "title" not in cols:
            alters.append("ADD COLUMN title VARCHAR(300)")
        if alters:
            with engine.begin() as conn:
                for clause in alters:
                    conn.execute(text(f"ALTER TABLE pm_visits {clause}"))

    if "reminders" in tables:
        cols = {c["name"] for c in insp.get_columns("reminders")}
        alters = []
        if "source" not in cols:
            alters.append("ADD COLUMN source VARCHAR(20) DEFAULT 'auto'")
        if "warning_days" not in cols:
            alters.append("ADD COLUMN warning_days INTEGER DEFAULT 30")
        if alters:
            with engine.begin() as conn:
                for clause in alters:
                    conn.execute(text(f"ALTER TABLE reminders {clause}"))

    _migrate_work_cases_to_pm_visits(insp, tables)


def _drop_enterprise_tables(tables: list[str]) -> None:
    """Remove leftover ITSM/PPM tables after the enterprise module was deleted."""
    drop_order = [
        "ci_dependencies",
        "business_impact_analyses",
        "olas",
        "okrs",
        "incidents",
        "change_requests",
        "problems",
        "releases",
        "resource_capacity",
        "projects",
        "programs",
        "portfolios",
        "strategic_goals",
        "slas",
        "kpis",
        "compliance_items",
        "risks",
        "configuration_items",
        "dr_plans",
        "bc_plans",
        "vendors",
        "budgets",
        "financial_forecasts",
    ]
    existing = [t for t in drop_order if t in tables]
    if not existing:
        return
    with engine.begin() as conn:
        for name in existing:
            conn.execute(text(f"DROP TABLE IF EXISTS {name} CASCADE"))
        conn.execute(text("DROP TYPE IF EXISTS ticketpriority CASCADE"))
        conn.execute(text("DROP TYPE IF EXISTS ticketstatus CASCADE"))
        conn.execute(text("DELETE FROM system_config WHERE key LIKE 'enterprise%' OR key LIKE 'ldap_%'"))


def _migrate_work_cases_to_pm_visits(insp, tables: list[str]) -> None:
    """Copy legacy work_cases rows into pm_visits as adhoc work items (once)."""
    if "work_cases" not in tables or "pm_visits" not in tables:
        return
    with engine.begin() as conn:
        flag = conn.execute(
            text("SELECT value FROM system_config WHERE key = 'work_cases_migrated'")
        ).fetchone()
        if flag:
            return
        rows = conn.execute(text("SELECT * FROM work_cases")).mappings().all()
        for wc in rows:
            visit_date = wc.get("completed_at") or wc.get("created_at")
            conn.execute(
                text("""
                    INSERT INTO pm_visits (
                        visit_date, recipient_name, asset_id, department_id,
                        performed_by, technician_id, notes, work_type, title, created_at
                    ) VALUES (
                        :visit_date, :recipient_name, :asset_id, :department_id,
                        :performed_by, :technician_id, :notes, 'adhoc', :title, :created_at
                    )
                """),
                {
                    "visit_date": visit_date,
                    "recipient_name": wc.get("title") or "—",
                    "asset_id": wc.get("asset_id"),
                    "department_id": wc.get("department_id"),
                    "performed_by": wc.get("performed_by") or "—",
                    "technician_id": wc.get("technician_id"),
                    "notes": wc.get("description"),
                    "title": wc.get("title"),
                    "created_at": wc.get("created_at"),
                },
            )
        conn.execute(
            text(
                "INSERT INTO system_config (key, value, updated_at) VALUES ('work_cases_migrated', '1', NOW())"
            )
        )
