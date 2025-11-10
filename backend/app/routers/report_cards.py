from __future__ import annotations

from typing import Annotated, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.orm import Session

from .. import models
from ..db import get_db
from ..auth import require_roles, get_current_user

router = APIRouter(prefix="/report-cards", tags=["report-cards"]) 

Guard = Depends(require_roles("Teacher", "Headmaster", "Director", "Dean", "Director of Studies", "Registrar/Secretary", "IT Support", "Student"))


def _results_for_term(db: Session, term: Optional[str]):
    q = db.query(models.Assessment)
    if term:
        q = q.filter(models.Assessment.term == term)
    assessments = q.all()
    if not assessments:
        return [], []
    asses_ids = [a.id for a in assessments]
    res = db.query(models.ExamResult).filter(models.ExamResult.assessment_id.in_(asses_ids)).all()
    return assessments, res


def _students_by_class(db: Session, class_name: Optional[str]):
    if not class_name:
        return None
    rows = db.query(models.Student).filter(models.Student.class_name == class_name).all()
    return set(s.id for s in rows)


@router.get("/class")
def class_report_cards_csv(
    _: Annotated[models.User, Guard],
    db: Session = Depends(get_db),
    term: Optional[str] = Query(None),
    class_name: Optional[str] = Query(None),
):
    assessments, results = _results_for_term(db, term)
    if not assessments:
        return Response(content="student_id,assessment_id,subject,score\n", media_type="text/csv")

    student_filter = _students_by_class(db, class_name)

    # Build CSV rows: student_id, assessment_id, subject, score
    lines = ["student_id,assessment_id,subject,score"]
    subj_map = {a.id: (a.subject or "") for a in assessments}
    for r in results:
        if student_filter is not None and r.student_id not in student_filter:
            continue
        score = "" if r.score is None else str(r.score)
        lines.append(f"{r.student_id},{r.assessment_id},{subj_map.get(r.assessment_id,'')},{score}")
    csv = "\n".join(lines)
    filename = f"class-report-cards-{term or 'all'}-{class_name or 'all'}.csv"
    return Response(content=csv, media_type="text/csv", headers={"Content-Disposition": f"attachment; filename={filename}"})


def _current_student_id(db: Session, user: models.User) -> int | None:
    link = db.query(models.UserStudentLink).filter(models.UserStudentLink.user_id == user.id).first()
    return link.student_id if link else None


@router.get("/student")
def student_report_card_csv(
    current_user: Annotated[models.User, Depends(get_current_user)],
    _: Annotated[models.User, Guard],
    db: Session = Depends(get_db),
    student_id: int = Query(...),
    term: Optional[str] = Query(None),
):
    roles = {r.name for r in (current_user.roles or [])}
    if "Student" in roles:
        my_sid = _current_student_id(db, current_user)
        if not my_sid:
            raise HTTPException(status_code=403, detail="Student link not configured")
        # Force to own student_id regardless of provided value
        student_id = my_sid
    assessments, results = _results_for_term(db, term)
    if not assessments:
        return Response(content="assessment_id,subject,score\n", media_type="text/csv")
    by_student = [r for r in results if r.student_id == student_id]
    subj_map = {a.id: (a.subject or "") for a in assessments}
    lines = ["assessment_id,subject,score"]
    for r in by_student:
        score = "" if r.score is None else str(r.score)
        lines.append(f"{r.assessment_id},{subj_map.get(r.assessment_id,'')},{score}")
    csv = "\n".join(lines)
    filename = f"student-report-card-{student_id}-{term or 'all'}.csv"
    return Response(content=csv, media_type="text/csv", headers={"Content-Disposition": f"attachment; filename={filename}"})


@router.get("/my")
def my_report_card_csv(
    current_user: Annotated[models.User, Depends(get_current_user)],
    _: Annotated[models.User, Guard],
    db: Session = Depends(get_db),
    term: Optional[str] = Query(None),
):
    roles = {r.name for r in (current_user.roles or [])}
    if "Student" not in roles:
        raise HTTPException(status_code=403, detail="Only students can use /report-cards/my")
    sid = _current_student_id(db, current_user)
    if not sid:
        raise HTTPException(status_code=403, detail="Student link not configured")
    # Delegate to student-specific logic
    return student_report_card_csv(current_user, current_user, db, sid, term)
