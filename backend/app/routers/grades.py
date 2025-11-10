from __future__ import annotations

from typing import Annotated, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from .. import models
from ..db import get_db
from ..auth import require_roles, get_current_user

router = APIRouter(prefix="/grades", tags=["grades"]) 

StudentGuard = Depends(require_roles("Student"))


def _current_student_id(db: Session, user: models.User) -> int | None:
    link = db.query(models.UserStudentLink).filter(models.UserStudentLink.user_id == user.id).first()
    return link.student_id if link else None


@router.get("/my")
def my_grades(
    current_user: Annotated[models.User, Depends(get_current_user)],
    _: Annotated[models.User, StudentGuard],
    db: Session = Depends(get_db),
    term: Optional[str] = Query(None),
    subject: Optional[str] = Query(None),
):
    sid = _current_student_id(db, current_user)
    if not sid:
        raise HTTPException(status_code=403, detail="Student link not configured")
    # join ExamResult with Assessment to enrich
    q = db.query(models.ExamResult, models.Assessment).join(
        models.Assessment, models.ExamResult.assessment_id == models.Assessment.id
    ).filter(models.ExamResult.student_id == sid)
    if term:
        q = q.filter(models.Assessment.term == term)
    if subject:
        q = q.filter(models.Assessment.subject == subject)
    rows = q.order_by(models.Assessment.date.asc().nullsfirst(), models.Assessment.id.asc()).all()
    items = []
    for r, a in rows:
        items.append({
            "assessment_id": r.assessment_id,
            "name": a.name,
            "term": a.term,
            "class_name": a.class_name,
            "subject": a.subject,
            "weight": a.weight,
            "date": (a.date.isoformat() if a.date else None),
            "score": r.score,
        })
    return {"items": items}


@router.get("/my/progress")
def my_progress(
    current_user: Annotated[models.User, Depends(get_current_user)],
    _: Annotated[models.User, StudentGuard],
    db: Session = Depends(get_db),
    subject: Optional[str] = Query(None),
):
    sid = _current_student_id(db, current_user)
    if not sid:
        raise HTTPException(status_code=403, detail="Student link not configured")
    # Load all results joined to assessments, optionally filter by subject
    q = db.query(models.ExamResult, models.Assessment).join(
        models.Assessment, models.ExamResult.assessment_id == models.Assessment.id
    ).filter(models.ExamResult.student_id == sid)
    if subject:
        q = q.filter(models.Assessment.subject == subject)
    rows = q.all()
    # Aggregate by term
    agg: dict[str, list[float]] = {}
    for r, a in rows:
        term = a.term or ""
        agg.setdefault(term, []).append(r.score)
    series = [
        {"term": term, "average": (sum(scores) / len(scores) if scores else 0.0)}
        for term, scores in sorted(agg.items())
    ]
    return {"series": series}
