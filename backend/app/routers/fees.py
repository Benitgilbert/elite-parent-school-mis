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
    from datetime import date
    for inv in invoices:
        pays = db.query(models.FeePayment).filter(models.FeePayment.invoice_id == inv.id).order_by(models.FeePayment.date.asc()).all()
        days_overdue = (date.today() - inv.due_date).days if inv.due_date and inv.status in ["unpaid", "partial"] else 0
        total_due = inv.balance + inv.late_fee
        
        out.append({
            "id": inv.id,
            "term": inv.term,
            "amount": inv.amount,
            "balance": inv.balance,
            "status": inv.status,
            "due_date": inv.due_date.isoformat() if inv.due_date else None,
            "description": inv.description,
            "late_fee": inv.late_fee,
            "total_due": total_due,
            "days_overdue": days_overdue,
            "is_overdue": days_overdue > 0 and inv.status in ["unpaid", "partial"],
            "created_at": inv.created_at.isoformat(),
            "payments": [
                {
                    "id": p.id,
                    "amount": p.amount,
                    "date": p.date.isoformat(),
                    "method": p.method,
                    "reference": p.reference,
                    "status": p.status,
                    "notes": p.notes,
                } for p in pays
            ]
        })
    
    # Calculate summary statistics
    total_invoiced = sum(inv.amount for inv in invoices)
    total_paid = sum(inv.amount - inv.balance for inv in invoices)
    total_balance = sum(inv.balance + inv.late_fee for inv in invoices)
    overdue_invoices = [inv for inv in invoices if (date.today() - (inv.due_date or date.today())).days > 0 and inv.status in ["unpaid", "partial"]]
    
    return {
        "invoices": out,
        "summary": {
            "total_invoiced": total_invoiced,
            "total_paid": total_paid,
            "total_balance": total_balance,
            "total_invoices": len(invoices),
            "overdue_invoices": len(overdue_invoices),
            "paid_invoices": len([inv for inv in invoices if inv.status == "paid"]),
            "partial_invoices": len([inv for inv in invoices if inv.status == "partial"])
        }
    }
