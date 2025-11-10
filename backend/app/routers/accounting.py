from __future__ import annotations

from datetime import date
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from .. import models
from ..db import get_db
from ..auth import require_roles, get_current_user

router = APIRouter(prefix="/accounting", tags=["accounting"]) 

Guard = Depends(require_roles("Accountant", "Headmaster", "IT Support"))


# Fees admin
@router.get("/fees/invoices")
def list_invoices(
    _: Annotated[models.User, Guard],
    db: Session = Depends(get_db),
    term: Optional[str] = Query(None),
    student_id: Optional[int] = Query(None),
):
    q = db.query(models.FeeInvoice)
    if term:
        q = q.filter(models.FeeInvoice.term == term)
    if student_id:
        q = q.filter(models.FeeInvoice.student_id == student_id)
    rows = q.order_by(models.FeeInvoice.created_at.desc()).all()
    out = []
    for inv in rows:
        pays = db.query(models.FeePayment).filter(models.FeePayment.invoice_id == inv.id).order_by(models.FeePayment.date.asc()).all()
        out.append({
            "id": inv.id,
            "student_id": inv.student_id,
            "term": inv.term,
            "amount": inv.amount,
            "balance": inv.balance,
            "status": inv.status,
            "created_at": inv.created_at.isoformat(),
            "payments": [
                {"id": p.id, "amount": p.amount, "date": p.date.isoformat(), "method": p.method, "reference": p.reference}
                for p in pays
            ]
        })
    return {"invoices": out}


def _ensure_can_write(current_user: models.User):
    roles = {r.name for r in (current_user.roles or [])}
    if "Accountant" in roles:
        return
    # Headmaster and others are read-only here
    raise HTTPException(status_code=403, detail="Read-only role")


@router.post("/fees/invoices", status_code=201)
def create_invoice(
    payload: dict,
    current_user: Annotated[models.User, Depends(get_current_user)],
    _: Annotated[models.User, Guard],
    db: Session = Depends(get_db),
):
    _ensure_can_write(current_user)
    try:
        student_id = int(payload["student_id"])  # type: ignore
        term = str(payload["term"])  # type: ignore
        amount = float(payload["amount"])  # type: ignore
    except Exception:
        raise HTTPException(status_code=400, detail="student_id, term, amount required")
    inv = models.FeeInvoice(student_id=student_id, term=term, amount=amount, balance=amount, status="unpaid")
    db.add(inv)
    db.commit()
    db.refresh(inv)
    return {"id": inv.id}


@router.post("/fees/payments", status_code=201)
def create_payment(
    payload: dict,
    current_user: Annotated[models.User, Depends(get_current_user)],
    _: Annotated[models.User, Guard],
    db: Session = Depends(get_db),
):
    _ensure_can_write(current_user)
    try:
        invoice_id = int(payload["invoice_id"])  # type: ignore
        amount = float(payload["amount"])  # type: ignore
        method = payload.get("method")
        reference = payload.get("reference")
    except Exception:
        raise HTTPException(status_code=400, detail="invoice_id, amount required")
    inv = db.query(models.FeeInvoice).filter(models.FeeInvoice.id == invoice_id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="invoice not found")
    pay = models.FeePayment(invoice_id=invoice_id, amount=amount, method=method, reference=reference)
    db.add(pay)
    # update balance/status
    inv.balance = max(0.0, float(inv.balance) - amount)
    inv.status = "paid" if inv.balance <= 0 else ("partial" if inv.balance < inv.amount else "unpaid")
    db.add(inv)
    db.commit()
    db.refresh(pay)
    return {"id": pay.id}


# Expenses
@router.get("/expenses")
def list_expenses(
    _: Annotated[models.User, Guard],
    db: Session = Depends(get_db),
    category: Optional[str] = Query(None),
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
):
    q = db.query(models.Expense)
    if category:
        q = q.filter(models.Expense.category == category)
    if from_date:
        q = q.filter(models.Expense.date >= from_date)
    if to_date:
        q = q.filter(models.Expense.date <= to_date)
    rows = q.order_by(models.Expense.date.desc()).all()
    return [{"id": r.id, "date": r.date.isoformat(), "amount": r.amount, "category": r.category, "description": r.description, "payee": r.payee} for r in rows]


@router.post("/expenses", status_code=201)
def create_expense(
    payload: dict,
    current_user: Annotated[models.User, Depends(get_current_user)],
    _: Annotated[models.User, Guard],
    db: Session = Depends(get_db),
):
    _ensure_can_write(current_user)
    try:
        d = date.fromisoformat(str(payload["date"]))  # type: ignore
        amount = float(payload["amount"])  # type: ignore
        category = str(payload["category"])  # type: ignore
    except Exception:
        raise HTTPException(status_code=400, detail="date, amount, category required")
    exp = models.Expense(date=d, amount=amount, category=category, description=payload.get("description"), payee=payload.get("payee"))
    db.add(exp)
    db.commit()
    db.refresh(exp)
    return {"id": exp.id}


# Payroll
@router.get("/payroll")
def list_payroll(
    _: Annotated[models.User, Guard],
    db: Session = Depends(get_db),
    month: Optional[str] = Query(None),
):
    q = db.query(models.Payroll)
    if month:
        q = q.filter(models.Payroll.month == month)
    rows = q.order_by(models.Payroll.month.desc(), models.Payroll.id.desc()).all()
    return [{"id": r.id, "staff_name": r.staff_name, "month": r.month, "gross": r.gross, "deductions": r.deductions, "net": r.net, "paid_date": (r.paid_date.isoformat() if r.paid_date else None), "reference": r.reference} for r in rows]


@router.post("/payroll", status_code=201)
def create_payroll(
    payload: dict,
    current_user: Annotated[models.User, Depends(get_current_user)],
    _: Annotated[models.User, Guard],
    db: Session = Depends(get_db),
):
    _ensure_can_write(current_user)
    try:
        staff_name = str(payload["staff_name"])  # type: ignore
        month = str(payload["month"])  # type: ignore
        gross = float(payload["gross"])  # type: ignore
        deductions = float(payload.get("deductions", 0.0))
        net = gross - deductions
    except Exception:
        raise HTTPException(status_code=400, detail="staff_name, month, gross required")
    rec = models.Payroll(staff_name=staff_name, month=month, gross=gross, deductions=deductions, net=net, reference=payload.get("reference"))
    db.add(rec)
    db.commit()
    db.refresh(rec)
    return {"id": rec.id}


# Reports
@router.get("/summary")
def summary(
    _: Annotated[models.User, Guard],
    db: Session = Depends(get_db),
    term: Optional[str] = Query(None),
    month: Optional[str] = Query(None),
):
    # Fees collected (sum of payments), Expenses total, Payroll total
    fees_q = db.query(models.FeePayment)
    if month:
        fees = [p.amount for p in fees_q if p.date.strftime("%Y-%m") == month]  # type: ignore
        fees_total = float(sum(fees))
    else:
        fees_total = float(sum(p.amount for p in fees_q.all()))

    exp_q = db.query(models.Expense)
    if month:
        exp_total = float(sum(r.amount for r in exp_q.filter(models.Expense.date.like(f"{month}-%")).all()))
    else:
        exp_total = float(sum(r.amount for r in exp_q.all()))

    pay_q = db.query(models.Payroll)
    if month:
        pay_total = float(sum(r.net for r in pay_q.filter(models.Payroll.month == month).all()))
    else:
        pay_total = float(sum(r.net for r in pay_q.all()))

    net = fees_total - exp_total - pay_total
    return {"fees_collected": fees_total, "expenses": exp_total, "payroll": pay_total, "net": net}


@router.get("/summary_series")
def summary_series(
    _: Annotated[models.User, Guard],
    db: Session = Depends(get_db),
    start_month: str = Query(..., description="YYYY-MM"),
    end_month: str = Query(..., description="YYYY-MM"),
):
    # naive month iteration using string compare on YYYY-MM
    def month_range(start: str, end: str):
        ys, ms = [int(x) for x in start.split("-")]; ye, me = [int(x) for x in end.split("-")]
        y, m = ys, ms
        out = []
        while (y < ye) or (y == ye and m <= me):
            out.append(f"{y:04d}-{m:02d}")
            m += 1
            if m > 12:
                m = 1; y += 1
        return out

    series = []
    months = month_range(start_month, end_month)
    for mm in months:
        fees_total = float(sum(p.amount for p in db.query(models.FeePayment).all() if p.date.strftime("%Y-%m") == mm))  # type: ignore
        exp_total = float(sum(r.amount for r in db.query(models.Expense).filter(models.Expense.date.like(f"{mm}-%")).all()))
        pay_total = float(sum(r.net for r in db.query(models.Payroll).filter(models.Payroll.month == mm).all()))
        series.append({"month": mm, "fees": fees_total, "expenses": exp_total, "payroll": pay_total, "net": fees_total - exp_total - pay_total})
    return {"series": series}


@router.get("/pl")
def profit_and_loss(
    _: Annotated[models.User, Guard],
    db: Session = Depends(get_db),
    term: Optional[str] = Query(None),
    month: Optional[str] = Query(None),
):
    # Revenue
    if month:
        revenue = float(sum(p.amount for p in db.query(models.FeePayment).all() if p.date.strftime("%Y-%m") == month))  # type: ignore
    else:
        revenue = float(sum(p.amount for p in db.query(models.FeePayment).all()))
    # Expenses
    if month:
        expenses = float(sum(r.amount for r in db.query(models.Expense).filter(models.Expense.date.like(f"{month}-%")).all()))
        payroll = float(sum(r.net for r in db.query(models.Payroll).filter(models.Payroll.month == month).all()))
    else:
        expenses = float(sum(r.amount for r in db.query(models.Expense).all()))
        payroll = float(sum(r.net for r in db.query(models.Payroll).all()))
    gross_profit = revenue
    operating_expenses = expenses + payroll
    net_profit = gross_profit - operating_expenses
    return {"revenue": revenue, "expenses": expenses, "payroll": payroll, "net_profit": net_profit}


@router.get("/balance")
def balance_sheet(
    _: Annotated[models.User, Guard],
    db: Session = Depends(get_db),
    term: Optional[str] = Query(None),
    month: Optional[str] = Query(None),
):
    # Simplified: Assets = Cash Collected + Accounts Receivable (invoice balances)
    cash = float(sum(p.amount for p in db.query(models.FeePayment).all()))
    receivables = float(sum(inv.balance for inv in db.query(models.FeeInvoice).all()))
    assets = cash + receivables
    liabilities = 0.0  # not tracked
    equity = assets - liabilities
    return {"assets": {"cash": cash, "receivables": receivables, "total": assets}, "liabilities": {"total": liabilities}, "equity": equity}


@router.get("/exports/fees.csv")
def export_fees_csv(
    _: Annotated[models.User, Guard],
    db: Session = Depends(get_db),
    month: Optional[str] = Query(None),
):
    from fastapi import Response
    rows = db.query(models.FeePayment).all()
    out = ["id,invoice_id,amount,date,method,reference"]
    for p in rows:
        if month and p.date.strftime("%Y-%m") != month:  # type: ignore
            continue
        out.append(f"{p.id},{p.invoice_id},{p.amount},{p.date.isoformat()},{p.method or ''},{p.reference or ''}")
    csv = "\n".join(out)
    return Response(content=csv, media_type="text/csv", headers={"Content-Disposition": "attachment; filename=fees.csv"})


@router.get("/exports/expenses.csv")
def export_expenses_csv(
    _: Annotated[models.User, Guard],
    db: Session = Depends(get_db),
    month: Optional[str] = Query(None),
):
    from fastapi import Response
    q = db.query(models.Expense)
    if month:
        q = q.filter(models.Expense.date.like(f"{month}-%"))
    rows = q.all()
    out = ["id,date,amount,category,payee,description"]
    for r in rows:
        out.append(f"{r.id},{r.date.isoformat()},{r.amount},{r.category},{r.payee or ''},{(r.description or '').replace(',', ';')}")
    csv = "\n".join(out)
    return Response(content=csv, media_type="text/csv", headers={"Content-Disposition": "attachment; filename=expenses.csv"})


@router.get("/exports/payroll.csv")
def export_payroll_csv(
    _: Annotated[models.User, Guard],
    db: Session = Depends(get_db),
    month: Optional[str] = Query(None),
):
    from fastapi import Response
    q = db.query(models.Payroll)
    if month:
        q = q.filter(models.Payroll.month == month)
    rows = q.all()
    out = ["id,staff_name,month,gross,deductions,net,paid_date,reference"]
    for r in rows:
        out.append(f"{r.id},{r.staff_name},{r.month},{r.gross},{r.deductions},{r.net},{r.paid_date.isoformat() if r.paid_date else ''},{r.reference or ''}")
    csv = "\n".join(out)
    return Response(content=csv, media_type="text/csv", headers={"Content-Disposition": "attachment; filename=payroll.csv"})


# Settings: categories and payment methods
@router.get("/settings/categories")
def list_categories(_: Annotated[models.User, Guard], db: Session = Depends(get_db)):
    rows = db.query(models.ExpenseCategory).order_by(models.ExpenseCategory.name.asc()).all()
    return [{"id": r.id, "name": r.name} for r in rows]


@router.post("/settings/categories", status_code=201)
def create_category(
    payload: dict,
    current_user: Annotated[models.User, Depends(get_current_user)],
    _: Annotated[models.User, Guard],
    db: Session = Depends(get_db),
):
    _ensure_can_write(current_user)
    name = (payload.get("name") or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="name required")
    c = models.ExpenseCategory(name=name)
    db.add(c)
    try:
        db.commit()
    except Exception:
        db.rollback(); raise HTTPException(status_code=400, detail="duplicate")
    db.refresh(c)
    return {"id": c.id}


@router.delete("/settings/categories/{category_id}", status_code=204)
def delete_category(
    category_id: int,
    current_user: Annotated[models.User, Depends(get_current_user)],
    _: Annotated[models.User, Guard],
    db: Session = Depends(get_db),
):
    _ensure_can_write(current_user)
    c = db.query(models.ExpenseCategory).filter(models.ExpenseCategory.id == category_id).first()
    if not c:
        return
    db.delete(c); db.commit(); return


@router.get("/settings/methods")
def list_methods(_: Annotated[models.User, Guard], db: Session = Depends(get_db)):
    rows = db.query(models.PaymentMethod).order_by(models.PaymentMethod.name.asc()).all()
    return [{"id": r.id, "name": r.name} for r in rows]


@router.post("/settings/methods", status_code=201)
def create_method(
    payload: dict,
    current_user: Annotated[models.User, Depends(get_current_user)],
    _: Annotated[models.User, Guard],
    db: Session = Depends(get_db),
):
    _ensure_can_write(current_user)
    name = (payload.get("name") or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="name required")
    m = models.PaymentMethod(name=name)
    db.add(m)
    try:
        db.commit()
    except Exception:
        db.rollback(); raise HTTPException(status_code=400, detail="duplicate")
    db.refresh(m)
    return {"id": m.id}


@router.delete("/settings/methods/{method_id}", status_code=204)
def delete_method(
    method_id: int,
    current_user: Annotated[models.User, Depends(get_current_user)],
    _: Annotated[models.User, Guard],
    db: Session = Depends(get_db),
):
    _ensure_can_write(current_user)
    m = db.query(models.PaymentMethod).filter(models.PaymentMethod.id == method_id).first()
    if not m:
        return
    db.delete(m); db.commit(); return
