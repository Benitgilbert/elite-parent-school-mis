from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import get_db
from models import User, Notification, NotificationType, NotificationPreference
from notification_service import NotificationService
from auth import get_current_user

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


class NotificationResponse(BaseModel):
    id: int
    type: str
    title: str
    message: str
    data: Optional[str]
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True


class NotificationPreferencesResponse(BaseModel):
    grade_updated: bool
    attendance_marked: bool
    fee_reminder: bool
    fee_payment_confirmed: bool
    disciplinary_case: bool
    timetable_updated: bool
    general_announcement: bool
    email_enabled: bool
    sms_enabled: bool
    push_enabled: bool

    class Config:
        from_attributes = True


class NotificationPreferencesUpdate(BaseModel):
    grade_updated: Optional[bool] = None
    attendance_marked: Optional[bool] = None
    fee_reminder: Optional[bool] = None
    fee_payment_confirmed: Optional[bool] = None
    disciplinary_case: Optional[bool] = None
    timetable_updated: Optional[bool] = None
    general_announcement: Optional[bool] = None
    email_enabled: Optional[bool] = None
    sms_enabled: Optional[bool] = None
    push_enabled: Optional[bool] = None


class UnreadCountResponse(BaseModel):
    count: int


@router.get("/", response_model=List[NotificationResponse])
async def get_notifications(
    unread_only: bool = Query(False, description="Filter only unread notifications"),
    limit: int = Query(50, ge=1, le=100, description="Maximum number of notifications to return"),
    offset: int = Query(0, ge=0, description="Number of notifications to skip"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get notifications for the current user"""
    service = NotificationService(db)
    notifications = service.get_user_notifications(
        user_id=current_user.id,
        unread_only=unread_only,
        limit=limit,
        offset=offset
    )
    return notifications


@router.get("/unread-count", response_model=UnreadCountResponse)
async def get_unread_count(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get count of unread notifications"""
    service = NotificationService(db)
    count = service.get_unread_count(current_user.id)
    return {"count": count}


@router.put("/{notification_id}/read")
async def mark_notification_as_read(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark a specific notification as read"""
    service = NotificationService(db)
    success = service.mark_as_read(notification_id, current_user.id)
    
    if not success:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    return {"message": "Notification marked as read"}


@router.put("/read-all")
async def mark_all_notifications_as_read(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark all notifications as read for the current user"""
    service = NotificationService(db)
    count = service.mark_all_as_read(current_user.id)
    return {"message": f"{count} notifications marked as read"}


@router.get("/preferences", response_model=NotificationPreferencesResponse)
async def get_notification_preferences(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get notification preferences for the current user"""
    service = NotificationService(db)
    pref = service.get_notification_preferences(current_user.id)
    
    if not pref:
        # Return default preferences if none exist
        return NotificationPreferencesResponse(
            grade_updated=True,
            attendance_marked=True,
            fee_reminder=True,
            fee_payment_confirmed=True,
            disciplinary_case=True,
            timetable_updated=False,
            general_announcement=True,
            email_enabled=True,
            sms_enabled=False,
            push_enabled=True
        )
    
    return pref


@router.put("/preferences", response_model=NotificationPreferencesResponse)
async def update_notification_preferences(
    preferences: NotificationPreferencesUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update notification preferences for the current user"""
    service = NotificationService(db)
    
    # Filter out None values
    pref_dict = {k: v for k, v in preferences.dict().items() if v is not None}
    
    updated_pref = service.update_notification_preferences(current_user.id, pref_dict)
    return updated_pref


# Parent-specific endpoints
@router.get("/parent/students")
async def get_parent_students(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get students linked to the current parent user"""
    if current_user.role != "parent":
        raise HTTPException(status_code=403, detail="Only parents can access this endpoint")
    
    from models import Student, ParentStudentLink
    
    # Get student IDs linked to this parent
    student_links = db.query(ParentStudentLink).filter(
        ParentStudentLink.parent_user_id == current_user.id
    ).all()
    
    student_ids = [link.student_id for link in student_links]
    if not student_ids:
        return []
    
    students = db.query(Student).filter(Student.id.in_(student_ids)).all()
    
    return [
        {
            "id": student.id,
            "full_name": student.full_name,
            "admission_number": student.admission_number,
            "class_name": student.class_name,
            "can_access_grades": next((link.can_access_grades for link in student_links if link.student_id == student.id), True),
            "can_access_attendance": next((link.can_access_attendance for link in student_links if link.student_id == student.id), True),
            "can_access_fees": next((link.can_access_fees for link in student_links if link.student_id == student.id), True),
            "can_access_disciplinary": next((link.can_access_disciplinary for link in student_links if link.student_id == student.id), True),
        }
        for student in students
    ]


@router.get("/parent/students/{student_id}/notifications")
async def get_student_notifications_as_parent(
    student_id: int,
    unread_only: bool = Query(False, description="Filter only unread notifications"),
    limit: int = Query(50, ge=1, le=100, description="Maximum number of notifications to return"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get notifications related to a specific student (for parents)"""
    if current_user.role != "parent":
        raise HTTPException(status_code=403, detail="Only parents can access this endpoint")
    
    from models import ParentStudentLink
    
    # Verify parent has access to this student
    link = db.query(ParentStudentLink).filter(
        and_(
            ParentStudentLink.parent_user_id == current_user.id,
            ParentStudentLink.student_id == student_id
        )
    ).first()
    
    if not link:
        raise HTTPException(status_code=404, detail="Student not found or no access")
    
    service = NotificationService(db)
    
    # Get notifications that contain this student_id in data
    query = db.query(Notification).filter(Notification.user_id == current_user.id)
    
    if unread_only:
        query = query.filter(Notification.is_read == False)
    
    # Filter notifications that are related to this student
    all_notifications = query.order_by(Notification.created_at.desc()).all()
    
    # Filter notifications that contain the student_id in data
    student_notifications = []
    for notification in all_notifications:
        if notification.data:
            try:
                import json
                data = json.loads(notification.data)
                if data.get("student_id") == student_id:
                    student_notifications.append(notification)
            except:
                continue
    
    return student_notifications[:limit]