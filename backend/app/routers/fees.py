from __future__ import annotations

from typing import Annotated, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from .. import models
from ..db import get_db
from ..auth import require_roles, get_current_user

router = APIRouter(prefix="/fees", tags=["fees"]) 

StudentGuard = Depends(require_roles("Student"))


def _current_student_id(db: Session, user: models.User) -> int | None:
    link = db.query(models.UserStudentLink).filter(models.UserStudentLink.user_id == user.id).first()
    return link.student_id if link else None


@router.get("/my")
def my_fees(
    current_user: Annotated[models.User, Depends(get_current_user)],
    _: Annotated[models.User, StudentGuard],
    db: Session = Depends(get_db),
    term: Optional[str] = Query(None),
):
    sid = _current_student_id(db, current_user)
    if not sid:
        raise HTTPException(status_code=403, detail="Student link not configured")
    q = db.query(models.FeeInvoice).filter(models.FeeInvoice.student_id == sid)
    if term:
        q = q.filter(models.FeeInvoice.term == term)
    invoices = q.order_by(models.FeeInvoice.created_at.desc()).all()
    # load payments per invoice
    out = []
    for inv in invoices:
        pays = db.query(models.FeePayment).filter(models.FeePayment.invoice_id == inv.id).order_by(models.FeePayment.date.asc()).all()
        out.append({
            "id": inv.id,
            "term": inv.term,
            "amount": inv.amount,
            "balance": inv.balance,
            "status": inv.status,
            "created_at": inv.created_at.isoformat(),
            "payments": [
                {
                    "id": p.id,
                    "amount": p.amount,
                    "date": p.date.isoformat(),
                    "method": p.method,
                    "reference": p.reference,
                } for p in pays
            ]
        })
    return {"invoices": out}
