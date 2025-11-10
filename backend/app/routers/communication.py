from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from ..db import get_db
from ..models import CommTemplate, User, Notification
from ..schemas import CommTemplateCreate, CommTemplateResponse, MessageSend
from ..auth import get_current_user
from ..notification_service import NotificationService

router = APIRouter()

@router.get("/templates", response_model=List[CommTemplateResponse])
async def get_templates(
    skip: int = 0,
    limit: int = 100,
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all communication templates"""
    query = db.query(CommTemplate)
    if is_active is not None:
        query = query.filter(CommTemplate.is_active == is_active)
    
    templates = query.offset(skip).limit(limit).all()
    return templates

@router.post("/templates", response_model=CommTemplateResponse)
async def create_template(
    template: CommTemplateCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new communication template"""
    db_template = CommTemplate(
        key=template.key,
        name=template.name,
        description=template.description,
        subject=template.subject,
        text_body=template.text_body,
        html_body=template.html_body,
        sms_template=template.sms_template,
        is_active=template.is_active,
        created_by=current_user.id
    )
    db.add(db_template)
    db.commit()
    db.refresh(db_template)
    return db_template

@router.put("/templates/{template_id}", response_model=CommTemplateResponse)
async def update_template(
    template_id: int,
    template: CommTemplateCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a communication template"""
    db_template = db.query(CommTemplate).filter(CommTemplate.id == template_id).first()
    if not db_template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    for key, value in template.dict().items():
        setattr(db_template, key, value)
    
    db_template.updated_at = datetime.now()
    db.commit()
    db.refresh(db_template)
    return db_template

@router.delete("/templates/{template_id}")
async def delete_template(
    template_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a communication template"""
    db_template = db.query(CommTemplate).filter(CommTemplate.id == template_id).first()
    if not db_template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    db.delete(db_template)
    db.commit()
    return {"message": "Template deleted successfully"}

@router.post("/send-message")
async def send_message(
    message: MessageSend,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Send a message using a template"""
    notification_service = NotificationService(db)
    
    # If template is provided, use it
    if message.template_key:
        template = db.query(CommTemplate).filter(
            CommTemplate.key == message.template_key,
            CommTemplate.is_active == True
        ).first()
        
        if not template:
            raise HTTPException(status_code=404, detail="Template not found")
        
        # Replace template parameters
        subject = template.subject.format(**message.parameters) if message.parameters else template.subject
        text_body = template.text_body.format(**message.parameters) if message.parameters else template.text_body
        html_body = template.html_body.format(**message.parameters) if message.parameters else template.html_body
        sms_body = template.sms_template.format(**message.parameters) if template.sms_template and message.parameters else template.sms_template
    else:
        # Use provided content directly
        subject = message.subject or "Message"
        text_body = message.content
        html_body = message.html_content
        sms_body = message.sms_content
    
    # Send via different channels based on message configuration
    results = {}
    
    if message.send_email and message.to_email:
        email_result = notification_service.send_email(
            to_email=message.to_email,
            subject=subject,
            body=text_body,
            html_body=html_body
        )
        results["email"] = email_result
    
    if message.send_sms and message.to_phone:
        sms_result = notification_service.send_sms(
            to_phone=message.to_phone,
            message=sms_body or text_body
        )
        results["sms"] = sms_result
    
    # Create notification record
    notification = notification_service.create_notification(
        user_id=current_user.id,
        type="general_announcement",
        title=subject,
        message=text_body,
        channels=["email"] if message.send_email else [] + ["sms"] if message.send_sms else []
    )
    
    return {
        "message": "Message sent successfully",
        "results": results,
        "notification_id": notification.id
    }

@router.post("/send-bulk-email")
async def send_bulk_email(
    recipients: List[str],
    subject: str,
    content: str,
    html_content: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Send bulk email to multiple recipients"""
    notification_service = NotificationService(db)
    
    results = []
    for recipient in recipients:
        result = notification_service.send_email(
            to_email=recipient,
            subject=subject,
            body=content,
            html_body=html_content
        )
        results.append({"email": recipient, "success": result})
    
    return {
        "message": f"Bulk email sent to {len(recipients)} recipients",
        "results": results
    }

@router.post("/send-bulk-sms")
async def send_bulk_sms(
    recipients: List[str],
    message: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Send bulk SMS to multiple recipients"""
    notification_service = NotificationService(db)
    
    results = []
    for recipient in recipients:
        result = notification_service.send_sms(
            to_phone=recipient,
            message=message
        )
        results.append({"phone": recipient, "success": result})
    
    return {
        "message": f"Bulk SMS sent to {len(recipients)} recipients",
        "results": results
    }

@router.post("/send-to-parents/{student_id}")
async def send_to_parents(
    student_id: int,
    message: MessageSend,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Send message to parents of a specific student"""
    from ..routers.students import get_student
    
    # Get student details
    student = get_student(student_id, db)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    notification_service = NotificationService(db)
    results = []
    
    # Send to parent email if available
    if student.parent_email and message.send_email:
        result = notification_service.send_email(
            to_email=student.parent_email,
            subject=message.subject or "School Update",
            body=message.content,
            html_body=message.html_content
        )
        results.append({"type": "email", "recipient": student.parent_email, "success": result})
    
    # Send to parent phone if available
    if student.parent_phone and message.send_sms:
        result = notification_service.send_sms(
            to_phone=student.parent_phone,
            message=message.sms_content or message.content
        )
        results.append({"type": "sms", "recipient": student.parent_phone, "success": result})
    
    return {
        "message": f"Message sent to parents of student {student.full_name}",
        "results": results
    }