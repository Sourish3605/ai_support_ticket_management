import os
import sys
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from apps.support.models import Ticket, ActivityLog
from apps.staff.models import Profile
from apps.support.classification import run_classification_agent
from apps.support.department_assignment import (
    get_agents_in_department,
    auto_assign_ticket_to_department_agent,
    drain_pending_queue_for_department
)

User = get_user_model()
client = APIClient()

print("=" * 75)
print("  VERIFYING USER SPECIFIC REQUIREMENTS")
print("=" * 75)

# 1. Test 7-category taxonomy & AI classification
test_cases = [
    ("VPN drops when working from home", "Network", "VPN"),
    ("Received a suspicious phishing email asking for credentials", "Security", "Phishing"),
    ("MFA code not arriving on phone", "Authentication", "MFA"),
    ("Laptop monitor flickering and turning black", "Hardware", "Monitor"),
    ("Excel crashing with error 0x80070005 on Windows 11", "Software", "Application Error"),
    ("Cannot send email through Outlook client", "Email", "Outlook"),
    ("Double charged on last invoice subscription", "Billing", "Invoice"),
]

passed_tax = 0
for text, exp_cat, exp_sub in test_cases:
    res = run_classification_agent(text, "")
    cat = res.get("category")
    sub = res.get("sub_category")
    if cat == exp_cat:
        passed_tax += 1
        print(f"[PASS] Classification: '{text[:30]}...' -> Cat: {cat}, Sub: {sub}")
    else:
        print(f"[FAIL] Classification: '{text[:30]}...' -> Got Cat: {cat}, Expected: {exp_cat}")

assert passed_tax == len(test_cases), f"Taxonomy test failed: {passed_tax}/{len(test_cases)}"

# 2. Test Agent Availability & Balanced Workload
# Create test agents with different availability statuses
agent_avail, _ = User.objects.get_or_create(username="agent_available_1", defaults={"email": "avail1@test.com", "is_staff": True})
agent_avail.save()
profile1, _ = Profile.objects.get_or_create(user=agent_avail)
profile1.department = "IT Support"
profile1.role = "Agent"
profile1.availability_status = "AVAILABLE"
profile1.save()

agent_busy, _ = User.objects.get_or_create(username="agent_busy_1", defaults={"email": "busy1@test.com", "is_staff": True})
agent_busy.save()
profile2, _ = Profile.objects.get_or_create(user=agent_busy)
profile2.department = "IT Support"
profile2.role = "Agent"
profile2.availability_status = "BUSY"
profile2.save()

agent_unavail, _ = User.objects.get_or_create(username="agent_unavail_1", defaults={"email": "unavail1@test.com", "is_staff": True})
agent_unavail.save()
profile3, _ = Profile.objects.get_or_create(user=agent_unavail)
profile3.department = "IT Support"
profile3.role = "Agent"
profile3.availability_status = "UNAVAILABLE"
profile3.save()

# Only agent_avail should be picked
avail_agents = get_agents_in_department("IT Support", available_only=True)
assert agent_avail in avail_agents, "Expected agent_avail to be in available agents"
assert agent_busy not in avail_agents, "Expected agent_busy to be excluded from available agents"
assert agent_unavail not in avail_agents, "Expected agent_unavail to be excluded from available agents"
print("[PASS] Only AVAILABLE agent selected (BUSY and UNAVAILABLE agents properly excluded)")

# 3. Test queueing when ALL suitable agents are busy or unavailable
it_profiles = list(Profile.objects.filter(department__icontains="IT"))
old_statuses = {p.id: p.availability_status for p in it_profiles}
Profile.objects.filter(department__icontains="IT").update(availability_status="BUSY")

avail_agents_none = get_agents_in_department("IT Support", available_only=True)
assert len(avail_agents_none) == 0, f"Expected 0 agents when all busy, got {len(avail_agents_none)}"

customer, _ = User.objects.get_or_create(username="req_cust", defaults={"email": "req_cust@test.com"})
customer.set_password("pass123")
customer.save()

t_busy = Ticket.objects.create(
    title="VPN not connecting",
    description="I followed the troubleshooting steps but it still fails.",
    created_by=customer,
    category="Network",
    sub_category="VPN",
    priority="High",
    status="OPEN"
)
res_busy_assigned = auto_assign_ticket_to_department_agent(t_busy)
t_busy.refresh_from_db()
assert res_busy_assigned is None, "Should return None when all agents busy"
assert t_busy.assigned_to is None, "assigned_to should be None"
assert "Pending Queue" in (t_busy.assigned_queue or ""), f"Should be in pending queue, got {t_busy.assigned_queue}"
assert t_busy.status == "ESCALATED", f"Status should be ESCALATED, got {t_busy.status}"
print("[PASS] Pending queue triggered when all agents in department are BUSY/UNAVAILABLE")

# Restore statuses
for pid, st in old_statuses.items():
    Profile.objects.filter(id=pid).update(availability_status=st)

# 4. Test "Need More Help" -> Escalation and Auto-Assignment
customer, _ = User.objects.get_or_create(username="req_cust", defaults={"email": "req_cust@test.com"})
customer.set_password("pass123")
customer.save()

t_escalate = Ticket.objects.create(
    title="VPN not connecting",
    description="I followed the troubleshooting steps but it still fails.",
    created_by=customer,
    category="Network",
    sub_category="VPN",
    priority="High",
    status="AI_RESPONDED"
)

# Switch agent_avail back to AVAILABLE
profile1.availability_status = "AVAILABLE"
profile1.save()

client.force_authenticate(user=customer)
res_escalate = client.post("/api/support/m4/customer-confirmation/", {
    "ticket_id": t_escalate.id,
    "is_solved": False,
    "details": {
        "reason": "AI troubleshooting did not resolve the VPN handshake error."
    }
}, format="json")

assert res_escalate.status_code == 200, f"Escalation endpoint returned {res_escalate.status_code}"
t_escalate.refresh_from_db()
assert t_escalate.status in ["ESCALATED", "ASSIGNED", "REOPENED"], f"Status is {t_escalate.status}"
assert t_escalate.assigned_to is not None, "Assigned agent should not be None"
assert t_escalate.assigned_to.profile.availability_status == "AVAILABLE", f"Assigned agent {t_escalate.assigned_to} should be AVAILABLE"
print(f"[PASS] 'Need More Help' workflow successfully escalated and auto-assigned ticket #{t_escalate.ticket_number} to available agent {t_escalate.assigned_to.username}")

# 5. Test "Resolved" -> Closes ticket automatically
t_resolve = Ticket.objects.create(
    title="Reset password",
    description="Self service reset worked.",
    created_by=customer,
    category="Authentication",
    sub_category="Password",
    status="AI_RESPONDED"
)

res_resolve = client.post("/api/support/m4/customer-confirmation/", {
    "ticket_id": t_resolve.id,
    "is_solved": True,
    "details": {
        "feedback": "Troubleshooting solved the issue completely."
    }
}, format="json")

assert res_resolve.status_code == 200, f"Resolved endpoint returned {res_resolve.status_code}"
t_resolve.refresh_from_db()
assert t_resolve.status == "CLOSED", f"Status expected CLOSED, got {t_resolve.status}"
assert t_resolve.closed_at is not None, "closed_at should be populated"
print(f"[PASS] 'Resolved' workflow automatically closed ticket #{t_resolve.ticket_number} at {t_resolve.closed_at}")

# 6. Test server-side transactional email endpoint
staff_user, _ = User.objects.get_or_create(username="req_staff", defaults={"email": "staff@test.com", "is_staff": True})
staff_user.save()
client.force_authenticate(user=staff_user)

res_email = client.post(f"/api/support/tickets/{t_escalate.id}/send-email/", {
    "to": "customer@company.com",
    "subject": f"Update on #{t_escalate.ticket_number}",
    "message": "Hello, we are investigating your VPN issue.",
    "include_history": True
}, format="json")

assert res_email.status_code == 200, f"Email API returned {res_email.status_code}"
email_data = res_email.data
assert email_data.get("success") is True, f"Email data not ok: {email_data}"
print(f"[PASS] Server-side transactional email sent successfully: recipient={email_data.get('recipient')}, status={email_data.get('status')}")

# Verify email activity was logged
activity = ActivityLog.objects.filter(ticket=t_escalate, action__icontains="EMAIL").first()
assert activity is not None, "Activity log for EMAIL should exist"
print(f"[PASS] Email activity log recorded in ticket history: {activity.description}")

# 7. Test Queue Draining when Agent becomes AVAILABLE
t_queued = Ticket.objects.create(
    title="Network outage",
    description="Router offline",
    created_by=customer,
    category="Network",
    department="IT Support",
    priority="Critical",
    status="OPEN"
)

# Agent is available, run drain
drained = drain_pending_queue_for_department("IT Support")
t_queued.refresh_from_db()
assert t_queued.assigned_to is not None, "Queued ticket should now be assigned"
print(f"[PASS] Queued tickets automatically drained and assigned when agent becomes available: {drained} tickets drained, assigned to {t_queued.assigned_to.username}")

print("\n" + "=" * 75)
print("  ALL CUSTOM REQUIREMENTS VERIFIED AND PASSED SUCCESSFULLY!")
print("=" * 75)
