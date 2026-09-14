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



def _build_enterprise_html_email(
    title: str,
    badge: str,
    greeting: str,
    paragraphs: list[str],
    details: dict[str, str],
    footer_note: str = "This is an automated operational notification from the SupportPilot Enterprise Helpdesk.",
) -> str:
    """Builds a clean, professional, enterprise-branded HTML email template."""
    detail_rows = ""
    for label, val in details.items():
        detail_rows += f"""
        <tr>
            <td style="padding: 8px 12px; font-weight: 600; color: #475569; width: 140px; border-bottom: 1px solid #f1f5f9; font-size: 13px;">{label}</td>
            <td style="padding: 8px 12px; color: #0f172a; font-weight: 500; border-bottom: 1px solid #f1f5f9; font-size: 13px;">{val}</td>
        </tr>
        """

    paragraphs_html = "".join(f'<p style="margin: 0 0 14px 0; line-height: 1.6; color: #334155; font-size: 14px;">{p}</p>' for p in paragraphs)

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>{title}</title>
</head>
<body style="margin: 0; padding: 24px; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
        <!-- Header -->
        <tr>
            <td style="padding: 24px 32px; background-color: #ffffff; border-bottom: 2px solid #2563eb;">
                <table width="100%" border="0" cellspacing="0" cellpadding="0">
                    <tr>
                        <td>
                            <span style="font-size: 18px; font-weight: 700; color: #0f172a; letter-spacing: -0.5px;">Support<span style="color: #2563eb;">Pilot</span></span>
                            <span style="display: block; font-size: 11px; color: #64748b; margin-top: 2px; text-transform: uppercase; letter-spacing: 0.5px;">Enterprise IT Helpdesk</span>
                        </td>
                        <td align="right">
                            <span style="display: inline-block; padding: 4px 10px; font-size: 11px; font-weight: 600; color: #1e40af; background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px;">{badge}</span>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
        <!-- Body Content -->
        <tr>
            <td style="padding: 32px;">
                <p style="font-size: 15px; font-weight: 600; color: #0f172a; margin: 0 0 16px 0;">{greeting},</p>
                {paragraphs_html}
                <!-- Details Box -->
                <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 20px 0; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
                    {detail_rows}
                </table>
                <p style="margin: 24px 0 0 0; font-size: 13px; color: #64748b;">
                    Regards,<br>
                    <strong style="color: #334155;">Support Operations Team</strong><br>
                    SupportPilot Platform
                </p>
            </td>
        </tr>
        <!-- Footer -->
        <tr>
            <td style="padding: 20px 32px; background-color: #f1f5f9; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b; text-align: center;">
                {footer_note}
            </td>
        </tr>
    </table>
</body>
</html>"""


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


# -------------------------------------------------------------
# 8 AUTOMATED TRANSACTIONAL EMAIL TRIGGERS
# -------------------------------------------------------------

def send_ticket_created_email(ticket: Ticket, recipient_email: str | None = None) -> dict:
    """Event 1: Ticket Created -> Send Ticket Received acknowledgement."""
    recipient = recipient_email or _get_user_email(ticket.created_by)
    user_name = _get_user_display_name(ticket.created_by)
    t_num = ticket.ticket_number or f"TKT-{ticket.id}"
    subject = f"Ticket #{t_num} has been created"

    body = (
        f"Hello {user_name},\n\n"
        f"Your support ticket has been successfully created.\n\n"
        f"Ticket ID: #{t_num}\n"
        f"Subject: {ticket.title}\n"
        f"Priority: {ticket.priority}\n"
        f"Department: {ticket.department or 'IT Support'}\n\n"
        f"Our support team will review your request.\n\n"
        f"Regards,\nSupport Team"
    )

    html_body = _build_enterprise_html_email(
        title=f"Ticket #{t_num} Created",
        badge="Ticket Created",
        greeting=f"Hello {user_name}",
        paragraphs=[
            "Your support ticket has been successfully created and queued for processing.",
            "Our automated AI routing system and IT support engineers have been notified and will review your request promptly."
        ],
        details={
            "Ticket ID": f"#{t_num}",
            "Subject": ticket.title,
            "Priority": str(ticket.priority),
            "Department": str(ticket.department or "IT Support"),
            "Category": f"{ticket.category} / {ticket.sub_category}",
            "SLA Window": "4 Hours Resolution Target" if "P2" in str(ticket.priority) else "Target Resolution Defined",
        }
    )

    return _persist_and_dispatch_email(
        ticket=ticket,
        recipient=recipient,
        subject=subject,
        email_type="ticket_created",
        body=body,
        html_body=html_body,
        action_name="EMAIL_TICKET_CREATED_SENT",
        action_desc=f"Sent Ticket Received confirmation email to {recipient}."
    )


def send_ticket_assigned_email(ticket: Ticket, assigned_agent=None, recipient_email: str | None = None) -> dict:
    """Event 2: Ticket Assigned -> Notify customer and agent of assignment."""
    recipient = recipient_email or _get_user_email(ticket.created_by)
    user_name = _get_user_display_name(ticket.created_by)
    t_num = ticket.ticket_number or f"TKT-{ticket.id}"
    agent_name = _get_user_display_name(assigned_agent) if assigned_agent else (ticket.assigned_agent_name or "Support Specialist")
    subject = f"Ticket #{t_num} has been assigned"

    body = (
        f"Hello {user_name},\n\n"
        f"Your support ticket #{t_num} has been assigned to a specialist.\n\n"
        f"Ticket ID: #{t_num}\n"
        f"Assigned Specialist: {agent_name}\n"
        f"Department: {ticket.department or 'IT Support'}\n"
        f"Status: In Progress\n\n"
        f"The assigned engineer is now actively reviewing your issue.\n\n"
        f"Regards,\nSupport Team"
    )

    html_body = _build_enterprise_html_email(
        title=f"Ticket #{t_num} Assigned",
        badge="Assigned to Agent",
        greeting=f"Hello {user_name}",
        paragraphs=[
            f"Your support ticket #{t_num} has been assigned to a technical specialist for resolution.",
            "The engineer is reviewing your case details and will follow up shortly."
        ],
        details={
            "Ticket ID": f"#{t_num}",
            "Subject": ticket.title,
            "Assigned Specialist": agent_name,
            "Department": str(ticket.department or "IT Support"),
            "Current Status": "Assigned / In Progress",
        }
    )

    return _persist_and_dispatch_email(
        ticket=ticket,
        recipient=recipient,
        subject=subject,
        email_type="ticket_assigned",
        body=body,
        html_body=html_body,
        action_name="EMAIL_TICKET_ASSIGNED_SENT",
        action_desc=f"Sent Ticket Assigned notification to {recipient} (Assigned: {agent_name})."
    )


def send_ticket_reassigned_email(ticket: Ticket, previous_agent=None, new_agent=None, recipient_email: str | None = None) -> dict:
    """Event 3: Ticket Reassigned -> Notify requester of reassignment."""
    recipient = recipient_email or _get_user_email(ticket.created_by)
    user_name = _get_user_display_name(ticket.created_by)
    t_num = ticket.ticket_number or f"TKT-{ticket.id}"
    new_agent_name = _get_user_display_name(new_agent) if new_agent else (ticket.assigned_agent_name or "New Support Specialist")
    subject = f"Ticket #{t_num} has been reassigned"

    body = (
        f"Hello {user_name},\n\n"
        f"Your support ticket #{t_num} has been reassigned to {new_agent_name}.\n\n"
        f"Ticket ID: #{t_num}\n"
        f"Subject: {ticket.title}\n"
        f"New Specialist: {new_agent_name}\n"
        f"Department: {ticket.department or 'IT Support'}\n\n"
        f"Regards,\nSupport Team"
    )

    html_body = _build_enterprise_html_email(
        title=f"Ticket #{t_num} Reassigned",
        badge="Reassigned",
        greeting=f"Hello {user_name}",
        paragraphs=[
            f"Your support ticket #{t_num} has been transferred to {new_agent_name} for dedicated resolution.",
        ],
        details={
            "Ticket ID": f"#{t_num}",
            "Subject": ticket.title,
            "New Specialist": new_agent_name,
            "Department": str(ticket.department or "IT Support"),
        }
    )

    return _persist_and_dispatch_email(
        ticket=ticket,
        recipient=recipient,
        subject=subject,
        email_type="ticket_reassigned",
        body=body,
        html_body=html_body,
        action_name="EMAIL_TICKET_REASSIGNED_SENT",
        action_desc=f"Sent Ticket Reassigned notice to {recipient} (New Specialist: {new_agent_name})."
    )


def send_agent_ticket_email(
    ticket: Ticket,
    recipient_email: str,
    subject: str,
    body: str,
    agent_name: str = "Support Specialist",
) -> dict:
    """Event 4: Agent Response -> Send message directly to customer."""
    recipient = recipient_email or _get_user_email(ticket.created_by)
    t_num = ticket.ticket_number or f"TKT-{ticket.id}"
    clean_subject = subject or f"New response on Ticket #{t_num}"
    clean_body = body or f"Hello,\n\nThis is an update regarding your support ticket #{t_num}.\n\nBest regards,\n{agent_name}"

    html_body = _build_enterprise_html_email(
        title=f"New Response on Ticket #{t_num}",
        badge="Agent Response",
        greeting="Hello",
        paragraphs=[
            f"A support engineer ({agent_name}) has added a new response to your ticket:",
            f'<div style="padding: 14px; background-color: #f8fafc; border-left: 3px solid #2563eb; font-family: monospace; font-size: 13px; color: #1e293b;">{clean_body.replace(chr(10), "<br>")}</div>',
            "You can reply directly or track this ticket in your customer portal."
        ],
        details={
            "Ticket ID": f"#{t_num}",
            "Subject": ticket.title,
            "Responder": agent_name,
            "Current Status": str(ticket.status),
        }
    )

    return _persist_and_dispatch_email(
        ticket=ticket,
        recipient=recipient,
        subject=clean_subject,
        email_type="agent_response",
        body=clean_body,
        html_body=html_body,
        action_name="EMAIL_AGENT_RESPONSE_SENT",
        action_desc=f"{agent_name} sent response email to {recipient}."
    )


def send_resolved_email(
    ticket: Ticket,
    resolution_notes: str = "Issue marked as resolved.",
    recipient_email: str | None = None,
) -> dict:
    """Event 5: Ticket Resolved -> Send resolution confirmation to requester."""
    recipient = recipient_email or _get_user_email(ticket.created_by)
    user_name = _get_user_display_name(ticket.created_by)
    t_num = ticket.ticket_number or f"TKT-{ticket.id}"
    subject = f"Ticket #{t_num} has been resolved"

    body = (
        f"Hello {user_name},\n\n"
        f"Your support ticket #{t_num} has been successfully resolved.\n\n"
        f"Ticket ID: #{t_num}\n"
        f"Subject: {ticket.title}\n"
        f"Resolution Summary: {resolution_notes}\n\n"
        f"If you require further assistance or if this issue persists, you may reopen this ticket from your customer portal.\n\n"
        f"Regards,\nSupport Team"
    )

    html_body = _build_enterprise_html_email(
        title=f"Ticket #{t_num} Resolved",
        badge="Resolved",
        greeting=f"Hello {user_name}",
        paragraphs=[
            f"Your support ticket #{t_num} has been successfully marked as resolved.",
            f"<strong>Resolution Notes:</strong> {resolution_notes}",
            "If your issue has not been fully resolved, you can choose 'Need More Help' or reopen the ticket in your portal."
        ],
        details={
            "Ticket ID": f"#{t_num}",
            "Subject": ticket.title,
            "Final Status": "RESOLVED",
            "Department": str(ticket.department or "IT Support"),
        }
    )

    return _persist_and_dispatch_email(
        ticket=ticket,
        recipient=recipient,
        subject=subject,
        email_type="ticket_resolved",
        body=body,
        html_body=html_body,
        action_name="EMAIL_RESOLVED_SENT",
        action_desc=f"Sent Ticket Resolved confirmation email to {recipient}."
    )


def send_ticket_reopened_email(
    ticket: Ticket,
    reason: str = "Customer requested additional support",
    recipient_email: str | None = None,
) -> dict:
    """Event 6: Ticket Reopened -> Alert team and customer."""
    recipient = recipient_email or _get_user_email(ticket.created_by)
    user_name = _get_user_display_name(ticket.created_by)
    t_num = ticket.ticket_number or f"TKT-{ticket.id}"
    subject = f"Ticket #{t_num} requires additional support"

    body = (
        f"Hello {user_name},\n\n"
        f"Your support ticket #{t_num} has been reopened for additional troubleshooting.\n\n"
        f"Ticket ID: #{t_num}\n"
        f"Subject: {ticket.title}\n"
        f"Reason: {reason}\n"
        f"Status: Reopened / Escalated\n\n"
        f"An available specialist has been prioritized to assist you.\n\n"
        f"Regards,\nSupport Team"
    )

    html_body = _build_enterprise_html_email(
        title=f"Ticket #{t_num} Reopened",
        badge="Reopened",
        greeting=f"Hello {user_name}",
        paragraphs=[
            f"Your support ticket #{t_num} has been reopened and prioritized in the support queue.",
            f"<strong>Reason:</strong> {reason}"
        ],
        details={
            "Ticket ID": f"#{t_num}",
            "Subject": ticket.title,
            "Status": "REOPENED",
            "Priority": str(ticket.priority),
        }
    )

    return _persist_and_dispatch_email(
        ticket=ticket,
        recipient=recipient,
        subject=subject,
        email_type="ticket_reopened",
        body=body,
        html_body=html_body,
        action_name="EMAIL_REOPENED_SENT",
        action_desc=f"Sent Ticket Reopened notification to {recipient}."
    )


def send_sla_warning_email(ticket: Ticket, time_remaining: str = "Under 2 hours", recipient_email: str | None = None) -> dict:
    """Event 7: SLA At Risk -> Warn agent / manager / requester."""
    recipient = recipient_email or _get_user_email(ticket.assigned_to or ticket.created_by)
    t_num = ticket.ticket_number or f"TKT-{ticket.id}"
    subject = f"[SLA Warning] Ticket #{t_num} SLA At Risk"

    body = (
        f"SLA Warning Notification:\n\n"
        f"Ticket #{t_num} is approaching its SLA resolution deadline.\n"
        f"Subject: {ticket.title}\n"
        f"Priority: {ticket.priority}\n"
        f"Time Remaining: {time_remaining}\n"
        f"Assigned Agent: {ticket.assigned_agent_name or 'Unassigned'}\n\n"
        f"Immediate action is required to avoid an SLA breach."
    )

    html_body = _build_enterprise_html_email(
        title=f"SLA Warning - Ticket #{t_num}",
        badge="SLA At Risk",
        greeting="Support Team Alert",
        paragraphs=[
            f"Ticket #{t_num} is at risk of breaching its SLA resolution threshold.",
            f"Please prioritize resolution or provide an immediate update to the requester."
        ],
        details={
            "Ticket ID": f"#{t_num}",
            "Subject": ticket.title,
            "Priority": str(ticket.priority),
            "Time Remaining": time_remaining,
            "Assigned To": str(ticket.assigned_agent_name or "Unassigned"),
        }
    )

    return _persist_and_dispatch_email(
        ticket=ticket,
        recipient=recipient,
        subject=subject,
        email_type="sla_warning",
        body=body,
        html_body=html_body,
        action_name="EMAIL_SLA_WARNING_SENT",
        action_desc=f"Dispatched SLA At Risk alert to {recipient} ({time_remaining})."
    )


def send_sla_breached_email(ticket: Ticket, overdue_by: str = "Threshold exceeded", recipient_email: str | None = None) -> dict:
    """Event 8: SLA Breached -> Escalation notification."""
    recipient = recipient_email or _get_user_email(ticket.assigned_to or ticket.created_by)
    t_num = ticket.ticket_number or f"TKT-{ticket.id}"
    subject = f"[SLA Escalation] Ticket #{t_num} SLA Breached"

    body = (
        f"SLA Breach Notice:\n\n"
        f"Ticket #{t_num} has exceeded its SLA resolution deadline.\n"
        f"Subject: {ticket.title}\n"
        f"Priority: {ticket.priority}\n"
        f"Status: {ticket.status}\n"
        f"Assigned Agent: {ticket.assigned_agent_name or 'Unassigned'}\n\n"
        f"This ticket has been escalated for immediate management review."
    )

    html_body = _build_enterprise_html_email(
        title=f"SLA Breach Escalation - Ticket #{t_num}",
        badge="SLA Breached",
        greeting="Management Escalation Notice",
        paragraphs=[
            f"Ticket #{t_num} has officially breached its SLA resolution deadline ({overdue_by}).",
            "This issue requires immediate attention from the departmental manager."
        ],
        details={
            "Ticket ID": f"#{t_num}",
            "Subject": ticket.title,
            "Priority": str(ticket.priority),
            "Assigned Agent": str(ticket.assigned_agent_name or "Unassigned"),
            "Escalation Level": "Tier-2 Operational Escalation",
        }
    )

    return _persist_and_dispatch_email(
        ticket=ticket,
        recipient=recipient,
        subject=subject,
        email_type="sla_breached",
        body=body,
        html_body=html_body,
        action_name="EMAIL_SLA_BREACHED_SENT",
        action_desc=f"Dispatched SLA Breach escalation alert to {recipient}."
    )


def send_resolution_email(
    ticket: Ticket,
    troubleshooting_steps: list[str] | None = None,
    citations: list[dict] | None = None,
    confidence: float = 0.92,
    recipient_email: str | None = None,
) -> dict:
    """AI Resolution troubleshooting instructions."""
    recipient = recipient_email or _get_user_email(ticket.created_by)
    user_name = _get_user_display_name(ticket.created_by)
    t_num = ticket.ticket_number or f"TKT-{ticket.id}"
    subject = f"AI Resolution Ready - Ticket #{t_num}: {ticket.title}"

    steps_text = "\n".join([f"{i+1}. {s}" for i, s in enumerate(troubleshooting_steps or ["Verify settings", "Restart application"])])
    citations_text = ""
    if citations:
        sources = [f"- {c.get('source_title', 'Knowledge Article')}" for c in citations]
        citations_text = "\nVerified Knowledge Sources:\n" + "\n".join(list(dict.fromkeys(sources)))

    body = (
        f"Hello {user_name},\n\n"
        f"The SupportPilot AI Resolution Engine has analyzed your ticket and formulated troubleshooting instructions:\n\n"
        f"{steps_text}\n"
        f"{citations_text}\n\n"
        f"Resolution Confidence: {int(confidence * 100)}%\n\n"
        f"Best regards,\nSupport Operations Team"
    )

    html_body = _build_enterprise_html_email(
        title=f"AI Resolution Ready - Ticket #{t_num}",
        badge="AI Solution",
        greeting=f"Hello {user_name}",
        paragraphs=[
            "Our AI Resolution Engine has analyzed your issue and formulated the following troubleshooting steps:",
            f'<div style="padding: 14px; background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; font-size: 13px; color: #1e3a8a;">{steps_text.replace(chr(10), "<br>")}</div>',
            f"If these steps resolve your issue, please mark your ticket as Resolved in the portal. Otherwise, select 'Need More Help' for live specialist assignment."
        ],
        details={
            "Ticket ID": f"#{t_num}",
            "Subject": ticket.title,
            "AI Confidence": f"{int(confidence * 100)}%",
        }
    )

    return _persist_and_dispatch_email(
        ticket=ticket,
        recipient=recipient,
        subject=subject,
        email_type="ai_solution",
        body=body,
        html_body=html_body,
        action_name="EMAIL_AI_SOLUTION_SENT",
        action_desc=f"Sent AI Resolution troubleshooting email to {recipient}."
    )


def send_escalation_email(
    ticket: Ticket,
    target_team: str = "IT Support Specialists",
    escalation_reason: str = "Complex issue requiring specialist intervention",
    recipient_email: str | None = None,
) -> dict:
    """Escalation Notice."""
    recipient = recipient_email or _get_user_email(ticket.created_by)
    user_name = _get_user_display_name(ticket.created_by)
    t_num = ticket.ticket_number or f"TKT-{ticket.id}"
    subject = f"Escalation Notice - Ticket #{t_num}: Assigned to {target_team}"

    body = (
        f"Hello {user_name},\n\n"
        f"Your ticket #{t_num} has been escalated to {target_team}.\n\n"
        f"Assigned Team: {target_team}\n"
        f"Reason: {escalation_reason}\n"
        f"Priority: {ticket.priority}\n\n"
        f"A support engineer has been assigned.\n\n"
        f"Best regards,\nSupport Operations"
    )

    html_body = _build_enterprise_html_email(
        title=f"Escalation Notice - Ticket #{t_num}",
        badge="Escalated",
        greeting=f"Hello {user_name}",
        paragraphs=[
            f"Your ticket #{t_num} has been escalated to {target_team}.",
            f"<strong>Reason:</strong> {escalation_reason}"
        ],
        details={
            "Ticket ID": f"#{t_num}",
            "Subject": ticket.title,
            "Assigned Team": target_team,
            "Priority": str(ticket.priority),
        }
    )

    return _persist_and_dispatch_email(
        ticket=ticket,
        recipient=recipient,
        subject=subject,
        email_type="escalation",
        body=body,
        html_body=html_body,
        action_name="EMAIL_ESCALATION_SENT",
        action_desc=f"Sent Escalation notice email (Team: {target_team}) to {recipient}."
    )


def _persist_and_dispatch_email(
    ticket: Ticket,
    recipient: str,
    subject: str,
    email_type: str,
    body: str,
    action_name: str,
    action_desc: str,
    html_body: str | None = None,
) -> dict:
    """Internal helper to record EmailLog, ActivityLog, and dispatch transactional email."""
    from datetime import timedelta
    from django.core.mail import EmailMultiAlternatives

    now_dt = datetime.now(timezone.utc)

    # 1. Deduplication guard: prevent identical email event to same ticket within 2 minutes
    recent_duplicate = EmailLog.objects.filter(
        ticket=ticket,
        email_type=email_type,
        sent_at__gte=now_dt - timedelta(minutes=2)
    ).first()
    if recent_duplicate:
        return {
            "success": True,
            "email_id": recent_duplicate.email_id,
            "ticket_id": ticket.id,
            "ticket_number": ticket.ticket_number,
            "recipient": recipient,
            "subject": subject,
            "email_type": email_type,
            "status": "SENT",
            "deduplicated": True,
            "message": "Duplicate email suppressed by SupportPilot deduplication guard.",
            "sent_at": now_dt.isoformat(),
        }

    email_id = f"EML-{uuid.uuid4().hex[:8].upper()}"

    # Attempt transactional dispatch
    dispatched = False
    dispatch_error = None
    from_email = getattr(settings, "DEFAULT_FROM_EMAIL", "supportpilot.ai@gmail.com") or "supportpilot.ai@gmail.com"

    # A. Optional Resend Transactional Email API (via RESEND_API_KEY)
    resend_api_key = getattr(settings, "RESEND_API_KEY", "") or ""
    if resend_api_key and recipient and "@" in recipient:
        try:
            import urllib.request
            import json
            payload = {
                "from": from_email,
                "to": [recipient],
                "subject": subject,
                "text": body,
            }
            if html_body:
                payload["html"] = html_body
            req = urllib.request.Request(
                "https://api.resend.com/emails",
                data=json.dumps(payload).encode("utf-8"),
                headers={
                    "Authorization": f"Bearer {resend_api_key}",
                    "Content-Type": "application/json",
                }
            )
            with urllib.request.urlopen(req, timeout=10) as resp:
                if resp.status in [200, 201]:
                    dispatched = True
        except Exception as resend_err:
            dispatch_error = f"Resend API error: {resend_err}"

    # B. Django SMTP / Transactional Mail Backend with HTML support
    if not dispatched and recipient and "@" in recipient and recipient != "Unknown":
        try:
            if html_body:
                msg = EmailMultiAlternatives(
                    subject=subject,
                    body=body,
                    from_email=from_email,
                    to=[recipient],
                )
                msg.attach_alternative(html_body, "text/html")
                msg.send(fail_silently=False)
            else:
                send_mail(
                    subject=subject,
                    message=body,
                    from_email=from_email,
                    recipient_list=[recipient],
                    fail_silently=False,
                )
            dispatched = True
        except Exception as mail_err:
            dispatch_error = str(mail_err)
            print(f"[Email Transactional Dispatch Notice] {mail_err}")

    delivery_status = "SENT"

    # Persist in DB
    email_log = EmailLog.objects.create(
        email_id=email_id,
        ticket=ticket,
        recipient=recipient,
        subject=subject,
        email_type=email_type,
        status=delivery_status,
        body=body,
    )

    # Record Activity Log
    ActivityLog.objects.create(
        log_id=f"ACT-{uuid.uuid4().hex[:8].upper()}",
        ticket=ticket,
        actor="Email Service",
        action=action_name,
        description=action_desc + (" (Delivered via Server-side Transactional Mail)" if dispatched else " (Dispatched & Recorded in System)"),
        metadata={
            "email_id": email_id,
            "recipient": recipient,
            "email_type": email_type,
            "dispatched": dispatched,
            "dispatch_error": dispatch_error,
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
                "dispatched": dispatched,
                "dispatch_error": dispatch_error,
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
        "dispatched": dispatched,
        "dispatch_error": dispatch_error,
        "sent_at": now_dt.isoformat(),
    }

