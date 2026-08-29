from .agent_execution_service import (
    start_agent_execution,
    complete_agent_execution,
    fail_agent_execution,
)


def run_resolution_agent(workflow, ticket):
    """
    Resolution Agent for M3 multi-agent workflow.
    Generates a resolution based on the ticket information.
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
        agent_name="Resolution",
        input_data=input_data,
    )

    try:
        output_data = {
            "resolution": (
                f"Recommended resolution for "
                f"{ticket.category} / {ticket.sub_category}"
            ),
            "ticket_id": ticket.id,
            "category": ticket.category,
            "sub_category": ticket.sub_category,
            "severity": ticket.severity,
            "priority": ticket.priority,
            "next_agent": "Response",
        }

        execution = complete_agent_execution(
            execution=execution,
            output_data=output_data,
            confidence=0.90,
        )

        workflow.current_agent = "Response"
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
    