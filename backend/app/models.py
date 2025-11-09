from __future__ import annotations

from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    Table,
    Float,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .db import Base

# Association table for many-to-many User<->Role
user_roles: Table = Table(
    "user_roles",
    Base.metadata,
    Column("user_id", Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
    Column("role_id", Integer, ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True),
)


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    full_name: Mapped[str | None] = mapped_column(String(255))
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="true")
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    roles: Mapped[list[Role]] = relationship(
        "Role",
        secondary=user_roles,
        back_populates="users",
        lazy="selectin",
    )


class Role(Base):
    __tablename__ = "roles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    description: Mapped[str | None] = mapped_column(Text)

    users: Mapped[list[User]] = relationship(
        "User",
        secondary=user_roles,
        back_populates="roles",
        lazy="selectin",
    )

    __table_args__ = (
        UniqueConstraint("name", name="uq_roles_name"),
    )


class Student(Base):
    __tablename__ = "students"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    admission_no: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    date_of_birth: Mapped[Date | None] = mapped_column(Date)
    gender: Mapped[str | None] = mapped_column(String(20))
    class_name: Mapped[str | None] = mapped_column(String(50))
    guardian_contact: Mapped[str | None] = mapped_column(String(100))
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint("admission_no", name="uq_students_admission_no"),
    )


class StudentApplication(Base):
    __tablename__ = "student_applications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    reference: Mapped[str] = mapped_column(String(20), unique=True, index=True)
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    date_of_birth: Mapped[Date | None] = mapped_column(Date)
    gender: Mapped[str | None] = mapped_column(String(20))
    class_name: Mapped[str | None] = mapped_column(String(50))
    guardian_contact: Mapped[str | None] = mapped_column(String(100))
    email: Mapped[str | None] = mapped_column(String(255))
    birth_certificate_path: Mapped[str | None] = mapped_column(String(255))
    passport_photo_path: Mapped[str | None] = mapped_column(String(255))
    status: Mapped[str] = mapped_column(String(20), nullable=False, server_default="pending")  # pending|approved|rejected
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    processed_at: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True))
    decision_reason: Mapped[str | None] = mapped_column(Text)


class Attendance(Base):
    __tablename__ = "attendance"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    student_id: Mapped[int] = mapped_column(Integer, index=True)
    date: Mapped[Date] = mapped_column(Date, index=True)
    status: Mapped[str] = mapped_column(String(10))  # PRESENT|LATE|ABSENT
    remarks: Mapped[str | None] = mapped_column(String(255))
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint("student_id", "date", name="uq_attendance_student_date"),
    )


class Assessment(Base):
    __tablename__ = "assessments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    term: Mapped[str | None] = mapped_column(String(20))
    class_name: Mapped[str | None] = mapped_column(String(50), index=True)
    subject: Mapped[str | None] = mapped_column(String(50), index=True)
    weight: Mapped[float] = mapped_column(Float, nullable=False, default=1.0)
    date: Mapped[Date | None] = mapped_column(Date)

    __table_args__ = (
        UniqueConstraint("name", "term", "class_name", "subject", name="uq_assessments_unique"),
    )


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
