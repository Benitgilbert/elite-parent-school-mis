"""Add reference and file paths to student applications

Revision ID: 0004_app_ref_files
Revises: 0003_student_applications
Create Date: 2025-11-08
"""
from alembic import op
import sqlalchemy as sa
import secrets
import string

# revision identifiers, used by Alembic.
revision = "0004_app_ref_files"
down_revision = "0003_student_applications"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("student_applications", sa.Column("reference", sa.String(length=20), nullable=True))
    op.add_column("student_applications", sa.Column("birth_certificate_path", sa.String(length=255), nullable=True))
    op.add_column("student_applications", sa.Column("passport_photo_path", sa.String(length=255), nullable=True))
    op.create_index("ix_student_applications_reference", "student_applications", ["reference"]) 
    op.create_unique_constraint("uq_student_applications_reference", "student_applications", ["reference"]) 

    # Backfill references for existing rows
    conn = op.get_bind()
    rows = conn.execute(sa.text("SELECT id FROM student_applications WHERE reference IS NULL")).fetchall()
    alphabet = string.ascii_uppercase + string.digits
    for (rid,) in rows:
        ref = "".join(secrets.choice(alphabet) for _ in range(10))
        conn.execute(sa.text("UPDATE student_applications SET reference=:ref WHERE id=:id"), {"ref": ref, "id": rid})

    # Make column non-nullable after backfill
    op.alter_column("student_applications", "reference", existing_type=sa.String(length=20), nullable=False)


def downgrade() -> None:
    op.drop_constraint("uq_student_applications_reference", "student_applications", type_="unique")
    op.drop_index("ix_student_applications_reference", table_name="student_applications")
    op.drop_column("student_applications", "passport_photo_path")
    op.drop_column("student_applications", "birth_certificate_path")
    op.drop_column("student_applications", "reference")
