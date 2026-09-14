import os
import sys
import django
from datetime import datetime, timezone, timedelta

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from django.contrib.auth import get_user_model
from apps.support.models import (
    Ticket,
    TicketReply,
    AgentWorkflow,
    AgentExecution,
    JiraTicket,
    EmailLog,
    ActivityLog,
)

User = get_user_model()

def populate_image1_dataset():
    print("Populating exact Image 1 dataset into Django database...")

    # 1. Clear existing tickets and related records
    TicketReply.objects.all().delete()
    AgentExecution.objects.all().delete()
    AgentWorkflow.objects.all().delete()
    JiraTicket.objects.all().delete()
    EmailLog.objects.all().delete()
    ActivityLog.objects.all().delete()
    Ticket.objects.all().delete()

    # 2. Ensure core users exist
    customer = User.objects.filter(email="customer@gmail.com").first()
    if not customer:
        customer = User.objects.create(username="customer@gmail.com", email="customer@gmail.com", first_name="Customer", last_name="")

    test_cust = User.objects.filter(email="test@gmail.com").first()
    if not test_cust:
        test_cust = User.objects.create(username="test@gmail.com", email="test@gmail.com", first_name="Test", last_name="User")
    agent_chen = User.objects.filter(email="agent@gmail.com").first()
    if not agent_chen:
        agent_chen = User.objects.create(username="agent@gmail.com", email="agent@gmail.com", first_name="Agent", last_name="Chen")

    yogitha = User.objects.filter(email="yogitha@gmail.com").first()
    if not yogitha:
        yogitha = User.objects.create(username="yogitha@gmail.com", email="yogitha@gmail.com", first_name="Yogitha", last_name="R.")

    premalatha = User.objects.filter(email="premalatha@gmail.com").first()
    if not premalatha:
        premalatha = User.objects.create(username="premalatha@gmail.com", email="premalatha@gmail.com", first_name="Premalatha", last_name="S.")

    david = User.objects.filter(email="david_it@gmail.com").first()
    if not david:
        david = User.objects.create(username="david_it", email="david_it@gmail.com", first_name="David", last_name="Miller")

    admin = User.objects.filter(email="admin@gmail.com").first()
    if not admin:
        admin = User.objects.create(username="admin@gmail.com", email="admin@gmail.com", first_name="Admin", last_name="")

    now = datetime.now(timezone.utc)

    # 3. Define the 28 tickets matching Image 1
    # 13 Active for Agent Chen (12 Pending + 1 In Progress), 5 Completed for Agent Chen (18 total for Agent Chen)
    # 5 Unassigned tickets
    # 5 Other / multi-agent tickets
    tickets_data = [
        # --- Visible in Image 1 table for Agent Chen ---
        {
            "ticket_number": "TKT-1001",
            "title": "Payment deducted twice for subscription renewal",
            "description": "I noticed two charges of $49 on my credit card statement for the same monthly subscription renewal.",
            "category": "Finance",
            "sub_category": "Billing",
            "department": "Finance Department",
            "priority": "P2 - High",
            "severity": "High",
            "status": "RESOLVED",
            "assigned_to": agent_chen,
            "created_by": customer,
            "sla_breached": False,
        },
        {
            "ticket_number": "TKT-1002",
            "title": "Unable to login to my account",
            "description": "After multiple password attempts, my account got locked out. Need an immediate reset.",
            "category": "Authentication",
            "sub_category": "Password Reset",
            "department": "IT Department",
            "priority": "P3 - Medium",
            "severity": "Medium",
            "status": "RESOLVED",
            "assigned_to": agent_chen,
            "created_by": customer,
            "sla_breached": False,
        },
        {
            "ticket_number": "TKT-1003",
            "title": "VPN connection drops every 5 minutes",
            "description": "Corporate VPN keeps disconnecting after a few minutes of idle time. Need persistent connection.",
            "category": "Network",
            "sub_category": "VPN",
            "department": "IT Department",
            "priority": "P2 - High",
            "severity": "High",
            "status": "RESOLVED",
            "assigned_to": agent_chen,
            "created_by": customer,
            "sla_breached": False,
        },
        {
            "ticket_number": "TKT-1004",
            "title": "not opening the website",
            "description": "Customer portal website throws ERR_CONNECTION_TIMED_OUT intermittently when opening the login page.",
            "category": "General",
            "sub_category": "Other",
            "department": "IT Department",
            "priority": "P4 - Low",
            "severity": "Low",
            "status": "Classified",
            "assigned_to": agent_chen,
            "created_by": customer,
            "sla_breached": True,
        },
        {
            "ticket_number": "TKT-1005",
            "title": "Suspicious email received",
            "description": "Received an unexpected phishing email requesting credentials update with suspicious external links.",
            "category": "Email",
            "sub_category": "Outlook Sync",
            "department": "IT Department",
            "priority": "P4 - Low",
            "severity": "Low",
            "status": "AI_RESPONDED",
            "assigned_to": agent_chen,
            "created_by": customer,
            "sla_breached": True,
        },
        {
            "ticket_number": "TKT-1006",
            "title": "Data missing from dashboard analytics",
            "description": "The weekly reports dashboard is showing empty graphs for the past 48 hours.",
            "category": "General",
            "sub_category": "Reporting",
            "department": "IT Department",
            "priority": "P1 - Critical",
            "severity": "Critical",
            "status": "IN_PROGRESS",
            "assigned_to": agent_chen,
            "created_by": customer,
            "sla_breached": True,
        },
        {
            "ticket_number": "TKT-1007",
            "title": "Unable to send emails",
            "description": "Outlook client returns error 0x800CCC0E when sending outgoing SMTP messages.",
            "category": "Email",
            "sub_category": "Outlook Sync",
            "department": "IT Department",
            "priority": "P3 - Medium",
            "severity": "Medium",
            "status": "Classified",
            "assigned_to": agent_chen,
            "created_by": test_cust,
            "sla_breached": True,
        },
        {
            "ticket_number": "TKT-1008",
            "title": "Laptop overheating and fan running constantly",
            "description": "MacBook Pro fan runs at maximum RPM and battery drains in less than one hour.",
            "category": "Hardware",
            "sub_category": "Computer/Peripheral",
            "department": "IT Department",
            "priority": "P3 - Medium",
            "severity": "Medium",
            "status": "ASSIGNED",
            "assigned_to": agent_chen,
            "created_by": customer,
            "sla_breached": True,
        },
        {
            "ticket_number": "TKT-1009",
            "title": "SLA Breach Notification Check",
            "description": "Checking response escalation pipeline for critical network and server tickets.",
            "category": "General",
            "sub_category": "Other",
            "department": "IT Department",
            "priority": "P1 - Critical",
            "severity": "Critical",
            "status": "ASSIGNED",
            "assigned_to": agent_chen,
            "created_by": customer,
            "sla_breached": True,
        },
        {
            "ticket_number": "TKT-1010",
            "title": "Cannot access shared network drive",
            "description": "Getting permission denied error when mounting SMB network volume \\\\storage\\teams.",
            "category": "Network",
            "sub_category": "Shared Drive",
            "department": "IT Department",
            "priority": "P2 - High",
            "severity": "High",
            "status": "ASSIGNED",
            "assigned_to": agent_chen,
            "created_by": customer,
            "sla_breached": True,
        },
        {
            "ticket_number": "TKT-1011",
            "title": "Email is not working",
            "description": "Unable to connect to Microsoft Exchange server from the mobile Outlook application.",
            "category": "Email",
            "sub_category": "Outlook Sync",
            "department": "IT Department",
            "priority": "P2 - High",
            "severity": "High",
            "status": "AI_RESPONDED",
            "assigned_to": agent_chen,
            "created_by": customer,
            "sla_breached": True,
        },
        {
            "ticket_number": "TKT-1012",
            "title": "Software installation request",
            "description": "Need administrative privileges to install Docker Desktop and VS Code updates on work machine.",
            "category": "Email",
            "sub_category": "Outlook Sync",
            "department": "IT Department",
            "priority": "P4 - Low",
            "severity": "Low",
            "status": "Assigned",
            "assigned_to": agent_chen,
            "created_by": customer,
            "sla_breached": True,
        },
        {
            "ticket_number": "TKT-1013",
            "title": "Monitor display flickering via HDMI",
            "description": "External Dell 4K display goes black for 2 seconds every few minutes when connected via HDMI adapter.",
            "category": "Hardware",
            "sub_category": "Peripheral",
            "department": "IT Department",
            "priority": "P3 - Medium",
            "severity": "Medium",
            "status": "ASSIGNED",
            "assigned_to": agent_chen,
            "created_by": customer,
            "sla_breached": True,
        },
        {
            "ticket_number": "TKT-1014",
            "title": "Zoom audio echo in conference room",
            "description": "Conference Room B microphones have feedback loop causing severe echo during video calls.",
            "category": "General",
            "sub_category": "Audio/Video",
            "department": "IT Department",
            "priority": "P4 - Low",
            "severity": "Low",
            "status": "ASSIGNED",
            "assigned_to": agent_chen,
            "created_by": customer,
            "sla_breached": True,
        },
        {
            "ticket_number": "TKT-1015",
            "title": "Printer queue stalled on 3rd floor",
            "description": "HP LaserJet on 3rd floor is showing document error and not printing queued jobs.",
            "category": "Hardware",
            "sub_category": "Printer",
            "department": "IT Department",
            "priority": "P4 - Low",
            "severity": "Low",
            "status": "ASSIGNED",
            "assigned_to": agent_chen,
            "created_by": customer,
            "sla_breached": True,
        },
        {
            "ticket_number": "TKT-1016",
            "title": "SSO certificate expired on staging",
            "description": "Staging environment SAML SSO returns 500 error due to expired x509 certificate.",
            "category": "Authentication",
            "sub_category": "SSO",
            "department": "IT Department",
            "priority": "P1 - Critical",
            "severity": "Critical",
            "status": "ASSIGNED",
            "assigned_to": agent_chen,
            "created_by": customer,
            "sla_breached": True,
        },
        {
            "ticket_number": "TKT-1017",
            "title": "Database backup verification completed",
            "description": "Monthly PostgreSQL backup snapshot integrity check passed with zero errors.",
            "category": "General",
            "sub_category": "Maintenance",
            "department": "IT Department",
            "priority": "P3 - Medium",
            "severity": "Medium",
            "status": "RESOLVED",
            "assigned_to": agent_chen,
            "created_by": customer,
            "sla_breached": False,
        },
        {
            "ticket_number": "TKT-1018",
            "title": "New employee workstation setup",
            "description": "Configured M3 MacBook Pro, access cards, and developer credentials for onboarding.",
            "category": "General",
            "sub_category": "Onboarding",
            "department": "IT Department",
            "priority": "P3 - Medium",
            "severity": "Medium",
            "status": "RESOLVED",
            "assigned_to": agent_chen,
            "created_by": customer,
            "sla_breached": False,
        },
        # --- 5 Unassigned Tickets ---
        {
            "ticket_number": "TKT-1019",
            "title": "New account setup for marketing intern",
            "description": "Please create corporate email, Slack, and Figma access for incoming marketing intern.",
            "category": "General",
            "sub_category": "Onboarding",
            "department": "IT Department",
            "priority": "P3 - Medium",
            "severity": "Medium",
            "status": "NEW",
            "assigned_to": None,
            "created_by": customer,
            "sla_breached": False,
        },
        {
            "ticket_number": "TKT-1020",
            "title": "Security badge not scanning at East gate",
            "description": "RFID access badge failed to unlock the East office entrance door.",
            "category": "General",
            "sub_category": "Facilities",
            "department": "IT Department",
            "priority": "P2 - High",
            "severity": "High",
            "status": "CLASSIFIED",
            "assigned_to": None,
            "created_by": customer,
            "sla_breached": False,
        },
        {
            "ticket_number": "TKT-1021",
            "title": "Request keyboard replacement (mechanical)",
            "description": "Spacebar on current workstation keyboard is sticky and double-typing.",
            "category": "Hardware",
            "sub_category": "Peripheral",
            "department": "IT Department",
            "priority": "P4 - Low",
            "severity": "Low",
            "status": "OPEN",
            "assigned_to": None,
            "created_by": customer,
            "sla_breached": False,
        },
        {
            "ticket_number": "TKT-1022",
            "title": "Two-factor authentication device replacement",
            "description": "Lost my secondary YubiKey token. Need to register backup hardware key.",
            "category": "Authentication",
            "sub_category": "2FA",
            "department": "IT Department",
            "priority": "P2 - High",
            "severity": "High",
            "status": "OPEN",
            "assigned_to": None,
            "created_by": customer,
            "sla_breached": False,
        },
        {
            "ticket_number": "TKT-1023",
            "title": "GitLab CI pipeline runner failure",
            "description": "Docker build runner exited with out-of-disk-space error on runner-node-04.",
            "category": "General",
            "sub_category": "DevOps",
            "department": "IT Department",
            "priority": "P1 - Critical",
            "severity": "Critical",
            "status": "OPEN",
            "assigned_to": None,
            "created_by": customer,
            "sla_breached": False,
        },
        # --- Other Department / Agent Tickets ---
        {
            "ticket_number": "TKT-1024",
            "title": "Annual leave balance discrepancy",
            "description": "Payroll portal shows 12 PTO days remaining instead of 16 approved days.",
            "category": "HR",
            "sub_category": "Payroll",
            "department": "HR Department",
            "priority": "P3 - Medium",
            "severity": "Medium",
            "status": "ASSIGNED",
            "assigned_to": yogitha,
            "created_by": customer,
            "sla_breached": False,
        },
        {
            "ticket_number": "TKT-1025",
            "title": "Expense report approval pending",
            "description": "Travel expense report #EXP-8829 has been awaiting Level 2 manager sign-off for 5 days.",
            "category": "Finance",
            "sub_category": "Reimbursement",
            "department": "Finance Department",
            "priority": "P3 - Medium",
            "severity": "Medium",
            "status": "ASSIGNED",
            "assigned_to": premalatha,
            "created_by": customer,
            "sla_breached": False,
        },
        {
            "ticket_number": "TKT-1026",
            "title": "Office temperature regulation in Wing C",
            "description": "Thermostat in Wing C is locked at 62F. Please adjust HVAC setpoint.",
            "category": "General",
            "sub_category": "Facilities",
            "department": "Admin Department",
            "priority": "P4 - Low",
            "severity": "Low",
            "status": "ASSIGNED",
            "assigned_to": david,
            "created_by": customer,
            "sla_breached": False,
        },
        {
            "ticket_number": "TKT-1027",
            "title": "API rate limiting on analytics endpoint",
            "description": "Partner API integration hitting 429 Too Many Requests during morning synchronization.",
            "category": "General",
            "sub_category": "API",
            "department": "IT Department",
            "priority": "P1 - Critical",
            "severity": "Critical",
            "status": "ASSIGNED",
            "assigned_to": admin,
            "created_by": customer,
            "sla_breached": False,
        },
        {
            "ticket_number": "TKT-1028",
            "title": "SSL certificate renewal for public portal",
            "description": "Wildcard certificate *.supportpilot.com expires in 7 days. Automated Let's Encrypt renew failed.",
            "category": "Network",
            "sub_category": "Security",
            "department": "IT Department",
            "priority": "P1 - Critical",
            "severity": "Critical",
            "status": "ASSIGNED",
            "assigned_to": yogitha,
            "created_by": customer,
            "sla_breached": False,
        },
    ]

    for idx, d in enumerate(tickets_data, start=1):
        t = Ticket.objects.create(
            id=idx,
            ticket_number=d["ticket_number"],
            title=d["title"],
            description=d["description"],
            category=d["category"],
            sub_category=d["sub_category"],
            department=d["department"],
            priority=d["priority"],
            severity=d["severity"],
            status=d["status"],
            sentiment="NEUTRAL",
            sentiment_score=0.85,
            ai_confidence=0.92,
            assigned_to=d["assigned_to"],
            created_by=d["created_by"],
            sla_breached=d["sla_breached"],
            sla_response_due=now + timedelta(hours=2),
            sla_resolution_due=now + timedelta(hours=8),
            created_at=now - timedelta(hours=idx * 2),
            updated_at=now - timedelta(minutes=idx * 15),
        )

        # Create Agent Workflow for each
        wf = AgentWorkflow.objects.create(
            ticket=t,
            workflow_id=f"WF-{t.ticket_number}",
            workflow_status="COMPLETED" if t.status in ["RESOLVED", "CLOSED"] else "ACTIVE",
            current_agent="Validation Gate" if t.status == "AI_RESPONDED" else "Diagnosis Agent",
            final_confidence=0.94,
            latency_ms=180,
            started_at=t.created_at,
            completed_at=t.updated_at,
        )

        # Create Jira Ticket
        JiraTicket.objects.create(
            ticket=t,
            jira_id=f"SP-{1000 + idx}",
            jira_issue_key=f"SP-{1000 + idx}",
            jira_status="RESOLVED" if t.status in ["RESOLVED", "CLOSED"] else "IN_PROGRESS",
            assignee=d["assigned_to"].get_full_name() if d["assigned_to"] else "SupportPilot Engine",
            team=f"{d['category']} Support",
            synced_at=now,
        )

        # Create Email Log
        EmailLog.objects.create(
            ticket=t,
            email_id=f"EML-{t.ticket_number}-1",
            email_type="ticket_created",
            recipient=d["created_by"].email,
            subject=f"[SupportPilot] Ticket Received - #{t.ticket_number}: {t.title}",
            status="SENT",
            body=f"Hello,\n\nWe have received your ticket #{t.ticket_number}. Our team is reviewing it.",
            sent_at=t.created_at,
        )

    print(f"Successfully populated {len(tickets_data)} tickets matching Image 1!")

if __name__ == "__main__":
    populate_image1_dataset()
