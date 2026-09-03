import time
from .agent_execution_service import (
    start_agent_execution,
    complete_agent_execution,
    fail_agent_execution,
)


def run_resolution_agent(
    *args,
    ticket_data: dict | None = None,
    diagnosis_data: dict | None = None,
    retrieval_data: dict | None = None,
    category: str = "General",
    sub_category: str = "Other",
    workflow=None,
    ticket=None,
    **kwargs,
) -> dict:
    """
    Resolution Agent for M3 multi-agent workflow.
    Supports both orchestrator dict pipeline (ticket_data, diagnosis_data, retrieval_data)
    and DB model execution pipeline (workflow, ticket).
    """
    # 1. Check if invoked as run_resolution_agent(workflow, ticket)
    if len(args) >= 2 and hasattr(args[0], "workflow_id"):
        workflow = args[0]
        ticket = args[1]
    elif len(args) == 1 and hasattr(args[0], "workflow_id"):
        workflow = args[0]

    if workflow is not None and ticket is not None and ticket_data is None:
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
            workflow.save(update_fields=["current_agent", "workflow_status"])
            return execution

        except Exception as e:
            fail_agent_execution(
                execution=execution,
                output_data={"error": str(e)},
            )
            workflow.workflow_status = "Failed"
            workflow.save(update_fields=["workflow_status"])
            raise

    # 2. Invoked as run_resolution_agent(ticket_data=..., diagnosis_data=..., retrieval_data=...)
    start_time = time.time()
    if len(args) >= 1 and isinstance(args[0], dict) and ticket_data is None:
        ticket_data = args[0]
        if len(args) >= 2 and isinstance(args[1], dict):
            diagnosis_data = args[1]
        if len(args) >= 3 and isinstance(args[2], dict):
            retrieval_data = args[2]
        if len(args) >= 4 and isinstance(args[3], str):
            category = args[3]
        if len(args) >= 5 and isinstance(args[4], str):
            sub_category = args[4]

    ticket_data = ticket_data or {}
    diagnosis_data = diagnosis_data or {}
    retrieval_data = retrieval_data or {}

    retrieved_steps = retrieval_data.get("suggested_steps", [])
    citations = retrieval_data.get("citations", [])
    knowledge_source = retrieval_data.get("knowledge_source", "Enterprise IT Support Desk")
    diag_confidence = float(diagnosis_data.get("confidence", 0.85))
    retrieval_confidence = float(retrieval_data.get("retrieval_confidence", 0.85))

    # Formulate step-by-step grounded resolution
    steps = []
    if retrieved_steps:
        for step in retrieved_steps:
            clean_step = step.strip().lstrip("0123456789.-* ")
            if clean_step:
                steps.append(clean_step)
    else:
        steps = [
            "Verify network and endpoint connectivity.",
            "Restart the affected client application or service.",
            "Verify valid corporate SSO credentials.",
            "Contact Tier-2 Support if the condition persists.",
        ]

    # Calculate aggregate resolution confidence
    base_confidence = (diag_confidence * 0.45) + (retrieval_confidence * 0.55)
    is_obscure = not retrieval_data.get("knowledge_retrieved", True) or len(citations) == 0

    if is_obscure:
        final_confidence = min(0.48, base_confidence)
        resolution_text = "Insufficient verified knowledge base documentation to formulate an automated resolution."
    else:
        final_confidence = round(min(0.96, base_confidence), 2)
        formatted_steps = "\n".join([f"{i+1}. {step}" for i, step in enumerate(steps)])
        resolution_text = f"Recommended Troubleshooting Steps:\n{formatted_steps}"

    sources = [
        c.get("source_title") or c.get("quote")
        for c in citations
        if c.get("source_title")
    ]
    if not sources and knowledge_source:
        sources = [knowledge_source]

    latency_ms = int((time.time() - start_time) * 1000)

    return {
        "status": "SUCCESS",
        "agent_name": "Resolution Generation Agent",
        "resolution_summary": resolution_text,
        "troubleshooting_steps": steps,
        "sources": list(dict.fromkeys(sources)),
        "citations": citations,
        "confidence": final_confidence,
        "grounded": not is_obscure,
        "latency_ms": max(latency_ms, 5),
    }

    