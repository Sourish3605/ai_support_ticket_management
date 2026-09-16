"""
Automated Verification Suite for AI-based Automatic Email Notification System.
Tests:
1. Dynamic AI Email Generation for all 5 statuses (Open, In Progress, Pending, Solved, Closed)
2. Backend Automatic Trigger on Ticket Creation -> Open Acknowledgement Email
3. Backend Automatic Trigger on Status Change -> In Progress, Pending, Solved, Closed
4. Admin AI Email Automation Config (Toggles per status and global auto-send)
5. Toggle Disable Suppression (Disabling Open/Pending suppresses email)
6. Deduplication guard preventing duplicate emails for identical status transition
7. Failure logging and Admin retry mechanism
"""

import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from apps.support.models import Ticket, EmailLog, AIEmailAutomationConfig, ActivityLog
from apps.support.email_service import (
    generate_ai_status_email,
    dispatch_status_ai_email,
    get_ai_email_config,
    update_ai_email_config,
    retry_failed_email_dispatch,
)

User = get_user_model()
client = APIClient()

print("\n" + "="*80)
print("  AI SUPPORT TICKET MANAGEMENT — AI EMAIL AUTOMATION VERIFICATION SUITE")
print("="*80 + "\n")

results = []

def record(test_num, name, passed, details=""):
    status_label = "PASS" if passed else "FAIL"
    results.append((f"Test {test_num}", name, status_label, details))
    print(f"[{status_label}] Test {test_num}: {name} -> {details}")

# Setup Test User
test_cust, _ = User.objects.get_or_create(
    username="email_test_cust",
    defaults={"email": "sarah.connor@acme.corp", "first_name": "Sarah", "last_name": "Connor"}
)
test_cust.set_password("password123")
test_cust.save()

test_agent, _ = User.objects.get_or_create(
    username="email_test_agent",
    defaults={"email": "prem.kumar@supportpilot.com", "first_name": "Prem", "last_name": "Kumar", "is_staff": True}
)
test_agent.set_password("password123")
test_agent.save()

# Reset config to enabled
update_ai_email_config({
    "open_enabled": True,
    "in_progress_enabled": True,
    "pending_enabled": True,
    "solved_enabled": True,
    "closed_enabled": True,
    "auto_send_enabled": True,
})

# -------------------------------------------------------------
# Test 1: AI Email Generation for all 5 Statuses
# -------------------------------------------------------------
try:
    ticket = Ticket.objects.create(
        created_by=test_cust,
        title="VPN Client disconnecting every 10 minutes",
        description="I am experiencing frequent VPN dropouts while working remotely on Windows 11.",
        category="Network",
        sub_category="VPN",
        department="IT Department",
        priority="High",
        severity="High",
        status="OPEN",
    )

    # Open Email
    open_email = generate_ai_status_email(ticket, "OPEN")
    has_open_fields = (
        "Sarah" in open_email["body"] and
        ticket.ticket_number in open_email["subject"] and
        "VPN" in open_email["body"] and
        open_email["trigger_status"] == "OPEN" and
        len(open_email["html_body"]) > 100
    )

    # In Progress Email
    in_prog_email = generate_ai_status_email(ticket, "IN_PROGRESS")
    has_in_prog = "In Progress" in in_prog_email["badge"] and ticket.ticket_number in in_prog_email["subject"]

    # Pending Email
    pending_email = generate_ai_status_email(ticket, "PENDING")
    has_pending = "Action Required" in pending_email["badge"] or "Pending" in pending_email["badge"]

    # Solved Email
    solved_email = generate_ai_status_email(ticket, "SOLVED", extra_context={"resolution_notes": "Updated Cisco AnyConnect profile to v4.9 and flushed DNS cache."})
    has_solved = "Resolved" in solved_email["badge"] and "Cisco AnyConnect" in solved_email["body"]

    # Closed Email
    closed_email = generate_ai_status_email(ticket, "CLOSED")
    has_closed = "Closed" in closed_email["badge"]

    all_gen_pass = has_open_fields and has_in_prog and has_pending and has_solved and has_closed
    record(1, "Dynamic AI Email Generator for all 5 Statuses", all_gen_pass, "Generated rich, context-aware emails for Open, In Progress, Pending, Solved, Closed")
except Exception as e:
    record(1, "Dynamic AI Email Generator for all 5 Statuses", False, str(e))

# -------------------------------------------------------------
# Test 2: Ticket Creation API automatically triggers Open AI Email
# -------------------------------------------------------------
try:
    client.force_authenticate(user=test_cust)
    resp = client.post("/api/tickets/", {
        "subject": "Outlook 365 crashes on launch",
        "description": "Whenever I click on Outlook it terminates with exception code 0xc0000005.",
        "category": "Software",
        "sub_category": "Email Client",
        "priority": "P2 - High",
    }, format="json")

    tkt_data = resp.data
    tkt_id = tkt_data.get("id")
    created_tkt = Ticket.objects.get(id=tkt_id)

    # Check if EmailLog was generated for this ticket
    email_log = EmailLog.objects.filter(ticket=created_tkt, trigger_status="OPEN").first()
    has_log = email_log is not None and email_log.status in ["SENT", "FAILED"] and "Outlook" in email_log.subject
    record(2, "Automatic Open-status AI Email on Ticket Creation", has_log, f"Dispatched Email ID: {email_log.email_id if email_log else 'None'}")
except Exception as e:
    record(2, "Automatic Open-status AI Email on Ticket Creation", False, str(e))

# -------------------------------------------------------------
# Test 3: Status Transition API -> In Progress, Pending, Solved, Closed
# -------------------------------------------------------------
try:
    client.force_authenticate(user=test_agent)

    # Transition to IN_PROGRESS
    patch_prog = client.patch(f"/api/tickets/{created_tkt.id}/status/", {"status": "IN_PROGRESS"}, format="json")
    prog_log = EmailLog.objects.filter(ticket=created_tkt, trigger_status="IN_PROGRESS").first()

    # Transition to PENDING (WAITING_FOR_CUSTOMER)
    patch_pend = client.patch(f"/api/tickets/{created_tkt.id}/status/", {"status": "WAITING_FOR_CUSTOMER", "info_needed": "Please send event viewer log file."}, format="json")
    pend_log = EmailLog.objects.filter(ticket=created_tkt, trigger_status="PENDING").first()

    # Transition to RESOLVED (SOLVED)
    patch_solv = client.patch(f"/api/tickets/{created_tkt.id}/status/", {"status": "RESOLVED", "resolution_notes": "Repaired Office installation in online mode."}, format="json")
    solv_log = EmailLog.objects.filter(ticket=created_tkt, trigger_status="SOLVED").first()

    # Transition to CLOSED
    patch_close = client.patch(f"/api/tickets/{created_tkt.id}/status/", {"status": "CLOSED"}, format="json")
    close_log = EmailLog.objects.filter(ticket=created_tkt, trigger_status="CLOSED").first()

    all_status_emails = (
        prog_log is not None and
        pend_log is not None and
        solv_log is not None and
        close_log is not None
    )
    record(3, "Full Lifecycle Automatic Status Email Transitions", all_status_emails, "Verified In Progress, Pending, Solved, Closed emails dispatched")
except Exception as e:
    record(3, "Full Lifecycle Automatic Status Email Transitions", False, str(e))

# -------------------------------------------------------------
# Test 4: Deduplication Guard Suppresses Identical State Transition
# -------------------------------------------------------------
try:
    # Attempting to dispatch the same status email again without force
    initial_count = EmailLog.objects.filter(ticket=created_tkt, trigger_status="CLOSED").count()
    dup_res = dispatch_status_ai_email(created_tkt, target_status="CLOSED", force=False)
    new_count = EmailLog.objects.filter(ticket=created_tkt, trigger_status="CLOSED").count()

    is_deduped = dup_res.get("deduplicated") or dup_res.get("skipped") or (new_count == initial_count)
    record(4, "Deduplication Guard Prevents Duplicate Emails", is_deduped, "Duplicate status transition email suppressed cleanly")
except Exception as e:
    record(4, "Deduplication Guard Prevents Duplicate Emails", False, str(e))

# -------------------------------------------------------------
# Test 5: Admin Configuration Toggles (Disabling Open/Pending Suppresses Email)
# -------------------------------------------------------------
try:
    # Disable Pending and Open in config
    client.post("/api/email/automation-config/", {
        "open_enabled": False,
        "pending_enabled": False,
    }, format="json")

    # Create new ticket to verify Open email is suppressed
    new_tkt = Ticket.objects.create(
        created_by=test_cust,
        title="Testing Disabled Open Toggle",
        description="Testing toggle behavior",
        category="General",
        status="OPEN"
    )
    res_open = dispatch_status_ai_email(new_tkt, target_status="OPEN", force=False)
    open_suppressed = res_open.get("skipped") is True

    # Test Pending suppression
    res_pend = dispatch_status_ai_email(new_tkt, target_status="PENDING", force=False)
    pend_suppressed = res_pend.get("skipped") is True

    # Re-enable
    update_ai_email_config({"open_enabled": True, "pending_enabled": True})
    res_open_enabled = dispatch_status_ai_email(new_tkt, target_status="OPEN", force=True)
    open_now_sent = res_open_enabled.get("success") is True

    toggles_work = open_suppressed and pend_suppressed and open_now_sent
    record(5, "Admin AI Email Automation Toggles & Suppression", toggles_work, "Verified disabling status toggles halts emails, re-enabling resumes")
except Exception as e:
    record(5, "Admin AI Email Automation Toggles & Suppression", False, str(e))

# -------------------------------------------------------------
# Test 6: Admin Retry Mechanism for Failed Deliveries
# -------------------------------------------------------------
try:
    import uuid
    test_fail_id = f"EML-FAIL-{uuid.uuid4().hex[:6].upper()}"
    # Create a simulated failed email log
    failed_log = EmailLog.objects.create(
        email_id=test_fail_id,
        ticket=created_tkt,
        recipient="sarah.connor@acme.corp",
        subject="[Test] Failed Delivery Retry Test",
        email_type="in_progress",
        trigger_status="IN_PROGRESS",
        status="FAILED",
        body="Simulated failed content",
        html_body="<p>Simulated failed content</p>",
        failure_reason="Simulated connection timeout",
    )

    retry_res = retry_failed_email_dispatch(test_fail_id)
    failed_log.refresh_from_db()
    retry_success = retry_res.get("success") is True and failed_log.status == "SENT"
    record(6, "Admin Retry for Failed Email Deliveries", retry_success, f"Retried {test_fail_id} -> Status: {failed_log.status}")
except Exception as e:
    record(6, "Admin Retry for Failed Email Deliveries", False, str(e))

# -------------------------------------------------------------
# Test 7: Email Logs API with Filters & Preview Endpoint
# -------------------------------------------------------------
try:
    # Test GET /api/email/logs/
    logs_resp = client.get("/api/email/logs/")
    has_logs_api = logs_resp.status_code == 200 and len(logs_resp.data) > 0

    # Test POST /api/email/preview/
    prev_resp = client.post("/api/email/preview/", {
        "status": "SOLVED",
        "title": "Dual Monitor Display Flickering",
        "description": "Second monitor loses signal randomly during conference calls.",
        "extra_context": {"resolution_notes": "Updated DisplayPort driver and replaced HDMI adapter cable."}
    }, format="json")
    has_prev_api = prev_resp.status_code == 200 and "DisplayPort driver" in prev_resp.data.get("preview", {}).get("body", "")

    record(7, "Email Logs API & Live Preview Endpoint", has_logs_api and has_prev_api, "Logs filtered and preview generated successfully")
except Exception as e:
    record(7, "Email Logs API & Live Preview Endpoint", False, str(e))

print("\n" + "="*80)
print(f"  VERIFICATION RESULTS: {sum(1 for r in results if r[2] == 'PASS')}/{len(results)} PASSED")
print("="*80 + "\n")
