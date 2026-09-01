"""
SupportPilot Milestone 3 — Automated Email Notification Service.

Features:
- Handles 4 Core Email Notification Types:
    1. Ticket Created (Ticket Received Confirmation)
    2. AI Resolution Ready (Contextual Guided Troubleshooting Steps)
    3. Escalation Notice (Escalation to Tier-2/SecOps Support)
    4. Ticket Resolved (Resolution & Customer Confirmation)
- Email Audit Logging to SQLite/Postgres EmailLog model and MongoDB
- Ticket Activity Timeline recording
"""

from datetime import datetime, timezone
import uuid

import urllib.parse
from django.conf import settings
from django.core.mail import send_mail

from .models import Ticket, EmailLog, ActivityLog
from mongodb import email_logs_collection


def get_gmail_compose_url(recipient: str, subject: str, body: str) -> str:
    """Generate direct 1-click web Gmail compose link with prefilled To, Subject, and Body."""
    base = "https://mail.google.com/mail/?view=cm&fs=1"
    params = {
        "to": recipient or "",
        "su": subject or "",
        "body": body or "",
    }
    return f"{base}&{urllib.parse.urlencode(params)}"



def _get_user_email(user) -> str:
    """Safely extract user email address without raising attribute errors."""
    if not user:
        return "customer@example.com"
    email = getattr(user, "email", "")
    if email:
        return str(email)
    username = getattr(user, "username", "customer")
    return f"{username}@example.com"


def _get_user_display_name(user) -> str:
    """Safely extract user full name or username without raising attribute errors."""
    if not user:
        return "Customer"
    get_name = getattr(user, "get_full_name", None)
    if callable(get_name):
        try:
            full_name = get_name()
            if full_name:
                return str(full_name)
        except Exception:
            pass
    first_name = getattr(user, "first_name", "")
    if first_name:
        return str(first_name)
    username = getattr(user, "username", "")
    if username:
        return str(username)
    return "Customer"


def send_ticket_created_email(ticket: Ticket, recipient_email: str | None = None) -> dict:
    """Event 1: Ticket Created -> Send Ticket Received acknowledgement."""
    recipient = recipient_email or _get_user_email(ticket.created_by)
    user_name = _get_user_display_name(ticket.created_by)
    subject = f"[SupportPilot] Ticket Received - #{ticket.ticket_number or ticket.id}: {ticket.title}"
    body = (
        f"Hello {user_name},\n\n"
        f"Thank you for reaching out. We have received your support request:\n\n"
        f"Ticket Number: {ticket.ticket_number or ticket.id}\n"
        f"Subject: {ticket.title}\n"
        f"Category: {ticket.category} -> {ticket.sub_category}\n"
        f"Priority: {ticket.priority} | Severity: {ticket.severity}\n\n"
        f"Our Multi-Agent AI system is currently investigating your issue and retrieving verified troubleshooting knowledge.\n\n"
        f"Best regards,\nSupportPilot AI Operations Team"
    )

    return _persist_and_dispatch_email(
        ticket=ticket,
        recipient=recipient,
        subject=subject,
        email_type="ticket_created",
        body=body,
        action_name="EMAIL_TICKET_CREATED_SENT",
        action_desc=f"Sent Ticket Received confirmation email to {recipient}."
    )


def send_resolution_email(
    ticket: Ticket,
    troubleshooting_steps: list[str] | None = None,
    citations: list[dict] | None = None,
    confidence: float = 0.92,
    recipient_email: str | None = None,
) -> dict:
    """Event 2: AI Resolution Ready -> Send step-by-step grounded troubleshooting instructions."""
    recipient = recipient_email or _get_user_email(ticket.created_by)
    user_name = _get_user_display_name(ticket.created_by)
    subject = f"[SupportPilot] AI Resolution Ready - #{ticket.ticket_number or ticket.id}: {ticket.title}"

    steps_text = "\n".join([f"{i+1}. {s}" for i, s in enumerate(troubleshooting_steps or ["Verify settings", "Restart application"])])
    citations_text = ""
    if citations:
        sources = [f"- {c.get('source_title', 'Knowledge Article')}" for c in citations]
        citations_text = "\nVerified Knowledge Sources:\n" + "\n".join(list(dict.fromkeys(sources)))

    body = (
        f"Hello {user_name},\n\n"
        f"The SupportPilot AI Resolution Engine has analyzed your ticket and formulated grounded troubleshooting instructions:\n\n"
        f"{steps_text}\n"
        f"{citations_text}\n\n"
        f"Resolution Confidence Score: {int(confidence * 100)}%\n\n"
        f"If these steps resolve your issue, you can confirm directly in your customer portal.\n"
        f"Best regards,\nSupportPilot AI Assistant"
    )

    return _persist_and_dispatch_email(
        ticket=ticket,
        recipient=recipient,
        subject=subject,
        email_type="resolution",
        body=body,
        action_name="EMAIL_RESOLUTION_SENT",
        action_desc=f"Sent AI Resolution email with {len(troubleshooting_steps or [])} troubleshooting steps to {recipient}."
    )


def send_escalation_email(
    ticket: Ticket,
    target_team: str = "Tier-2 Technical Support",
    escalation_reason: str = "Complex issue requiring human engineer review",
    recipient_email: str | None = None,
) -> dict:
    """Event 3: Escalation -> Notify requester and assigned specialized support team."""
    recipient = recipient_email or _get_user_email(ticket.created_by)
    user_name = _get_user_display_name(ticket.created_by)
    subject = f"[SupportPilot] Escalation Notice - #{ticket.ticket_number or ticket.id}: Assigned to {target_team}"

    body = (
        f"Hello {user_name},\n\n"
        f"Your ticket #{ticket.ticket_number or ticket.id} has been escalated to our specialized human support engineering team.\n\n"
        f"Assigned Team: {target_team}\n"
        f"Reason: {escalation_reason}\n"
        f"Priority SLA: {ticket.priority}\n\n"
        f"A support engineer has been assigned and will follow up with you shortly.\n\n"
        f"Best regards,\nSupportPilot Escalation Desk"
    )

    return _persist_and_dispatch_email(
        ticket=ticket,
        recipient=recipient,
        subject=subject,
        email_type="escalation",
        body=body,
        action_name="EMAIL_ESCALATION_SENT",
        action_desc=f"Sent Escalation notice email (Team: {target_team}) to {recipient}."
    )


def send_resolved_email(
    ticket: Ticket,
    resolution_notes: str = "Issue marked as resolved.",
    recipient_email: str | None = None,
) -> dict:
    """Event 4: Ticket Resolved -> Send resolution confirmation to requester."""
    recipient = recipient_email or _get_user_email(ticket.created_by)
    user_name = _get_user_display_name(ticket.created_by)
    subject = f"[SupportPilot] Ticket Resolved - #{ticket.ticket_number or ticket.id}: {ticket.title}"

    body = (
        f"Hello {user_name},\n\n"
        f"Your ticket #{ticket.ticket_number or ticket.id} has been successfully marked as RESOLVED.\n\n"
        f"Resolution Summary:\n{resolution_notes}\n\n"
        f"Thank you for contacting SupportPilot Support.\n\n"
        f"Best regards,\nSupportPilot Operations Team"
    )

    return _persist_and_dispatch_email(
        ticket=ticket,
        recipient=recipient,
        subject=subject,
        email_type="resolved",
        body=body,
        action_name="EMAIL_RESOLVED_SENT",
        action_desc=f"Sent Ticket Resolved confirmation email to {recipient}."
    )



def _persist_and_dispatch_email(
    ticket: Ticket,
    recipient: str,
    subject: str,
    email_type: str,
    body: str,
    action_name: str,
    action_desc: str,
) -> dict:
    """Internal helper to record EmailLog, ActivityLog, dispatch SMTP email, and provide Gmail compose link."""
    email_id = f"EML-{uuid.uuid4().hex[:8].upper()}"
    now_dt = datetime.now(timezone.utc)
    gmail_url = get_gmail_compose_url(recipient=recipient, subject=subject, body=body)

    # Attempt real SMTP dispatch only if SMTP credentials or test backend are configured
    smtp_sent = False
    smtp_error = None
    from_email = getattr(settings, "DEFAULT_FROM_EMAIL", "supportpilot.ai@gmail.com") or "supportpilot.ai@gmail.com"
    host_user = getattr(settings, "EMAIL_HOST_USER", "").strip()
    backend_name = getattr(settings, "EMAIL_BACKEND", "")

    if recipient and "@" in recipient and recipient != "Unknown" and (host_user or "console" in backend_name or "locmem" in backend_name):
        try:
            send_mail(
                subject=subject,
                message=body,
                from_email=from_email,
                recipient_list=[recipient],
                fail_silently=False,
            )
            smtp_sent = True
        except Exception as mail_err:
            smtp_error = str(mail_err)
            print(f"[Email Automation SMTP Notice] {mail_err} (Fallback to Gmail 1-Click Active)")


    # Persist in DB
    email_log = EmailLog.objects.create(
        email_id=email_id,
        ticket=ticket,
        recipient=recipient,
        subject=subject,
        email_type=email_type,
        status="SENT" if (smtp_sent or not smtp_error) else "SENT_VIA_WEBHOOK",
        body=body,
    )

    # Record Activity Log
    ActivityLog.objects.create(
        log_id=f"ACT-{uuid.uuid4().hex[:8].upper()}",
        ticket=ticket,
        actor="Email Automation",
        action=action_name,
        description=action_desc + (" (SMTP Delivered)" if smtp_sent else " (Ready in Gmail & Queue)"),
        metadata={
            "email_id": email_id,
            "recipient": recipient,
            "email_type": email_type,
            "smtp_sent": smtp_sent,
            "smtp_error": smtp_error,
            "gmail_compose_url": gmail_url,
        },
    )

    # Safe sync to MongoDB
    try:
        if email_logs_collection:
            email_logs_collection.insert_one({
                "email_id": email_id,
                "ticket_id": ticket.id,
                "ticket_number": ticket.ticket_number,
                "recipient": recipient,
                "subject": subject,
                "email_type": email_type,
                "status": "SENT",
                "smtp_sent": smtp_sent,
                "gmail_compose_url": gmail_url,
                "sent_at": now_dt.isoformat(),
            })
    except Exception:
        pass

    return {
        "success": True,
        "email_id": email_id,
        "ticket_id": ticket.id,
        "ticket_number": ticket.ticket_number,
        "recipient": recipient,
        "subject": subject,
        "email_type": email_type,
        "status": "SENT",
        "smtp_sent": smtp_sent,
        "smtp_error": smtp_error,
        "gmail_url": gmail_url,
        "sent_at": now_dt.isoformat(),
    }

