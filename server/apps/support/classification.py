import re


def normalize_text(text: str) -> str:
    """Normalize text by lowercasing, removing punctuation, and collapsing whitespaces."""
    if not text:
        return ""
    # Convert to lowercase
    s = text.lower()
    # Replace punctuation with spaces
    s = re.sub(r"[^\w\s]", " ", s)
    # Collapse multiple spaces into one and trim
    return " ".join(s.split())


def classify_ticket(subject, description):
    raw_text = f"{subject or ''} {description or ''}"
    text = normalize_text(raw_text)

    # -------------------------------------------------------------
    # 1. Critical Security & Account Compromise Patterns (Highest Priority)
    # -------------------------------------------------------------
    critical_security_phrases = [
        "my account is hacked",
        "account hacked",
        "someone hacked my account",
        "somebody hacked my account",
        "account has been hacked",
        "account was hacked",
        "account got hacked",
        "hacked my account",
        "hacked account",
        "account compromised",
        "account has been compromised",
        "account was compromised",
        "account is compromised",
        "account takeover",
        "someone accessed my account",
        "somebody accessed my account",
        "unauthorized access",
        "unauthorized login",
        "unauthorised access",
        "unauthorised login",
        "suspicious login",
        "unknown login",
        "identity theft",
        "fraud",
        "fraudulent transaction",
        "unauthorized transaction",
        "unauthorised transaction",
        "money stolen",
        "money was stolen",
        "funds stolen",
        "funds were stolen",
        "password changed without my permission",
        "password changed without permission",
        "password was changed without permission",
        "otp stolen",
        "otp compromised",
        "otp intercepted",
        "security breach",
        "data breach",
        "ransomware",
        "compromised account",
    ]

    critical_security_regexes = [
        r"\bhack(ed|ing)?\b.*\b(account|profile|portal|login|password)\b",
        r"\b(account|profile|portal|login|password)\b.*\bhack(ed|ing)?\b",
        r"\b(someone|somebody|attacker|hacker)\b.*\b(accessed|logged\s+into|stole|takeover)\b",
        r"\bunauthori[zs]ed\b.*\b(access|login|entry|activity|transaction|charge|transfer)\b",
        r"\b(suspicious|unknown|unrecognized|unrecognised)\b.*\b(login|sign\s*in|activity|device|ip|location)\b",
        r"\b(money|funds|cash|balance|savings)\b.*\b(stolen|lost|taken|drained|transferred)\b",
        r"\b(stolen|intercepted|leaked)\b.*\b(otp|code|pin|password|credential)\b",
        r"\bpassword\b.*\b(changed|reset)\b.*\b(without|no)\b.*\b(permission|consent|knowledge|me)\b",
        r"\b(identity\s+theft|account\s+takeover|data\s+breach|security\s+breach|ransomware)\b",
        r"\b(fraud|fraudulent|scam|scammed|phishing)\b",
    ]

    is_critical_security = any(phrase in text for phrase in critical_security_phrases) or any(
        re.search(rgx, text) for rgx in critical_security_regexes
    )

    if is_critical_security:
        # Determine specific subcategory
        if any(w in text for w in ["fraud", "transaction", "money", "funds", "stolen"]):
            sub_cat = "Fraud"
        elif any(w in text for w in ["phishing", "scam"]):
            sub_cat = "Phishing"
        elif any(w in text for w in ["breach", "ransomware", "malware"]):
            sub_cat = "Security Alert"
        else:
            sub_cat = "Unauthorized Access"

        return "Security", sub_cat, "Critical", "P1"

    # -------------------------------------------------------------
    # 2. General Category and Sub-category Rules
    # -------------------------------------------------------------
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
                "unauthorised",
                "suspicious",
                "hacked",
                "virus",
                "trojan",
                "compromised",
                "security alert",
                "scam",
                "spyware",
                "exploit",
            ],
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
                "vpn client",
                "vpn connection",
            ],
        ),
        (
            "Network",
            "Internet",
            [
                "internet",
                "interent",
                "intenet",
                "wifi",
                "wi fi",
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
                "switch",
                "packet loss",
                "offline",
                "ip address",
                "latency",
            ],
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
                "passcode",
                "authentication",
                "authenticator",
                "mfa",
                "2fa",
                "sso",
                "single sign on",
                "account locked",
                "locked out",
                "credentials",
                "reset password",
                "forgot password",
                "expired password",
                "session expired",
                "access denied",
                "permission denied",
            ],
        ),
        (
            "Hardware",
            "Laptop",
            [
                "laptop",
                "laptp",
                "desktop",
                "pc",
                "macbook",
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
                "webcam",
                "microphone",
                "hardware",
                "device",
                "overheating",
                "fan",
            ],
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
                "undelivered",
                "smtp",
                "imap",
                "spam folder",
                "teams invite",
            ],
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
                "update failed",
                "freeze",
                "freezing",
                "blue screen",
                "bsod",
                "unresponsive",
            ],
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
                "pricing",
                "charge",
                "bill",
                "plan upgrade",
            ],
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

    # -------------------------------------------------------------
    # 3. Severity & Priority Classification
    # -------------------------------------------------------------
    critical_keywords = [
        "emergency",
        "ransomware",
        "breach",
        "data breach",
        "security incident",
        "system down",
        "server down",
        "major outage",
        "all users",
        "entire office",
        "entire company",
        "production down",
        "critical emergency",
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
        "internet is not working",
        "down",
        "escalate",
        "asap",
        "immediately",
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
        "issue",
        "problem",
        "glitch",
    ]

    if any(keyword in text for keyword in critical_keywords):
        severity = "Critical"
    elif any(keyword in text for keyword in high_keywords):
        severity = "High"
    elif any(keyword in text for keyword in medium_keywords):
        severity = "Medium"
    else:
        severity = "Low"

    # Priority mapping
    if severity == "Critical":
        priority = "P1"
    elif severity == "High":
        priority = "P2"
    elif severity == "Medium":
        priority = "P3"
    else:
        priority = "P4"

    return category, sub_category, severity, priority

