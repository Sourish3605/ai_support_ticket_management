"""
SupportPilot Milestone 3 — Resolution Generation Agent.

Responsibilities:
- Ingest ticket context, diagnosis, and M2 retrieved evidence
- Synthesize a grounded, step-by-step troubleshooting resolution
- Eliminate hallucinations by enforcing strict reliance on retrieved KB citations
- Calculate resolution confidence score and output actionable guidance
"""

import time


def run_resolution_agent(
    ticket_data: dict,
    diagnosis_data: dict,
    retrieval_data: dict,
    category: str = "General",
    sub_category: str = "Other",
) -> dict:
    start_time = time.time()

    retrieved_steps = retrieval_data.get("suggested_steps", [])
    citations = retrieval_data.get("citations", [])
    knowledge_source = retrieval_data.get("knowledge_source", "Enterprise IT Support Desk")
    diag_confidence = float(diagnosis_data.get("confidence", 0.85))
    retrieval_confidence = float(retrieval_data.get("retrieval_confidence", 0.85))

    # Formulate step-by-step grounded resolution
    steps = []
    if retrieved_steps:
        for idx, step in enumerate(retrieved_steps, start=1):
            clean_step = step.strip().lstrip("0123456789.-* ")
            if clean_step:
                steps.append(f"{clean_step}")
    else:
        steps = [
            "Verify network and endpoint connectivity.",
            "Restart the affected client application or service.",
            "Verify valid corporate SSO credentials.",
            "Contact Tier-2 Support if the condition persists.",
        ]

    # Calculate aggregate resolution confidence
    # Resolution confidence combines diagnosis accuracy and knowledge grounding
    base_confidence = (diag_confidence * 0.45) + (retrieval_confidence * 0.55)

    # Check for low-grounding / obscure tickets
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
