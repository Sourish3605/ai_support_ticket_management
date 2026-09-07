"""
End-to-End Workflow Validation Test
-----------------------------------
Tests:
Customer creates ticket -> Manager receives ticket -> Manager assigns agent ->
Assigned agent receives ticket (and non-assigned agent sees non-actionable) ->
Assigned agent sends reply -> Customer sees reply and history -> Follow-up reply.
"""

import os
import sys
import django

# Setup Django environment
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from apps.support.models import Ticket, TicketReply, ActivityLog, Notification

User = get_user_model()

def run_e2e_workflow_test():
    print("=" * 75)
    print("  AI SUPPORT TICKET MANAGEMENT — END-TO-END WORKFLOW TEST")
    print("=" * 75)

    # 1. Setup test users
    # Customer
    customer, _ = User.objects.get_or_create(
        username="workflow_customer",
        defaults={"email": "wf_customer@test.com", "first_name": "Alice", "last_name": "Customer"}
    )
    customer.set_password("pass123")
    if hasattr(customer, "profile"):
        customer.profile.role = "Customer"
        customer.profile.save()
    customer.save()

    # Manager
    manager, _ = User.objects.get_or_create(
        username="workflow_manager",
        defaults={"email": "wf_manager@test.com", "first_name": "Mary", "last_name": "Manager", "is_staff": True}
    )
    manager.set_password("pass123")
    if hasattr(manager, "profile"):
        manager.profile.role = "Manager"
        manager.profile.save()
    manager.save()

    # Agent 1 (Assigned)
    agent1, _ = User.objects.get_or_create(
        username="workflow_agent1",
        defaults={"email": "wf_agent1@test.com", "first_name": "Bob", "last_name": "Agent", "is_staff": True}
    )
    agent1.set_password("pass123")
    if hasattr(agent1, "profile"):
        agent1.profile.role = "Agent"
        agent1.profile.save()
    agent1.save()

    # Agent 2 (Unassigned / Other)
    agent2, _ = User.objects.get_or_create(
        username="workflow_agent2",
        defaults={"email": "wf_agent2@test.com", "first_name": "Charlie", "last_name": "Agent", "is_staff": True}
    )
    agent2.set_password("pass123")
    if hasattr(agent2, "profile"):
        agent2.profile.role = "Agent"
        agent2.profile.save()
    agent2.save()

    client = APIClient()

    # -------------------------------------------------------------
    # Step 1: Customer creates ticket
    # -------------------------------------------------------------
    client.force_authenticate(user=customer)
    create_payload = {
        "title": "VPN Gateway drops every 10 minutes",
        "description": "Whenever I connect to the corporate VPN tunnel, the gateway drops connection after 10 minutes.",
        "category": "Network",
        "priority": "P2",
    }
    create_res = client.post("/api/tickets/", create_payload, format="json")
    assert create_res.status_code == 201, f"Expected 201, got {create_res.status_code}: {create_res.data}"
    
    ticket_data = create_res.data
    ticket_id = ticket_data["id"]
    ticket_num = ticket_data.get("ticket_number") or ticket_data.get("ticketNumber")
    assert ticket_id, "Ticket ID must be present"
    assert ticket_num, "Ticket number must be present"
    assert ticket_data["customerId"] == customer.id or ticket_data.get("created_by") == customer.id
    print(f"[PASS] Step 1: Customer created ticket #{ticket_num} (ID: {ticket_id})")

    # -------------------------------------------------------------
    # Step 2: Manager receives ticket in manager dashboard / queue
    # -------------------------------------------------------------
    client.force_authenticate(user=manager)
    mgr_list_res = client.get("/api/agent/tickets/")
    assert mgr_list_res.status_code == 200, f"Expected 200, got {mgr_list_res.status_code}: {mgr_list_res.data}"
    tickets_in_queue = mgr_list_res.data if isinstance(mgr_list_res.data, list) else mgr_list_res.data.get("results", [])
    matching = [t for t in tickets_in_queue if t["id"] == ticket_id or t.get("ticket_number") == ticket_num]
    assert len(matching) > 0, f"Ticket #{ticket_num} must appear in Manager Queue"
    print(f"[PASS] Step 2: Manager received ticket #{ticket_num} in support queue")

    # -------------------------------------------------------------
    # Step 3: Manager assigns ticket to Agent 1 (Bob Agent)
    # -------------------------------------------------------------
    assign_payload = {
        "agent_id": agent1.id,
        "agent_name": agent1.get_full_name() or agent1.username,
    }
    assign_res = client.patch(f"/api/tickets/{ticket_id}/assign/", assign_payload, format="json")
    assert assign_res.status_code == 200, f"Expected 200, got {assign_res.status_code}: {assign_res.data}"
    assigned_ticket = assign_res.data
    assert assigned_ticket.get("status") in ["ASSIGNED", "IN_PROGRESS"]
    assert assigned_ticket.get("assigned_to") == agent1.id or assigned_ticket.get("assignedAgentId") == agent1.id
    print(f"[PASS] Step 3: Manager assigned ticket #{ticket_num} to agent '{agent1.username}' (Status: {assigned_ticket.get('status')})")

    # -------------------------------------------------------------
    # Step 4: Assigned Agent 1 opens ticket and checks details
    # -------------------------------------------------------------
    client.force_authenticate(user=agent1)
    agent1_ticket_res = client.get(f"/api/tickets/{ticket_num}/")
    assert agent1_ticket_res.status_code == 200, f"Expected 200, got {agent1_ticket_res.status_code}"
    a1_data = agent1_ticket_res.data
    assert a1_data["title"] == create_payload["title"]
    assert a1_data["customerId"] == customer.id
    assert a1_data.get("assignedAgentId") == agent1.id or a1_data.get("assigned_to") == agent1.id
    print(f"[PASS] Step 4: Assigned agent {agent1.username} opened ticket #{ticket_num} with customer details and status")

    # -------------------------------------------------------------
    # Step 5: Verify Agent 2 sees ticket as assigned to someone else
    # -------------------------------------------------------------
    client.force_authenticate(user=agent2)
    # Filter by assigned_to for Agent 2:
    agent2_tickets_res = client.get(f"/api/agent/tickets/?assigned_to={agent2.id}")
    assert agent2_tickets_res.status_code == 200
    a2_tickets = agent2_tickets_res.data if isinstance(agent2_tickets_res.data, list) else agent2_tickets_res.data.get("results", [])
    a2_matching = [t for t in a2_tickets if t["id"] == ticket_id]
    assert len(a2_matching) == 0, "Ticket must not be in Agent 2's assigned list"

    # Direct view shows assigned_to is agent1, so UI will display non-actionable badge
    a2_view_res = client.get(f"/api/tickets/{ticket_num}/")
    assert a2_view_res.status_code == 200
    assert a2_view_res.data.get("assigned_to") == agent1.id
    print(f"[PASS] Step 5: Agent 2 sees ticket is assigned to {agent1.username} (not actionable for Agent 2)")

    # -------------------------------------------------------------
    # Step 6: Assigned Agent 1 sends reply to Customer
    # -------------------------------------------------------------
    client.force_authenticate(user=agent1)
    reply_payload = {
        "message": "Hello Alice, I have re-configured the VPN tunnel keep-alive timeout to 60 minutes. Please re-test your connection.",
        "is_internal": False,
    }
    reply_res = client.post(f"/api/tickets/{ticket_id}/reply/", reply_payload, format="json")
    assert reply_res.status_code == 201, f"Expected 201, got {reply_res.status_code}: {reply_res.data}"
    reply_data = reply_res.data
    assert reply_data["author_name"] == (agent1.get_full_name() or agent1.username)
    assert reply_data["author_role"] == "SUPPORT_AGENT"
    assert reply_data["message"] == reply_payload["message"]
    assert reply_data.get("created_at") is not None
    print(f"[PASS] Step 6: Agent 1 posted reply: '{reply_data['message'][:45]}...'")

    # Verify status changed to IN_PROGRESS in backend
    t_obj = Ticket.objects.get(id=ticket_id)
    assert t_obj.status == "IN_PROGRESS", f"Expected IN_PROGRESS, got {t_obj.status}"
    print(f"[PASS] Step 6b: Ticket status automatically transitioned to '{t_obj.status}'")

    # -------------------------------------------------------------
    # Step 7: Customer reopens ticket and views the agent's reply
    # -------------------------------------------------------------
    client.force_authenticate(user=customer)
    cust_view_res = client.get(f"/api/tickets/{ticket_num}/")
    assert cust_view_res.status_code == 200, f"Expected 200, got {cust_view_res.status_code}"
    cust_ticket = cust_view_res.data
    replies = cust_ticket.get("replies", [])
    assert len(replies) >= 1, "Customer must see the agent reply in replies list"
    agent_reply = [r for r in replies if r["message"] == reply_payload["message"]][0]
    assert agent_reply["author_role"] == "SUPPORT_AGENT"
    assert agent_reply["author_name"] == (agent1.get_full_name() or agent1.username)
    assert agent_reply.get("created_at"), "Created timestamp must be present"
    print(f"[PASS] Step 7: Customer retrieved conversation history: agent reply with timestamp '{agent_reply['created_at']}'")

    # -------------------------------------------------------------
    # Step 8: Customer replies back to agent
    # -------------------------------------------------------------
    cust_reply_payload = {
        "message": "Thank you Bob! The VPN connection is now solid and hasn't disconnected.",
        "is_internal": False,
    }
    cust_reply_res = client.post(f"/api/tickets/{ticket_id}/reply/", cust_reply_payload, format="json")
    assert cust_reply_res.status_code == 201
    print(f"[PASS] Step 8: Customer replied back: '{cust_reply_payload['message'][:45]}...'")

    # Verify conversation history now has both agent and customer replies persisted in order
    final_view_res = client.get(f"/api/tickets/{ticket_id}/")
    assert final_view_res.status_code == 200
    final_replies = final_view_res.data.get("replies", [])
    print(f"Total replies in conversation: {len(final_replies)}")
    for r in final_replies:
        print(f" - [{r.get('author_role')} / {r.get('author_name')}]: {r.get('message')[:60]}...")

    # Find agent reply and customer reply
    has_agent_reply = any(
        r["author_role"] == "SUPPORT_AGENT" and reply_payload["message"] in r["message"]
        for r in final_replies
    )
    has_customer_reply = any(
        r["author_role"] == "CUSTOMER" and cust_reply_payload["message"] in r["message"]
        for r in final_replies
    )
    assert has_agent_reply, "Agent reply must be persisted in replies list"
    assert has_customer_reply, "Customer reply must be persisted in replies list"
    print(f"[PASS] Step 9: Complete conversation thread persisted and linked to ticket #{ticket_num} and customer {customer.id}")

    print("=" * 75)
    print("  ALL E2E WORKFLOW CHECKS PASSED SUCCESSFULLY! (100%)")
    print("=" * 75)


if __name__ == "__main__":
    run_e2e_workflow_test()
