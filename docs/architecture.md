# Architecture

Domain modules
- Identity & RBAC: Users, Roles, Permissions, Sessions
- Academics: Subjects, Classes, Timetables, Assessments, Grades
- Students: Profiles, Guardians, Enrollment, Transfers
- Attendance & Discipline: Daily/period attendance, incidents, sanctions, houses
- Finance: Fees structures, invoices, payments, receipts, arrears
- Communication: Notices, messages, parent portal
- Reporting: Bulletins, transcripts, attendance sheets, fee statements

RBAC (initial roles)
- student, teacher, headmaster, director_studies, director_discipline,
  accountant, registrar, patron, matron, it_support

Backend plan
- FastAPI routers per module (e.g., /api/v1/students, /attendance, /finance)
- SQLAlchemy models + Alembic migrations; PostgreSQL
- Auth: OAuth2 password + JWT, role claims; session cookies; password hashing
- Background jobs via Redis (e.g., bulk report generation)
- WebSockets for live notifications

Data model (high level)
- User(id, email, phone, role, status, password_hash)
- Student(id, profile_id, current_class_id, house_id)
- Guardian(id, relation, contacts) with M2M StudentGuardian
- Class(id, name, level, stream); Subject(id, code, name)
- Enrollment(id, student_id, class_id, year, status)
- Assessment(id, subject_id, class_id, term, type, max_score)
- Grade(id, assessment_id, student_id, score, remark)
- Attendance(id, student_id, date, session, status)
- Incident(id, student_id, type, severity, handled_by, action)
- Invoice(id, student_id, term, amount, status); Payment(id, invoice_id, amount, method, ref)

Non-functional
- Audit logging, soft deletes, PII protection
- Internationalization (en), timezone awareness
- Backups, error tracking, metrics
