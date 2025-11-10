from __future__ import annotations

from datetime import date

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session

from .. import models, schemas
from ..db import get_db
from ..settings import settings
import os
import secrets
import string
from fastapi import UploadFile, File, Form

router = APIRouter(prefix="/public/applications", tags=["public"]) 


def _parse_date(value: str | None) -> date | None:
    if not value:
        return None
    return date.fromisoformat(value)


@router.post("/", response_model=schemas.ApplicationOut, status_code=201)
def create_application(payload: schemas.ApplicationCreate, db: Session = Depends(get_db)):
    # ensure upload directory exists
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    # generate reference
    alphabet = string.ascii_uppercase + string.digits
    reference = "".join(secrets.choice(alphabet) for _ in range(10))

    app = models.StudentApplication(
        reference=reference,
        first_name=payload.first_name,
        last_name=payload.last_name,
        date_of_birth=_parse_date(payload.date_of_birth),
        gender=payload.gender,
        class_name=payload.class_name,
        guardian_contact=payload.guardian_contact,
        email=payload.email,
    )
    db.add(app)
    db.commit()
    db.refresh(app)
    return app


@router.post("/upload", response_model=schemas.ApplicationOut, status_code=201)
async def create_application_with_upload(
    first_name: str = Form(...),
    last_name: str = Form(...),
    date_of_birth: str | None = Form(None),
    gender: str | None = Form(None),
    class_name: str | None = Form(None),
    guardian_contact: str | None = Form(None),
    email: str | None = Form(None),
    birth_certificate: UploadFile | None = File(None),
    passport_photo: UploadFile | None = File(None),
    db: Session = Depends(get_db),
):
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    alphabet = string.ascii_uppercase + string.digits
    reference = "".join(secrets.choice(alphabet) for _ in range(10))

    bc_path = None
    pp_path = None

    async def _save(file: UploadFile | None, prefix: str) -> str | None:
        if not file:
            return None
        name = f"{prefix}_{reference}_{file.filename}"
        path = os.path.join(settings.UPLOAD_DIR, name)
        with open(path, "wb") as out:
            while True:
                chunk = await file.read(1024 * 1024)
                if not chunk:
                    break
                out.write(chunk)
        return path

    bc_path = await _save(birth_certificate, "birth")
    pp_path = await _save(passport_photo, "photo")

    app = models.StudentApplication(
        reference=reference,
        first_name=first_name,
        last_name=last_name,
        date_of_birth=_parse_date(date_of_birth),
        gender=gender,
        class_name=class_name,
        guardian_contact=guardian_contact,
        email=email,
        birth_certificate_path=bc_path,
        passport_photo_path=pp_path,
    )
    db.add(app)
    db.commit()
    db.refresh(app)
    return app


@router.get("/status/{reference}", response_model=schemas.ApplicationOut)
def public_application_status(reference: str, db: Session = Depends(get_db)):
    app = db.query(models.StudentApplication).filter(models.StudentApplication.reference == reference).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    return app
