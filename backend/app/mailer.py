from __future__ import annotations

import os
import smtplib
from email.message import EmailMessage

from . import settings


def send_email(to: str, subject: str, body: str) -> bool:
    """Send an email via SMTP if configured. Returns True if sent, False if skipped."""
    if not settings.SMTP_HOST or not to:
        return False

    msg = EmailMessage()
    msg["From"] = settings.SMTP_FROM
    msg["To"] = to
    msg["Subject"] = subject
    msg.set_content(body)

    if settings.SMTP_TLS:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            server.starttls()
            if settings.SMTP_USER:
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD or "")
            server.send_message(msg)
    else:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            if settings.SMTP_USER:
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD or "")
            server.send_message(msg)
    return True
