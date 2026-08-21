from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models import User
from app.schemas import ReportRequest
from app.services.reports import export_xlsx

router = APIRouter(prefix="/reports", tags=["گزارش‌ها"])


@router.post("/export")
def export_report(
    req: ReportRequest,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    filters = {
        "department_id": req.department_id,
        "date_from": req.date_from,
        "date_to": req.date_to,
    }
    buf = export_xlsx(db, req.report_type, **filters)
    filename = f"report_{req.report_type}.xlsx"
    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
