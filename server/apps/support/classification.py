import json
import os
import re
import urllib.request
import urllib.error

try:
    from decouple import config
except ImportError:
    def config(key, default=None, cast=None):
        val = os.environ.get(key, default)
        if cast == bool and isinstance(val, str):
            return val.lower() in ('true', '1', 'yes')
        return val


# Groq API Configuration
GROQ_API_KEY = config('GROQ_API_KEY', default=None)
GROQ_MODEL = config('GROQ_MODEL', default='openai/gpt-oss-20b')

# Comprehensive taxonomy rules for fallback & validation
CATEGORY_RULES = [
    (
        "Network",
        "VPN",
        ["vpn", "virtual private network", "cisco anyconnect", "globalprotect", "openvpn", "tunnel", "remote access gateway"],
        "Network Team",
    ),
    (
        "Network",
        "Internet",
        ["internet", "wifi", "wi-fi", "ethernet", "dns", "gateway", "no connection", "network down", "packet loss", "latency", "broadband"],
        "Network Team",
    ),
    (
        "Security",
        "Phishing",
        ["phishing", "suspicious email", "malicious link", "impersonation", "fake email", "credential harvest"],
        "Security Team",
    ),
    (
        "Security",
        "Malware / Breach",
        ["ransomware", "malware", "virus", "trojan", "unauthorized access", "data leak", "compromised", "hacked", "security alert", "breach"],
        "Security Team",
    ),
    (
        "Authentication",
        "Password Reset",
        ["forgot password", "reset password", "password expired", "change password", "temp password"],
        "IT Support",
    ),
    (
        "Authentication",
        "Login Issue",
        ["cannot login", "login failed", "sign in error", "invalid credentials", "account locked", "locked out", "sso error", "okta", "mfa", "2fa", "authenticator", "unable to login"],
        "IT Support",
    ),
    (
        "Hardware",
        "Computer/Peripheral",
        ["laptop", "desktop", "macbook", "keyboard", "mouse", "monitor", "docking station", "charger", "battery", "trackpad", "headset", "webcam"],
        "Hardware Team",
    ),
    (
        "Hardware",
        "Printer",
        ["printer", "printing", "scanner", "paper jam", "toner", "print queue", "offline printer"],
        "Hardware Team",
    ),
    (
        "Software",
        "Application Error",
        ["crash", "crashing", "exception", "freeze", "freezing", "not responding", "software bug", "application error", "error code", "fails to open", "won't launch"],
        "Software Team",
    ),
    (
        "Software",
        "License / Install",
        ["license expired", "activation error", "install request", "upgrade software", "reinstall", "software license"],
        "Software Team",
    ),
    (
        "Email",
        "Outlook / Sync",
        ["outlook", "email not syncing", "missing emails", "mailbox full", "cannot send email", "exchange", "office 365", "calendar invite", "pst"],
        "IT Support",
    ),
    (
        "Billing",
        "Invoice / Payment",
        ["billing", "invoice", "payment failed", "credit card", "subscription renewal", "charge", "receipt"],
        "Finance",
    ),
]

CRITICAL_SEVERITY_KEYWORDS = [
    "ransomware", "breach", "security incident", "system down", "server down",
    "entire company", "all employees", "outage", "production down", "database down",
    "completely blocked", "whole org", "cannot work", "p0", "disaster"
]

HIGH_SEVERITY_KEYWORDS = [
    "vpn", "cannot login", "locked out", "team blocked", "department blocked",
    "urgent", "critical meeting", "high priority", "deadline today", "data loss",
    "crash loop", "cannot access"
]

MEDIUM_SEVERITY_KEYWORDS = [
    "error", "slow", "freezing", "bug", "failing", "intermittent", "disconnected",
    "workaround", "warning", "unable to"
]


def classify_with_groq(subject, description, scope="Just me", work_blocked=False):
    """
    Calls Groq Cloud LLM API with structured JSON output schema.
    """
    api_key = config('GROQ_API_KEY', default=None)
    if not api_key or not api_key.strip():
        return None

    model_name = config('GROQ_MODEL', default='openai/gpt-oss-20b')

    system_prompt = (
        "You are the enterprise AI Support Ticket Classification Engine for SupportPilot. "
        "Analyze the user's complete support ticket and return strict structured JSON.\n\n"
        "Taxonomies & Routing Rules:\n"
        "- Categories & Sub-categories:\n"
        "  * Network (VPN, Internet, Wi-Fi, DNS / Gateway) -> Assigned Team: Network Team\n"
        "  * Security (Phishing, Malware / Breach, Unauthorized Access) -> Assigned Team: Security Team\n"
        "  * Authentication (Password Reset, Login Issue, MFA / SSO Error, Account Locked) -> Assigned Team: IT Support\n"
        "  * Hardware (Computer/Peripheral, Printer, Monitor / Display, Battery / Charger) -> Assigned Team: Hardware Team\n"
        "  * Software (Application Error, Crash Loop, License / Install) -> Assigned Team: Software Team\n"
        "  * Email (Outlook / Sync, Mailbox Full, Delivery Failure) -> Assigned Team: IT Support\n"
        "  * Billing (Invoice / Payment, Subscription Renewal) -> Assigned Team: Finance\n"
        "  * General (Other, Inquiry) -> Assigned Team: IT Support\n\n"
        "- Deterministic Severity & Priority:\n"
        "  * Critical -> P1 (SLA: 4 Hours). Triggered by: security breach, ransomware, outage, production down.\n"
        "  * High -> P2 (SLA: 8 Hours). Triggered by: work blocked, VPN failure, cannot login.\n"
        "  * Medium -> P3 (SLA: 24 Hours). Triggered by: non-blocking bugs, performance issues.\n"
        "  * Low -> P4 (SLA: 48 Hours). Triggered by: minor queries, how-to, general requests.\n\n"
        "Respond STRICTLY as JSON with schema:\n"
        "{\n"
        '  "category": "Authentication",\n'
        '  "sub_category": "Login Issue",\n'
        '  "severity": "Low",\n'
        '  "priority": "P4",\n'
        '  "assigned_team": "IT Support",\n'
        '  "sla_hours": 48,\n'
        '  "confidence": 0.95,\n'
        '  "reasoning": "Explanation"\n'
        "}"
    )

    user_content = (
        f"Subject: {subject}\n"
        f"Description: {description}\n"
        f"Affected Scope: {scope}\n"
        f"Work Blocked: {'Yes' if work_blocked else 'No'}"
    )

    payload = {
        "model": model_name,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_content},
        ],
        "response_format": {"type": "json_object"},
        "temperature": 0.1,
    }

    try:
        req = urllib.request.Request(
            "https://api.groq.com/openai/v1/chat/completions",
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Authorization": f"Bearer {api_key.strip()}",
                "Content-Type": "application/json",
                "User-Agent": "SupportPilot-Groq-Client/1.0",
            },
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=4.5) as response:
            res_data = json.loads(response.read().decode("utf-8"))
            content_str = res_data["choices"][0]["message"]["content"]
            parsed = json.loads(content_str)
            return {
                "category": parsed.get("category", "General"),
                "sub_category": parsed.get("sub_category", "Other"),
                "severity": parsed.get("severity", "Medium"),
                "priority": parsed.get("priority", "P3"),
                "team": parsed.get("assigned_team") or parsed.get("team", "IT Support"),
                "confidence": float(parsed.get("confidence", 0.95)),
                "classification_path": f"Groq ({model_name})",
                "reasoning": parsed.get("reasoning", ""),
            }
    except Exception as err:
        print(f"[Groq LLM Notice] Fallback to deterministic rules engine: {err}")
        return None


def classify_ticket(subject, description, scope="Just me", work_blocked=False):
    """
    Milestone 1 Core AI Classification Engine.
    Attempts Groq LLM first if GROQ_API_KEY is configured; otherwise uses deterministic fast-path rules.
    """
    # 1. Try Groq Cloud LLM
    groq_result = classify_with_groq(subject, description, scope, work_blocked)
    if groq_result:
        return groq_result

    # 2. Deterministic Rule-Based Classification (Instant Fallback)
    text = f"{subject or ''} {description or ''}".lower()

    matched_category = "General"
    matched_sub_category = "Other"
    matched_team = "IT Support"
    match_score = 0.0

    for cat, sub_cat, keywords, team in CATEGORY_RULES:
        hits = sum(1 for kw in keywords if re.search(r'\b' + re.escape(kw) + r'\b', text))
        if hits > 0:
            score = min(0.98, 0.85 + (hits * 0.04))
            if score > match_score:
                match_score = score
                matched_category = cat
                matched_sub_category = sub_cat
                matched_team = team

    if match_score == 0.0:
        for cat, sub_cat, keywords, team in CATEGORY_RULES:
            if any(kw in text for kw in keywords):
                matched_category = cat
                matched_sub_category = sub_cat
                matched_team = team
                match_score = 0.82
                break

    confidence = round(match_score if match_score > 0 else 0.75, 2)
    classification_path = "Fast-Path (Deterministic)"

    # Severity Prediction
    if any(kw in text for kw in CRITICAL_SEVERITY_KEYWORDS) or (work_blocked and scope in ["Whole org", "My department"]):
        severity = "Critical"
    elif any(kw in text for kw in HIGH_SEVERITY_KEYWORDS) or work_blocked:
        severity = "High"
    elif any(kw in text for kw in MEDIUM_SEVERITY_KEYWORDS):
        severity = "Medium"
    else:
        severity = "Low"

    # Priority Calculation (P1, P2, P3, P4)
    if severity == "Critical" or (severity == "High" and scope in ["Whole org", "My department"]):
        priority = "P1"
    elif severity == "High" or (severity == "Medium" and work_blocked):
        priority = "P2"
    elif severity == "Medium" or work_blocked:
        priority = "P3"
    else:
        priority = "P4"

    return {
        "category": matched_category,
        "sub_category": matched_sub_category,
        "severity": severity,
        "priority": priority,
        "team": matched_team,
        "confidence": confidence,
        "classification_path": classification_path,
    }
