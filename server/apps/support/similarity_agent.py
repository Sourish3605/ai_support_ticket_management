"""
Milestone 2 — Similarity Agent.
Searches historical and resolved tickets using text similarity / token overlap.
Identifies matching past incidents, resolutions, and confidence metrics.
"""

import math
import re
import time
from collections import Counter


HISTORICAL_RESOLVED_TICKETS = [
    {
        "ticket_number": "TKT-890",
        "title": "Unable to login with password",
        "description": "Password reset link not arriving in email and cannot access account.",
        "category": "Account",
        "sub_category": "Login Issue",
        "priority": "Medium",
        "status": "RESOLVED",
        "resolution": "Reset corporate directory credentials via self-service verification portal.",
        "resolved_by": "AI Auto-Resolution",
    },
    {
        "ticket_number": "TKT-722",
        "title": "Account locked after multiple attempts",
        "description": "I changed my password yesterday and now cannot access my account.",
        "category": "Account",
        "sub_category": "Account Locked",
        "priority": "Medium",
        "status": "RESOLVED",
        "resolution": "Cleared lockout flag and refreshed session directory cache.",
        "resolved_by": "Authentication Specialist",
    },
    {
        "ticket_number": "TKT-650",
        "title": "Charged twice for monthly subscription",
        "description": "Payment was deducted twice from my credit card on invoice renewal.",
        "category": "Billing",
        "sub_category": "Payment Failure",
        "priority": "High",
        "status": "RESOLVED",
        "resolution": "Refunded duplicate Stripe transaction ref #tx_98274 within 3 business days.",
        "resolved_by": "Billing Support Tier-2",
    },
    {
        "ticket_number": "TKT-540",
        "title": "Corporate VPN connection failing with timeout",
        "description": "Cannot connect to internal network resources or VPN gateway.",
        "category": "Network",
        "sub_category": "VPN",
        "priority": "High",
        "status": "RESOLVED",
        "resolution": "Instructed user to re-install Cisco AnyConnect client and verify UDP ports 500/4500.",
        "resolved_by": "Network Support Team",
    },
    {
        "ticket_number": "TKT-412",
        "title": "Application crashes on startup",
        "description": "Software crashes immediately with error code 500 on launch.",
        "category": "Technical",
        "sub_category": "Application Error",
        "priority": "High",
        "status": "RESOLVED",
        "resolution": "Cleared local application cache in AppData directory and updated patch.",
        "resolved_by": "Application Engineering",
    },
    {
        "ticket_number": "TKT-308",
        "title": "Need invoice copy for accounting",
        "description": "Please provide a PDF copy of my last annual subscription invoice.",
        "category": "Billing",
        "sub_category": "Invoice",
        "priority": "Low",
        "status": "RESOLVED",
        "resolution": "Generated and sent tax invoice PDF for invoice #INV-2026-99.",
        "resolved_by": "AI Auto-Resolution",
    },
    {
        "ticket_number": "TKT-201",
        "title": "Data missing from dashboard reports",
        "description": "Critical issue: production telemetry graphs are showing blank data for all teams.",
        "category": "Technical",
        "sub_category": "Crash",
        "priority": "Critical",
        "status": "RESOLVED",
        "resolution": "Restarted ingestion pipeline worker queue and re-indexed reporting cluster.",
        "resolved_by": "Site Reliability Engineering",
    },
]


def _tokenize(text: str) -> list[str]:
    clean = re.sub(r"[^\w\s]", " ", (text or "").lower())
    stop_words = {"the", "a", "an", "and", "or", "to", "for", "of", "in", "on", "with", "is", "was", "my", "i", "it"}
    return [w for w in clean.split() if w and w not in stop_words and len(w) > 2]


def _cosine_similarity(tokens1: list[str], tokens2: list[str]) -> float:
    if not tokens1 or not tokens2:
        return 0.0
    v1 = Counter(tokens1)
    v2 = Counter(tokens2)
    intersection = set(v1.keys()) & set(v2.keys())
    numerator = sum([v1[x] * v2[x] for x in intersection])
    sum1 = sum([v1[x] ** 2 for x in v1.keys()])
    sum2 = sum([v2[x] ** 2 for x in v2.keys()])
    denominator = math.sqrt(sum1) * math.sqrt(sum2)
    if not denominator:
        return 0.0
    return float(numerator) / denominator


def find_similar_tickets(
    subject: str,
    description: str,
    category: str = "",
    sub_category: str = "",
    exclude_ticket_id: str | int | None = None,
    limit: int = 3
) -> dict:
    """
    Finds historical resolved tickets similar to the current issue.
    """
    start_time = time.time()
    query_text = f"{subject} {description}".strip()
    query_tokens = _tokenize(query_text)

    candidates = []

    # 1. Check live database for resolved tickets
    try:
        from .models import Ticket
        qs = Ticket.objects.filter(status__in=["RESOLVED", "CLOSED", "Resolved", "Closed"])
        if exclude_ticket_id:
            qs = qs.exclude(id=exclude_ticket_id).exclude(ticket_number=str(exclude_ticket_id))
        
        for t in qs[:20]:
            candidates.append({
                "ticket_number": t.ticket_number or f"TKT-{t.id}",
                "title": t.title,
                "description": t.description,
                "category": t.category,
                "sub_category": t.sub_category,
                "priority": t.priority,
                "status": t.status,
                "resolution": t.resolution_notes or t.suggested_resolution or "Resolved by support team.",
                "resolved_by": (t.assigned_to.username if t.assigned_to else "Support Staff"),
            })
    except Exception:
        pass

    # 2. Add benchmark historical database
    for bench in HISTORICAL_RESOLVED_TICKETS:
        if not any(c["ticket_number"] == bench["ticket_number"] for c in candidates):
            candidates.append(bench)

    scored_candidates = []
    for cand in candidates:
        cand_text = f"{cand['title']} {cand['description']} {cand.get('category', '')} {cand.get('sub_category', '')}"
        cand_tokens = _tokenize(cand_text)
        score = _cosine_similarity(query_tokens, cand_tokens)
        
        # Boost for matching category/subcategory
        if category and cand.get("category", "").lower() == category.lower():
            score += 0.15
        if sub_category and cand.get("sub_category", "").lower() == sub_category.lower():
            score += 0.15

        if score > 0.15:
            scored_candidates.append({
                "ticket_number": cand["ticket_number"],
                "title": cand["title"],
                "category": cand.get("category"),
                "sub_category": cand.get("sub_category"),
                "priority": cand.get("priority"),
                "similarity_score": round(min(0.99, score), 2),
                "resolution": cand.get("resolution"),
                "resolved_by": cand.get("resolved_by"),
            })

    scored_candidates.sort(key=lambda x: x["similarity_score"], reverse=True)
    top_matches = scored_candidates[:limit]
    ticket_ids = [m["ticket_number"] for m in top_matches]

    latency_ms = max(5, int((time.time() - start_time) * 1000))

    return {
        "status": "SUCCESS",
        "agent_name": "Similarity Agent",
        "similar_tickets_count": len(top_matches),
        "similar_ticket_ids": ticket_ids,
        "similar_tickets": top_matches,
        "top_similarity_score": top_matches[0]["similarity_score"] if top_matches else 0.0,
        "latency_ms": latency_ms,
    }
