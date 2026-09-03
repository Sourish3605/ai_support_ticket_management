"""
SupportPilot Milestone 3 — Central Multi-Agent Orchestrator.

Architecture:
Existing Ticket
   ↓
M1 Classification + Severity + Priority
   ↓
M2 Knowledge Retrieval / RAG
   ↓
M3 Multi-Agent Orchestrator
   ↓
Diagnosis Agent → Knowledge Retrieval Agent → Resolution Generation Agent
   ↓
Confidence / Resolution Validation
   ├── [High Confidence] → Automated Resolution → Email + Jira + Activity Logs
   └── [Low Confidence]  → Escalation Agent   → Human Support + Jira + Email + Activity Logs
"""

from datetime import datetime, timezone, timedelta
import time
import uuid

from django.contrib.auth import get_user_model
from .models import Ticket, TicketReply, Notification, AgentWorkflow, AgentExecution, ActivityLog
from .classification import run_classification_agent, run_priority_agent
from .sentiment_agent import analyze_sentiment
from .similarity_agent import find_similar_tickets
from .diagnosis_agent import run_diagnosis_agent
from .retrieval_agent import run_knowledge_retrieval_agent
from .resolution_agent import run_resolution_agent
from .validation_gate import run_validation_gate
from .escalation_agent import run_escalation_agent
from .jira_service import create_or_update_jira_ticket
from .email_service import (
    send_ticket_created_email,
    send_resolution_email,
    send_escalation_email,
)
from mongodb import (
    agent_workflows_collection,
    agent_executions_collection,
    activity_logs_collection,
)

User = get_user_model()


def calculate_sla_due_dates(priority: str, base_time=None):
    """Calculate response and resolution SLA deadlines based on PDF specifications."""
    now = base_time or datetime.now(timezone.utc)
    pri_clean = (priority or "MEDIUM").upper()
    if pri_clean in ["CRITICAL", "P1"]:
        resp_due = now + timedelta(minutes=30)
        resol_due = now + timedelta(hours=4)
    elif pri_clean in ["HIGH", "P2"]:
        resp_due = now + timedelta(hours=2)
        resol_due = now + timedelta(hours=8)
    elif pri_clean in ["MEDIUM", "P3"]:
        resp_due = now + timedelta(hours=8)
        resol_due = now + timedelta(hours=24)
    else:  # LOW / P4
        resp_due = now + timedelta(hours=24)
        resol_due = now + timedelta(hours=72)
    return resp_due, resol_due


def run_multi_agent_workflow(
    ticket: Ticket,
    send_creation_email: bool = False,
    override_threshold: float = 0.75,
) -> dict:
    """
    Executes the end-to-end Milestone 2 and Milestone 3 multi-agent workflow for a given ticket.
    Flow:
    AI Orchestrator
      ↓
    Classification Agent → Priority Agent → Sentiment Agent → Similarity Agent
      ↓
    Diagnosis Agent → Knowledge Retrieval Agent (RAG) → Resolution Agent
      ↓
    Validation Gate (Confidence + Safety / Policy Check)
      ├── [High Confidence & Safe] → Automated AI Response → Ticket AI_RESPONDED
      └── [Low Confidence / Complex / Critical] → Escalation Agent → Ticket ESCALATED
    """
    workflow_start_time = time.time()
    now_dt = datetime.now(timezone.utc)
    workflow_id = f"WF-{ticket.id}-{uuid.uuid4().hex[:6].upper()}"

    # Initial status transition to AI_ANALYZING
    ticket.status = "AI_ANALYZING"
    ticket.save(update_fields=["status", "updated_at"])

    # 1. Create Workflow State Record
    workflow = AgentWorkflow.objects.create(
        workflow_id=workflow_id,
        ticket=ticket,
        workflow_status="RUNNING",
        current_agent="AI Orchestrator",
    )

    _log_activity(
        ticket=ticket,
        actor="Orchestrator",
        action="WORKFLOW_STARTED",
        description=f"Multi-Agent AI pipeline '{workflow_id}' initiated for Ticket #{ticket.ticket_number or ticket.id}.",
        metadata={"workflow_id": workflow_id},
    )

    if send_creation_email:
        send_ticket_created_email(ticket)

    try:
        # -------------------------------------------------------------
        # STEP 1: Classification Agent
        # -------------------------------------------------------------
        workflow.current_agent = "Classification Agent"
        workflow.save(update_fields=["current_agent"])

        class_res = run_classification_agent(ticket.title, ticket.description)
        ticket.category = class_res.get("category", ticket.category)
        ticket.sub_category = class_res.get("sub_category", ticket.sub_category)

        _record_execution(
            workflow=workflow,
            agent_name="Classification Agent",
            input_data={"subject": ticket.title, "description": ticket.description},
            output_data=class_res,
            status=class_res.get("status", "SUCCESS"),
            confidence=class_res.get("confidence", 0.95),
            latency_ms=class_res.get("latency_ms", 0),
        )

        _log_activity(
            ticket=ticket,
            actor="Classification Agent",
            action="CLASSIFICATION_COMPLETED",
            description=f"Predicted category: {ticket.category} → {ticket.sub_category}.",
            metadata=class_res,
        )

        # -------------------------------------------------------------
        # STEP 2: Priority Agent
        # -------------------------------------------------------------
        workflow.current_agent = "Priority Agent"
        workflow.save(update_fields=["current_agent"])

        pri_res = run_priority_agent(ticket.title, ticket.description, ticket.category, ticket.severity)
        if not ticket.priority or ticket.priority in ["Medium", "MEDIUM", "P3"]:
            ticket.priority = str(pri_res.get("priority", "Medium")).title()
        else:
            ticket.priority = ticket.priority.title()
        ticket.severity = pri_res.get("severity", ticket.severity)

        _record_execution(
            workflow=workflow,
            agent_name="Priority Agent",
            input_data={"category": ticket.category, "severity": ticket.severity},
            output_data=pri_res,
            status=pri_res.get("status", "SUCCESS"),
            confidence=pri_res.get("confidence", 0.95),
            latency_ms=pri_res.get("latency_ms", 0),
        )

        _log_activity(
            ticket=ticket,
            actor="Priority Agent",
            action="PRIORITY_ASSIGNED",
            description=f"Priority evaluated as {ticket.priority} (Severity: {ticket.severity}).",
            metadata=pri_res,
        )

        # -------------------------------------------------------------
        # STEP 3: Sentiment Agent
        # -------------------------------------------------------------
        workflow.current_agent = "Sentiment Agent"
        workflow.save(update_fields=["current_agent"])

        sent_res = analyze_sentiment(f"{ticket.title} {ticket.description}")
        ticket.sentiment = sent_res.get("sentiment", "NEUTRAL")
        ticket.sentiment_score = sent_res.get("sentiment_score", 0.0)

        _record_execution(
            workflow=workflow,
            agent_name="Sentiment Agent",
            input_data={"text_length": len(f"{ticket.title} {ticket.description}")},
            output_data=sent_res,
            status=sent_res.get("status", "SUCCESS"),
            confidence=sent_res.get("confidence", 0.90),
            latency_ms=sent_res.get("latency_ms", 0),
        )

        _log_activity(
            ticket=ticket,
            actor="Sentiment Agent",
            action="SENTIMENT_ANALYZED",
            description=f"Sentiment detected: {ticket.sentiment} (Score: {ticket.sentiment_score}).",
            metadata=sent_res,
        )

        # -------------------------------------------------------------
        # STEP 4: Similarity Agent
        # -------------------------------------------------------------
        workflow.current_agent = "Similarity Agent"
        workflow.save(update_fields=["current_agent"])

        sim_res = find_similar_tickets(
            subject=ticket.title,
            description=ticket.description,
            category=ticket.category,
            sub_category=ticket.sub_category,
            exclude_ticket_id=ticket.id,
            limit=3
        )
        ticket.similar_tickets_meta = sim_res.get("similar_tickets", [])

        _record_execution(
            workflow=workflow,
            agent_name="Similarity Agent",
            input_data={"category": ticket.category, "sub_category": ticket.sub_category},
            output_data=sim_res,
            status=sim_res.get("status", "SUCCESS"),
            confidence=sim_res.get("top_similarity_score", 0.85),
            latency_ms=sim_res.get("latency_ms", 0),
        )

        _log_activity(
            ticket=ticket,
            actor="Similarity Agent",
            action="SIMILAR_TICKETS_SEARCHED",
            description=f"Found {sim_res.get('similar_tickets_count', 0)} related historical ticket(s): {', '.join(sim_res.get('similar_ticket_ids', [])) or 'None'}.",
            metadata={"similar_ticket_ids": sim_res.get("similar_ticket_ids", [])},
        )

        # -------------------------------------------------------------
        # STEP 5: Diagnosis Agent
        # -------------------------------------------------------------
        workflow.current_agent = "Diagnosis Agent"
        workflow.save(update_fields=["current_agent"])

        ticket_data = {
            "id": ticket.id,
            "ticket_id": ticket.id,
            "ticket_number": ticket.ticket_number or f"TKT-{ticket.id}",
            "title": ticket.title,
            "subject": ticket.title,
            "description": ticket.description,
            "category": ticket.category,
            "sub_category": ticket.sub_category,
            "severity": ticket.severity,
            "priority": ticket.priority,
            "sentiment": ticket.sentiment,
        }

        diagnosis_res = run_diagnosis_agent(
            ticket_data=ticket_data,
            category=ticket.category,
            sub_category=ticket.sub_category,
            severity=ticket.severity,
            priority=ticket.priority,
        )

        _record_execution(
            workflow=workflow,
            agent_name="Diagnosis Agent",
            input_data={"ticket_number": ticket.ticket_number, "category": ticket.category},
            output_data=diagnosis_res,
            status=diagnosis_res.get("status", "SUCCESS"),
            confidence=diagnosis_res.get("confidence", 0.0),
            latency_ms=diagnosis_res.get("latency_ms", 0),
        )

        _log_activity(
            ticket=ticket,
            actor="Diagnosis Agent",
            action="DIAGNOSIS_COMPLETED",
            description=f"Diagnosis identified: {diagnosis_res.get('diagnosis')}.",
            metadata=diagnosis_res,
        )

        # -------------------------------------------------------------
        # STEP 6: Knowledge Retrieval Agent (M2 / M3 RAG)
        # -------------------------------------------------------------
        workflow.current_agent = "Knowledge Retrieval Agent"
        workflow.save(update_fields=["current_agent"])

        try:
            retrieval_res = run_knowledge_retrieval_agent(
                ticket_data=ticket_data,
                diagnosis_data=diagnosis_res,
                category=ticket.category,
                sub_category=ticket.sub_category,
            )
        except Exception as rag_err:
            retrieval_res = {
                "status": "FAILED",
                "knowledge_retrieved": False,
                "articles_retrieved_count": 0,
                "knowledge_source": "Unavailable",
                "citations": [],
                "suggested_steps": [],
                "retrieval_confidence": 0.30,
                "latency_ms": 10,
                "error": str(rag_err),
            }

        _record_execution(
            workflow=workflow,
            agent_name="Knowledge Retrieval Agent",
            input_data={"query": f"{ticket.title} {ticket.description}", "category": ticket.category},
            output_data=retrieval_res,
            status="SUCCESS" if retrieval_res.get("status") == "SUCCESS" else "FAILED",
            confidence=float(retrieval_res.get("retrieval_confidence") or 0.0),
            latency_ms=int(retrieval_res.get("latency_ms") or 0),
        )

        _log_activity(
            ticket=ticket,
            actor="Retrieval Agent",
            action="KNOWLEDGE_RETRIEVED",
            description=f"Retrieved {retrieval_res.get('articles_retrieved_count', 0)} sources ({retrieval_res.get('knowledge_source')}).",
            metadata={"source": retrieval_res.get("knowledge_source"), "count": retrieval_res.get("articles_retrieved_count")},
        )

        # -------------------------------------------------------------
        # Fallback Check: If not in Knowledge Base or Category fallback, set Category 'Other' and Priority 'P3' (Medium)
        # -------------------------------------------------------------
        raw_citations = retrieval_res.get("citations")
        citations_list = raw_citations if isinstance(raw_citations, list) else []
        citations_count = len(citations_list)
        articles_count = int(retrieval_res.get("articles_retrieved_count") or 0)
        is_in_kb = (
            bool(retrieval_res.get("knowledge_retrieved"))
            and articles_count > 0
            and citations_count > 0
        )
        if not is_in_kb or ticket.category in ["Other", "General"]:
            known_keywords = ["vpn", "password", "invoice", "payment", "login", "wifi", "screen", "laptop", "charge", "hack", "phishing", "bug", "crash"]
            has_known_kw = any(k in f"{ticket.title} {ticket.description}".lower() for k in known_keywords)
            if not is_in_kb and not has_known_kw:
                ticket.category = "Other"
                ticket.sub_category = "Other"
            if not ticket.priority or ticket.priority in ["Medium", "MEDIUM", "P3", "Low", "LOW", "P4"]:
                ticket.priority = "Medium"
                ticket.severity = "Medium"

        # -------------------------------------------------------------
        # STEP 7: Resolution Generation Agent
        # -------------------------------------------------------------
        workflow.current_agent = "Resolution Generation Agent"
        workflow.save(update_fields=["current_agent"])

        resolution_res = run_resolution_agent(
            ticket_data=ticket_data,
            diagnosis_data=diagnosis_res,
            retrieval_data=retrieval_res,
            category=ticket.category,
            sub_category=ticket.sub_category,
        )

        ticket.suggested_resolution = "\n".join(resolution_res.get("troubleshooting_steps", []))

        _record_execution(
            workflow=workflow,
            agent_name="Resolution Generation Agent",
            input_data={"citations_count": citations_count},
            output_data=resolution_res,
            status=str(resolution_res.get("status", "SUCCESS")),
            confidence=float(resolution_res.get("confidence") or 0.0),
            latency_ms=int(resolution_res.get("latency_ms") or 0),
        )

        _log_activity(
            ticket=ticket,
            actor="Resolution Agent",
            action="RESOLUTION_GENERATED",
            description=f"Resolution Agent generated troubleshooting response (Confidence: {resolution_res.get('confidence')}).",
            metadata={"confidence": resolution_res.get("confidence")},
        )

        # -------------------------------------------------------------
        # STEP 8: Validation & Confidence / Safety Gate
        # -------------------------------------------------------------
        workflow.current_agent = "Validation Gate"
        workflow.save(update_fields=["current_agent"])

        validation_res = run_validation_gate(
            ticket_data=ticket_data,
            diagnosis_data=diagnosis_res,
            retrieval_data=retrieval_res,
            resolution_data=resolution_res,
            threshold=override_threshold,
        )

        _record_execution(
            workflow=workflow,
            agent_name="Validation Gate",
            input_data={"confidence": resolution_res.get("confidence"), "threshold": override_threshold},
            output_data=validation_res,
            status=validation_res.get("status", "SUCCESS"),
            confidence=validation_res.get("confidence", 0.0),
            latency_ms=validation_res.get("latency_ms", 0),
        )

        final_decision = validation_res.get("decision")
        final_confidence = validation_res.get("confidence", 0.0)

        # SLA Deadlines
        resp_due, resol_due = calculate_sla_due_dates(ticket.priority, now_dt)
        ticket.sla_response_due = resp_due
        ticket.sla_resolution_due = resol_due

        # Save aggregated AI metadata
        ticket.ai_confidence = final_confidence
        ticket.ai_analysis_meta = {
            "classification": class_res,
            "priority": pri_res,
            "sentiment": sent_res,
            "similarity": sim_res,
            "diagnosis": diagnosis_res,
            "retrieval": retrieval_res,
            "resolution": resolution_res,
            "validation": validation_res,
            "final_decision": final_decision,
        }

        # -------------------------------------------------------------
        # STEP 9: High Confidence Decision vs Low Confidence Escalation
        # -------------------------------------------------------------
        if final_decision == "AUTOMATE_RESOLUTION":
            workflow.workflow_status = "COMPLETED"
            workflow.current_agent = "Completed (Automated Resolution)"
            workflow.final_confidence = final_confidence

            ticket.status = "AI_RESPONDED"
            ticket.auto_resolved = True
            ticket.save(update_fields=[
                "category", "sub_category", "priority", "severity", "sentiment", "sentiment_score",
                "similar_tickets_meta", "suggested_resolution", "ai_confidence", "ai_analysis_meta",
                "status", "auto_resolved", "sla_response_due", "sla_resolution_due", "updated_at"
            ])

            _log_activity(
                ticket=ticket,
                actor="Validation Gate",
                action="VALIDATION_PASSED",
                description=f"Validation passed (Confidence: {final_confidence}). Automated resolution dispatched to customer.",
                metadata={"final_decision": "AUTOMATE_RESOLUTION"},
            )

            # Post automated AI reply on ticket
            ai_steps = resolution_res.get("troubleshooting_steps", [])
            steps_text = "\n".join([f"• {s}" for s in ai_steps])
            ai_reply_body = (
                f"Hello,\n\nOur AI Assistant analyzed your request and retrieved the following recommended resolution steps:\n\n"
                f"{steps_text}\n\n"
                f"Knowledge Source: {retrieval_res.get('knowledge_source', 'Support Knowledge Base')}\n\n"
                f"If this resolves your issue, please click 'Confirm Resolution' below to close this ticket. "
                f"If you still need help, reply to this message and our support team will assist you."
            )
            TicketReply.objects.create(
                ticket=ticket,
                user=ticket.created_by,
                message=ai_reply_body,
                is_internal=False
            )

            # Customer Notification
            Notification.objects.create(
                notification_id=f"NOTIF-{uuid.uuid4().hex[:8].upper()}",
                user=ticket.created_by,
                ticket=ticket,
                title=f"AI Response Ready: #{ticket.ticket_number}",
                message=f"Suggested resolution steps are ready for '{ticket.title}'. Please review and confirm resolution.",
                notification_type="ai_response"
            )

            # Jira Create / Update
            jira_res = create_or_update_jira_ticket(ticket, status_override="IN_PROGRESS")

            # Email Automation
            email_res = send_resolution_email(
                ticket=ticket,
                troubleshooting_steps=resolution_res.get("troubleshooting_steps", []),
                citations=resolution_res.get("citations", []),
                confidence=final_confidence,
            )

            escalation_res = None
        else:
            # Low Confidence or High Risk -> Run Escalation Agent
            workflow.current_agent = "Escalation Agent"
            workflow.save(update_fields=["current_agent"])

            esc_input = {
                "reason": validation_res.get("failure_reasons"),
                "confidence": final_confidence,
                "category": ticket.category,
                "priority": ticket.priority,
            }
            escalation_res = run_escalation_agent(
                ticket_data=ticket_data,
                diagnosis_data=diagnosis_res,
                validation_data=validation_res,
                category=ticket.category,
                sub_category=ticket.sub_category,
            )

            _record_execution(
                workflow=workflow,
                agent_name="Escalation Agent",
                input_data=esc_input,
                output_data=escalation_res,
                status=escalation_res.get("status", "SUCCESS"),
                confidence=escalation_res.get("confidence", 0.95),
                latency_ms=escalation_res.get("latency_ms", 0),
            )

            workflow.workflow_status = "ESCALATED"
            workflow.current_agent = "Escalated to Human Support"
            workflow.final_confidence = final_confidence

            ticket.status = "ESCALATED"
            ticket.escalated = True
            ticket.assigned_queue = escalation_res.get("target_team", "Technical Support")
            ticket.escalation_reason = escalation_res.get("escalation_reason", "AI confidence threshold not met.")
            ticket.save(update_fields=[
                "category", "sub_category", "priority", "severity", "sentiment", "sentiment_score",
                "similar_tickets_meta", "suggested_resolution", "ai_confidence", "ai_analysis_meta",
                "status", "escalated", "assigned_queue", "escalation_reason",
                "sla_response_due", "sla_resolution_due", "updated_at"
            ])

            _log_activity(
                ticket=ticket,
                actor="Escalation Agent",
                action="TICKET_ESCALATED",
                description=f"Ticket escalated to {ticket.assigned_queue}. Reason: {ticket.escalation_reason}.",
                metadata=escalation_res,
            )

            # Notify Support Staff / Managers
            for staff_user in User.objects.filter(is_staff=True)[:10]:
                Notification.objects.create(
                    notification_id=f"NOTIF-{uuid.uuid4().hex[:8].upper()}",
                    user=staff_user,
                    ticket=ticket,
                    title=f"Ticket #{ticket.ticket_number} Escalated to {ticket.assigned_queue}",
                    message=f"Priority: {ticket.priority} · SLA Target: {ticket.sla_response_due.strftime('%H:%M')} · {ticket.title}",
                    notification_type="escalation"
                )

            # Jira update with Escalated status and Target team
            jira_res = create_or_update_jira_ticket(
                ticket=ticket,
                status_override="ESCALATED",
                team_name=ticket.assigned_queue,
            )

            # Email Automation: Send Escalation Notice
            email_res = send_escalation_email(
                ticket=ticket,
                target_team=ticket.assigned_queue,
                escalation_reason=ticket.escalation_reason,
            )

        # Critical priority immediate alert
        if (ticket.priority or "").upper() in ["CRITICAL", "P1"]:
            for mgr in User.objects.filter(is_superuser=True)[:5]:
                Notification.objects.create(
                    notification_id=f"NOTIF-{uuid.uuid4().hex[:8].upper()}",
                    user=mgr,
                    ticket=ticket,
                    title=f"🚨 CRITICAL SLA ALERT: #{ticket.ticket_number}",
                    message=f"Critical incident requiring 30-min response! Issue: {ticket.title}",
                    notification_type="sla_warning"
                )

        total_latency_ms = int((time.time() - workflow_start_time) * 1000)
        workflow.completed_at = datetime.now(timezone.utc)
        workflow.latency_ms = total_latency_ms
        workflow.save(update_fields=["workflow_status", "current_agent", "final_confidence", "latency_ms", "completed_at"])

        _sync_workflow_to_mongo(workflow)

        return {
            "success": True,
            "workflow_id": workflow.workflow_id,
            "workflow_status": workflow.workflow_status,
            "current_agent": workflow.current_agent,
            "final_confidence": workflow.final_confidence,
            "final_decision": final_decision,
            "latency_ms": total_latency_ms,
            "classification": class_res,
            "priority": pri_res,
            "sentiment": sent_res,
            "similarity": sim_res,
            "diagnosis": diagnosis_res,
            "knowledge_retrieval": retrieval_res,
            "resolution": resolution_res,
            "validation": validation_res,
            "escalation": escalation_res,
            "jira": jira_res,
            "email": email_res,
        }


    except Exception as err:
        # Failure handling: Never lose ticket or halt system without clean fallback
        total_latency_ms = int((time.time() - workflow_start_time) * 1000)
        workflow.workflow_status = "FAILED"
        workflow.current_agent = "Error Fallback"
        workflow.error_message = str(err)
        workflow.latency_ms = total_latency_ms
        workflow.completed_at = datetime.now(timezone.utc)
        workflow.save()

        _log_activity(
            ticket=ticket,
            actor="Orchestrator",
            action="WORKFLOW_ERROR_FALLBACK",
            description=f"Agent workflow encountered an exception: {err}. Safe fallback applied.",
            metadata={"error": str(err)},
        )

        return {
            "success": False,
            "workflow_id": workflow.workflow_id,
            "workflow_status": "FAILED",
            "error": str(err),
            "latency_ms": total_latency_ms,
        }


def _record_execution(
    workflow: AgentWorkflow,
    agent_name: str,
    input_data: dict,
    output_data: dict,
    status: str = "SUCCESS",
    confidence: float = 0.0,
    latency_ms: int = 0,
    error_message: str = "",
) -> AgentExecution:
    execution_id = f"EXEC-{uuid.uuid4().hex[:8].upper()}"
    exec_obj = AgentExecution.objects.create(
        execution_id=execution_id,
        workflow=workflow,
        agent_name=agent_name,
        input_data=input_data,
        output_data=output_data,
        status=status,
        confidence=confidence,
        latency_ms=latency_ms,
        error_message=error_message,
        completed_at=datetime.now(timezone.utc),
    )

    try:
        if agent_executions_collection:
            agent_executions_collection.insert_one({
                "execution_id": execution_id,
                "workflow_id": workflow.workflow_id,
                "agent_name": agent_name,
                "input_data": input_data,
                "output_data": output_data,
                "status": status,
                "confidence": confidence,
                "latency_ms": latency_ms,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            })
    except Exception:
        pass

    return exec_obj


def _log_activity(
    ticket: Ticket,
    actor: str,
    action: str,
    description: str,
    metadata: dict | None = None,
) -> ActivityLog:
    log_id = f"ACT-{uuid.uuid4().hex[:8].upper()}"
    log_obj = ActivityLog.objects.create(
        log_id=log_id,
        ticket=ticket,
        actor=actor,
        action=action,
        description=description,
        metadata=metadata or {},
    )

    try:
        if activity_logs_collection:
            activity_logs_collection.insert_one({
                "log_id": log_id,
                "ticket_id": ticket.id,
                "ticket_number": ticket.ticket_number,
                "actor": actor,
                "action": action,
                "description": description,
                "metadata": metadata or {},
                "timestamp": datetime.now(timezone.utc).isoformat(),
            })
    except Exception:
        pass

    return log_obj


def _sync_workflow_to_mongo(workflow: AgentWorkflow):
    try:
        if agent_workflows_collection:
            agent_workflows_collection.update_one(
                {"workflow_id": workflow.workflow_id},
                {
                    "$set": {
                        "workflow_id": workflow.workflow_id,
                        "ticket_id": workflow.ticket.id,
                        "ticket_number": workflow.ticket.ticket_number,
                        "workflow_status": workflow.workflow_status,
                        "current_agent": workflow.current_agent,
                        "final_confidence": workflow.final_confidence,
                        "latency_ms": workflow.latency_ms,
                        "started_at": workflow.started_at.isoformat() if workflow.started_at else None,
                        "completed_at": workflow.completed_at.isoformat() if workflow.completed_at else None,
                    }
                },
                upsert=True,
            )
    except Exception:
        pass
