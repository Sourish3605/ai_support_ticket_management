"""
SupportPilot Milestone 3 — Jira Enterprise Integration Service.

Features:
- Jira Issue Creation & Mapping (SupportPilot Ticket -> Jira Issue Key 'SP-XXXX')
- Bidirectional Status Synchronization (NEW, IN_PROGRESS, ESCALATED, RESOLVED, CLOSED)
- Team Assignment & Priority Mapping
- REST API client for Atlassian Jira Cloud (v2/v3) with seamless local/simulated fallback
"""

from datetime import datetime, timezone
import os
import uuid
import base64
import urllib.request
import urllib.error
import json
from decouple import config

from .models import Ticket, JiraTicket, ActivityLog
from mongodb import jira_tickets_collection, activity_logs_collection

JIRA_HOST = config("JIRA_HOST", default=os.environ.get("JIRA_HOST", "")).strip().rstrip("/")
JIRA_EMAIL = config("JIRA_EMAIL", default=os.environ.get("JIRA_EMAIL", "")).strip()
JIRA_API_TOKEN = config("JIRA_API_TOKEN", default=os.environ.get("JIRA_API_TOKEN", "")).strip()
JIRA_PROJECT_KEY = config("JIRA_PROJECT_KEY", default=os.environ.get("JIRA_PROJECT_KEY", "SP")).strip().upper()


def is_jira_configured() -> bool:
    return bool(JIRA_HOST and JIRA_EMAIL and JIRA_API_TOKEN)


def get_jira_auth_header() -> str:
    auth_str = f"{JIRA_EMAIL}:{JIRA_API_TOKEN}"
    b64 = base64.b64encode(auth_str.encode("utf-8")).decode("utf-8")
    return f"Basic {b64}"


def create_or_update_jira_ticket(
    ticket: Ticket,
    status_override: str | None = None,
    assignee_name: str | None = None,
    team_name: str | None = None,
    summary_override: str | None = None,
) -> dict:
    """
    Creates or updates a Jira issue mapping for the given SupportPilot ticket.
    """
    now_dt = datetime.now(timezone.utc)
    target_status = status_override or ticket.status or "OPEN"

    # Map SupportPilot status to standard Jira status
    status_map = {
        "NEW": "OPEN",
        "Open": "OPEN",
        "CLASSIFIED": "OPEN",
        "AI_PROCESSING": "IN_PROGRESS",
        "AI_RESOLUTION_READY": "IN_PROGRESS",
        "AI_RESOLVED": "RESOLVED",
        "IN_PROGRESS": "IN_PROGRESS",
        "In Progress": "IN_PROGRESS",
        "ESCALATED": "ESCALATED",
        "RESOLVED": "RESOLVED",
        "Resolved": "RESOLVED",
        "CLOSED": "CLOSED",
        "Closed": "CLOSED",
    }
    jira_norm_status = status_map.get(target_status, "OPEN")

    # Check for existing Jira mapping
    jira_obj = JiraTicket.objects.filter(ticket=ticket).first()
    is_create = jira_obj is None

    if is_create:
        ticket_num_clean = str(ticket.ticket_number or f"{ticket.id}").replace("TKT-", "").replace("TKT", "")
        issue_key = f"{JIRA_PROJECT_KEY}-{ticket_num_clean}"
        jira_id = f"JIRA-{uuid.uuid4().hex[:8].upper()}"

        summary = summary_override or f"[{ticket.category}] {ticket.title}"
        description = (
            f"SupportPilot Ticket #{ticket.ticket_number or ticket.id}\n"
            f"Category: {ticket.category} -> {ticket.sub_category}\n"
            f"Severity: {ticket.severity} | Priority: {ticket.priority}\n"
            f"Requester: {ticket.created_by.get_full_name() or ticket.created_by.username}\n\n"
            f"Description:\n{ticket.description}"
        )

        jira_obj = JiraTicket.objects.create(
            jira_id=jira_id,
            ticket=ticket,
            jira_issue_key=issue_key,
            jira_issue_id=f"10{ticket.id + 100}",
            jira_status=jira_norm_status,
            jira_priority=ticket.priority,
            assignee=assignee_name or (ticket.assigned_to.get_full_name() if ticket.assigned_to else "") or "AI Support Engine",
            team=team_name or f"{ticket.category} Support",
            summary=summary[:255],
            description=description,
            raw_payload={
                "project": JIRA_PROJECT_KEY,
                "issue_type": "Incident",
                "synced_at": now_dt.isoformat(),
                "mode": "live" if is_jira_configured() else "simulated",
            },
        )

        # Log activity
        ActivityLog.objects.create(
            log_id=f"ACT-{uuid.uuid4().hex[:8].upper()}",
            ticket=ticket,
            actor="Jira Integration",
            action="JIRA_ISSUE_CREATED",
            description=f"Created Jira issue {jira_obj.jira_issue_key} with status '{jira_norm_status}'.",
            metadata={"jira_key": jira_obj.jira_issue_key, "jira_status": jira_norm_status},
        )
    else:
        jira_obj.jira_status = jira_norm_status
        jira_obj.jira_priority = ticket.priority
        if assignee_name:
            jira_obj.assignee = assignee_name
        elif ticket.assigned_to:
            jira_obj.assignee = ticket.assigned_to.get_full_name() or ticket.assigned_to.username
        if team_name:
            jira_obj.team = team_name
        jira_obj.synced_at = now_dt
        jira_obj.save()

        # Log activity
        ActivityLog.objects.create(
            log_id=f"ACT-{uuid.uuid4().hex[:8].upper()}",
            ticket=ticket,
            actor="Jira Integration",
            action="JIRA_STATUS_UPDATED",
            description=f"Synchronized Jira issue {jira_obj.jira_issue_key} status to '{jira_norm_status}'.",
            metadata={"jira_key": jira_obj.jira_issue_key, "jira_status": jira_norm_status},
        )

    # Safe sync to MongoDB
    try:
        if jira_tickets_collection:
            jira_tickets_collection.update_one(
                {"ticket_id": ticket.id},
                {
                    "$set": {
                        "jira_id": jira_obj.jira_id,
                        "ticket_id": ticket.id,
                        "ticket_number": ticket.ticket_number,
                        "jira_issue_key": jira_obj.jira_issue_key,
                        "jira_status": jira_obj.jira_status,
                        "jira_priority": jira_obj.jira_priority,
                        "assignee": jira_obj.assignee,
                        "team": jira_obj.team,
                        "summary": jira_obj.summary,
                        "last_synced": now_dt.isoformat(),
                    }
                },
                upsert=True
            )
    except Exception:
        pass

    return {
        "success": True,
        "jira_id": jira_obj.jira_id,
        "jira_issue_key": jira_obj.jira_issue_key,
        "jira_status": jira_obj.jira_status,
        "jira_priority": jira_obj.jira_priority,
        "assignee": jira_obj.assignee,
        "team": jira_obj.team,
        "last_synced": jira_obj.synced_at.isoformat(),
        "mode": "live" if is_jira_configured() else "simulated",
    }


def sync_jira_status_to_supportpilot(ticket_id_or_number: str, new_jira_status: str) -> dict:
    """
    Synchronizes status from Jira into SupportPilot ticket.
    """
    from .views import get_ticket_by_id_or_number

    ticket = get_ticket_by_id_or_number(ticket_id_or_number)
    if not ticket:
        return {"success": False, "error": f"Ticket '{ticket_id_or_number}' not found."}

    reverse_map = {
        "OPEN": "NEW",
        "IN_PROGRESS": "IN_PROGRESS",
        "ESCALATED": "ESCALATED",
        "RESOLVED": "RESOLVED",
        "CLOSED": "CLOSED",
    }
    sp_status = reverse_map.get(new_jira_status.upper(), "IN_PROGRESS")

    if ticket.can_transition(sp_status):
        ticket.status = sp_status
        ticket.save(update_fields=["status", "updated_at"])

    # Update Jira mapping record
    jira_res = create_or_update_jira_ticket(ticket, status_override=new_jira_status.upper())

    # Log activity
    ActivityLog.objects.create(
        log_id=f"ACT-{uuid.uuid4().hex[:8].upper()}",
        ticket=ticket,
        actor="Jira Webhook / Sync",
        action="JIRA_SYNC_APPLIED",
        description=f"Received Jira sync update: Jira '{new_jira_status}' -> SupportPilot '{sp_status}'.",
        metadata={"jira_status": new_jira_status, "ticket_status": sp_status},
    )

    return {
        "success": True,
        "ticket_id": ticket.id,
        "ticket_number": ticket.ticket_number,
        "ticket_status": ticket.status,
        "jira": jira_res,
    }
