from __future__ import annotations

from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from .. import models, schemas
from ..db import get_db
from ..auth import require_roles
from ..mailer import send_email, send_email_advanced
from .. import settings
from ..pdf import render_application_receipt
import os

router = APIRouter(prefix="/secretary/applications", tags=["secretary"]) 

Guard = Depends(require_roles("Registrar/Secretary", "Secretary", "Headmaster", "Director", "IT Support"))


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


# Also handle '/secretary/applications' (no trailing slash) to avoid a 307 redirect
@router.get("", response_model=list[schemas.ApplicationOut])
def list_applications_no_slash(_: models.User = Guard, db: Session = Depends(get_db), status: str | None = Query(None)):
    return list_applications(_, db, status)


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

    # notify applicant
    if app.email:
        # Ensure uploads dir
        os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
        # Try to generate receipt PDF (optional)
        pdf_bytes = None
        try:
            pdf_bytes = render_application_receipt(app, student)
        except Exception:
            pdf_bytes = None

        receipt_name = f"receipt_{app.reference}.pdf"
        receipt_path = os.path.join(settings.UPLOAD_DIR, receipt_name)
        if pdf_bytes:
            try:
                with open(receipt_path, "wb") as f:
                    f.write(pdf_bytes)
            except Exception:
                pass

        attach_html = "<p>Attached is your admission receipt (PDF).</p>" if pdf_bytes else ""
        html = (
            f"<p>Dear {app.first_name} {app.last_name},</p>"
            f"<p>Your application (ref: <b>{app.reference}</b>) has been <b>approved</b>.</p>"
            f"<p>Admission number: <b>{student.admission_no}</b><br/>Class: <b>{student.class_name or ''}</b></p>"
            f"{attach_html}"
            f"<p>Regards,<br/>Registrar</p>"
        )
        text = (
            f"Dear {app.first_name} {app.last_name},\n\n"
            f"Your application (ref: {app.reference}) has been approved.\n"
            f"Admission number: {student.admission_no}. Class: {student.class_name or ''}.\n\n"
            f"Regards, Registrar"
        )
        if pdf_bytes:
            send_email_advanced(
                to=app.email,
                subject="Application Approved",
                text_body=text,
                html_body=html,
                attachments=[(receipt_name, pdf_bytes, "application/pdf")],
            )
        else:
            # Send without attachment
            send_email_advanced(
                to=app.email,
                subject="Application Approved",
                text_body=text,
                html_body=html,
                attachments=[],
            )

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

    # notify applicant
    if app.email:
        html = (
            f"<p>Dear {app.first_name} {app.last_name},</p>"
            f"<p>Your application (ref: <b>{app.reference}</b>) has been <b>rejected</b>.</p>"
            f"<p>Reason: {payload.reason}</p>"
            f"<p>Regards,<br/>Registrar</p>"
        )
        text = (
            f"Dear {app.first_name} {app.last_name},\n\n"
            f"Your application (ref: {app.reference}) has been rejected. Reason: {payload.reason}.\n\n"
            f"Regards, Registrar"
        )
        send_email_advanced(
            to=app.email,
            subject="Application Rejected",
            text_body=text,
            html_body=html,
            attachments=[],
        )

    return app
