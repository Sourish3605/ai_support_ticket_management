def classify_ticket(subject, description):
    text = f"{subject or ''} {description or ''}".lower()

    rules = [
        (
            "Security",
            "Phishing",
            ["phishing", "malware", "ransomware", "breach", "unauthorized"]
        ),
        (
            "Network",
            "VPN",
            ["vpn", "virtual private network"]
        ),
        (
            "Network",
            "Internet",
            ["internet", "wifi", "wi-fi", "network", "connectivity"]
        ),
        (
            "Authentication",
            "Login Issue",
            ["login", "log in", "sign in", "password", "authentication"]
        ),
        (
            "Hardware",
            "Computer/Peripheral",
            ["laptop", "desktop", "keyboard", "mouse", "monitor", "printer"]
        ),
        (
            "Software",
            "Application Error",
            ["application", "software", "program", "crash", "error"]
        ),
    ]

    # Category and sub-category
    category = "General"
    sub_category = "Other"

    for rule_category, rule_sub_category, keywords in rules:
        if any(keyword in text for keyword in keywords):
            category = rule_category
            sub_category = rule_sub_category
            break

    # Priority classification
    high_priority_keywords = [
        "ransomware",
        "breach",
        "system down",
        "server down",
        "outage",
        "completely blocked",
        "work is blocked",
        "cannot work",
        "critical",
        "urgent"
    ]

    medium_priority_keywords = [
        "error",
        "crash",
        "not working",
        "unable",
        "cannot",
        "failed",
        "failure",
        "disconnecting"
    ]

    if any(keyword in text for keyword in high_priority_keywords):
        priority = "High"
    elif any(keyword in text for keyword in medium_priority_keywords):
        priority = "Medium"
    else:
        priority = "Low"

    return category, sub_category, priority