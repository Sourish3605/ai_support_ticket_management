from .agent_execution_service import (
    start_agent_execution,
    complete_agent_execution,
    fail_agent_execution,
)

from .knowledge_service import retrieve_knowledge_and_generate_resolution


def run_knowledge_retrieval(workflow, ticket):
    """
    M3 Knowledge Retrieval Agent.

    Uses the existing M2 RAG knowledge service and records
    the agent execution for M3 auditing.
    """

    input_data = {
        "ticket_id": ticket.id,
        "title": ticket.title,
        "description": ticket.description,
        "category": ticket.category,
        "sub_category": ticket.sub_category,
    }

    execution = start_agent_execution(
        workflow=workflow,
        agent_name="Knowledge Retrieval",
        input_data=input_data,
    )

    try:
        # Reuse the existing M2 RAG service.
        rag_result = retrieve_knowledge_and_generate_resolution(
            category=ticket.category,
            sub_category=ticket.sub_category,
            subject=ticket.title,
            description=ticket.description,
            ticket_id=ticket.id,
        )

        output_data = {
            "knowledge_source": rag_result.get(
                "knowledge_source",
                "Enterprise Knowledge Store"
            ),
            "suggested_steps": rag_result.get(
                "suggested_steps",
                []
            ),
            "citations": rag_result.get(
                "citations",
                []
            ),
            "next_agent": "Resolution",
        }

        execution = complete_agent_execution(
            execution=execution,
            output_data=output_data,
            confidence=0.95,
        )

        workflow.current_agent = "Resolution"
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