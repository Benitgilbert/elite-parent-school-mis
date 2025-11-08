from __future__ import annotations

from datetime import date

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session

from .. import models, schemas
from ..db import get_db

router = APIRouter(prefix="/public/applications", tags=["public"]) 


def _parse_date(value: str | None) -> date | None:
    if not value:
        return None
    return date.fromisoformat(value)


@router.post("/", response_model=schemas.ApplicationOut, status_code=201)
def create_application(payload: schemas.ApplicationCreate, db: Session = Depends(get_db)):
    app = models.StudentApplication(
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
