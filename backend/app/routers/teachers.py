from __future__ import annotations

from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from .. import models
from ..db import get_db
from ..auth import require_roles

router = APIRouter(prefix="/teachers", tags=["teachers"]) 

Guard = Depends(require_roles("Headmaster", "Director", "Dean", "Director of Studies", "Registrar/Secretary", "IT Support"))


# Teachers CRUD
@router.get("/")
def list_teachers(
    _: Annotated[models.User, Guard],
    db: Session = Depends(get_db),
    q: Optional[str] = Query(None, description="Search by name or email"),
):
    query = db.query(models.Teacher)
    if q:
        like = f"%{q}%"
        query = query.filter((models.Teacher.full_name.ilike(like)) | (models.Teacher.email.ilike(like)))
    rows = query.order_by(models.Teacher.full_name.asc()).all()
    return [
        {"id": t.id, "full_name": t.full_name, "email": t.email, "phone": t.phone}
        for t in rows
    ]


@router.post("/", status_code=201)
def create_teacher(
    payload: dict,
    _: Annotated[models.User, Guard],
    db: Session = Depends(get_db),
):
    name = (payload.get("full_name") or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="full_name is required")
    t = models.Teacher(full_name=name, email=payload.get("email"), phone=payload.get("phone"))
    db.add(t)
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(status_code=400, detail="duplicate email")
    db.refresh(t)
    return {"id": t.id, "full_name": t.full_name, "email": t.email, "phone": t.phone}


@router.put("/{teacher_id}")
def update_teacher(
    teacher_id: int,
    payload: dict,
    _: Annotated[models.User, Guard],
    db: Session = Depends(get_db),
):
    t = db.query(models.Teacher).filter(models.Teacher.id == teacher_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="teacher not found")
    if payload.get("full_name") is not None:
        t.full_name = (payload.get("full_name") or "").strip()
    if payload.get("email") is not None:
        t.email = payload.get("email")
    if payload.get("phone") is not None:
        t.phone = payload.get("phone")
    db.add(t)
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(status_code=400, detail="duplicate email")
    db.refresh(t)
    return {"id": t.id, "full_name": t.full_name, "email": t.email, "phone": t.phone}


@router.delete("/{teacher_id}", status_code=204)
def delete_teacher(
    teacher_id: int,
    _: Annotated[models.User, Guard],
    db: Session = Depends(get_db),
):
    t = db.query(models.Teacher).filter(models.Teacher.id == teacher_id).first()
    if not t:
        return
    # Delete assignments for teacher
    db.query(models.TeacherAssignment).filter(models.TeacherAssignment.teacher_id == teacher_id).delete()
    db.delete(t)
    db.commit()


# Assignments
@router.get("/{teacher_id}/assignments")
def list_assignments(
    teacher_id: int,
    _: Annotated[models.User, Guard],
    db: Session = Depends(get_db),
):
    t = db.query(models.Teacher).filter(models.Teacher.id == teacher_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="teacher not found")
    rows = (
        db.query(models.TeacherAssignment)
        .filter(models.TeacherAssignment.teacher_id == teacher_id)
        .order_by(models.TeacherAssignment.class_name.asc(), models.TeacherAssignment.subject.asc())
        .all()
    )
    return [{"id": a.id, "teacher_id": a.teacher_id, "class_name": a.class_name, "subject": a.subject} for a in rows]


@router.post("/assignments", status_code=201)
def create_assignment(
    payload: dict,
    _: Annotated[models.User, Guard],
    db: Session = Depends(get_db),
):
    try:
        teacher_id = int(payload.get("teacher_id"))
    except Exception:
        raise HTTPException(status_code=400, detail="teacher_id is required")
    class_name = (payload.get("class_name") or "").strip()
    subject = (payload.get("subject") or "").strip()
    if not class_name or not subject:
        raise HTTPException(status_code=400, detail="class_name and subject are required")

    # Ensure teacher exists
    if not db.query(models.Teacher).filter(models.Teacher.id == teacher_id).first():
        raise HTTPException(status_code=404, detail="teacher not found")

    a = models.TeacherAssignment(teacher_id=teacher_id, class_name=class_name, subject=subject)
    db.add(a)
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(status_code=400, detail="duplicate assignment")
    db.refresh(a)
    return {"id": a.id, "teacher_id": a.teacher_id, "class_name": a.class_name, "subject": a.subject}


@router.delete("/assignments/{assignment_id}", status_code=204)
def delete_assignment(
    assignment_id: int,
    _: Annotated[models.User, Guard],
    db: Session = Depends(get_db),
):
    a = db.query(models.TeacherAssignment).filter(models.TeacherAssignment.id == assignment_id).first()
    if not a:
        return
    db.delete(a)
    db.commit()


# Teacher accounts (users with Teacher role)
@router.get("/accounts")
def list_teacher_accounts(
    _: Annotated[models.User, Guard],
    db: Session = Depends(get_db),
):
    # Fetch users who have the 'Teacher' role
    users = (
        db.query(models.User)
        .join(models.User.roles)
        .filter(models.Role.name == "Teacher")
        .order_by(models.User.full_name.asc(), models.User.email.asc())
        .all()
    )
    # Map to existing Teacher rows by email
    teacher_by_email = {t.email: t for t in db.query(models.Teacher).all()}
    out = []
    for u in users:
        t = teacher_by_email.get(u.email)
        out.append({
            "user_id": u.id,
            "email": u.email,
            "full_name": u.full_name,
            "teacher_id": (t.id if t else None),
            "phone": getattr(t, "phone", None),
        })
    return out


@router.post("/from-user", status_code=201)
def create_teacher_from_user(
    payload: dict,
    _: Annotated[models.User, Guard],
    db: Session = Depends(get_db),
):
    try:
        user_id = int(payload.get("user_id"))
    except Exception:
        raise HTTPException(status_code=400, detail="user_id is required")
    u = db.query(models.User).filter(models.User.id == user_id).first()
    if not u:
        raise HTTPException(status_code=404, detail="user not found")
    # If Teacher row exists by email, return it
    existing = db.query(models.Teacher).filter(models.Teacher.email == u.email).first()
    if existing:
        return {"id": existing.id, "full_name": existing.full_name, "email": existing.email, "phone": existing.phone}
    # Create Teacher from user
    t = models.Teacher(full_name=u.full_name or u.email, email=u.email, phone=None)
    db.add(t)
    db.commit()
    db.refresh(t)
    return {"id": t.id, "full_name": t.full_name, "email": t.email, "phone": t.phone}
