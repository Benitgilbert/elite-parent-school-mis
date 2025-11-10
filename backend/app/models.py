from datetime import datetime
from typing import Optional, List
from sqlalchemy import (
    Boolean, Column, Date, DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint, func, Enum, LargeBinary
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .db import Base
import enum


class NotificationType(enum.Enum):
    GRADE_UPDATED = "grade_updated"
    ATTENDANCE_MARKED = "attendance_marked"
    FEE_REMINDER = "fee_reminder"
    FEE_PAYMENT_CONFIRMED = "fee_payment_confirmed"
    DISCIPLINARY_CASE = "disciplinary_case"
    TIMETABLE_UPDATED = "timetable_updated"
    GENERAL_ANNOUNCEMENT = "general_announcement"


class NotificationChannel(enum.Enum):
    EMAIL = "email"
    SMS = "sms"
    PUSH = "push"
    IN_APP = "in_app"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    username: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    full_name: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(50), index=True)  # student, teacher, parent, admin, etc.
    hashed_password: Mapped[str] = mapped_column(String(255))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint("username", name="uq_users_username"),
        UniqueConstraint("email", name="uq_users_email"),
    )


class Student(Base):
    __tablename__ = "students"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    admission_number: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    full_name: Mapped[str] = mapped_column(String(255), index=True)
    date_of_birth: Mapped[Date | None] = mapped_column(Date)
    gender: Mapped[str | None] = mapped_column(String(10))
    class_name: Mapped[str] = mapped_column(String(50), index=True)
    stream: Mapped[str | None] = mapped_column(String(50))
    parent_name: Mapped[str | None] = mapped_column(String(255))
    parent_phone: Mapped[str | None] = mapped_column(String(50))
    parent_email: Mapped[str | None] = mapped_column(String(255))
    address: Mapped[str | None] = mapped_column(Text)
    enrollment_date: Mapped[Date | None] = mapped_column(Date)
    status: Mapped[str] = mapped_column(String(20), default="active", index=True)  # active, graduated, transferred

    __table_args__ = (
        UniqueConstraint("admission_number", name="uq_students_admission_number"),
    )


class StudentApplication(Base):
    __tablename__ = "student_applications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    full_name: Mapped[str] = mapped_column(String(255))
    date_of_birth: Mapped[Date] = mapped_column(Date)
    gender: Mapped[str] = mapped_column(String(10))
    parent_name: Mapped[str] = mapped_column(String(255))
    parent_phone: Mapped[str] = mapped_column(String(50))
    parent_email: Mapped[str] = mapped_column(String(255))
    address: Mapped[str] = mapped_column(Text)
    previous_school: Mapped[str | None] = mapped_column(String(255))
    class_applied: Mapped[str] = mapped_column(String(50))
    applied_date: Mapped[Date] = mapped_column(Date, server_default=func.current_date())
    status: Mapped[str] = mapped_column(String(20), default="pending", index=True)  # pending, approved, rejected
    notes: Mapped[str | None] = mapped_column(Text)
    receipt_pdf: Mapped[bytes | None] = mapped_column(LargeBinary)


class Attendance(Base):
    __tablename__ = "attendance"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    student_id: Mapped[int] = mapped_column(Integer, index=True)
    date: Mapped[Date] = mapped_column(Date, index=True)
    status: Mapped[str] = mapped_column(String(20), index=True)  # present, absent, late
    remarks: Mapped[str | None] = mapped_column(String(255))

    __table_args__ = (
        UniqueConstraint("student_id", "date", name="uq_attendance_student_date"),
    )


class Assessment(Base):
    __tablename__ = "assessments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100), index=True)
    class_name: Mapped[str] = mapped_column(String(50), index=True)
    subject: Mapped[str] = mapped_column(String(50), index=True)
    term: Mapped[str] = mapped_column(String(50), index=True)
    total_score: Mapped[float] = mapped_column(Float, default=100.0)
    date: Mapped[Date] = mapped_column(Date, index=True)
    created_by: Mapped[int | None] = mapped_column(Integer, index=True)


class ExamResult(Base):
    __tablename__ = "exam_results"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    assessment_id: Mapped[int] = mapped_column(Integer, index=True)
    student_id: Mapped[int] = mapped_column(Integer, index=True)
    score: Mapped[float] = mapped_column(Float, nullable=False)

    __table_args__ = (
        UniqueConstraint("assessment_id", "student_id", name="uq_results_assessment_student"),
    )


class CommTemplate(Base):
    __tablename__ = "comm_templates"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    key: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    description: Mapped[str | None] = mapped_column(String(255))
    subject: Mapped[str] = mapped_column(String(255))
    text_body: Mapped[str | None] = mapped_column(Text)
    html_body: Mapped[str | None] = mapped_column(Text)
    sms_template: Mapped[str | None] = mapped_column(String(500))  # SMS version (max 500 chars)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        UniqueConstraint("key", name="uq_comm_templates_key"),
    )


class Term(Base):
    __tablename__ = "terms"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    start_date: Mapped[Date | None] = mapped_column(Date)
    end_date: Mapped[Date | None] = mapped_column(Date)


class ClassRoom(Base):
    __tablename__ = "classes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    capacity: Mapped[int | None] = mapped_column(Integer)


class GradingScale(Base):
    __tablename__ = "grading_scales"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    # items JSON: [{"min":0, "max":39, "grade":"F", "point":0}, ...]
    items_json: Mapped[str] = mapped_column(Text)


class Teacher(Base):
    __tablename__ = "teachers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    email: Mapped[str | None] = mapped_column(String(255), unique=True, index=True)
    full_name: Mapped[str] = mapped_column(String(255))
    phone: Mapped[str | None] = mapped_column(String(50))


class TeacherAssignment(Base):
    __tablename__ = "teacher_assignments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    teacher_id: Mapped[int] = mapped_column(Integer, index=True)
    class_name: Mapped[str] = mapped_column(String(50), index=True)
    subject: Mapped[str] = mapped_column(String(50), index=True)

    __table_args__ = (
        UniqueConstraint("teacher_id", "class_name", "subject", name="uq_teacher_assignment"),
    )


class DisciplinaryCase(Base):
    __tablename__ = "disciplinary_cases"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    student_id: Mapped[int] = mapped_column(Integer, index=True)
    date: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)
    category: Mapped[str] = mapped_column(String(100))  # e.g., Conduct, Attendance, Academic Honesty
    severity: Mapped[str] = mapped_column(String(20))   # e.g., Minor, Major, Critical
    status: Mapped[str] = mapped_column(String(20), default="open")  # open, closed
    description: Mapped[str | None] = mapped_column(Text)
    actions_taken: Mapped[str | None] = mapped_column(Text)
    created_by: Mapped[int | None] = mapped_column(Integer, index=True)


class TimetableConfig(Base):
    __tablename__ = "timetable_configs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    term: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    # JSON strings to keep schema flexible: days, blocks, etc.
    start_time: Mapped[str] = mapped_column(String(10))  # e.g., "08:30"
    period_minutes: Mapped[int] = mapped_column(Integer, default=40)
    days_json: Mapped[str] = mapped_column(Text)  # e.g., ["Mon","Tue","Wed","Thu","Fri"]
    blocks_json: Mapped[str] = mapped_column(Text)  # e.g., [{label, periods|minutes}, ...]


class SubjectAllocation(Base):
    __tablename__ = "subject_allocations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    term: Mapped[str] = mapped_column(String(50), index=True)
    class_name: Mapped[str] = mapped_column(String(50), index=True)
    subject: Mapped[str] = mapped_column(String(50), index=True)
    required_per_week: Mapped[int] = mapped_column(Integer)
    teacher_id: Mapped[int | None] = mapped_column(Integer, index=True)

    __table_args__ = (
        UniqueConstraint("term", "class_name", "subject", name="uq_subject_allocation"),
    )


class TimetableSlot(Base):
    __tablename__ = "timetable_slots"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    term: Mapped[str] = mapped_column(String(50), index=True)
    day_of_week: Mapped[str] = mapped_column(String(10), index=True)  # Mon..Fri configurable
    period_index: Mapped[int] = mapped_column(Integer, index=True)  # 1..N per day
    class_name: Mapped[str] = mapped_column(String(50), index=True)
    subject: Mapped[str] = mapped_column(String(50))
    room: Mapped[str | None] = mapped_column(String(50), index=True)
    teacher_id: Mapped[int | None] = mapped_column(Integer, index=True)

    __table_args__ = (
        UniqueConstraint("term", "day_of_week", "period_index", "class_name", name="uq_slot_unique"),
    )


class UserStudentLink(Base):
    __tablename__ = "user_student_links"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, index=True)
    student_id: Mapped[int] = mapped_column(Integer, ForeignKey("students.id", ondelete="CASCADE"), index=True)

    __table_args__ = (
        UniqueConstraint("user_id", name="uq_user_student_link_user"),
    )


class FeeInvoice(Base):
    __tablename__ = "fee_invoices"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    student_id: Mapped[int] = mapped_column(Integer, index=True)
    term: Mapped[str] = mapped_column(String(50), index=True)
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    balance: Mapped[float] = mapped_column(Float, nullable=False)
    status: Mapped[str] = mapped_column(String(20), index=True, default="unpaid")  # unpaid|partial|paid|overdue
    due_date: Mapped[Date] = mapped_column(Date, index=True, nullable=True)
    description: Mapped[str | None] = mapped_column(Text)  # e.g., "Term 1 Tuition, Books, Activities"
    late_fee: Mapped[float] = mapped_column(Float, default=0.0)  # Additional late fee amount
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    created_by: Mapped[int | None] = mapped_column(Integer, index=True)  # User ID who created the invoice


class FeeStructure(Base):
    __tablename__ = "fee_structures"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100), index=True)  # e.g., "Primary Day Scholar", "Secondary Boarding"
    class_name: Mapped[str] = mapped_column(String(50), index=True)  # Target class/grade
    term: Mapped[str] = mapped_column(String(50), index=True)  # Academic term
    tuition_fee: Mapped[float] = mapped_column(Float, default=0.0)
    boarding_fee: Mapped[float] = mapped_column(Float, default=0.0)
    activity_fee: Mapped[float] = mapped_column(Float, default=0.0)
    exam_fee: Mapped[float] = mapped_column(Float, default=0.0)
    other_fees: Mapped[float] = mapped_column(Float, default=0.0)
    total_amount: Mapped[float] = mapped_column(Float, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class FeeWaiver(Base):
    __tablename__ = "fee_waivers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    student_id: Mapped[int] = mapped_column(Integer, index=True)
    invoice_id: Mapped[int | None] = mapped_column(Integer, index=True)  # Optional: specific invoice
    waiver_type: Mapped[str] = mapped_column(String(50))  # scholarship, hardship, staff_discount, etc.
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    percentage: Mapped[float] = mapped_column(Float, default=0.0)  # Percentage waiver
    reason: Mapped[str | None] = mapped_column(Text)
    approved_by: Mapped[int | None] = mapped_column(Integer, index=True)  # User ID who approved
    status: Mapped[str] = mapped_column(String(20), default="pending")  # pending|approved|rejected
    effective_date: Mapped[Date] = mapped_column(Date, index=True)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class FeePayment(Base):
    __tablename__ = "fee_payments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    invoice_id: Mapped[int] = mapped_column(Integer, index=True)
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    date: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    method: Mapped[str | None] = mapped_column(String(50))
    reference: Mapped[str | None] = mapped_column(String(100), index=True)
    processed_by: Mapped[int | None] = mapped_column(Integer, index=True)  # User ID who processed the payment
    notes: Mapped[str | None] = mapped_column(Text)  # Additional notes about the payment
    status: Mapped[str] = mapped_column(String(20), default="confirmed")  # pending|confirmed|reversed|refunded


class ExpenseCategory(Base):
    __tablename__ = "expense_categories"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, index=True)


class PaymentMethod(Base):
    __tablename__ = "payment_methods"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, index=True)


class Expense(Base):
    __tablename__ = "expenses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    date: Mapped[Date] = mapped_column(Date, index=True)
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    category: Mapped[str] = mapped_column(String(100), index=True)
    description: Mapped[str | None] = mapped_column(Text)
    payee: Mapped[str | None] = mapped_column(String(255))
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class Payroll(Base):
    __tablename__ = "payroll"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    staff_name: Mapped[str] = mapped_column(String(255), index=True)
    month: Mapped[str] = mapped_column(String(20), index=True)  # e.g., 2025-01
    gross: Mapped[float] = mapped_column(Float, nullable=False)
    deductions: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    net: Mapped[float] = mapped_column(Float, nullable=False)
    paid_date: Mapped[Date | None] = mapped_column(Date)
    reference: Mapped[str | None] = mapped_column(String(100), index=True)


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    type: Mapped[NotificationType] = mapped_column(Enum(NotificationType), index=True)
    title: Mapped[str] = mapped_column(String(255))
    message: Mapped[str] = mapped_column(Text)
    data: Mapped[str | None] = mapped_column(Text)  # JSON string for additional data
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)


class NotificationPreference(Base):
    __tablename__ = "notification_preferences"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, index=True)
    grade_updated: Mapped[bool] = mapped_column(Boolean, default=True)
    attendance_marked: Mapped[bool] = mapped_column(Boolean, default=True)
    fee_reminder: Mapped[bool] = mapped_column(Boolean, default=True)
    fee_payment_confirmed: Mapped[bool] = mapped_column(Boolean, default=True)
    disciplinary_case: Mapped[bool] = mapped_column(Boolean, default=True)
    timetable_updated: Mapped[bool] = mapped_column(Boolean, default=False)
    general_announcement: Mapped[bool] = mapped_column(Boolean, default=True)
    email_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    sms_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    push_enabled: Mapped[bool] = mapped_column(Boolean, default=True)

    __table_args__ = (
        UniqueConstraint("user_id", name="uq_notification_preference_user"),
    )


class Parent(Base):
    __tablename__ = "parents"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, index=True)
    full_name: Mapped[str] = mapped_column(String(255))
    phone: Mapped[str | None] = mapped_column(String(50))
    email: Mapped[str | None] = mapped_column(String(255))
    address: Mapped[str | None] = mapped_column(Text)
    relationship: Mapped[str | None] = mapped_column(String(50))  # father, mother, guardian, etc.
    is_primary_contact: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint("user_id", name="uq_parents_user"),
    )


class ParentStudentLink(Base):
    __tablename__ = "parent_student_links"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    parent_user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    student_id: Mapped[int] = mapped_column(Integer, ForeignKey("students.id", ondelete="CASCADE"), index=True)
    relationship: Mapped[str | None] = mapped_column(String(50))
    can_access_grades: Mapped[bool] = mapped_column(Boolean, default=True)
    can_access_attendance: Mapped[bool] = mapped_column(Boolean, default=True)
    can_access_fees: Mapped[bool] = mapped_column(Boolean, default=True)
    can_access_disciplinary: Mapped[bool] = mapped_column(Boolean, default=True)
    is_primary_contact: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint("parent_user_id", "student_id", name="uq_parent_student_link"),
    )
