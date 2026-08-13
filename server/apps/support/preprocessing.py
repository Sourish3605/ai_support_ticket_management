import re


MAX_WORDS = 1000


def strip_quoted_replies(text):
    """Remove common quoted email/reply sections."""

    patterns = [
        r"(?im)^>.*$",
        r"(?ims)^On .+?wrote:\s*.*$",
        r"(?ims)^-----Original Message-----.*$",
    ]

    cleaned = text

    for pattern in patterns:
        cleaned = re.sub(pattern, "", cleaned)

    return cleaned


def strip_signature(text):
    """Remove common email signatures."""

    patterns = [
        r"(?ims)^Regards,.*$",
        r"(?ims)^Best regards,.*$",
        r"(?ims)^Thanks,.*$",
        r"(?ims)^Thank you,.*$",
        r"(?ims)^Sent from my .*?$",
    ]

    cleaned = text

    for pattern in patterns:
        cleaned = re.sub(pattern, "", cleaned)

    return cleaned


def mask_pii(text):
    """Mask common PII and sensitive information."""

    # Email addresses
    text = re.sub(
        r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b",
        "[EMAIL]",
        text,
    )

    # IPv4 addresses
    text = re.sub(
        r"\b(?:\d{1,3}\.){3}\d{1,3}\b",
        "[IP]",
        text,
    )

    # Phone numbers
    text = re.sub(
        r"\b(?:\+?\d[\d\s().-]{8,}\d)\b",
        "[PHONE]",
        text,
    )

    # Employee IDs such as EMP12345
    text = re.sub(
        r"\bEMP[-_]?\d+\b",
        "[EMPLOYEE_ID]",
        text,
        flags=re.IGNORECASE,
    )

    # Anything after "password is"
    text = re.sub(
        r"(?i)(password\s+is\s+).*$",
        r"\1[REDACTED]",
        text,
    )

    return text


def truncate_text(text, max_words=MAX_WORDS):
    """Limit text size before classification."""

    words = text.split()

    if len(words) <= max_words:
        return text

    return " ".join(words[:max_words])


def preprocess_ticket(subject, description):
    """
    Clean ticket text before classification.

    Returns cleaned subject and description.
    """

    subject = subject or ""
    description = description or ""

    description = strip_quoted_replies(description)
    description = strip_signature(description)

    subject = mask_pii(subject)
    description = mask_pii(description)

    subject = truncate_text(subject)
    description = truncate_text(description)

    return {
        "subject": subject.strip(),
        "description": description.strip(),
    }