from __future__ import annotations

from datetime import date
from typing import Annotated, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_

from .. import models
from ..db import get_db
from ..auth import require_roles

router = APIRouter(prefix="/attendance", tags=["attendance"]) 

Guard = Depends(require_roles("Teacher", "Headmaster", "Registrar/Secretary", "Secretary", "IT Support"))


def _parse_date(value: str | None) -> date:
    if not value:
        raise HTTPException(status_code=400, detail="date is required")
    try:
        return date.fromisoformat(value)
    except Exception:
        raise HTTPException(status_code=400, detail="invalid date format; expected YYYY-MM-DD")


@router.get("/")
def get_attendance(
    _: Annotated[models.User, Guard],
    db: Session = Depends(get_db),
    class_name: Optional[str] = Query(None),
    date_str: Optional[str] = Query(None, alias="date"),
):
    d = _parse_date(date_str)
    # Get students, optionally filter by class
    q = db.query(models.Student)
    if class_name:
        q = q.filter(models.Student.class_name == class_name)
    students = q.order_by(models.Student.id.asc()).all()

    # Get existing marks for that date
    marks = db.query(models.Attendance).filter(models.Attendance.date == d).all()
    mark_map = {m.student_id: m for m in marks}

    out = []
    for s in students:
        m = mark_map.get(s.id)
        out.append(
            {
                "student_id": s.id,
                "admission_no": s.admission_no,
                "full_name": f"{s.first_name} {s.last_name}",
                "class_name": s.class_name,
                "status": (m.status if m else None),
                "remarks": (m.remarks if m else None),
            }
        )
    return {"date": d.isoformat(), "items": out}


# Also handle '/attendance' (no trailing slash) to avoid a 307 redirect
@router.get("")
def get_attendance_no_slash(
    _: Annotated[models.User, Guard],
    db: Session = Depends(get_db),
    class_name: Optional[str] = Query(None),
    date: Optional[str] = Query(None),
):
    # delegate to main handler; parameter aliasing: 'date' routes to 'date_str'
    return get_attendance(_, db, class_name, date)


class MarkItem(BaseException):
    student_id: int
    status: str
    remarks: Optional[str]


@router.post("/mark")
def mark_attendance(
    payload: dict,
    _: Annotated[models.User, Guard],
    db: Session = Depends(get_db),
):
    # Expect payload: { date: YYYY-MM-DD, items: [{student_id, status, remarks?}] }
    if not isinstance(payload, dict):
        raise HTTPException(status_code=400, detail="invalid payload")
    d = _parse_date(payload.get("date"))
    items = payload.get("items") or []
    if not isinstance(items, list):
        raise HTTPException(status_code=400, detail="items must be a list")

    allowed = {"PRESENT", "LATE", "ABSENT"}
    for it in items:
        sid = it.get("student_id")
        status = (it.get("status") or "").upper()
        remarks = it.get("remarks")
        if not sid or status not in allowed:
            raise HTTPException(status_code=400, detail="invalid mark item")
        # upsert: try existing
        m = (
            db.query(models.Attendance)
            .filter(and_(models.Attendance.student_id == sid, models.Attendance.date == d))
            .first()
        )
        if m:
            m.status = status
            m.remarks = remarks
            db.add(m)
        else:
            db.add(models.Attendance(student_id=sid, date=d, status=status, remarks=remarks))
    db.commit()
    return {"ok": True, "count": len(items)}
