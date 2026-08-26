from .agent_execution_service import (
    start_agent_execution,
    complete_agent_execution,
    fail_agent_execution,
)


def run_diagnosis(workflow, ticket):
    """
    M3 Diagnosis Agent.

    Analyzes the already-classified ticket and produces
    a structured diagnosis.
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
        # Basic rule-based diagnosis using the
        # classification already produced by M1.
        diagnosis = {
            "problem": ticket.title,
            "description": ticket.description,
            "category": ticket.category,
            "sub_category": ticket.sub_category,
            "severity": ticket.severity,
            "priority": ticket.priority,
            "possible_cause": (
                f"Likely {ticket.sub_category.lower()} "
                f"related issue under {ticket.category}."
            ),
        }

        output_data = {
            "diagnosis": diagnosis,
            "next_agent": "Knowledge Retrieval",
        }

        execution = complete_agent_execution(
            execution=execution,
            output_data=output_data,
            confidence=0.90,
        )

        workflow.current_agent = "Knowledge Retrieval"
        workflow.save(
            update_fields=["current_agent"]
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
    