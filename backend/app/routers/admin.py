from __future__ import annotations

from typing import Iterable

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from .. import schemas, models
from ..db import get_db
from ..auth import require_roles
from ..security import hash_password

router = APIRouter(prefix="/admin", tags=["admin"]) 

AdminGuard = Depends(require_roles("IT Support", "Headmaster"))


def _roles_by_name(db: Session, names: Iterable[str]) -> list[models.Role]:
    if not names:
        return []
    return list(db.query(models.Role).filter(models.Role.name.in_(list(names))).all())


@router.get("/roles", response_model=list[schemas.RoleOut])
def list_roles(_: models.User = AdminGuard, db: Session = Depends(get_db)):
    return db.query(models.Role).order_by(models.Role.name.asc()).all()


@router.get("/users", response_model=list[schemas.UserOut])
def list_users(_: models.User = AdminGuard, db: Session = Depends(get_db)):
    users = db.query(models.User).order_by(models.User.id.asc()).all()
    out: list[schemas.UserOut] = []
    for u in users:
        out.append(
            schemas.UserOut(
                id=u.id,
                email=u.email,
                full_name=u.full_name,
                is_active=u.is_active,
                roles=[r.name for r in (u.roles or [])],
            )
        )
    return out


@router.post("/users", response_model=schemas.UserOut, status_code=201)
def create_user(payload: schemas.UserCreate, _: models.User = AdminGuard, db: Session = Depends(get_db)):
    if db.query(models.User).filter(models.User.email == payload.email).first():
        raise HTTPException(status_code=400, detail="Email already exists")
    user = models.User(
        email=payload.email,
        full_name=payload.full_name,
        hashed_password=hash_password(payload.password),
        is_active=True,
    )
    user.roles = _roles_by_name(db, payload.role_names)
    db.add(user)
    db.commit()
    db.refresh(user)
    return schemas.UserOut(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        is_active=user.is_active,
        roles=[r.name for r in (user.roles or [])],
    )


@router.patch("/users/{user_id}", response_model=schemas.UserOut)
def update_user(user_id: int, payload: schemas.UserUpdate, _: models.User = AdminGuard, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if payload.full_name is not None:
        user.full_name = payload.full_name
    if payload.is_active is not None:
        user.is_active = payload.is_active
    if payload.password:
        user.hashed_password = hash_password(payload.password)
    if payload.role_names is not None:
        user.roles = _roles_by_name(db, payload.role_names)

    db.add(user)
    db.commit()
    db.refresh(user)
    return schemas.UserOut(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        is_active=user.is_active,
        roles=[r.name for r in (user.roles or [])],
    )


@router.delete("/users/{user_id}", status_code=204)
def delete_user(user_id: int, _: models.User = AdminGuard, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        return
    db.delete(user)
    db.commit()
