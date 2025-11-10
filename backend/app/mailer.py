from __future__ import annotations

import smtplib
from email.message import EmailMessage
from typing import Iterable, Tuple

from .settings import settings

Attachment = Tuple[str, bytes, str]  # (filename, data, mime_type)


def _deliver(msg: EmailMessage) -> bool:
    if not settings.SMTP_HOST:
        return False
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


def send_email(to: str, subject: str, body: str) -> bool:
    """Plain-text convenience wrapper."""
    if not to:
        return False
    msg = EmailMessage()
    msg["From"] = settings.SMTP_FROM
    msg["To"] = to
    msg["Subject"] = subject
    msg.set_content(body)
    return _deliver(msg)


def send_email_advanced(
    to: str,
    subject: str,
    text_body: str | None = None,
    html_body: str | None = None,
    attachments: Iterable[Attachment] | None = None,
) -> bool:
    if not to:
        return False
    msg = EmailMessage()
    msg["From"] = settings.SMTP_FROM
    msg["To"] = to
    msg["Subject"] = subject

    # bodies
    if html_body and text_body:
        msg.set_content(text_body)
        msg.add_alternative(html_body, subtype="html")
    elif html_body:
        msg.add_alternative(html_body, subtype="html")
    elif text_body:
        msg.set_content(text_body)
    else:
        msg.set_content("")

    # attachments
    for att in attachments or []:
        filename, data, mime_type = att
        maintype, _, subtype = (mime_type.partition("/") if "/" in mime_type else (mime_type, "/", "octet-stream"))
        msg.add_attachment(data, maintype=maintype, subtype=subtype, filename=filename)

    return _deliver(msg)
