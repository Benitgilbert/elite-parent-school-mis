from __future__ import annotations

from typing import Annotated, Optional
from fastapi import APIRouter, Depends, HTTPException, Response, Query
from sqlalchemy.orm import Session

from .. import models
from ..db import get_db
from ..auth import require_roles

router = APIRouter(prefix="/analytics", tags=["analytics"]) 

Guard = Depends(require_roles("Teacher", "Headmaster", "Director", "Dean", "Director of Studies", "Registrar/Secretary", "IT Support"))


def _class_report(db: Session, term: Optional[str], class_name: Optional[str]):
    # Collect assessments by filters
    q = db.query(models.Assessment)
    if term:
        q = q.filter(models.Assessment.term == term)
    if class_name:
        q = q.filter(models.Assessment.class_name == class_name)
    assessments = q.all()

    # Aggregate by subject and overall
    overall_scores: list[float] = []
    subject_scores: dict[str, list[float]] = {}
    count_students = 0

    for a in assessments:
        rows = (
            db.query(models.ExamResult)
            .filter(models.ExamResult.assessment_id == a.id)
            .all()
        )
        # Approx class size by number of rows if we have class filter
        if class_name and rows:
            count_students = max(count_students, len(rows))
        for r in rows:
            if r.score is None:
                continue
            overall_scores.append(float(r.score))
            key = a.subject or "(none)"
            subject_scores.setdefault(key, []).append(float(r.score))

    def _avg(vals: list[float]) -> float:
        return round(sum(vals) / len(vals), 1) if vals else 0.0

    overall_avg = _avg(overall_scores)
    pass_rate = round((sum(1 for v in overall_scores if v >= 50) / len(overall_scores)) * 100, 1) if overall_scores else 0.0

    subjects = [
        {
            "subject": s,
            "average": _avg(vals),
            "count": len(vals),
            "pass_rate": round((sum(1 for v in vals if v >= 50) / len(vals)) * 100, 1) if vals else 0.0,
        }
        for s, vals in sorted(subject_scores.items())
    ]

    return {
        "term": term,
        "class_name": class_name,
        "overall_average": overall_avg,
        "overall_pass_rate": pass_rate,
        "approx_class_size": count_students or None,
        "subjects": subjects,
    }


@router.get("/class-report")
def class_report(
    _: Annotated[models.User, Guard],
    db: Session = Depends(get_db),
    term: Optional[str] = Query(None),
    class_name: Optional[str] = Query(None),
):
    return _class_report(db, term, class_name)


@router.get("/class-report/export")
def class_report_export(
    _: Annotated[models.User, Guard],
    db: Session = Depends(get_db),
    term: Optional[str] = Query(None),
    class_name: Optional[str] = Query(None),
    format: str = Query("csv"),
):
    data = _class_report(db, term, class_name)
    if format.lower() == "csv":
        # Flatten to CSV: overall row + subject rows
        lines: list[str] = []
        lines.append("type,term,class_name,metric,value")
        lines.append(
            f"overall,{data['term'] or ''},{data['class_name'] or ''},overall_average,{data['overall_average']}"
        )
        lines.append(
            f"overall,{data['term'] or ''},{data['class_name'] or ''},overall_pass_rate,{data['overall_pass_rate']}"
        )
        for s in data["subjects"]:
            lines.append(
                f"subject,{data['term'] or ''},{data['class_name'] or ''},{s['subject']}_average,{s['average']}"
            )
            lines.append(
                f"subject,{data['term'] or ''},{data['class_name'] or ''},{s['subject']}_pass_rate,{s['pass_rate']}"
            )
            lines.append(
                f"subject,{data['term'] or ''},{data['class_name'] or ''},{s['subject']}_count,{s['count']}"
            )
        csv = "\n".join(lines)
        return Response(content=csv, media_type="text/csv")
    raise HTTPException(status_code=400, detail="unsupported format")
