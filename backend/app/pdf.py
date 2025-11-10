from __future__ import annotations

from datetime import datetime, timezone
from textwrap import dedent
try:
    from weasyprint import HTML, CSS  # type: ignore
except Exception:
    HTML = None  # type: ignore
    CSS = None  # type: ignore

from .settings import settings


def render_application_receipt(app, student) -> bytes:
    issued = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    school = "Elite Parent School"
    html = dedent(f"""
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body {{ font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif; font-size: 12px; color: #222; }}
          h1 {{ font-size: 20px; margin-bottom: 4px; }}
          .meta, .section {{ margin: 12px 0; }}
          table {{ width: 100%; border-collapse: collapse; }}
          th, td {{ text-align: left; padding: 6px; border-bottom: 1px solid #ddd; }}
          .muted {{ color: #666; }}
        </style>
      </head>
      <body>
        <h1>Admission Receipt</h1>
        <div class="muted">{school}</div>
        <div class="meta">
          <div><b>Reference:</b> {app.reference}</div>
          <div><b>Issued:</b> {issued}</div>
        </div>
        <div class="section">
          <table>
            <tr><th>Student</th><td>{app.first_name} {app.last_name}</td></tr>
            <tr><th>Admission No</th><td>{student.admission_no}</td></tr>
            <tr><th>Class</th><td>{student.class_name or ''}</td></tr>
            <tr><th>Gender</th><td>{app.gender or ''}</td></tr>
            <tr><th>Date of Birth</th><td>{(app.date_of_birth.isoformat() if app.date_of_birth else '')}</td></tr>
            <tr><th>Guardian Contact</th><td>{app.guardian_contact or ''}</td></tr>
            <tr><th>Email</th><td>{app.email or ''}</td></tr>
          </table>
        </div>
        <p class="muted">Keep this receipt for your records.</p>
      </body>
    </html>
    """)
    if HTML is None or CSS is None:
        raise RuntimeError("WeasyPrint is not available on this system.")
    pdf = HTML(string=html).write_pdf(stylesheets=[CSS(string="@page { size: A4; margin: 24px; }")])
    return pdf
