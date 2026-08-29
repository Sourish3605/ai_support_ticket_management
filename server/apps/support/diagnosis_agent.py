from .agent_execution_service import (
    start_agent_execution,
    complete_agent_execution,
    fail_agent_execution,
)


def run_diagnosis_agent(workflow, ticket):
    """
    Diagnosis Agent for M3 multi-agent workflow.
    Analyzes the ticket and produces a diagnosis result.
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
        agent_name="Diagnosis",
        input_data=input_data,
    )

    try:
        output_data = {
            "diagnosis": (
                f"Ticket identified as "
                f"{ticket.category} / {ticket.sub_category}"
            ),
            "severity": ticket.severity,
            "priority": ticket.priority,
            "next_agent": "Knowledge Retrieval",
        }

        execution = complete_agent_execution(
            execution=execution,
            output_data=output_data,
            confidence=0.90,
        )

        workflow.current_agent = "Knowledge Retrieval"
        workflow.workflow_status = "Running"

        workflow.save(
            update_fields=[
                "current_agent",
                "workflow_status",
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
            update_fields=[
                "workflow_status",
            ]
        )

        raise
    