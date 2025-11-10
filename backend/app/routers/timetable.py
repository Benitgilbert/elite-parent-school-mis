from __future__ import annotations

from typing import Annotated, Optional
import json

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from .. import models
from ..db import get_db
from ..auth import require_roles, get_current_user

router = APIRouter(prefix="/timetable", tags=["timetable"]) 

Guard = Depends(require_roles("Headmaster", "Dean", "Director of Studies", "IT Support"))
StudentGuard = Depends(require_roles("Student"))


# Config
@router.get("/config")
def get_config(
    _: Annotated[models.User, Guard],
    db: Session = Depends(get_db),
    term: str = Query(...),
):
    cfg = db.query(models.TimetableConfig).filter(models.TimetableConfig.term == term).first()
    if not cfg:
        return None
    return {
        "term": cfg.term,
        "start_time": cfg.start_time,
        "period_minutes": cfg.period_minutes,
        "days": json.loads(cfg.days_json or "[]"),
        "blocks": json.loads(cfg.blocks_json or "[]"),
    }


@router.put("/config")
def upsert_config(
    payload: dict,
    _: Annotated[models.User, Guard],
    db: Session = Depends(get_db),
):
    term = (payload.get("term") or "").strip()
    if not term:
        raise HTTPException(status_code=400, detail="term is required")
    days = payload.get("days") or ["Mon","Tue","Wed","Thu","Fri"]
    blocks = payload.get("blocks") or []
    start_time = (payload.get("start_time") or "08:30").strip()
    period_minutes = int(payload.get("period_minutes") or 40)

    cfg = db.query(models.TimetableConfig).filter(models.TimetableConfig.term == term).first()
    if not cfg:
        cfg = models.TimetableConfig(term=term, start_time=start_time, period_minutes=period_minutes, days_json=json.dumps(days), blocks_json=json.dumps(blocks))
    else:
        cfg.start_time = start_time
        cfg.period_minutes = period_minutes
        cfg.days_json = json.dumps(days)
        cfg.blocks_json = json.dumps(blocks)
    db.add(cfg)
    db.commit()
    return {"ok": True}


# Allocations CRUD
@router.get("/allocations")
def list_allocations(
    _: Annotated[models.User, Guard],
    db: Session = Depends(get_db),
    term: str = Query(...),
    class_name: Optional[str] = Query(None),
):
    q = db.query(models.SubjectAllocation).filter(models.SubjectAllocation.term == term)
    if class_name:
        q = q.filter(models.SubjectAllocation.class_name == class_name)
    rows = q.order_by(models.SubjectAllocation.class_name.asc(), models.SubjectAllocation.subject.asc()).all()
    return [
        {"id": r.id, "term": r.term, "class_name": r.class_name, "subject": r.subject, "required_per_week": r.required_per_week, "teacher_id": r.teacher_id}
        for r in rows
    ]


@router.post("/allocations", status_code=201)
def create_allocation(
    payload: dict,
    _: Annotated[models.User, Guard],
    db: Session = Depends(get_db),
):
    try:
        term = str(payload["term"]).strip()
        class_name = str(payload["class_name"]).strip()
        subject = str(payload["subject"]).strip()
        required_per_week = int(payload["required_per_week"])  # may be 0+
    except Exception:
        raise HTTPException(status_code=400, detail="term, class_name, subject, required_per_week are required")
    teacher_id = payload.get("teacher_id")

    a = models.SubjectAllocation(term=term, class_name=class_name, subject=subject, required_per_week=required_per_week, teacher_id=teacher_id)
    db.add(a)
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(status_code=400, detail="duplicate allocation")
    db.refresh(a)
    return {"id": a.id}


@router.put("/allocations/{allocation_id}")
def update_allocation(
    allocation_id: int,
    payload: dict,
    _: Annotated[models.User, Guard],
    db: Session = Depends(get_db),
):
    a = db.query(models.SubjectAllocation).filter(models.SubjectAllocation.id == allocation_id).first()
    if not a:
        raise HTTPException(status_code=404, detail="not found")
    for key in ["term", "class_name", "subject"]:
        if key in payload and payload[key]:
            setattr(a, key, str(payload[key]).strip())
    if payload.get("required_per_week") is not None:
        a.required_per_week = int(payload.get("required_per_week"))
    if "teacher_id" in payload:
        a.teacher_id = payload.get("teacher_id")
    db.add(a)
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(status_code=400, detail="duplicate allocation")
    return {"ok": True}


@router.delete("/allocations/{allocation_id}", status_code=204)
def delete_allocation(
    allocation_id: int,
    _: Annotated[models.User, Guard],
    db: Session = Depends(get_db),
):
    a = db.query(models.SubjectAllocation).filter(models.SubjectAllocation.id == allocation_id).first()
    if not a:
        return
    db.delete(a)
    db.commit()


# Slots CRUD
@router.get("/slots")
def list_slots(
    _: Annotated[models.User, Guard],
    db: Session = Depends(get_db),
    term: str = Query(...),
    class_name: Optional[str] = Query(None),
):
    q = db.query(models.TimetableSlot).filter(models.TimetableSlot.term == term)
    if class_name:
        q = q.filter(models.TimetableSlot.class_name == class_name)
    rows = q.order_by(models.TimetableSlot.day_of_week.asc(), models.TimetableSlot.period_index.asc()).all()
    return [
        {"id": r.id, "term": r.term, "day_of_week": r.day_of_week, "period_index": r.period_index, "class_name": r.class_name, "subject": r.subject, "room": r.room, "teacher_id": r.teacher_id}
        for r in rows
    ]


@router.post("/slots", status_code=201)
def create_slot(
    payload: dict,
    _: Annotated[models.User, Guard],
    db: Session = Depends(get_db),
):
    try:
        term = str(payload["term"]).strip()
        day_of_week = str(payload["day_of_week"]).strip()
        period_index = int(payload["period_index"])  # 1..N
        class_name = str(payload["class_name"]).strip()
        subject = str(payload["subject"]).strip()
    except Exception:
        raise HTTPException(status_code=400, detail="term, day_of_week, period_index, class_name, subject are required")
    room = payload.get("room")
    teacher_id = payload.get("teacher_id")

    slot = models.TimetableSlot(term=term, day_of_week=day_of_week, period_index=period_index, class_name=class_name, subject=subject, room=room, teacher_id=teacher_id)
    db.add(slot)
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(status_code=400, detail="duplicate slot or constraint error")
    db.refresh(slot)
    return {"id": slot.id}


@router.put("/slots/{slot_id}")
def update_slot(
    slot_id: int,
    payload: dict,
    _: Annotated[models.User, Guard],
    db: Session = Depends(get_db),
):
    s = db.query(models.TimetableSlot).filter(models.TimetableSlot.id == slot_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="not found")
    for key in ["term", "day_of_week", "class_name", "subject", "room"]:
        if key in payload and payload[key] is not None:
            setattr(s, key, payload[key])
    if payload.get("period_index") is not None:
        s.period_index = int(payload.get("period_index"))
    if "teacher_id" in payload:
        s.teacher_id = payload.get("teacher_id")
    db.add(s)
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(status_code=400, detail="duplicate slot or constraint error")
    return {"ok": True}


@router.delete("/slots/{slot_id}", status_code=204)
def delete_slot(
    slot_id: int,
    _: Annotated[models.User, Guard],
    db: Session = Depends(get_db),
):
    s = db.query(models.TimetableSlot).filter(models.TimetableSlot.id == slot_id).first()
    if not s:
        return
    db.delete(s)
    db.commit()


# Conflicts
@router.get("/conflicts")
def conflicts(
    _: Annotated[models.User, Guard],
    db: Session = Depends(get_db),
    term: str = Query(...),
):
    rows = db.query(models.TimetableSlot).filter(models.TimetableSlot.term == term).all()
    teacher_map: dict[tuple[str,int,int], list[models.TimetableSlot]] = {}
    class_map: dict[tuple[str,int,int], list[models.TimetableSlot]] = {}
    room_map: dict[tuple[str,int,int], list[models.TimetableSlot]] = {}

    for r in rows:
        key_c = (r.day_of_week, r.period_index, hash(r.class_name))
        class_map.setdefault(key_c, []).append(r)
        if r.teacher_id:
            key_t = (r.day_of_week, r.period_index, int(r.teacher_id))
            teacher_map.setdefault(key_t, []).append(r)
        if r.room:
            key_r = (r.day_of_week, r.period_index, hash(r.room))
            room_map.setdefault(key_r, []).append(r)

    conflicts = []
    for _, lst in class_map.items():
        if len(lst) > 1:
            conflicts.append({
                "type": "class_double_book",
                "day": lst[0].day_of_week,
                "period_index": lst[0].period_index,
                "class_name": lst[0].class_name,
                "slots": [s.id for s in lst],
            })
    for _, lst in teacher_map.items():
        if len(lst) > 1:
            conflicts.append({
                "type": "teacher_double_book",
                "day": lst[0].day_of_week,
                "period_index": lst[0].period_index,
                "teacher_id": lst[0].teacher_id,
                "slots": [s.id for s in lst],
            })
    for _, lst in room_map.items():
        if len(lst) > 1:
            conflicts.append({
                "type": "room_double_book",
                "day": lst[0].day_of_week,
                "period_index": lst[0].period_index,
                "room": lst[0].room,
                "slots": [s.id for s in lst],
            })

    # Allocation deficits/excess
    # For each allocation, count assigned per week and compare to required_per_week
    allocs = db.query(models.SubjectAllocation).filter(models.SubjectAllocation.term == term).all()
    for a in allocs:
        count_assigned = db.query(models.TimetableSlot).filter(
            models.TimetableSlot.term == term,
            models.TimetableSlot.class_name == a.class_name,
            models.TimetableSlot.subject == a.subject,
        ).count()
        if count_assigned < a.required_per_week:
            conflicts.append({
                "type": "allocation_deficit",
                "class_name": a.class_name,
                "subject": a.subject,
                "required": a.required_per_week,
                "assigned": count_assigned,
            })
        elif count_assigned > a.required_per_week:
            conflicts.append({
                "type": "allocation_excess",
                "class_name": a.class_name,
                "subject": a.subject,
                "required": a.required_per_week,
                "assigned": count_assigned,
            })

    return {"conflicts": conflicts}


def _current_student(db: Session, user: models.User) -> models.Student | None:
    link = db.query(models.UserStudentLink).filter(models.UserStudentLink.user_id == user.id).first()
    if not link:
        return None
    s = db.query(models.Student).filter(models.Student.id == link.student_id).first()
    return s


@router.get("/my")
def my_timetable(
    current_user: Annotated[models.User, Depends(get_current_user)],
    _: Annotated[models.User, StudentGuard],
    db: Session = Depends(get_db),
    term: str = Query(...),
):
    s = _current_student(db, current_user)
    if not s or not s.class_name:
        raise HTTPException(status_code=403, detail="Student link or class not configured")
    rows = (
        db.query(models.TimetableSlot)
        .filter(models.TimetableSlot.term == term, models.TimetableSlot.class_name == s.class_name)
        .order_by(models.TimetableSlot.day_of_week.asc(), models.TimetableSlot.period_index.asc())
        .all()
    )
    out = [
        {
            "day_of_week": r.day_of_week,
            "period_index": r.period_index,
            "subject": r.subject,
            "room": r.room,
        }
        for r in rows
    ]
    return {"class_name": s.class_name, "term": term, "items": out}
