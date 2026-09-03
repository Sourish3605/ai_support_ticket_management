from django.test import TestCase
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from rest_framework import status

from .preprocessing import preprocess_ticket, mask_pii
from .classification import classify_ticket
from .views import get_sla_metrics
from .rag_service import generate_grounded_resolution
from .models import Ticket, TicketReply
import mongodb

User = get_user_model()


class SupportTicketSystemTests(TestCase):
    """End-to-end integration and security test suite for the Support Ticket System."""

    def setUp(self):
        self.client = APIClient()

        # 1. Customer A
        self.customer_a = User.objects.create_user(
            username="customer_a",
            email="customer_a@example.com",
            password="password123",
            first_name="Customer",
            last_name="Alpha",
        )

        # 2. Customer B
        self.customer_b = User.objects.create_user(
            username="customer_b",
            email="customer_b@example.com",
            password="password123",
            first_name="Customer",
            last_name="Beta",
        )

        # 3. Support Agent
        self.agent = User.objects.create_user(
            username="support_agent",
            email="agent@example.com",
            password="password123",
            first_name="Agent",
            last_name="One",
            is_staff=True,
        )

        # 4. Admin
        self.admin = User.objects.create_user(
            username="admin_user",
            email="admin@example.com",
            password="password123",
            first_name="Admin",
            last_name="Super",
            is_staff=True,
            is_superuser=True,
        )

    def test_01_authentication_login_roles(self):
        """Verify login flow and role check for Customer, Support Agent, and Admin."""
        # Customer Login
        res_cust = self.client.post("/api/auth/login/", {
            "username": "customer_a",
            "password": "password123",
        })
        self.assertEqual(res_cust.status_code, status.HTTP_200_OK)
        self.assertIn("access", res_cust.data)
        self.assertEqual(res_cust.data["user"]["role"], "customer")

        # Agent Login
        res_agent = self.client.post("/api/auth/login/", {
            "username": "support_agent",
            "password": "password123",
        })
        self.assertEqual(res_agent.status_code, status.HTTP_200_OK)
        self.assertEqual(res_agent.data["user"]["role"], "agent")

        # Admin Login
        res_admin = self.client.post("/api/auth/login/", {
            "username": "admin_user",
            "password": "password123",
        })
        self.assertEqual(res_admin.status_code, status.HTTP_200_OK)
        self.assertEqual(res_admin.data["user"]["role"], "admin")

    def test_02_customer_create_ticket(self):
        """Customer creates a ticket with Subject, Description, Category, Priority, Attachment."""
        self.client.force_authenticate(user=self.customer_a)

        ticket_payload = {
            "subject": "Unable to login",
            "description": "I cannot access my account",
            "category": "Account",
            "priority": "High",
            "attachment": "screenshot_error.png",
        }

        response = self.client.post("/api/tickets/", ticket_payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        data = response.data
        self.assertIn("id", data)
        self.assertIn("ticketNumber", data)
        self.assertTrue(str(data["ticketNumber"]).startswith("TKT-"))
        self.assertEqual(data["subject"], "Unable to login")
        self.assertEqual(data["description"], "I cannot access my account")
        self.assertEqual(data["category"], "Account")
        self.assertEqual(data["priority"], "High")
        self.assertIn(data["status"], ["NEW", "AI_RESOLUTION_READY", "OPEN", "AI_RESPONDED"])
        self.assertEqual(data["customerId"], self.customer_a.id)
        self.assertEqual(data["attachment"], "screenshot_error.png")

    def test_03_customer_my_tickets_endpoint(self):
        """Verify GET /api/tickets/my returns only the authenticated customer's tickets."""
        # Create ticket for Customer A
        ticket_a = Ticket.objects.create(
            created_by=self.customer_a,
            title="Ticket A Subject",
            description="Ticket A Description",
            category="Software",
            priority="Medium",
            status="NEW",
        )

        # Create ticket for Customer B
        ticket_b = Ticket.objects.create(
            created_by=self.customer_b,
            title="Ticket B Subject",
            description="Ticket B Description",
            category="Network",
            priority="Low",
            status="NEW",
        )

        # Customer A queries /api/tickets/my
        self.client.force_authenticate(user=self.customer_a)
        res_a = self.client.get("/api/tickets/my/")
        self.assertEqual(res_a.status_code, status.HTTP_200_OK)
        ticket_ids_a = [t["id"] for t in res_a.data]
        self.assertIn(ticket_a.id, ticket_ids_a)
        self.assertNotIn(ticket_b.id, ticket_ids_a)

        # Customer B queries /api/tickets/my
        self.client.force_authenticate(user=self.customer_b)
        res_b = self.client.get("/api/tickets/my/")
        self.assertEqual(res_b.status_code, status.HTTP_200_OK)
        ticket_ids_b = [t["id"] for t in res_b.data]
        self.assertIn(ticket_b.id, ticket_ids_b)
        self.assertNotIn(ticket_a.id, ticket_ids_b)

    def test_04_security_task_customer_isolation_403_forbidden(self):
        """
        IMPORTANT SECURITY TASK:
        Customer A must be able to view their own ticket (200 OK).
        Customer B must NOT be able to view Customer A's ticket (403 Forbidden).
        """
        # Customer A creates ticket
        ticket_a = Ticket.objects.create(
            created_by=self.customer_a,
            title="Unable to login",
            description="Customer A private issue",
            category="Account",
            priority="High",
            status="NEW",
        )

        ticket_code = ticket_a.ticketNumber

        # 1. Customer A accesses ticket -> 200 OK
        self.client.force_authenticate(user=self.customer_a)
        res_owner = self.client.get(f"/api/tickets/{ticket_code}/")
        self.assertEqual(res_owner.status_code, status.HTTP_200_OK)
        self.assertEqual(res_owner.data["id"], ticket_a.id)

        # 2. Customer B attempts to access Customer A's ticket -> 403 FORBIDDEN
        self.client.force_authenticate(user=self.customer_b)
        res_intruder = self.client.get(f"/api/tickets/{ticket_code}/")
        self.assertEqual(res_intruder.status_code, status.HTTP_403_FORBIDDEN)

        # 3. Support Agent accesses Customer A's ticket -> 200 OK
        self.client.force_authenticate(user=self.agent)
        res_agent = self.client.get(f"/api/tickets/{ticket_code}/")
        self.assertEqual(res_agent.status_code, status.HTTP_200_OK)

    def test_05_agent_tickets_queue_and_security(self):
        """Verify GET /api/agent/tickets allows Agent/Admin and returns 403 Forbidden to Customers."""
        Ticket.objects.create(
            created_by=self.customer_a,
            title="Ticket 1",
            description="Desc 1",
            status="NEW",
        )

        # 1. Support Agent accesses agent tickets queue -> 200 OK
        self.client.force_authenticate(user=self.agent)
        res_agent = self.client.get("/api/agent/tickets/")
        self.assertEqual(res_agent.status_code, status.HTTP_200_OK)
        self.assertTrue(len(res_agent.data) >= 1)

        # 2. Customer attempts to access agent tickets queue -> 403 FORBIDDEN
        self.client.force_authenticate(user=self.customer_a)
        res_cust = self.client.get("/api/agent/tickets/")
        self.assertEqual(res_cust.status_code, status.HTTP_403_FORBIDDEN)

    def test_06_ticket_status_lifecycle_transitions(self):
        """Verify status progression: NEW -> IN_PROGRESS -> RESOLVED -> CLOSED."""
        ticket = Ticket.objects.create(
            created_by=self.customer_a,
            title="Status lifecycle test",
            description="Testing status transitions",
            status="NEW",
        )

        self.client.force_authenticate(user=self.agent)

        # 1. Transition to IN_PROGRESS
        res1 = self.client.patch(f"/api/tickets/{ticket.id}/status/", {"status": "IN_PROGRESS"}, format="json")
        self.assertEqual(res1.status_code, status.HTTP_200_OK)
        self.assertEqual(res1.data["status"], "IN_PROGRESS")

        # 2. Transition to RESOLVED
        res2 = self.client.patch(f"/api/tickets/{ticket.id}/status/", {"status": "RESOLVED"}, format="json")
        self.assertEqual(res2.status_code, status.HTTP_200_OK)
        self.assertEqual(res2.data["status"], "RESOLVED")

        # 3. Transition to CLOSED
        res3 = self.client.patch(f"/api/tickets/{ticket.id}/status/", {"status": "CLOSED"}, format="json")
        self.assertEqual(res3.status_code, status.HTTP_200_OK)
        self.assertEqual(res3.data["status"], "CLOSED")

    def test_07_ticket_reply_functionality_and_security(self):
        """Verify posting replies to tickets and security rules."""
        ticket = Ticket.objects.create(
            created_by=self.customer_a,
            title="Reply test ticket",
            description="Testing message replies",
            status="NEW",
        )

        # 1. Customer A replies to their own ticket -> 201 CREATED
        self.client.force_authenticate(user=self.customer_a)
        res_cust_reply = self.client.post(
            f"/api/tickets/{ticket.id}/reply/",
            {"message": "Hello support, any update?"},
            format="json"
        )
        self.assertEqual(res_cust_reply.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res_cust_reply.data["author_name"], "Customer Alpha")

        # 2. Agent replies to the ticket -> 201 CREATED
        self.client.force_authenticate(user=self.agent)
        res_agent_reply = self.client.post(
            f"/api/tickets/{ticket.id}/reply/",
            {"message": "We are looking into this right now."},
            format="json"
        )
        self.assertEqual(res_agent_reply.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res_agent_reply.data["author_role"], "SUPPORT_AGENT")

        # 3. Customer B attempts to reply to Customer A's ticket -> 403 FORBIDDEN
        self.client.force_authenticate(user=self.customer_b)
        res_intruder_reply = self.client.post(
            f"/api/tickets/{ticket.id}/reply/",
            {"message": "Unauthorized message from intruder"},
            format="json"
        )
        self.assertEqual(res_intruder_reply.status_code, status.HTTP_403_FORBIDDEN)

        # Verify replies are returned in ticket detail
        self.client.force_authenticate(user=self.customer_a)
        res_detail = self.client.get(f"/api/tickets/{ticket.id}/")
        self.assertEqual(res_detail.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res_detail.data["replies"]), 2)

    def test_08_ticket_agent_assignment(self):
        """Verify assigning a ticket to a support agent."""
        ticket = Ticket.objects.create(
            created_by=self.customer_a,
            title="Assignment test",
            description="Testing agent assignment",
            status="NEW",
        )

        # 1. Agent assigns ticket to self
        self.client.force_authenticate(user=self.agent)
        res_assign = self.client.patch(
            f"/api/tickets/{ticket.id}/assign/",
            {"agent_id": self.agent.id},
            format="json"
        )
        self.assertEqual(res_assign.status_code, status.HTTP_200_OK)
        self.assertEqual(res_assign.data["assignedAgentId"], self.agent.id)
        self.assertEqual(res_assign.data["assignedAgentName"], "Agent One")

        # 2. Customer attempts assignment -> 403 FORBIDDEN
        self.client.force_authenticate(user=self.customer_a)
        res_cust_assign = self.client.patch(
            f"/api/tickets/{ticket.id}/assign/",
            {"agent_id": self.agent.id},
            format="json"
        )
        self.assertEqual(res_cust_assign.status_code, status.HTTP_403_FORBIDDEN)


class Milestone1ProcessingTests(TestCase):
    """Milestone 1 — Ticket Preprocessing, PII Masking, Classification & SLA Tests."""

    def test_pii_masking(self):
        sample_text = (
            "Contact user at alex.smith@company.com or +1 555-123-4567. "
            "Server IP is 192.168.1.100. Employee EMP-98765 said password is SecretPass123"
        )
        masked = mask_pii(sample_text)
        self.assertNotIn("alex.smith@company.com", masked)
        self.assertIn("[EMAIL]", masked)
        self.assertNotIn("192.168.1.100", masked)
        self.assertIn("[IP]", masked)
        self.assertNotIn("EMP-98765", masked)
        self.assertIn("[EMPLOYEE_ID]", masked)
        self.assertNotIn("SecretPass123", masked)
        self.assertIn("[REDACTED]", masked)

    def test_classification_and_priority(self):
        cat, sub, sev, prio = classify_ticket(
            "VPN connection failing",
            "Cannot connect to corporate VPN from home network"
        )
        self.assertEqual(cat, "Network")
        self.assertEqual(sub, "VPN")
        self.assertIn(prio, ["P1", "P2"])

    def test_sla_calculation(self):
        p1_sla = get_sla_metrics("P1")
        self.assertEqual(p1_sla["resolution_hours"], 4)
        self.assertEqual(p1_sla["coverage"], "24/7")

        p3_sla = get_sla_metrics("P3")
        self.assertEqual(p3_sla["resolution_hours"], 24)
        self.assertEqual(p3_sla["coverage"], "Business Hours")


class Milestone2RAGRetrievalTests(TestCase):
    """Milestone 2 — Knowledge Retrieval, RAG Pipeline & Grounded Resolution Tests."""

    def test_grounded_resolution_generation_with_citations(self):
        result = generate_grounded_resolution(
            query_text="VPN is not connecting to the company network gateway timeout",
            category="Network",
            sub_category="VPN",
        )

        self.assertTrue(result["knowledge_retrieved"])
        self.assertIn("suggested_steps", result)
        self.assertTrue(len(result["suggested_steps"]) > 0)
        self.assertIn("citations", result)
        self.assertTrue(len(result["citations"]) >= 1)


class Milestone3MultiAgentWorkflowTests(TestCase):
    """Milestone 3 — Multi-Agent AI Workflow, Jira, Email, Escalation & Activity Tests."""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="m3_user",
            email="m3_user@example.com",
            password="password123",
            first_name="Jane",
            last_name="Doe",
        )
        self.client.force_authenticate(user=self.user)

    def test_01_diagnosis_agent(self):
        """Verify Diagnosis Agent analyzes symptoms and produces root causes & confidence."""
        from .diagnosis_agent import run_diagnosis_agent
        ticket_data = {
            "title": "VPN is not connecting",
            "description": "Getting gateway timeout error when connecting to corporate VPN",
        }
        res = run_diagnosis_agent(ticket_data, category="Network", sub_category="VPN", severity="High", priority="P1")
        self.assertEqual(res["status"], "SUCCESS")
        self.assertIn("affected_system", res)
        self.assertIn("VPN", res["affected_system"])
        self.assertTrue(len(res["possible_causes"]) > 0)
        self.assertTrue(res["confidence"] >= 0.80)

    def test_02_knowledge_retrieval_agent_reuses_m2(self):
        """Verify Knowledge Retrieval Agent reuses M2 RAG service and returns citations."""
        from .retrieval_agent import run_knowledge_retrieval_agent
        ticket_data = {
            "id": 101,
            "title": "VPN is not connecting",
            "description": "Corporate VPN connection failing",
        }
        res = run_knowledge_retrieval_agent(ticket_data, category="Network", sub_category="VPN")
        self.assertEqual(res["status"], "SUCCESS")
        self.assertTrue(res["knowledge_retrieved"])
        self.assertTrue(len(res["citations"]) >= 1)
        self.assertTrue(len(res["suggested_steps"]) >= 1)

    def test_03_resolution_generation_agent(self):
        """Verify Resolution Agent produces grounded troubleshooting steps with citations."""
        from .diagnosis_agent import run_diagnosis_agent
        from .retrieval_agent import run_knowledge_retrieval_agent
        from .resolution_agent import run_resolution_agent

        ticket_data = {"id": 102, "title": "VPN connection error", "description": "Cannot connect to VPN"}
        diag = run_diagnosis_agent(ticket_data, "Network", "VPN", "High", "P1")
        retr = run_knowledge_retrieval_agent(ticket_data, diag, "Network", "VPN")
        resol = run_resolution_agent(ticket_data, diag, retr, "Network", "VPN")

        self.assertEqual(resol["status"], "SUCCESS")
        self.assertTrue(resol["grounded"])
        self.assertTrue(len(resol["troubleshooting_steps"]) >= 2)
        self.assertTrue(resol["confidence"] >= 0.75)

    def test_04_validation_gate_and_confidence_decision(self):
        """Verify Validation Gate distinguishes between high-confidence and low-confidence."""
        from .validation_gate import run_validation_gate

        # High confidence pass
        ticket_data = {"id": 103, "title": "VPN error", "description": "VPN issue"}
        diag = {"confidence": 0.90}
        retr = {"citations": [{"source_title": "VPN Guide", "quote": "Verify connection"}], "suggested_steps": ["Step 1", "Step 2"]}
        resol = {"confidence": 0.88, "citations": [{"source_title": "VPN Guide"}], "troubleshooting_steps": ["Step 1", "Step 2"], "grounded": True}

        val_high = run_validation_gate(ticket_data, diag, retr, resol, threshold=0.75)
        self.assertTrue(val_high["validation_passed"])
        self.assertEqual(val_high["decision"], "AUTOMATE_RESOLUTION")

        # Low confidence fail -> escalate
        resol_low = {"confidence": 0.40, "citations": [], "troubleshooting_steps": [], "grounded": False}
        val_low = run_validation_gate(ticket_data, diag, retr, resol_low, threshold=0.75)
        self.assertFalse(val_low["validation_passed"])
        self.assertEqual(val_low["decision"], "ESCALATE")

    def test_05_escalation_agent(self):
        """Verify Escalation Agent assigns specialized support team and reason."""
        from .escalation_agent import run_escalation_agent
        ticket_data = {"title": "Security breach suspected", "description": "Unauthorized login"}
        val_data = {"failure_reasons": ["confidence_above_threshold"]}
        res = run_escalation_agent(ticket_data, validation_data=val_data, category="Security", sub_category="Unauthorized Access")
        self.assertEqual(res["status"], "SUCCESS")
        self.assertIn("SecOps", res["target_team"])
        self.assertIn("Escalation", res["agent_name"])

    def test_06_end_to_end_orchestrator_high_confidence(self):
        """Test full M3 workflow execution for 'VPN is not connecting' (High Confidence)."""
        from .models import Ticket, AgentWorkflow, JiraTicket, EmailLog, ActivityLog
        from .agent_orchestrator import run_multi_agent_workflow

        ticket = Ticket.objects.create(
            created_by=self.user,
            title="VPN is not connecting",
            description="Cannot connect to corporate VPN gateway",
            category="Network",
            sub_category="VPN",
            severity="High",
            priority="P1",
            status="NEW",
        )

        result = run_multi_agent_workflow(ticket, send_creation_email=True)
        self.assertTrue(result["success"])
        self.assertEqual(result["workflow_status"], "COMPLETED")
        self.assertEqual(result["final_decision"], "AUTOMATE_RESOLUTION")

        # Verify DB records
        wf = AgentWorkflow.objects.filter(ticket=ticket).first()
        self.assertIsNotNone(wf)
        self.assertTrue(wf.executions.count() >= 4)

        jira = JiraTicket.objects.filter(ticket=ticket).first()
        self.assertIsNotNone(jira)
        self.assertEqual(jira.jira_status, "IN_PROGRESS")

        email_logs = EmailLog.objects.filter(ticket=ticket)
        self.assertTrue(email_logs.count() >= 1)

        activities = ActivityLog.objects.filter(ticket=ticket)
        self.assertTrue(activities.count() >= 4)

    def test_07_end_to_end_orchestrator_low_confidence_escalation(self):
        """Test full M3 workflow execution for obscure issue -> triggers Escalation Agent."""
        from .models import Ticket, AgentWorkflow, JiraTicket, EmailLog
        from .agent_orchestrator import run_multi_agent_workflow

        ticket = Ticket.objects.create(
            created_by=self.user,
            title="Quantum warp coil flux fluctuation",
            description="Non-standard unknown propulsion anomaly",
            category="General",
            sub_category="Other",
            severity="Medium",
            priority="P3",
            status="NEW",
        )

        result = run_multi_agent_workflow(ticket, override_threshold=0.80)
        self.assertTrue(result["success"])
        self.assertEqual(result["workflow_status"], "ESCALATED")
        self.assertEqual(result["final_decision"], "ESCALATE")

        ticket.refresh_from_db()
        self.assertEqual(ticket.status, "ESCALATED")

        jira = JiraTicket.objects.filter(ticket=ticket).first()
        self.assertIsNotNone(jira)
        self.assertEqual(jira.jira_status, "ESCALATED")

        esc_emails = EmailLog.objects.filter(ticket=ticket, email_type="escalation")
        self.assertTrue(esc_emails.exists())

    def test_08_jira_apis_and_status_sync(self):
        """Verify Jira REST endpoints: create, update, and bi-directional status sync."""
        from .models import Ticket

        ticket = Ticket.objects.create(
            created_by=self.user,
            title="Jira Sync Test",
            description="Testing Jira sync endpoints",
            status="NEW",
        )

        # 1. Create Jira issue via API
        res_create = self.client.post("/api/jira/tickets/", {"ticket_id": ticket.id}, format="json")
        self.assertEqual(res_create.status_code, status.HTTP_201_CREATED)
        self.assertIn("jira_issue_key", res_create.data)
        jira_key = res_create.data["jira_issue_key"]

        # 2. Get Jira issue via API
        res_get = self.client.get(f"/api/jira/tickets/{ticket.id}/")
        self.assertEqual(res_get.status_code, status.HTTP_200_OK)
        self.assertEqual(res_get.data["jira_issue_key"], jira_key)

        # 3. Synchronize Jira status -> SupportPilot
        res_sync = self.client.post("/api/jira/sync/", {
            "ticket_id": ticket.id,
            "jira_status": "RESOLVED",
        }, format="json")
        self.assertEqual(res_sync.status_code, status.HTTP_200_OK)
        self.assertTrue(res_sync.data["success"])

        ticket.refresh_from_db()
        self.assertEqual(ticket.status, "RESOLVED")

    def test_09_email_automation_endpoints(self):
        """Verify all 4 Email event endpoints and logs retrieval."""
        from .models import Ticket

        ticket = Ticket.objects.create(
            created_by=self.user,
            title="Email Automation Test",
            description="Testing email triggers",
            status="NEW",
        )

        # 1. Ticket Created Email
        r1 = self.client.post("/api/email/ticket-created/", {"ticket_id": ticket.id}, format="json")
        self.assertEqual(r1.status_code, status.HTTP_200_OK)
        self.assertEqual(r1.data["email_type"], "ticket_created")

        # 2. Resolution Email
        r2 = self.client.post("/api/email/resolution/", {
            "ticket_id": ticket.id,
            "suggested_steps": ["Step 1", "Step 2"],
            "confidence": 0.95,
        }, format="json")
        self.assertEqual(r2.status_code, status.HTTP_200_OK)
        self.assertEqual(r2.data["email_type"], "resolution")

        # 3. Escalation Email
        r3 = self.client.post("/api/email/escalation/", {
            "ticket_id": ticket.id,
            "target_team": "Tier-2 Tech Support",
        }, format="json")
        self.assertEqual(r3.status_code, status.HTTP_200_OK)
        self.assertEqual(r3.data["email_type"], "escalation")

        # 4. Resolved Email
        r4 = self.client.post("/api/email/resolved/", {
            "ticket_id": ticket.id,
            "resolution_notes": "Completed successfully.",
        }, format="json")
        self.assertEqual(r4.status_code, status.HTTP_200_OK)
        self.assertEqual(r4.data["email_type"], "resolved")

        # 5. Fetch Email Logs for Ticket
        r_logs = self.client.get(f"/api/email/logs/{ticket.id}/")
        self.assertEqual(r_logs.status_code, status.HTTP_200_OK)
        self.assertEqual(len(r_logs.data), 4)

    def test_10_agent_runs_operations_apis(self):
        """Verify GET /api/agent/runs and /api/agent/runs/:id for AI Operations Center."""
        from .models import Ticket
        from .agent_orchestrator import run_multi_agent_workflow

        ticket = Ticket.objects.create(
            created_by=self.user,
            title="Ops Test Ticket",
            description="Testing agent run telemetry",
            category="Network",
            sub_category="VPN",
        )
        res_wf = run_multi_agent_workflow(ticket)
        wf_id = res_wf["workflow_id"]

        # List runs
        r_runs = self.client.get("/api/agent/runs/")
        self.assertEqual(r_runs.status_code, status.HTTP_200_OK)
        self.assertTrue(len(r_runs.data) >= 1)

        # Get run detail
        r_detail = self.client.get(f"/api/agent/runs/{wf_id}/")
        self.assertEqual(r_detail.status_code, status.HTTP_200_OK)
        self.assertEqual(r_detail.data["workflow_id"], wf_id)
        self.assertTrue(len(r_detail.data["executions"]) >= 1)

