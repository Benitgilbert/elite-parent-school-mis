from __future__ import annotations

from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from .. import models, schemas
from ..db import get_db
from ..auth import require_roles

router = APIRouter(prefix="/secretary/applications", tags=["secretary"]) 

Guard = Depends(require_roles("Registrar/Secretary", "Headmaster", "IT Support"))


def _parse_date(value: str | None) -> date | None:
    if not value:
        return None
    return date.fromisoformat(value)


@router.get("/", response_model=list[schemas.ApplicationOut])
def list_applications(_: models.User = Guard, db: Session = Depends(get_db), status: str | None = Query(None)):
    q = db.query(models.StudentApplication).order_by(models.StudentApplication.id.asc())
    if status:
        q = q.filter(models.StudentApplication.status == status)
    return q.all()


@router.get("/{app_id}", response_model=schemas.ApplicationOut)
def get_application(app_id: int, _: models.User = Guard, db: Session = Depends(get_db)):
    app = db.query(models.StudentApplication).filter(models.StudentApplication.id == app_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    return app


@router.post("/{app_id}/approve", response_model=schemas.StudentOut)
def approve_application(app_id: int, payload: schemas.ApplicationApprove, _: models.User = Guard, db: Session = Depends(get_db)):
    app = db.query(models.StudentApplication).filter(models.StudentApplication.id == app_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    if app.status != "pending":
        raise HTTPException(status_code=400, detail="Application already processed")
    if db.query(models.Student).filter(models.Student.admission_no == payload.admission_no).first():
        raise HTTPException(status_code=400, detail="admission_no already exists")

    student = models.Student(
        admission_no=payload.admission_no,
        first_name=app.first_name,
        last_name=app.last_name,
        date_of_birth=app.date_of_birth,
        gender=app.gender,
        class_name=payload.class_name or app.class_name,
        guardian_contact=app.guardian_contact,
    )
    db.add(student)

    app.status = "approved"
    app.processed_at = datetime.now(timezone.utc)
    app.decision_reason = None

    db.commit()
    db.refresh(student)
    return student


@router.post("/{app_id}/reject", response_model=schemas.ApplicationOut)
def reject_application(app_id: int, payload: schemas.ApplicationReject, _: models.User = Guard, db: Session = Depends(get_db)):
    app = db.query(models.StudentApplication).filter(models.StudentApplication.id == app_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    if app.status != "pending":
        raise HTTPException(status_code=400, detail="Application already processed")

    app.status = "rejected"
    app.processed_at = datetime.now(timezone.utc)
    app.decision_reason = payload.reason
    db.add(app)
    db.commit()
    db.refresh(app)
    return app
