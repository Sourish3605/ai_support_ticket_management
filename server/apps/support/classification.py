import re


def classify_ticket(subject, description):
    text = f"{subject or ''} {description or ''}".lower()

    # -----------------------------
    # Category and Sub-category (with comprehensive keywords and typo tolerance)
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
                "unauthorized",
                "suspicious",
                "hacked",
                "virus",
                "trojan",
                "compromised",
                "security alert",
            ]
        ),
        (
            "Network",
            "VPN",
            [
                "vpn",
                "virtual private network",
                "anyconnect",
                "globalprotect",
                "cisco vpn",
                "vpn tunnel",
            ]
        ),
        (
            "Network",
            "Internet",
            [
                "internet",
                "interent",      # Common user typo
                "intenet",
                "wifi",
                "wi-fi",
                "wifie",
                "network",
                "netowrk",
                "netwrok",
                "connectivity",
                "broadband",
                "ethernet",
                "dns",
                "gateway",
                "router",
                "packet loss",
                "offline",
            ]
        ),
        (
            "Authentication",
            "Login Issue",
            [
                "login",
                "log in",
                "signin",
                "sign in",
                "password",
                "pasword",
                "pssword",
                "authentication",
                "mfa",
                "2fa",
                "sso",
                "account locked",
                "locked out",
                "credentials",
                "reset password",
            ]
        ),
        (
            "Hardware",
            "Laptop",
            [
                "laptop",
                "laptp",
                "desktop",
                "pc",
                "workstation",
                "keyboard",
                "mouse",
                "monitor",
                "screen",
                "display",
                "printer",
                "battery",
                "charger",
                "dock",
                "headset",
            ]
        ),
        (
            "Email",
            "Outlook Sync",
            [
                "email",
                "outlook",
                "oulook",
                "mailbox",
                "exchange",
                "inbox",
                "mail sync",
                "delivery failure",
                "calendar",
            ]
        ),
        (
            "Software",
            "Application Error",
            [
                "application",
                "app",
                "software",
                "softwre",
                "program",
                "crash",
                "crashing",
                "bug",
                "license",
                "installation",
                "install",
            ]
        ),
        (
            "Billing",
            "Invoice",
            [
                "billing",
                "invoice",
                "invoce",
                "payment",
                "subscription",
                "credit card",
                "receipt",
                "refund",
            ]
        ),
    ]

    category = None
    sub_category = None

    for rule_category, rule_sub_category, keywords in rules:
        if any(keyword in text for keyword in keywords):
            category = rule_category
            sub_category = rule_sub_category
            break

    # Fallback to general network/hardware defaults if not strictly matched
    if not category:
        if any(w in text for w in ["slow", "down", "not working", "unable", "cannot", "failed", "broken", "connect", "access"]):
            category = "Network"
            sub_category = "Internet"
        else:
            category = "General"
            sub_category = "Other"

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
        "all users",
        "entire office",
        "emergency",
    ]

    high_keywords = [
        "urgent",
        "critical",
        "work is blocked",
        "cannot work",
        "completely blocked",
        "outage",
        "cannot connect",
        "unable to connect",
        "vpn is not working",
        "vpn not working",
        "interent is not working",
        "internet is not working",
        "down",
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
        "slow",
        "intermittent",
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
        priority = "P2"
    elif severity == "Medium":
        priority = "P3"
    else:
        priority = "P4"

    return category, sub_category, severity, priority
