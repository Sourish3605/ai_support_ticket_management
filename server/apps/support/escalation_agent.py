from .agent_execution_service import (
    start_agent_execution,
    complete_agent_execution,
    fail_agent_execution,
)


def run_escalation(workflow, ticket, reason):
    """
    M3 Escalation Agent.

    Records an escalation when the workflow determines
    that the ticket requires human/agent intervention.
    """

    input_data = {
        "ticket_id": ticket.id,
        "title": ticket.title,
        "description": ticket.description,
        "category": ticket.category,
        "sub_category": ticket.sub_category,
        "severity": ticket.severity,
        "priority": ticket.priority,
        "reason": reason,
    }

    execution = start_agent_execution(
        workflow=workflow,
        agent_name="Escalation",
        input_data=input_data,
    )

    try:
        output_data = {
            "escalated": True,
            "reason": reason,
            "message": (
                "Ticket requires human/agent intervention."
            ),
        }

        execution = complete_agent_execution(
            execution=execution,
            output_data=output_data,
            confidence=0.95,
        )

        workflow.workflow_status = "Escalated"
        workflow.current_agent = "Escalation"
        workflow.final_confidence = 0.95

        workflow.save(
            update_fields=[
                "workflow_status",
                "current_agent",
                "final_confidence",
            ]
        )

        return execution

    except Exception as e:
        fail_agent_execution(
            execution=execution,
            output_data={
                "error": str(e),
            },
        )

        workflow.workflow_status = "Failed"

        workflow.save(
            update_fields=["workflow_status"]
        )

        raise
    