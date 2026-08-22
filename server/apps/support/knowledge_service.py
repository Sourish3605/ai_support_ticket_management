"""
Dynamic Knowledge Base Retrieval & Resolution Service.
Integrates with Milestone 2 RAG Pipeline to return grounded resolution with mandatory citations.
"""

from .rag_service import generate_grounded_resolution


def retrieve_knowledge_and_generate_resolution(
    category: str | None = None,
    sub_category: str | None = None,
    subject: str = "",
    description: str = "",
    ticket_id: int | None = None
) -> dict:
    """
    RAG Knowledge Retrieval & AI Resolution Generation with Citations.
    """
    query_text = f"{subject or ''} {description or ''}".strip()
    return generate_grounded_resolution(
        query_text=query_text,
        category=category,
        sub_category=sub_category,
        ticket_id=ticket_id,
    )
