import re


KEYWORD_GROUPS = {
    "vpn": [
        "vpn",
        "virtual private network",
    ],
    "security": [
        "security",
        "breach",
        "phishing",
        "malware",
        "ransomware",
        "suspicious",
        "unauthorized",
    ],
    "login": [
        "login",
        "log in",
        "sign in",
        "password",
        "authentication",
    ],
    "network": [
        "network",
        "internet",
        "wifi",
        "wi-fi",
        "connection",
        "connectivity",
    ],
    "outage": [
        "outage",
        "site down",
        "system down",
        "server down",
    ],
    "hardware": [
        "laptop",
        "desktop",
        "keyboard",
        "mouse",
        "monitor",
        "printer",
    ],
    "software": [
        "application",
        "software",
        "program",
        "crash",
        "error",
    ],
}


def has_error_code(text):
    """
    Detect common error-code patterns.
    """

    patterns = [
        r"\b[A-Z]{2,10}[-_]\d{2,10}\b",
        r"\bERR[-_]?\d+\b",
        r"\bERROR[-_]?\d+\b",
        r"\bHTTP\s*[45]\d{2}\b",
        r"\b5\d{2}\b",
        r"\b4\d{2}\b",
    ]

    return any(
        re.search(pattern, text, flags=re.IGNORECASE)
        for pattern in patterns
    )


def extract_keyword_flags(text):
    """
    Detect predefined keyword groups.
    """

    text_lower = text.lower()

    flags = {}

    for group, keywords in KEYWORD_GROUPS.items():
        flags[group] = any(
            keyword in text_lower
            for keyword in keywords
        )

    return flags


def extract_features(
    subject,
    description,
    department=None,
    channel="PORTAL",
    affected_scope="SELF",
    work_blocked="NO",
):
    """
    Extract structured features from a ticket.

    Embeddings will be added later when the project
    selects an embedding model.
    """

    subject = subject or ""
    description = description or ""

    combined_text = f"{subject} {description}".strip()

    return {
        "subject": subject,
        "description": description,
        "department": department,
        "channel": channel,
        "affected_scope": affected_scope,
        "work_blocked": work_blocked,
        "has_error_code": has_error_code(combined_text),
        "keyword_flags": extract_keyword_flags(combined_text),

        # Placeholder until an embedding model is selected.
        "embedding": None,
    }