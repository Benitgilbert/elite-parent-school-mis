from __future__ import annotations

from sqlalchemy import Table, Column, Integer, String, Boolean, DateTime, Date, ForeignKey, Text, func, UniqueConstraint
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
