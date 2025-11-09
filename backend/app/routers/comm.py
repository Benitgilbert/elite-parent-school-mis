from __future__ import annotations

from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models
from ..db import get_db
from ..auth import require_roles
from ..mailer import send_email_advanced

router = APIRouter(prefix="/comm", tags=["comm"]) 

Guard = Depends(require_roles("Registrar/Secretary", "Headmaster", "IT Support"))


@router.get("/templates")
def list_templates(_: Annotated[models.User, Guard], db: Session = Depends(get_db)):
    rows = db.query(models.CommTemplate).order_by(models.CommTemplate.key.asc()).all()
    return [
        {
            "id": r.id,
            "key": r.key,
            "description": r.description,
            "subject": r.subject,
            "text_body": r.text_body,
            "html_body": r.html_body,
        }
        for r in rows
    ]


@router.post("/templates", status_code=201)
def create_template(payload: dict, _: Annotated[models.User, Guard], db: Session = Depends(get_db)):
    key = (payload.get("key") or "").strip()
    subject = (payload.get("subject") or "").strip()
    if not key or not subject:
        raise HTTPException(status_code=400, detail="key and subject are required")
    t = models.CommTemplate(
        key=key,
        description=payload.get("description"),
        subject=subject,
        text_body=payload.get("text_body"),
        html_body=payload.get("html_body"),
    )
    db.add(t)
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(status_code=400, detail="duplicate key")
    db.refresh(t)
    return {
        "id": t.id,
        "key": t.key,
        "description": t.description,
        "subject": t.subject,
        "text_body": t.text_body,
        "html_body": t.html_body,
    }


@router.put("/templates/{template_id}")
def update_template(template_id: int, payload: dict, _: Annotated[models.User, Guard], db: Session = Depends(get_db)):
    t = db.query(models.CommTemplate).filter(models.CommTemplate.id == template_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="template not found")
    if payload.get("key") is not None:
        t.key = (payload["key"] or "").strip()
    if payload.get("description") is not None:
        t.description = payload.get("description")
    if payload.get("subject") is not None:
        t.subject = (payload.get("subject") or "").strip()
    if payload.get("text_body") is not None:
        t.text_body = payload.get("text_body")
    if payload.get("html_body") is not None:
        t.html_body = payload.get("html_body")
    db.add(t)
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(status_code=400, detail="duplicate key")
    db.refresh(t)
    return {
        "id": t.id,
        "key": t.key,
        "description": t.description,
        "subject": t.subject,
        "text_body": t.text_body,
        "html_body": t.html_body,
    }


@router.delete("/templates/{template_id}", status_code=204)
def delete_template(template_id: int, _: Annotated[models.User, Guard], db: Session = Depends(get_db)):
    t = db.query(models.CommTemplate).filter(models.CommTemplate.id == template_id).first()
    if not t:
        return
    db.delete(t)
    db.commit()


@router.post("/send")
def send_message(payload: dict, _: Annotated[models.User, Guard], db: Session = Depends(get_db)):
    to = payload.get("to")
    if not to:
        raise HTTPException(status_code=400, detail="to is required")
    key = payload.get("key")
    subject = payload.get("subject")
    text_body = payload.get("text_body")
    html_body = payload.get("html_body")
    params = payload.get("params") or {}

    if key:
        t = db.query(models.CommTemplate).filter(models.CommTemplate.key == key).first()
        if not t:
            raise HTTPException(status_code=404, detail="template not found")
        subject = subject or t.subject
        text_body = text_body or t.text_body
        html_body = html_body or t.html_body

    if not subject:
        raise HTTPException(status_code=400, detail="subject is required")

    # Simple parameter replacement using str.format_map
    def render(s: Optional[str]) -> Optional[str]:
        if not s:
            return s
        try:
            return s.format_map({k: str(v) for k, v in params.items()})
        except Exception:
            return s

    subject_r = render(subject) or ""
    text_r = render(text_body)
    html_r = render(html_body)

    send_email_advanced(
        to=to,
        subject=subject_r,
        text_body=text_r or subject_r,
        html_body=html_r,
        attachments=[],
    )
    return {"ok": True}
