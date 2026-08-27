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

    # Determine optimal Support Team Routing
    if "security" in cat_lower or "hack" in full_text or "phishing" in full_text:
        target_team = "Security Incident Response Team (SecOps)"
        sla_tier = "Tier-3 SecOps"
    elif "billing" in cat_lower or "payment" in full_text or "invoice" in full_text:
        target_team = "Billing & Financial Operations"
        sla_tier = "Tier-2 Finance"
    elif "network" in cat_lower or "vpn" in full_text or "wifi" in full_text or "dns" in full_text:
        target_team = "Network Operations Engineering"
        sla_tier = "Tier-2 Network"
    elif "authentication" in cat_lower or "login" in full_text or "password" in full_text or "2fa" in full_text:
        target_team = "Identity & Access Management (IAM)"
        sla_tier = "Tier-1 Helpdesk"
    elif "hardware" in cat_lower or "laptop" in full_text or "monitor" in full_text:
        target_team = "Desktop & Hardware Support"
        sla_tier = "Tier-1 Desktop"
    else:
        target_team = "Tier-2 Technical Support Team"
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
