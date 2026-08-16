"""
Milestone 2: Knowledge Retrieval & Resolution Generation Service
"""

KNOWLEDGE_BASE_ARTICLES = [
    {
        "id": "KB-NET-001",
        "title": "Corporate VPN Connection & Troubleshooting Guide",
        "category": "Network",
        "sub_category": "VPN",
        "tags": ["vpn", "cisco", "remote", "connectivity", "gateway"],
        "steps": [
            "Verify your local internet connection is active by loading a public webpage.",
            "Confirm the VPN server address matches 'vpn.company.com' in your client profile.",
            "Restart the Cisco AnyConnect / GlobalProtect VPN service from task manager.",
            "Check that port 443 / UDP 500/4500 is not restricted on your local network.",
            "Clear cached VPN credentials and re-authenticate via company SSO.",
        ],
        "source": "Enterprise IT Knowledge Base / Network Operations",
    },
    {
        "id": "KB-SEC-002",
        "title": "Security Incident Response — Phishing & Suspicious Emails",
        "category": "Security",
        "sub_category": "Phishing",
        "tags": ["phishing", "malware", "security", "suspicious", "email"],
        "steps": [
            "Do NOT click any links or download attachments from the suspicious message.",
            "Use the 'Report Phishing' button in Outlook to submit headers to SecOps.",
            "If you entered credentials, change your corporate password immediately via SSO portal.",
            "Disconnect your machine from Wi-Fi if unauthorized downloads occurred.",
            "SecOps will review message telemetry and quarantine threat vectors.",
        ],
        "source": "SecOps Security Guidelines v3.4",
    },
    {
        "id": "KB-AUTH-003",
        "title": "SSO Login & Self-Service Password Reset",
        "category": "Authentication",
        "sub_category": "Password Reset",
        "tags": ["password", "sso", "mfa", "login", "locked"],
        "steps": [
            "Navigate to the self-service portal: sso.company.com/recovery.",
            "Enter your corporate email address to receive an MFA verification push.",
            "Follow the on-screen prompts to set a new 12+ character complex password.",
            "Wait 2 minutes for directory synchronization across corporate services.",
            "Log in to your workstation with the new password.",
        ],
        "source": "Identity & Access Management Policy",
    },
    {
        "id": "KB-HDW-004",
        "title": "Workstation & Laptop Diagnostics and Performance Optimization",
        "category": "Hardware",
        "sub_category": "Computer/Peripheral",
        "tags": ["laptop", "hardware", "slow", "freeze", "monitor"],
        "steps": [
            "Perform a full restart to flush system RAM and pending updates.",
            "Check Task Manager for runaway background processes consuming > 80% CPU.",
            "Verify the device has at least 15 GB free disk space on the primary drive.",
            "Inspect physical cable connections for external displays and docks.",
            "Run hardware diagnostics utility via Dell Command / Apple Diagnostics.",
        ],
        "source": "Hardware Lifecycle & Asset Support Desk",
    },
    {
        "id": "KB-SFT-005",
        "title": "Application Crash Recovery & Cache Clearing",
        "category": "Software",
        "sub_category": "Application Error",
        "tags": ["software", "crash", "error", "application", "license"],
        "steps": [
            "Force-close all instances of the application using Task Manager.",
            "Clear local application cache files located in %LOCALAPPDATA% or ~/Library/Caches.",
            "Check Company Portal / Software Center for pending application updates.",
            "Run the built-in application repair wizard from Add/Remove Programs.",
            "Reboot your computer and relaunch the application as Administrator.",
        ],
        "source": "Software Packaging & Application Support",
    },
    {
        "id": "KB-EML-006",
        "title": "Outlook Sync & Mailbox Recovery Guide",
        "category": "Email",
        "sub_category": "Outlook / Sync",
        "tags": ["outlook", "email", "sync", "exchange", "calendar"],
        "steps": [
            "Verify Outlook status shows 'Connected to Microsoft Exchange' in the status bar.",
            "Toggle Outlook into Work Offline mode, wait 10 seconds, then reconnect.",
            "Run Outlook in Safe Mode (outlook.exe /safe) to disable conflicting add-ins.",
            "Rebuild the local Outlook data file (.OST) via Account Settings.",
            "Check Office 365 webmail (outlook.office.com) to verify cloud mailbox health.",
        ],
        "source": "Messaging & Collaboration Services",
    },
]


def retrieve_knowledge_and_generate_resolution(category, sub_category, subject, description):
    """
    Milestone 2 RAG Knowledge Retrieval & AI Resolution Generation.
    Matches ticket text against Enterprise Knowledge Base articles.
    """
    text = f"{subject or ''} {description or ''}".lower()

    best_article = None
    best_score = 0

    for article in KNOWLEDGE_BASE_ARTICLES:
        score = 0
        if article["category"].lower() == (category or "").lower():
            score += 4
        if article["sub_category"].lower() == (sub_category or "").lower():
            score += 3
        for tag in article["tags"]:
            if tag in text:
                score += 2

        if score > best_score:
            best_score = score
            best_article = article

    if not best_article:
        best_article = KNOWLEDGE_BASE_ARTICLES[0]

    return {
        "article_id": best_article["id"],
        "article_title": best_article["title"],
        "source": best_article["source"],
        "suggested_steps": best_article["steps"],
        "knowledge_retrieved": True,
        "resolution_status": "AI_RESOLUTION_READY",
    }
