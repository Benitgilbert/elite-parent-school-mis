from __future__ import annotations

from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from .. import models, schemas
from ..db import get_db
from ..auth import require_roles, get_current_user

router = APIRouter(prefix="/students", tags=["students"]) 

# Allow both legacy and short role names for Secretary
StaffGuard = Depends(require_roles("Teacher", "Headmaster", "Registrar/Secretary", "Secretary", "IT Support"))


def _parse_date(value: str | None) -> date | None:
    if not value:
        return None
    return date.fromisoformat(value)


@router.get("/", response_model=list[schemas.StudentOut])
def list_students(
    _: Annotated[models.User, StaffGuard],
    db: Session = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
):
    q = db.query(models.Student).order_by(models.Student.id.asc()).offset(skip).limit(limit)
    return q.all()


# Also handle '/students' (no trailing slash) to avoid a 307 redirect
@router.get("", response_model=list[schemas.StudentOut])
def list_students_no_slash(
    _: Annotated[models.User, StaffGuard],
    db: Session = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
):
    return list_students(_, db, skip, limit)


@router.post("/", response_model=schemas.StudentOut, status_code=201)
def create_student(
    payload: schemas.StudentCreate,
    _: Annotated[models.User, StaffGuard],
    db: Session = Depends(get_db),
):
    if db.query(models.Student).filter(models.Student.admission_no == payload.admission_no).first():
        raise HTTPException(status_code=400, detail="admission_no already exists")
    s = models.Student(
        admission_no=payload.admission_no,
        first_name=payload.first_name,
        last_name=payload.last_name,
        date_of_birth=_parse_date(payload.date_of_birth),
        gender=payload.gender,
        class_name=payload.class_name,
        guardian_contact=payload.guardian_contact,
    )
    db.add(s)
    db.commit()
    db.refresh(s)
    return s


@router.get("/{student_id}", response_model=schemas.StudentOut)
def get_student(student_id: int, _: Annotated[models.User, StaffGuard], db: Session = Depends(get_db)):
    s = db.query(models.Student).filter(models.Student.id == student_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Student not found")
    return s


@router.patch("/{student_id}", response_model=schemas.StudentOut)
def update_student(
    student_id: int,
    payload: schemas.StudentUpdate,
    _: Annotated[models.User, StaffGuard],
    db: Session = Depends(get_db),
):
    s = db.query(models.Student).filter(models.Student.id == student_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Student not found")

    if payload.first_name is not None:
        s.first_name = payload.first_name
    if payload.last_name is not None:
        s.last_name = payload.last_name
    if payload.date_of_birth is not None:
        s.date_of_birth = _parse_date(payload.date_of_birth)
    if payload.gender is not None:
        s.gender = payload.gender
    if payload.class_name is not None:
        s.class_name = payload.class_name
    if payload.guardian_contact is not None:
        s.guardian_contact = payload.guardian_contact

    db.add(s)
    db.commit()
    db.refresh(s)
    return s


@router.delete("/{student_id}", status_code=204)
def delete_student(student_id: int, _: Annotated[models.User, StaffGuard], db: Session = Depends(get_db)):
    s = db.query(models.Student).filter(models.Student.id == student_id).first()
    if not s:
        return
    db.delete(s)
    db.commit()
