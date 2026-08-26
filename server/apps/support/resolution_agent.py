from .agent_execution_service import (
    start_agent_execution,
    complete_agent_execution,
    fail_agent_execution,
)


def run_resolution(workflow, ticket):
    """
    M3 Resolution Agent.

    Uses the Knowledge Retrieval Agent's output to
    generate and store the final resolution.
    """

    # Get the latest Knowledge Retrieval execution
    retrieval_execution = (
        workflow.executions
        .filter(agent_name="Knowledge Retrieval")
        .order_by("-started_at")
        .first()
    )

    if not retrieval_execution:
        raise ValueError(
            "Knowledge Retrieval execution not found."
        )

    input_data = {
        "ticket_id": ticket.id,
        "title": ticket.title,
        "description": ticket.description,
        "diagnosis": (
            workflow.executions
            .filter(agent_name="Diagnosis")
            .order_by("-started_at")
            .values_list("output_data", flat=True)
            .first()
        ),
        "knowledge_retrieval": retrieval_execution.output_data,
    }

    execution = start_agent_execution(
        workflow=workflow,
        agent_name="Resolution",
        input_data=input_data,
    )

    try:
        retrieval_output = retrieval_execution.output_data or {}

        suggested_steps = retrieval_output.get(
            "suggested_steps",
            []
        )

        citations = retrieval_output.get(
            "citations",
            []
        )

        knowledge_source = retrieval_output.get(
            "knowledge_source",
            "Enterprise Knowledge Store"
        )

        output_data = {
            "resolution": suggested_steps,
            "knowledge_source": knowledge_source,
            "citations": citations,
            "message": (
                "Resolution generated successfully "
                "using retrieved enterprise knowledge."
            ),
        }

        execution = complete_agent_execution(
            execution=execution,
            output_data=output_data,
            confidence=0.94,
        )

        workflow.workflow_status = "Completed"
        workflow.current_agent = "Resolution"
        workflow.completed_at = execution.completed_at
        workflow.final_confidence = 0.94

        workflow.save(
            update_fields=[
                "workflow_status",
                "current_agent",
                "completed_at",
                "final_confidence",
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
    