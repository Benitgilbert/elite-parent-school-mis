from __future__ import annotations

from typing import Annotated, Optional
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from .. import models
from ..db import get_db
from ..auth import require_roles

router = APIRouter(prefix="/discipline", tags=["discipline"]) 

# Roles
ROLE_DIRECTOR = "Director of Discipline"
ROLE_PATRON = "Patron"
ROLE_MATRON = "Matron"
ROLE_DEAN = "Dean"
ROLE_DOS = "Director of Studies"

Guard = Depends(require_roles(ROLE_DIRECTOR, ROLE_PATRON, ROLE_MATRON, ROLE_DEAN, ROLE_DOS, "Headmaster", "IT Support"))


def _can_write(user: models.User) -> bool:
    role_names = {getattr(r, "name", str(r)) for r in (user.roles or [])}
    return any(name in role_names for name in [ROLE_DIRECTOR, ROLE_PATRON, ROLE_MATRON, "Headmaster", "IT Support"])  # Dean/DOS read-only


def _enforce_gender_scope(db: Session, user: models.User, student_id: int):
    """If user is Patron, only allow Male students; if Matron, only Female."""
    role_names = {getattr(r, "name", str(r)) for r in (user.roles or [])}
    if ROLE_PATRON in role_names or ROLE_MATRON in role_names:
        s = db.query(models.Student).filter(models.Student.id == student_id).first()
        if not s:
            raise HTTPException(status_code=404, detail="student not found")
        g = (s.gender or "").strip().lower()
        if ROLE_PATRON in role_names and g not in ("male", "m"):
            raise HTTPException(status_code=403, detail="Patron may only manage Male students")
        if ROLE_MATRON in role_names and g not in ("female", "f"):
            raise HTTPException(status_code=403, detail="Matron may only manage Female students")


@router.get("/cases")
def list_cases(
    me: Annotated[models.User, Guard],
    db: Session = Depends(get_db),
    student_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    gender: Optional[str] = Query(None, description="Filter by student gender"),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=1000),
):
    q = db.query(models.DisciplinaryCase)
    if gender:
        # join to students to filter by gender
        q = (
            db.query(models.DisciplinaryCase)
            .join(models.Student, models.Student.id == models.DisciplinaryCase.student_id)
            .filter(models.Student.gender == gender)
        )
    if student_id is not None:
        q = q.filter(models.DisciplinaryCase.student_id == student_id)
    if status:
        q = q.filter(models.DisciplinaryCase.status == status)
    if severity:
        q = q.filter(models.DisciplinaryCase.severity == severity)
    if start_date:
        try:
            sd = datetime.fromisoformat(start_date)
            q = q.filter(models.DisciplinaryCase.date >= sd)
        except Exception:
            raise HTTPException(status_code=400, detail="invalid start_date")
    if end_date:
        try:
            ed = datetime.fromisoformat(end_date)
            q = q.filter(models.DisciplinaryCase.date <= ed)
        except Exception:
            raise HTTPException(status_code=400, detail="invalid end_date")
    rows = q.order_by(models.DisciplinaryCase.date.desc()).limit(limit).all()
    return [
        {
            "id": r.id,
            "student_id": r.student_id,
            "date": r.date.isoformat(),
            "category": r.category,
            "severity": r.severity,
            "status": r.status,
            "description": r.description,
            "actions_taken": r.actions_taken,
        }
        for r in rows
    ]


@router.post("/cases", status_code=201)
def create_case(
    payload: dict,
    me: Annotated[models.User, Guard],
    db: Session = Depends(get_db),
):
    if not _can_write(me):
        raise HTTPException(status_code=403, detail="insufficient permissions")
    try:
        student_id = int(payload.get("student_id"))
    except Exception:
        raise HTTPException(status_code=400, detail="student_id is required")
    _enforce_gender_scope(db, me, student_id)
    category = (payload.get("category") or "").strip()
    severity = (payload.get("severity") or "").strip() or "Minor"
    status = (payload.get("status") or "").strip() or "open"
    description = payload.get("description")
    actions = payload.get("actions_taken")
    date_s = payload.get("date")
    dt = None
    if date_s:
        try:
            dt = datetime.fromisoformat(date_s)
        except Exception:
            raise HTTPException(status_code=400, detail="invalid date")
    case = models.DisciplinaryCase(
        student_id=student_id,
        category=category or "General",
        severity=severity,
        status=status,
        description=description,
        actions_taken=actions,
        date=dt or datetime.utcnow(),
        created_by=me.id,
    )
    db.add(case)
    db.commit()
    db.refresh(case)
    return {"id": case.id}


@router.put("/cases/{case_id}")
def update_case(
    case_id: int,
    payload: dict,
    me: Annotated[models.User, Guard],
    db: Session = Depends(get_db),
):
    if not _can_write(me):
        raise HTTPException(status_code=403, detail="insufficient permissions")
    case = db.query(models.DisciplinaryCase).filter(models.DisciplinaryCase.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="not found")
    # enforce gender scope on existing case student
    _enforce_gender_scope(db, me, case.student_id)
    for key in ["category", "severity", "status", "description", "actions_taken"]:
        if key in payload:
            setattr(case, key, payload.get(key))
    if payload.get("date"):
        try:
            case.date = datetime.fromisoformat(payload.get("date"))
        except Exception:
            raise HTTPException(status_code=400, detail="invalid date")
    db.add(case)
    db.commit()
    db.refresh(case)
    return {"ok": True}


@router.delete("/cases/{case_id}", status_code=204)
def delete_case(
    case_id: int,
    me: Annotated[models.User, Guard],
    db: Session = Depends(get_db),
):
    if not _can_write(me):
        raise HTTPException(status_code=403, detail="insufficient permissions")
    case = db.query(models.DisciplinaryCase).filter(models.DisciplinaryCase.id == case_id).first()
    if not case:
        return
    db.delete(case)
    db.commit()


@router.get("/summary")
def summary(
    _: Annotated[models.User, Guard],
    db: Session = Depends(get_db),
    student_id: int = Query(...),
):
    rows = (
        db.query(models.DisciplinaryCase)
        .filter(models.DisciplinaryCase.student_id == student_id)
        .order_by(models.DisciplinaryCase.date.desc())
        .limit(5)
        .all()
    )
    total = db.query(models.DisciplinaryCase).filter(models.DisciplinaryCase.student_id == student_id).count()
    open_cases = db.query(models.DisciplinaryCase).filter(models.DisciplinaryCase.student_id == student_id, models.DisciplinaryCase.status == "open").count()
    return {
        "student_id": student_id,
        "recent": [
            {
                "id": r.id,
                "date": r.date.isoformat(),
                "category": r.category,
                "severity": r.severity,
                "status": r.status,
            }
            for r in rows
        ],
        "totals": {"all": total, "open": open_cases},
    }


@router.get("/report")
def full_report(
    _: Annotated[models.User, Guard],
    db: Session = Depends(get_db),
    student_id: int = Query(...),
):
    rows = (
        db.query(models.DisciplinaryCase)
        .filter(models.DisciplinaryCase.student_id == student_id)
        .order_by(models.DisciplinaryCase.date.desc())
        .all()
    )
    return [
        {
            "id": r.id,
            "date": r.date.isoformat(),
            "category": r.category,
            "severity": r.severity,
            "status": r.status,
            "description": r.description,
            "actions_taken": r.actions_taken,
        }
        for r in rows
    ]


@router.get("/report/export")
def full_report_export(
    _: Annotated[models.User, Guard],
    db: Session = Depends(get_db),
    student_id: int = Query(...),
):
    rows = (
        db.query(models.DisciplinaryCase)
        .filter(models.DisciplinaryCase.student_id == student_id)
        .order_by(models.DisciplinaryCase.date.desc())
        .all()
    )
    from fastapi import Response
    out = ["date,category,severity,status,description,actions_taken"]
    for r in rows:
        desc = (r.description or "").replace(",", ";")
        act = (r.actions_taken or "").replace(",", ";")
        out.append(f"{r.date.isoformat()},{r.category},{r.severity},{r.status},{desc},{act}")
    csv = "\n".join(out)
    return Response(content=csv, media_type="text/csv", headers={"Content-Disposition": f"attachment; filename=discipline_{student_id}.csv"})
