from apps.support.models import AgentWorkflow, AgentExecution

from apps.support.agent_execution_service import (
    start_agent_execution,
    complete_agent_execution,
    fail_agent_execution,
)

from apps.support.diagnosis_agent import run_diagnosis_agent
from apps.support.knowledge_retrieval_agent import run_knowledge_retrieval
from apps.support.resolution_agent import run_resolution_agent


def create_agent_workflow(ticket):
    """
    Create an M3 AgentWorkflow for the given ticket.
    """

    workflow, created = AgentWorkflow.objects.get_or_create(
        ticket=ticket,
        defaults={
            "workflow_status": "Started",
            "current_agent": "Orchestrator",
        }
    )

    return workflow


def run_orchestrator(workflow, ticket):
    """
    Start and complete the Orchestrator agent execution.
    """

    input_data = {
        "ticket_id": ticket.id,
        "title": ticket.title,
        "description": ticket.description,
        "category": ticket.category,
        "sub_category": ticket.sub_category,
        "severity": ticket.severity,
        "priority": ticket.priority,
    }

    execution = start_agent_execution(
        workflow=workflow,
        agent_name="Orchestrator",
        input_data=input_data,
    )

    try:
        output_data = {
            "message": "M3 workflow orchestration started",
            "next_agent": "Diagnosis",
        }

        execution = complete_agent_execution(
            execution=execution,
            output_data=output_data,
            confidence=0.95,
        )

        workflow.workflow_status = "Running"
        workflow.current_agent = "Diagnosis"

        workflow.save(
            update_fields=[
                "workflow_status",
                "current_agent",
            ]
        )

        return execution

    except Exception as e:
        fail_agent_execution(
            execution=execution,
            output_data={
                "error": str(e)
            },
        )

        workflow.workflow_status = "Failed"

        workflow.save(
            update_fields=["workflow_status"]
        )

        raise


def run_m3_workflow(ticket):
    """
    Run the complete M3 multi-agent workflow.

    Flow:
        Orchestrator
            ↓
        Diagnosis
            ↓
        Knowledge Retrieval
            ↓
        Resolution
    """

    workflow = create_agent_workflow(ticket)

    try:
        # --------------------------------------------------
        # 1. ORCHESTRATOR
        # --------------------------------------------------

        run_orchestrator(
            workflow=workflow,
            ticket=ticket,
        )

        # Refresh workflow before moving to next agent.
        workflow.refresh_from_db()

        # --------------------------------------------------
        # 2. DIAGNOSIS
        # --------------------------------------------------

        run_diagnosis_agent(
            workflow=workflow,
            ticket=ticket,
        )

        workflow.refresh_from_db()

        # --------------------------------------------------
        # 3. KNOWLEDGE RETRIEVAL
        # --------------------------------------------------

        run_knowledge_retrieval(
            workflow=workflow,
            ticket=ticket,
        )

        workflow.refresh_from_db()

        # --------------------------------------------------
        # 4. RESOLUTION
        # --------------------------------------------------

        run_resolution_agent(
            workflow=workflow,
            ticket=ticket,
        )

        workflow.refresh_from_db()

        return workflow

    except Exception:
        workflow.workflow_status = "Failed"

        workflow.save(
            update_fields=[
                "workflow_status",
            ]
        )

        raise
    
    