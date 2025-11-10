"""
Background tasks for fee management and notifications
"""
from datetime import date, timedelta
from sqlalchemy.orm import Session
from . import models
import logging

logger = logging.getLogger(__name__)


def check_overdue_invoices(db: Session, notification_service=None):
    """
    Check for overdue invoices and update their status
    """
    try:
        today = date.today()
        overdue_invoices = db.query(models.FeeInvoice).filter(
            models.FeeInvoice.status.in_(["unpaid", "partial"]),
            models.FeeInvoice.due_date < today
        ).all()
        
        updated_count = 0
        for invoice in overdue_invoices:
            # Update status to overdue if not already marked
            if invoice.status not in ["overdue"]:
                invoice.status = "overdue"
                db.add(invoice)
                updated_count += 1
                
                # Send notification if service is available
                if notification_service:
                    try:
                        days_overdue = (today - invoice.due_date).days if invoice.due_date else 0
                        total_due = invoice.balance + invoice.late_fee
                        
                        notification_service.notify_fee_overdue(
                            invoice.student_id,
                            invoice.term,
                            total_due,
                            days_overdue,
                            invoice.due_date.isoformat() if invoice.due_date else None
                        )
                    except Exception as e:
                        logger.error(f"Failed to send overdue notification for invoice {invoice.id}: {str(e)}")
        
        db.commit()
        logger.info(f"Updated {updated_count} overdue invoices")
        return updated_count
        
    except Exception as e:
        logger.error(f"Error checking overdue invoices: {str(e)}")
        db.rollback()
        return 0


def generate_fee_reminders(db: Session, notification_service=None, days_before_due: int = 3):
    """
    Generate fee payment reminders for invoices due soon
    """
    try:
        reminder_date = date.today() + timedelta(days=days_before_due)
        
        upcoming_invoices = db.query(models.FeeInvoice).filter(
            models.FeeInvoice.status.in_(["unpaid", "partial"]),
            models.FeeInvoice.due_date == reminder_date
        ).all()
        
        reminder_count = 0
        for invoice in upcoming_invoices:
            if notification_service:
                try:
                    total_due = invoice.balance + invoice.late_fee
                    notification_service.notify_fee_reminder(
                        invoice.student_id,
                        invoice.term,
                        total_due,
                        invoice.due_date.isoformat() if invoice.due_date else None
                    )
                    reminder_count += 1
                except Exception as e:
                    logger.error(f"Failed to send reminder for invoice {invoice.id}: {str(e)}")
        
        logger.info(f"Sent {reminder_count} fee payment reminders")
        return reminder_count
        
    except Exception as e:
        logger.error(f"Error generating fee reminders: {str(e)}")
        return 0


def calculate_late_fees(db: Session, grace_period_days: int = 0):
    """
    Calculate and apply late fees for overdue invoices
    """
    try:
        today = date.today()
        overdue_invoices = db.query(models.FeeInvoice).filter(
            models.FeeInvoice.status == "overdue",
            models.FeeInvoice.due_date < today - timedelta(days=grace_period_days)
        ).all()
        
        late_fee_count = 0
        for invoice in overdue_invoices:
            if invoice.late_fee > 0:
                days_overdue = (today - invoice.due_date).days if invoice.due_date else 0
                
                # Apply late fee (simple calculation - can be made more complex)
                # For now, we assume late_fee is a fixed amount set on the invoice
                # In future, could calculate percentage-based fees
                
                logger.info(f"Invoice {invoice.id} has late fee of {invoice.late_fee} after {days_overdue} days")
                late_fee_count += 1
        
        logger.info(f"Processed late fees for {late_fee_count} overdue invoices")
        return late_fee_count
        
    except Exception as e:
        logger.error(f"Error calculating late fees: {str(e)}")
        return 0


def generate_monthly_fee_statements(db: Session, month: str = None):
    """
    Generate monthly fee statements for all students
    """
    try:
        if not month:
            month = date.today().strftime("%Y-%m")
        
        # Get all students with fee activity in the month
        from sqlalchemy import func
        students_with_activity = db.query(models.FeeInvoice.student_id).distinct().filter(
            func.strftime("%Y-%m", models.FeeInvoice.created_at) == month
        ).all()
        
        statement_count = 0
        for (student_id,) in students_with_activity:
            # Generate statement for this student
            invoices = db.query(models.FeeInvoice).filter(
                models.FeeInvoice.student_id == student_id,
                func.strftime("%Y-%m", models.FeeInvoice.created_at) == month
            ).all()
            
            if invoices:
                total_invoiced = sum(inv.amount for inv in invoices)
                total_balance = sum(inv.balance + inv.late_fee for inv in invoices)
                
                logger.info(f"Generated statement for student {student_id}: {total_invoiced} invoiced, {total_balance} balance")
                statement_count += 1
        
        logger.info(f"Generated {statement_count} monthly fee statements for {month}")
        return statement_count
        
    except Exception as e:
        logger.error(f"Error generating monthly statements: {str(e)}")
        return 0