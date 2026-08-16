import re

# Comprehensive taxonomy rules for Milestone 1 AI classification
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
        ["cannot login", "login failed", "sign in error", "invalid credentials", "account locked", "locked out", "sso error", "okta", "mfa", "2fa", "authenticator"],
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


def classify_ticket(subject, description, scope="Just me", work_blocked=False):
    """
    Milestone 1 Core AI Classification Engine.
    Returns:
      category (str)
      sub_category (str)
      severity (str): 'Critical' | 'High' | 'Medium' | 'Low'
      priority (str): 'P1' | 'P2' | 'P3' | 'P4'
      suggested_team (str)
      confidence (float): 0.0 - 1.0
      classification_path (str): 'Fast-Path' | 'LLM'
    """
    text = f"{subject or ''} {description or ''}".lower()

    matched_category = "General"
    matched_sub_category = "Other"
    matched_team = "IT Support"
    match_score = 0.0

    # 1. Category and Sub-category rule matching
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
        # Fallback keyword match without word boundary
        for cat, sub_cat, keywords, team in CATEGORY_RULES:
            if any(kw in text for kw in keywords):
                matched_category = cat
                matched_sub_category = sub_cat
                matched_team = team
                match_score = 0.82
                break

    confidence = round(match_score if match_score > 0 else 0.75, 2)
    classification_path = "Fast-Path" if confidence >= 0.90 else "LLM"

    # 2. Severity Prediction
    if any(kw in text for kw in CRITICAL_SEVERITY_KEYWORDS) or (work_blocked and scope in ["Whole org", "My department"]):
        severity = "Critical"
    elif any(kw in text for kw in HIGH_SEVERITY_KEYWORDS) or work_blocked:
        severity = "High"
    elif any(kw in text for kw in MEDIUM_SEVERITY_KEYWORDS):
        severity = "Medium"
    else:
        severity = "Low"

    # 3. Priority Calculation (P1, P2, P3, P4)
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
