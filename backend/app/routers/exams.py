from __future__ import annotations

from datetime import date
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_

from .. import models
from ..db import get_db
from ..auth import require_roles

router = APIRouter(prefix="/exams", tags=["exams"]) 

Guard = Depends(require_roles("Teacher", "Headmaster", "Director", "Dean", "Director of Studies", "Registrar/Secretary", "IT Support"))


def _parse_date(value: str | None) -> date | None:
    if not value:
        return None
    try:
        return date.fromisoformat(value)
    except Exception:
        raise HTTPException(status_code=400, detail="invalid date format; expected YYYY-MM-DD")


@router.get("/assessments")
def list_assessments(
    user: Annotated[models.User, Guard],
    db: Session = Depends(get_db),
    term: Optional[str] = Query(None),
    class_name: Optional[str] = Query(None),
    subject: Optional[str] = Query(None),
):
    q = db.query(models.Assessment)
    if term:
        q = q.filter(models.Assessment.term == term)
    if class_name:
        q = q.filter(models.Assessment.class_name == class_name)
    if subject:
        q = q.filter(models.Assessment.subject == subject)

    # If Teacher, limit to their assignments (class_name+subject)
    if any(r.name == "Teacher" or r == "Teacher" for r in getattr(user, "roles", []) or []):
        # Map teacher by email to Teacher entity
        t = db.query(models.Teacher).filter(models.Teacher.email == user.email).first()
        if t:
            assigns = db.query(models.TeacherAssignment).filter(models.TeacherAssignment.teacher_id == t.id).all()
            if assigns:
                allowed = {(a.class_name, a.subject) for a in assigns}
                # Reduce query by filtering OR of allowed pairs
                cond = None
                for cls, sub in allowed:
                    c = (models.Assessment.class_name == cls) & (models.Assessment.subject == sub)
                    cond = c if cond is None else (cond | c)
                if cond is not None:
                    q = q.filter(cond)
                else:
                    q = q.filter(models.Assessment.id == -1)
        else:
            # No Teacher record mapped to user; return empty
            q = q.filter(models.Assessment.id == -1)

    q = q.order_by(models.Assessment.id.asc())
    return [
        {
            "id": a.id,
            "name": a.name,
            "term": a.term,
            "class_name": a.class_name,
            "subject": a.subject,
            "weight": a.weight,
            "date": a.date.isoformat() if a.date else None,
        }
        for a in q.all()
    ]


@router.post("/assessments", status_code=201)
def create_assessment(
    payload: dict,
    _: Annotated[models.User, Guard],
    db: Session = Depends(get_db),
):
    name = (payload.get("name") or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="name is required")
    a = models.Assessment(
        name=name,
        term=payload.get("term"),
        class_name=payload.get("class_name"),
        subject=payload.get("subject"),
        weight=float(payload.get("weight") or 1.0),
        date=_parse_date(payload.get("date")),
    )
    db.add(a)
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(status_code=400, detail="duplicate assessment")
    db.refresh(a)
    return {
        "id": a.id,
        "name": a.name,
        "term": a.term,
        "class_name": a.class_name,
        "subject": a.subject,
        "weight": a.weight,
        "date": a.date.isoformat() if a.date else None,
    }


@router.delete("/assessments/{assessment_id}", status_code=204)
def delete_assessment(
    assessment_id: int,
    _: Annotated[models.User, Guard],
    db: Session = Depends(get_db),
):
    a = db.query(models.Assessment).filter(models.Assessment.id == assessment_id).first()
    if not a:
        return
    # Also delete results for this assessment
    db.query(models.ExamResult).filter(models.ExamResult.assessment_id == assessment_id).delete()
    db.delete(a)
    db.commit()


@router.get("/results")
def list_results(
    assessment_id: int,
    user: Annotated[models.User, Guard],
    db: Session = Depends(get_db),
):
    a = db.query(models.Assessment).filter(models.Assessment.id == assessment_id).first()
    if not a:
        raise HTTPException(status_code=404, detail="assessment not found")

    # If Teacher, ensure assessment is in their assignments
    if any(r.name == "Teacher" or r == "Teacher" for r in getattr(user, "roles", []) or []):
        t = db.query(models.Teacher).filter(models.Teacher.email == user.email).first()
        if not t:
            raise HTTPException(status_code=403, detail="not assigned")
        ok = (
            db.query(models.TeacherAssignment)
            .filter(
                (models.TeacherAssignment.teacher_id == t.id)
                & (models.TeacherAssignment.class_name == (a.class_name or ""))
                & (models.TeacherAssignment.subject == (a.subject or ""))
            )
            .first()
        )
        if not ok:
            raise HTTPException(status_code=403, detail="not assigned")

    # join to students in same class if provided, else all students
    q = db.query(models.Student)
    if a.class_name:
        q = q.filter(models.Student.class_name == a.class_name)
    students = q.order_by(models.Student.id.asc()).all()

    results = db.query(models.ExamResult).filter(models.ExamResult.assessment_id == assessment_id).all()
    rmap = {r.student_id: r for r in results}

    out = []
    for s in students:
        r = rmap.get(s.id)
        out.append({
            "student_id": s.id,
            "admission_no": s.admission_no,
            "full_name": f"{s.first_name} {s.last_name}",
            "score": (r.score if r else None),
        })
    return {"assessment": {
        "id": a.id,
        "name": a.name,
        "term": a.term,
        "class_name": a.class_name,
        "subject": a.subject,
        "weight": a.weight,
        "date": a.date.isoformat() if a.date else None,
    }, "items": out}


@router.post("/results", status_code=200)
def upsert_results(
    payload: dict,
    _: Annotated[models.User, Guard],
    db: Session = Depends(get_db),
):
    # payload: { assessment_id, items: [{student_id, score}] }
    try:
        aid = int(payload.get("assessment_id"))
    except Exception:
        raise HTTPException(status_code=400, detail="assessment_id is required")
    items = payload.get("items") or []
    if not isinstance(items, list):
        raise HTTPException(status_code=400, detail="items must be a list")

    # Get assessment details for notifications
    assessment = db.query(models.Assessment).filter(models.Assessment.id == aid).first()
    assessment_name = assessment.name if assessment else "Assessment"

    for it in items:
        sid = it.get("student_id")
        score = it.get("score")
        if sid is None or score is None:
            raise HTTPException(status_code=400, detail="invalid item")
        existing = (
            db.query(models.ExamResult)
            .filter(and_(models.ExamResult.assessment_id == aid, models.ExamResult.student_id == sid))
            .first()
        )
        if existing:
            existing.score = float(score)
            db.add(existing)
        else:
            db.add(models.ExamResult(assessment_id=aid, student_id=sid, score=float(score)))
    
    db.commit()
    
    # Send notifications to parents for grade updates
    try:
        from notification_service import NotificationService
        notification_service = NotificationService(db)
        
        for it in items:
            sid = it.get("student_id")
            score = it.get("score")
            if sid and score is not None:
                notification_service.notify_grade_updated(sid, assessment_name, float(score))
    except Exception as e:
        # Log error but don't fail the request
        import logging
        logging.error(f"Failed to send grade update notifications: {str(e)}")
    
    return {"ok": True, "count": len(items)}
