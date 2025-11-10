from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from app.models import (
    User, Student, Notification, NotificationPreference, ParentStudentLink,
    NotificationType, ExamResult, Attendance, FeePayment, DisciplinaryCase
)
from app.mailer import send_email_advanced
import json
import logging

logger = logging.getLogger(__name__)


class NotificationService:
    def __init__(self, db: Session):
        self.db = db

    def create_notification(
        self,
        user_id: int,
        notification_type: NotificationType,
        title: str,
        message: str,
        data: Optional[Dict[str, Any]] = None
    ) -> Notification:
        """Create a new notification for a user"""
        notification = Notification(
            user_id=user_id,
            type=notification_type,
            title=title,
            message=message,
            data=json.dumps(data) if data else None
        )
        self.db.add(notification)
        self.db.commit()
        self.db.refresh(notification)
        return notification

    def get_user_notifications(
        self,
        user_id: int,
        unread_only: bool = False,
        limit: int = 50,
        offset: int = 0
    ) -> List[Notification]:
        """Get notifications for a user"""
        query = self.db.query(Notification).filter(Notification.user_id == user_id)
        
        if unread_only:
            query = query.filter(Notification.is_read == False)
        
        return query.order_by(Notification.created_at.desc()).offset(offset).limit(limit).all()

    def mark_as_read(self, notification_id: int, user_id: int) -> bool:
        """Mark a notification as read"""
        notification = self.db.query(Notification).filter(
            and_(Notification.id == notification_id, Notification.user_id == user_id)
        ).first()
        
        if notification and not notification.is_read:
            notification.is_read = True
            self.db.commit()
            return True
        return False

    def mark_all_as_read(self, user_id: int) -> int:
        """Mark all notifications as read for a user"""
        updated_count = self.db.query(Notification).filter(
            and_(Notification.user_id == user_id, Notification.is_read == False)
        ).update({"is_read": True})
        self.db.commit()
        return updated_count

    def get_notification_preferences(self, user_id: int) -> Optional[NotificationPreference]:
        """Get notification preferences for a user"""
        return self.db.query(NotificationPreference).filter(
            NotificationPreference.user_id == user_id
        ).first()

    def update_notification_preferences(
        self,
        user_id: int,
        preferences: Dict[str, Any]
    ) -> NotificationPreference:
        """Update notification preferences for a user"""
        pref = self.get_notification_preferences(user_id)
        
        if not pref:
            pref = NotificationPreference(user_id=user_id)
            self.db.add(pref)
        
        # Update boolean fields
        boolean_fields = [
            'grade_updated', 'attendance_marked', 'fee_reminder',
            'fee_payment_confirmed', 'disciplinary_case', 'timetable_updated',
            'general_announcement', 'email_enabled', 'sms_enabled', 'push_enabled'
        ]
        
        for field in boolean_fields:
            if field in preferences:
                setattr(pref, field, bool(preferences[field]))
        
        self.db.commit()
        self.db.refresh(pref)
        return pref

    def get_parent_users_for_student(self, student_id: int) -> List[User]:
        """Get all parent users linked to a student"""
        links = self.db.query(ParentStudentLink).filter(
            ParentStudentLink.student_id == student_id
        ).all()
        
        parent_user_ids = [link.parent_user_id for link in links]
        if not parent_user_ids:
            return []
        
        return self.db.query(User).filter(User.id.in_(parent_user_ids)).all()

    def should_send_notification(
        self,
        user_id: int,
        notification_type: NotificationType,
        channel: str = "in_app"
    ) -> bool:
        """Check if user wants to receive this type of notification"""
        pref = self.get_notification_preferences(user_id)
        if not pref:
            return True  # Default to sending if no preferences set
        
        # Check if the notification type is enabled
        type_enabled = getattr(pref, notification_type.value, True)
        if not type_enabled:
            return False
        
        # Check if the channel is enabled
        if channel == "email" and not pref.email_enabled:
            return False
        elif channel == "sms" and not pref.sms_enabled:
            return False
        elif channel == "push" and not pref.push_enabled:
            return False
        
        return True

    def notify_grade_updated(self, student_id: int, assessment_name: str, score: float):
        """Notify parents when a student's grade is updated"""
        parents = self.get_parent_users_for_student(student_id)
        student = self.db.query(Student).filter(Student.id == student_id).first()
        
        if not student:
            return
        
        for parent in parents:
            if not self.should_send_notification(parent.id, NotificationType.GRADE_UPDATED):
                continue
            
            title = f"Grade Updated for {student.full_name}"
            message = f"New grade recorded for {assessment_name}: {score}%"
            
            self.create_notification(
                user_id=parent.id,
                notification_type=NotificationType.GRADE_UPDATED,
                title=title,
                message=message,
                data={
                    "student_id": student_id,
                    "assessment_name": assessment_name,
                    "score": score,
                    "timestamp": datetime.now().isoformat()
                }
            )
            
            # Send email if enabled
            if self.should_send_notification(parent.id, NotificationType.GRADE_UPDATED, "email"):
                self.send_email_notification(parent, title, message)

    def notify_attendance_marked(self, student_id: int, date: datetime, status: str):
        """Notify parents when attendance is marked"""
        parents = self.get_parent_users_for_student(student_id)
        student = self.db.query(Student).filter(Student.id == student_id).first()
        
        if not student:
            return
        
        for parent in parents:
            if not self.should_send_notification(parent.id, NotificationType.ATTENDANCE_MARKED):
                continue
            
            title = f"Attendance Update for {student.full_name}"
            message = f"Attendance marked for {date.strftime('%B %d, %Y')}: {status.title()}"
            
            self.create_notification(
                user_id=parent.id,
                notification_type=NotificationType.ATTENDANCE_MARKED,
                title=title,
                message=message,
                data={
                    "student_id": student_id,
                    "date": date.isoformat(),
                    "status": status
                }
            )
            
            # Send email if enabled and status is concerning
            if status in ['absent', 'late'] and self.should_send_notification(parent.id, NotificationType.ATTENDANCE_MARKED, "email"):
                self.send_email_notification(parent, title, message)

    def notify_fee_payment_confirmed(self, student_id: int, amount: float, balance: float):
        """Notify parents when fee payment is confirmed"""
        parents = self.get_parent_users_for_student(student_id)
        student = self.db.query(Student).filter(Student.id == student_id).first()
        
        if not student:
            return
        
        for parent in parents:
            if not self.should_send_notification(parent.id, NotificationType.FEE_PAYMENT_CONFIRMED):
                continue
            
            title = f"Fee Payment Confirmed for {student.full_name}"
            message = f"Payment of KES {amount:,.2f} received. Outstanding balance: KES {balance:,.2f}"
            
            self.create_notification(
                user_id=parent.id,
                notification_type=NotificationType.FEE_PAYMENT_CONFIRMED,
                title=title,
                message=message,
                data={
                    "student_id": student_id,
                    "amount": amount,
                    "balance": balance,
                    "timestamp": datetime.now().isoformat()
                }
            )
            
            # Send email if enabled
            if self.should_send_notification(parent.id, NotificationType.FEE_PAYMENT_CONFIRMED, "email"):
                self.send_email_notification(parent, title, message)

    def notify_fee_reminder(self, student_id: int, term: str, amount_due: float, due_date: str):
        """Notify parents about upcoming fee payment due dates"""
        parents = self.get_parent_users_for_student(student_id)
        student = self.db.query(Student).filter(Student.id == student_id).first()
        
        if not student:
            return
        
        for parent in parents:
            if not self.should_send_notification(parent.id, NotificationType.FEE_REMINDER):
                continue
            
            title = f"Fee Payment Reminder for {student.full_name}"
            message = f"Payment of KES {amount_due:,.2f} for {term} is due on {due_date}. Please make payment to avoid late fees."
            
            self.create_notification(
                user_id=parent.id,
                notification_type=NotificationType.FEE_REMINDER,
                title=title,
                message=message,
                data={
                    "student_id": student_id,
                    "term": term,
                    "amount_due": amount_due,
                    "due_date": due_date,
                    "timestamp": datetime.now().isoformat()
                }
            )
            
            # Send email if enabled
            if self.should_send_notification(parent.id, NotificationType.FEE_REMINDER, "email"):
                self.send_email_notification(parent, title, message)

    def notify_fee_overdue(self, student_id: int, term: str, amount_due: float, days_overdue: int, due_date: str):
        """Notify parents about overdue fee payments"""
        parents = self.get_parent_users_for_student(student_id)
        student = self.db.query(Student).filter(Student.id == student_id).first()
        
        if not student:
            return
        
        for parent in parents:
            if not self.should_send_notification(parent.id, NotificationType.FEE_REMINDER):
                continue
            
            title = f"Overdue Fee Payment for {student.full_name}"
            message = f"Payment of KES {amount_due:,.2f} for {term} is {days_overdue} days overdue. Please make immediate payment to avoid additional penalties."
            
            self.create_notification(
                user_id=parent.id,
                notification_type=NotificationType.FEE_REMINDER,
                title=title,
                message=message,
                data={
                    "student_id": student_id,
                    "term": term,
                    "amount_due": amount_due,
                    "days_overdue": days_overdue,
                    "due_date": due_date,
                    "timestamp": datetime.now().isoformat()
                }
            )
            
            # Send email if enabled - this is more urgent so always send email
            if self.should_send_notification(parent.id, NotificationType.FEE_REMINDER, "email"):
                self.send_email_notification(parent, title, message)

    def notify_disciplinary_case_created(self, student_id: int, case_id: int, category: str, severity: str, description: str):
        """Notify parents about new disciplinary case"""
        parents = self.get_parent_users_for_student(student_id)
        student = self.db.query(Student).filter(Student.id == student_id).first()
        
        if not student:
            return
        
        for parent in parents:
            if not self.should_send_notification(parent.id, NotificationType.DISCIPLINARY_CASE):
                continue
            
            title = f"Disciplinary Case: {category}"
            message = f"A new {severity.lower()} disciplinary case has been registered for your child: {description or 'No description provided'}"
            
            self.create_notification(
                user_id=parent.id,
                notification_type=NotificationType.DISCIPLINARY_CASE,
                title=title,
                message=message,
                data={
                    "student_id": student_id,
                    "case_id": case_id,
                    "category": category,
                    "severity": severity,
                    "timestamp": datetime.now().isoformat()
                }
            )
            
            # Send email if enabled and severity is high
            if severity.lower() in ['major', 'critical'] and self.should_send_notification(parent.id, NotificationType.DISCIPLINARY_CASE, "email"):
                self.send_email_notification(parent, title, message)

    def notify_disciplinary_case_updated(self, student_id: int, case_id: int, category: str, severity: str, status: str, description: str):
        """Notify parents about disciplinary case update"""
        parents = self.get_parent_users_for_student(student_id)
        student = self.db.query(Student).filter(Student.id == student_id).first()
        
        if not student:
            return
        
        for parent in parents:
            if not self.should_send_notification(parent.id, NotificationType.DISCIPLINARY_CASE):
                continue
            
            title = f"Disciplinary Case Updated: {category}"
            message = f"The disciplinary case for your child has been updated to {status}: {description or 'No description provided'}"
            
            self.create_notification(
                user_id=parent.id,
                notification_type=NotificationType.DISCIPLINARY_CASE,
                title=title,
                message=message,
                data={
                    "student_id": student_id,
                    "case_id": case_id,
                    "category": category,
                    "severity": severity,
                    "status": status,
                    "timestamp": datetime.now().isoformat()
                }
            )
            
            # Send email if enabled and severity is high
            if severity in ['major', 'critical'] and self.should_send_notification(parent.id, NotificationType.DISCIPLINARY_CASE, "email"):
                self.send_email_notification(parent, title, message)

    def send_email_notification(self, user: User, subject: str, message: str):
        """Send email notification to user"""
        try:
            # Use existing email system with HTML template
            html_body = f"""
            <html>
            <body>
                <h2>{subject}</h2>
                <p>Hello {user.full_name or user.username},</p>
                <p>{message}</p>
                <hr>
                <p><small>This is an automated message from the school management system.</small></p>
            </body>
            </html>
            """
            
            send_email_advanced(
                to=user.email,
                subject=subject,
                text_body=message,
                html_body=html_body
            )
            logger.info(f"Email notification sent to {user.email}")
        except Exception as e:
            logger.error(f"Failed to send email notification to {user.email}: {str(e)}")

    def get_unread_count(self, user_id: int) -> int:
        """Get count of unread notifications for user"""
        return self.db.query(Notification).filter(
            and_(Notification.user_id == user_id, Notification.is_read == False)
        ).count()

    def delete_old_notifications(self, days_old: int = 90) -> int:
        """Delete notifications older than specified days"""
        cutoff_date = datetime.now() - timedelta(days=days_old)
        deleted_count = self.db.query(Notification).filter(
            Notification.created_at < cutoff_date
        ).delete()
        self.db.commit()
        return deleted_count