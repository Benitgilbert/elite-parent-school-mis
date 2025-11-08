"""Student applications (online / office)

Revision ID: 0003_student_applications
Revises: 0002_students
Create Date: 2025-11-08
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "0003_student_applications"
down_revision = "0002_students"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "student_applications",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("first_name", sa.String(length=100), nullable=False),
        sa.Column("last_name", sa.String(length=100), nullable=False),
        sa.Column("date_of_birth", sa.Date(), nullable=True),
        sa.Column("gender", sa.String(length=20), nullable=True),
        sa.Column("class_name", sa.String(length=50), nullable=True),
        sa.Column("guardian_contact", sa.String(length=100), nullable=True),
        sa.Column("email", sa.String(length=255), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="pending"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("processed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("decision_reason", sa.Text(), nullable=True),
    )
    op.create_index("ix_student_applications_id", "student_applications", ["id"])  # parity with ORM


def downgrade() -> None:
    op.drop_index("ix_student_applications_id", table_name="student_applications")
    op.drop_table("student_applications")
