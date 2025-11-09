from __future__ import annotations

from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models
from ..db import get_db
from ..auth import require_roles

router = APIRouter(prefix="/settings/academics", tags=["settings-academics"]) 

# Allow Secretary access again so their pages continue to work
Guard = Depends(require_roles(
    "Dean",
    "Director of Studies",
    "Registrar/Secretary",
    "Secretary",
    "Headmaster",
    "IT Support",
))


def _parse_date(v: str | None) -> date | None:
    if not v:
        return None
    try:
        return date.fromisoformat(v)
    except Exception:
        raise HTTPException(status_code=400, detail="invalid date format; expected YYYY-MM-DD")


# Terms
@router.get("/terms")
def list_terms(_: Annotated[models.User, Guard], db: Session = Depends(get_db)):
    rows = db.query(models.Term).order_by(models.Term.id.asc()).all()
    return [{"id": r.id, "name": r.name, "start_date": r.start_date.isoformat() if r.start_date else None, "end_date": r.end_date.isoformat() if r.end_date else None} for r in rows]


@router.post("/terms", status_code=201)
def create_term(payload: dict, _: Annotated[models.User, Guard], db: Session = Depends(get_db)):
    name = (payload.get("name") or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="name is required")
    t = models.Term(name=name, start_date=_parse_date(payload.get("start_date")), end_date=_parse_date(payload.get("end_date")))
    db.add(t)
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(status_code=400, detail="duplicate term")
    db.refresh(t)
    return {"id": t.id, "name": t.name, "start_date": t.start_date.isoformat() if t.start_date else None, "end_date": t.end_date.isoformat() if t.end_date else None}


@router.put("/terms/{term_id}")
def update_term(term_id: int, payload: dict, _: Annotated[models.User, Guard], db: Session = Depends(get_db)):
    t = db.query(models.Term).filter(models.Term.id == term_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="term not found")
    if payload.get("name") is not None:
        t.name = (payload.get("name") or "").strip()
    if "start_date" in payload:
        t.start_date = _parse_date(payload.get("start_date"))
    if "end_date" in payload:
        t.end_date = _parse_date(payload.get("end_date"))
    db.add(t)
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(status_code=400, detail="duplicate term")
    db.refresh(t)
    return {"id": t.id, "name": t.name, "start_date": t.start_date.isoformat() if t.start_date else None, "end_date": t.end_date.isoformat() if t.end_date else None}


@router.delete("/terms/{term_id}", status_code=204)
def delete_term(term_id: int, _: Annotated[models.User, Guard], db: Session = Depends(get_db)):
    t = db.query(models.Term).filter(models.Term.id == term_id).first()
    if not t:
        return
    db.delete(t)
    db.commit()


# Classes
@router.get("/classes")
def list_classes(_: Annotated[models.User, Guard], db: Session = Depends(get_db)):
    rows = db.query(models.ClassRoom).order_by(models.ClassRoom.name.asc()).all()
    return [{"id": r.id, "name": r.name, "capacity": r.capacity} for r in rows]


@router.post("/classes", status_code=201)
def create_class(payload: dict, _: Annotated[models.User, Guard], db: Session = Depends(get_db)):
    name = (payload.get("name") or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="name is required")
    c = models.ClassRoom(name=name, capacity=int(payload.get("capacity") or 0) or None)
    db.add(c)
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(status_code=400, detail="duplicate class")
    db.refresh(c)
    return {"id": c.id, "name": c.name, "capacity": c.capacity}


@router.put("/classes/{class_id}")
def update_class(class_id: int, payload: dict, _: Annotated[models.User, Guard], db: Session = Depends(get_db)):
    c = db.query(models.ClassRoom).filter(models.ClassRoom.id == class_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="class not found")
    if payload.get("name") is not None:
        c.name = (payload.get("name") or "").strip()
    if payload.get("capacity") is not None:
        try:
            c.capacity = int(payload.get("capacity"))
        except Exception:
            c.capacity = None
    db.add(c)
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(status_code=400, detail="duplicate class")
    db.refresh(c)
    return {"id": c.id, "name": c.name, "capacity": c.capacity}


@router.delete("/classes/{class_id}", status_code=204)
def delete_class(class_id: int, _: Annotated[models.User, Guard], db: Session = Depends(get_db)):
    c = db.query(models.ClassRoom).filter(models.ClassRoom.id == class_id).first()
    if not c:
        return
    db.delete(c)
    db.commit()


# Grading Scales
@router.get("/grading-scales")
def list_scales(_: Annotated[models.User, Guard], db: Session = Depends(get_db)):
    rows = db.query(models.GradingScale).order_by(models.GradingScale.name.asc()).all()
    return [{"id": r.id, "name": r.name, "items_json": r.items_json} for r in rows]


@router.post("/grading-scales", status_code=201)
def create_scale(payload: dict, _: Annotated[models.User, Guard], db: Session = Depends(get_db)):
    name = (payload.get("name") or "").strip()
    items_json = payload.get("items_json") or "[]"
    if not name:
        raise HTTPException(status_code=400, detail="name is required")
    gs = models.GradingScale(name=name, items_json=items_json)
    db.add(gs)
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(status_code=400, detail="duplicate grading scale")
    db.refresh(gs)
    return {"id": gs.id, "name": gs.name, "items_json": gs.items_json}


@router.put("/grading-scales/{scale_id}")
def update_scale(scale_id: int, payload: dict, _: Annotated[models.User, Guard], db: Session = Depends(get_db)):
    gs = db.query(models.GradingScale).filter(models.GradingScale.id == scale_id).first()
    if not gs:
        raise HTTPException(status_code=404, detail="grading scale not found")
    if payload.get("name") is not None:
        gs.name = (payload.get("name") or "").strip()
    if payload.get("items_json") is not None:
        gs.items_json = payload.get("items_json") or "[]"
    db.add(gs)
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(status_code=400, detail="duplicate grading scale")
    db.refresh(gs)
    return {"id": gs.id, "name": gs.name, "items_json": gs.items_json}


@router.delete("/grading-scales/{scale_id}", status_code=204)
def delete_scale(scale_id: int, _: Annotated[models.User, Guard], db: Session = Depends(get_db)):
    gs = db.query(models.GradingScale).filter(models.GradingScale.id == scale_id).first()
    if not gs:
        return
    db.delete(gs)
    db.commit()
