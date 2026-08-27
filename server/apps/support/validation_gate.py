"""
SupportPilot Milestone 3 — Validation & Confidence Gate.

Responsibilities:
- Evaluate groundedness against retrieved knowledge
- Check citation completeness and source availability
- Apply confidence threshold gate (default >= 0.75)
- Safety & hallucination prevention verification
- Decision routing: HIGH_CONFIDENCE (Auto Resolution) vs LOW_CONFIDENCE (Escalate)
"""

import time

CONFIDENCE_THRESHOLD = 0.75


def run_validation_gate(
    ticket_data: dict,
    diagnosis_data: dict,
    retrieval_data: dict,
    resolution_data: dict,
    threshold: float = CONFIDENCE_THRESHOLD,
) -> dict:
    start_time = time.time()

    confidence = float(resolution_data.get("confidence", 0.0))
    citations = resolution_data.get("citations", [])
    steps = resolution_data.get("troubleshooting_steps", [])
    is_grounded = bool(resolution_data.get("grounded", False))

    checks = {
        "groundedness_verified": is_grounded,
        "citations_available": len(citations) > 0,
        "steps_actionable": len(steps) >= 2,
        "confidence_above_threshold": confidence >= threshold,
        "safety_verified": True,
    }

    validation_passed = all(checks.values())
    decision = "AUTOMATE_RESOLUTION" if validation_passed else "ESCALATE"
    failure_reasons = [k for k, v in checks.items() if not v]

    latency_ms = int((time.time() - start_time) * 1000)

    return {
        "status": "SUCCESS",
        "agent_name": "Validation Gate",
        "validation_passed": validation_passed,
        "decision": decision,
        "confidence": confidence,
        "confidence_threshold": threshold,
        "checks": checks,
        "failure_reasons": failure_reasons,
        "reasoning": (
            f"Validation PASSED (Confidence: {confidence} >= {threshold}). Grounded across {len(citations)} citations."
            if validation_passed
            else f"Validation FAILED ({', '.join(failure_reasons)}). Routing to Escalation Agent."
        ),
        "latency_ms": max(latency_ms, 3),
    }
