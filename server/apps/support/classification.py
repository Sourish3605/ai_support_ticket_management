
def classify_ticket(subject, description):
    text = f"{subject or ''} {description or ''}".lower()

    # -----------------------------
    # Category and Sub-category
    # -----------------------------
    rules = [
        (
            "Security",
            "Phishing",
            [
                "phishing",
                "malware",
                "ransomware",
                "breach",
                "unauthorized"
            ]
        ),
        (
            "Network",
            "VPN",
            [
                "vpn",
                "virtual private network"
            ]
        ),
        (
            "Network",
            "Internet",
            [
                "internet",
                "wifi",
                "wi-fi",
                "network",
                "connectivity"
            ]
        ),
        (
            "Authentication",
            "Login Issue",
            [
                "login",
                "log in",
                "sign in",
                "password",
                "authentication"
            ]
        ),
        (
            "Hardware",
            "Computer/Peripheral",
            [
                "laptop",
                "desktop",
                "keyboard",
                "mouse",
                "monitor",
                "printer"
            ]
        ),
        (
            "Software",
            "Application Error",
            [
                "application",
                "software",
                "program",
                "crash",
                "error"
            ]
        ),
    ]

    category = "General"
    sub_category = "Other"

    for rule_category, rule_sub_category, keywords in rules:
        if any(keyword in text for keyword in keywords):
            category = rule_category
            sub_category = rule_sub_category
            break

    # -----------------------------
    # Severity Classification
    # -----------------------------

    critical_keywords = [
        "ransomware",
        "breach",
        "security incident",
        "system down",
        "server down",
        "major outage",
    ]

    high_keywords = [
        "urgent",
        "critical",
        "work is blocked",
        "cannot work",
        "completely blocked",
        "outage",

        # Network / VPN high-severity cases
        "cannot connect",
        "unable to connect",
        "vpn is not working",
        "vpn not working",
    ]

    medium_keywords = [
        "error",
        "crash",
        "not working",
        "unable",
        "cannot",
        "failed",
        "failure",
        "disconnecting",
    ]

    if any(keyword in text for keyword in critical_keywords):
        severity = "Critical"

    elif any(keyword in text for keyword in high_keywords):
        severity = "High"

    elif any(keyword in text for keyword in medium_keywords):
        severity = "Medium"

    else:
        severity = "Low"

    # -----------------------------
    # Priority Classification
    # -----------------------------

    if severity == "Critical":
        priority = "P1"

    elif severity == "High":
        priority = "P1"

    elif severity == "Medium":
        priority = "P3"

    else:
        priority = "P4"

    return category, sub_category, severity, priority
