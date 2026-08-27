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

from datetime import datetime, timezone
import time
import uuid

from .models import Ticket, AgentWorkflow, AgentExecution, ActivityLog
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


def run_multi_agent_workflow(
    ticket: Ticket,
    send_creation_email: bool = False,
    override_threshold: float = 0.75,
) -> dict:
    """
    Executes the end-to-end Milestone 3 multi-agent workflow for a given ticket.
    """
    workflow_start_time = time.time()
    now_dt = datetime.now(timezone.utc)
    workflow_id = f"WF-{ticket.id}-{uuid.uuid4().hex[:6].upper()}"

    # 1. Create Workflow State Record
    workflow = AgentWorkflow.objects.create(
        workflow_id=workflow_id,
        ticket=ticket,
        workflow_status="RUNNING",
        current_agent="Diagnosis Agent",
    )

    # Log initial workflow start
    _log_activity(
        ticket=ticket,
        actor="Orchestrator",
        action="WORKFLOW_STARTED",
        description=f"Multi-Agent AI workflow '{workflow_id}' initiated for Ticket #{ticket.ticket_number or ticket.id}.",
        metadata={"workflow_id": workflow_id},
    )

    if send_creation_email:
        send_ticket_created_email(ticket)

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
    }

    try:
        # -------------------------------------------------------------
        # STEP 1: Diagnosis Agent
        # -------------------------------------------------------------
        workflow.current_agent = "Diagnosis Agent"
        workflow.save(update_fields=["current_agent"])

        diag_input = {
            "ticket_number": ticket.ticket_number,
            "category": ticket.category,
            "sub_category": ticket.sub_category,
            "severity": ticket.severity,
            "priority": ticket.priority,
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
            input_data=diag_input,
            output_data=diagnosis_res,
            status=diagnosis_res.get("status", "SUCCESS"),
            confidence=diagnosis_res.get("confidence", 0.0),
            latency_ms=diagnosis_res.get("latency_ms", 0),
        )

        _log_activity(
            ticket=ticket,
            actor="Diagnosis Agent",
            action="DIAGNOSIS_COMPLETED",
            description=f"Diagnosis Agent identified: {diagnosis_res.get('diagnosis')} (Confidence: {diagnosis_res.get('confidence')}).",
            metadata=diagnosis_res,
        )

        # -------------------------------------------------------------
        # STEP 2: Knowledge Retrieval Agent (Consuming M2 RAG Service)
        # -------------------------------------------------------------
        workflow.current_agent = "Knowledge Retrieval Agent"
        workflow.save(update_fields=["current_agent"])

        retr_input = {
            "query": f"{ticket.title} {ticket.description}",
            "diagnosis": diagnosis_res.get("diagnosis"),
            "category": ticket.category,
        }
        retrieval_res = run_knowledge_retrieval_agent(
            ticket_data=ticket_data,
            diagnosis_data=diagnosis_res,
            category=ticket.category,
            sub_category=ticket.sub_category,
        )

        _record_execution(
            workflow=workflow,
            agent_name="Knowledge Retrieval Agent",
            input_data=retr_input,
            output_data=retrieval_res,
            status=retrieval_res.get("status", "SUCCESS"),
            confidence=retrieval_res.get("retrieval_confidence", 0.0),
            latency_ms=retrieval_res.get("latency_ms", 0),
        )

        _log_activity(
            ticket=ticket,
            actor="Retrieval Agent",
            action="KNOWLEDGE_RETRIEVED",
            description=f"Retrieval Agent retrieved {retrieval_res.get('articles_retrieved_count', 0)} knowledge sources ({retrieval_res.get('knowledge_source')}).",
            metadata={"source": retrieval_res.get("knowledge_source"), "count": retrieval_res.get("articles_retrieved_count")},
        )

        # -------------------------------------------------------------
        # STEP 3: Resolution Generation Agent
        # -------------------------------------------------------------
        workflow.current_agent = "Resolution Generation Agent"
        workflow.save(update_fields=["current_agent"])

        resol_input = {
            "diagnosis": diagnosis_res.get("diagnosis"),
            "retrieved_articles": retrieval_res.get("knowledge_source"),
            "citations_count": len(retrieval_res.get("citations", [])),
        }
        resolution_res = run_resolution_agent(
            ticket_data=ticket_data,
            diagnosis_data=diagnosis_res,
            retrieval_data=retrieval_res,
            category=ticket.category,
            sub_category=ticket.sub_category,
        )

        _record_execution(
            workflow=workflow,
            agent_name="Resolution Generation Agent",
            input_data=resol_input,
            output_data=resolution_res,
            status=resolution_res.get("status", "SUCCESS"),
            confidence=resolution_res.get("confidence", 0.0),
            latency_ms=resolution_res.get("latency_ms", 0),
        )

        _log_activity(
            ticket=ticket,
            actor="Resolution Agent",
            action="RESOLUTION_GENERATED",
            description=f"Resolution Agent generated troubleshooting steps with confidence {resolution_res.get('confidence')}.",
            metadata={"confidence": resolution_res.get("confidence")},
        )

        # -------------------------------------------------------------
        # STEP 4: Validation & Confidence Gate
        # -------------------------------------------------------------
        workflow.current_agent = "Validation Gate"
        workflow.save(update_fields=["current_agent"])

        val_input = {
            "confidence": resolution_res.get("confidence"),
            "grounded": resolution_res.get("grounded"),
            "citations_count": len(resolution_res.get("citations", [])),
            "threshold": override_threshold,
        }
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
            input_data=val_input,
            output_data=validation_res,
            status=validation_res.get("status", "SUCCESS"),
            confidence=validation_res.get("confidence", 0.0),
            latency_ms=validation_res.get("latency_ms", 0),
        )

        final_decision = validation_res.get("decision")
        final_confidence = validation_res.get("confidence", 0.0)

        # -------------------------------------------------------------
        # STEP 5: High Confidence Decision vs Low Confidence Escalation
        # -------------------------------------------------------------
        if final_decision == "AUTOMATE_RESOLUTION":
            workflow.workflow_status = "COMPLETED"
            workflow.current_agent = "Completed (Automated Resolution)"
            workflow.final_confidence = final_confidence

            # Update ticket state
            if ticket.status in ["NEW", "Open", "CLASSIFIED"]:
                ticket.status = "AI_RESOLUTION_READY"
                ticket.save(update_fields=["status", "updated_at"])

            _log_activity(
                ticket=ticket,
                actor="Validation Gate",
                action="VALIDATION_PASSED",
                description=f"Validation passed (Confidence: {final_confidence}). Automated resolution approved.",
                metadata={"final_decision": "AUTOMATE_RESOLUTION"},
            )

            # Jira Create / Update
            jira_res = create_or_update_jira_ticket(ticket, status_override="IN_PROGRESS")

            # Email Automation: Send AI Resolution Ready
            email_res = send_resolution_email(
                ticket=ticket,
                troubleshooting_steps=resolution_res.get("troubleshooting_steps", []),
                citations=resolution_res.get("citations", []),
                confidence=final_confidence,
            )

            escalation_res = None
        else:
            # Low Confidence -> Run Escalation Agent
            workflow.current_agent = "Escalation Agent"
            workflow.save(update_fields=["current_agent"])

            esc_input = {
                "reason": validation_res.get("failure_reasons"),
                "confidence": final_confidence,
                "category": ticket.category,
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

            # Update ticket state to ESCALATED
            ticket.status = "ESCALATED"
            ticket.save(update_fields=["status", "updated_at"])

            _log_activity(
                ticket=ticket,
                actor="Escalation Agent",
                action="TICKET_ESCALATED",
                description=f"Ticket escalated to {escalation_res.get('target_team')}. Reason: {escalation_res.get('escalation_reason')}.",
                metadata=escalation_res,
            )

            # Jira update with Escalated status and Target team
            jira_res = create_or_update_jira_ticket(
                ticket=ticket,
                status_override="ESCALATED",
                team_name=escalation_res.get("target_team"),
            )

            # Email Automation: Send Escalation Notice
            email_res = send_escalation_email(
                ticket=ticket,
                target_team=escalation_res.get("target_team", "Technical Support"),
                escalation_reason=escalation_res.get("escalation_reason", "AI confidence threshold not met."),
            )

        total_latency_ms = int((time.time() - workflow_start_time) * 1000)
        workflow.completed_at = datetime.now(timezone.utc)
        workflow.latency_ms = total_latency_ms
        workflow.save(update_fields=["workflow_status", "current_agent", "final_confidence", "latency_ms", "completed_at"])

        # Sync to MongoDB collection
        _sync_workflow_to_mongo(workflow)

        return {
            "success": True,
            "workflow_id": workflow.workflow_id,
            "workflow_status": workflow.workflow_status,
            "current_agent": workflow.current_agent,
            "final_confidence": workflow.final_confidence,
            "final_decision": final_decision,
            "latency_ms": total_latency_ms,
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
