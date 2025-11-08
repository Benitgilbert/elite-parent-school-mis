"""Students table

Revision ID: 0002_students
Revises: 0001_initial
Create Date: 2025-11-08
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "0002_students"
down_revision = "0001_initial"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "students",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("admission_no", sa.String(length=50), nullable=False),
        sa.Column("first_name", sa.String(length=100), nullable=False),
        sa.Column("last_name", sa.String(length=100), nullable=False),
        sa.Column("date_of_birth", sa.Date(), nullable=True),
        sa.Column("gender", sa.String(length=20), nullable=True),
        sa.Column("class_name", sa.String(length=50), nullable=True),
        sa.Column("guardian_contact", sa.String(length=100), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_unique_constraint("uq_students_admission_no", "students", ["admission_no"])
    op.create_index("ix_students_id", "students", ["id"])  # for parity with ORM index
    op.create_index("ix_students_admission_no", "students", ["admission_no"])  # ORM index


def downgrade() -> None:
    op.drop_index("ix_students_admission_no", table_name="students")
    op.drop_index("ix_students_id", table_name="students")
    op.drop_constraint("uq_students_admission_no", "students", type_="unique")
    op.drop_table("students")
