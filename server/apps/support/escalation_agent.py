"""
SupportPilot Milestone 3 — Escalation Agent.

Responsibilities:
- Handles low-confidence resolutions, validation failures, or missing knowledge
- Analyzes ticket and failure context to select appropriate specialized human support team
- Formulates escalation reasons and remediation briefs for human engineers
- Initiates ticket state transition to ESCALATED
"""

import time


def run_escalation_agent(
    ticket_data: dict,
    diagnosis_data: dict | None = None,
    validation_data: dict | None = None,
    category: str = "General",
    sub_category: str = "Other",
) -> dict:
    start_time = time.time()

    cat_lower = category.lower()
    title = str(ticket_data.get("title") or ticket_data.get("subject") or "").strip()
    description = str(ticket_data.get("description") or "").strip()
    full_text = f"{title} {description}".lower()

    # Determine optimal Support Team Routing matching PDF specifications
    if "security" in cat_lower or "hack" in full_text or "phishing" in full_text:
        target_team = "Security Incident Response (SecOps)"
        sla_tier = "Tier-3 SecOps"
    elif "billing" in cat_lower or "payment" in full_text or "invoice" in full_text or "deducted" in full_text:
        target_team = "Billing Support"
        sla_tier = "Tier-2 Billing"
    elif "product" in cat_lower or "feature request" in full_text or "suggestion" in full_text:
        target_team = "Product Support"
        sla_tier = "Product Queue"
    elif "data missing" in full_text or "outage" in full_text or "crash" in full_text or "technical" in cat_lower or "software" in cat_lower:
        if "data missing" in full_text or "outage" in full_text:
            target_team = "Site Reliability Engineering (SRE)"
            sla_tier = "Critical Incident SRE"
        else:
            target_team = "Technical Support"
            sla_tier = "Technical Agent Queue"
    elif "network" in cat_lower or "vpn" in full_text or "wifi" in full_text or "dns" in full_text:
        target_team = "Network Support"
        sla_tier = "Tier-2 Network"
    elif "account" in cat_lower or "authentication" in cat_lower or "login" in full_text or "password" in full_text:
        target_team = "Account Support"
        sla_tier = "Tier-1 Account"
    elif "hardware" in cat_lower or "laptop" in full_text or "monitor" in full_text:
        target_team = "Hardware Support"
        sla_tier = "Tier-1 Desktop"
    elif "other" in cat_lower:
        target_team = "General Support"
        sla_tier = "Tier-1 General"
    else:
        target_team = "Technical Support"
        sla_tier = "Tier-2 Technical"

    # Formulate Escalation Reason
    reasons = []
    if validation_data and validation_data.get("failure_reasons"):
        reasons.extend(validation_data["failure_reasons"])
    if not reasons:
        reasons.append("Low AI resolution confidence / complex multi-tier issue")

    escalation_reason = (
        f"Automated resolution bypassed: {', '.join(reasons)}. "
        f"Assigned to {target_team} ({sla_tier}) for specialized human engineer investigation."
    )

    engineer_brief = (
        f"Ticket Context: {category} → {sub_category}\n"
        f"Diagnosis Hypothesis: {diagnosis_data.get('diagnosis', 'Requires manual diagnostic triage') if diagnosis_data else 'Triage needed'}\n"
        f"Missing Info: {diagnosis_data.get('missing_information', 'Standard system logs') if diagnosis_data else 'System logs'}\n"
        f"Target Queue: {target_team}"
    )

    latency_ms = int((time.time() - start_time) * 1000)

    return {
        "status": "SUCCESS",
        "agent_name": "Escalation Agent",
        "escalation_decision": "ESCALATED",
        "target_team": target_team,
        "sla_tier": sla_tier,
        "escalation_reason": escalation_reason,
        "engineer_brief": engineer_brief,
        "confidence": 0.95,
        "latency_ms": max(latency_ms, 4),
    }
