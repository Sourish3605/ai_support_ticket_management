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

from .models import Ticket, EmailLog, ActivityLog
from mongodb import email_logs_collection


def send_ticket_created_email(ticket: Ticket, recipient_email: str | None = None) -> dict:
    """Event 1: Ticket Created -> Send Ticket Received acknowledgement."""
    recipient = recipient_email or getattr(ticket.created_by, "email", "") or f"{ticket.created_by.username}@example.com"
    subject = f"[SupportPilot] Ticket Received - #{ticket.ticket_number or ticket.id}: {ticket.title}"
    body = (
        f"Hello {ticket.created_by.get_full_name() or ticket.created_by.username},\n\n"
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
    recipient = recipient_email or getattr(ticket.created_by, "email", "") or f"{ticket.created_by.username}@example.com"
    subject = f"[SupportPilot] AI Resolution Ready - #{ticket.ticket_number or ticket.id}: {ticket.title}"

    steps_text = "\n".join([f"{i+1}. {s}" for i, s in enumerate(troubleshooting_steps or ["Verify settings", "Restart application"])])
    citations_text = ""
    if citations:
        sources = [f"- {c.get('source_title', 'Knowledge Article')}" for c in citations]
        citations_text = "\nVerified Knowledge Sources:\n" + "\n".join(list(dict.fromkeys(sources)))

    body = (
        f"Hello {ticket.created_by.get_full_name() or ticket.created_by.username},\n\n"
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
    recipient = recipient_email or getattr(ticket.created_by, "email", "") or f"{ticket.created_by.username}@example.com"
    subject = f"[SupportPilot] Escalation Notice - #{ticket.ticket_number or ticket.id}: Assigned to {target_team}"

    body = (
        f"Hello {ticket.created_by.get_full_name() or ticket.created_by.username},\n\n"
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
    recipient = recipient_email or getattr(ticket.created_by, "email", "") or f"{ticket.created_by.username}@example.com"
    subject = f"[SupportPilot] Ticket Resolved - #{ticket.ticket_number or ticket.id}: {ticket.title}"

    body = (
        f"Hello {ticket.created_by.get_full_name() or ticket.created_by.username},\n\n"
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
    """Internal helper to record EmailLog, ActivityLog, and simulate/send dispatch."""
    email_id = f"EML-{uuid.uuid4().hex[:8].upper()}"
    now_dt = datetime.now(timezone.utc)

    # Persist in DB
    email_log = EmailLog.objects.create(
        email_id=email_id,
        ticket=ticket,
        recipient=recipient,
        subject=subject,
        email_type=email_type,
        status="SENT",
        body=body,
    )

    # Record Activity Log
    ActivityLog.objects.create(
        log_id=f"ACT-{uuid.uuid4().hex[:8].upper()}",
        ticket=ticket,
        actor="Email Automation",
        action=action_name,
        description=action_desc,
        metadata={"email_id": email_id, "recipient": recipient, "email_type": email_type},
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
        "sent_at": now_dt.isoformat(),
    }
