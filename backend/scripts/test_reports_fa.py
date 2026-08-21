#!/usr/bin/env python
"""Smoke test: Persian Excel reports."""
from datetime import datetime

from app.core.database import SessionLocal
from app.models import PMVisit
from app.services.reports import export_xlsx


def main():
    db = SessionLocal()
    try:
        visit = PMVisit(
            visit_date=datetime.utcnow(),
            recipient_name="علی رضایی",
            recipient_unit="بخش اورژانس",
            performed_by="تیم IT",
            work_type="pm",
        )
        db.add(visit)
        db.commit()

        xlsx_buf = export_xlsx(db, "pm_visits")
        assert xlsx_buf.getvalue()[:2] == b"PK"
        print("OK: Excel", len(xlsx_buf.getvalue()), "bytes")
    finally:
        db.close()


if __name__ == "__main__":
    main()
