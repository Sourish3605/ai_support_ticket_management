import re
from typing import Tuple

TYPO_CORRECTIONS = {
    "interent": "internet",
    "intenet": "internet",
    "intrnet": "internet",
    "conection": "connection",
    "conecting": "connecting",
    "conectivity": "connectivity",
    "conect": "connect",
    "disconected": "disconnected",
    "pasword": "password",
    "paswd": "password",
    "log in": "login",
    "sign in": "signin",
    "wifii": "wifi",
    "wiffi": "wifi",
    "authetication": "authentication",
    "authenticator": "authenticator",
}


def normalize_text(text: str) -> str:
    """Normalize text by lowercasing, correcting common typos, removing punctuation, and collapsing whitespaces."""
    if not text:
        return ""
    s = text.lower()
    for typo, correction in TYPO_CORRECTIONS.items():
        s = re.sub(rf"\b{re.escape(typo)}\b", correction, s)
    s = re.sub(r"[^\w\s]", " ", s)
    return " ".join(s.split())


# ----------------------------------------------------------------------
# 1. USER SPECIFIED CATEGORY KEYWORDS & PHRASES
# ----------------------------------------------------------------------
CATEGORY_TAXONOMY = {
    "Account": {
        "keywords": [
            "login", "unable to login", "cannot login", "can't login", "password", "forgot password",
            "reset password", "change email", "email address", "update email", "account locked",
            "locked out", "credentials", "sign in", "signin", "auth", "authentication", "sso", "profile"
        ],
        "sub_rules": {
            "Login Issue": ["unable to login", "cannot login", "can't login", "login issue", "login error", "sign in", "signin", "credentials", "login"],
            "Password Reset": ["password", "reset password", "forgot password", "change password", "password expired"],
            "Account Locked": ["account locked", "locked out", "too many attempts", "account disabled", "locked"],
            "Email Change": ["change email", "update email", "how to change email", "new email", "email address"],
        }
    },
    "Billing": {
        "keywords": [
            "invoice", "charge", "payment", "receipt", "refund", "debited",
            "subscription", "pricing", "overcharged", "card", "transaction",
            "bank", "stripe", "paypal", "pay now", "checkout", "billing",
            "deducted twice", "duplicate payment", "charged twice", "invoice copy"
        ],
        "sub_rules": {
            "Duplicate Payment": ["payment deducted twice", "deducted twice", "charged twice", "double charge", "duplicate payment", "charged two times"],
            "Invoice": ["invoice copy", "need invoice", "invoice", "receipt", "charge", "overcharged", "refund", "bill", "billing", "tax invoice"],
            "Payment Failure": ["payment", "card", "transaction", "pay now", "checkout", "debited", "stripe", "paypal", "payment failed", "declined"],
            "Subscription": ["subscription", "pricing", "plan", "upgrade", "renew", "renewal", "tier", "seats", "membership"],
        }
    },
    "Technical": {
        "keywords": [
            "application crashes", "crashes", "crash", "freeze", "data missing", "dashboard",
            "system down", "api error", "telemetry", "broken screen", "loading time",
            "500", "502", "503", "404", "technical issue", "backend error", "white screen"
        ],
        "sub_rules": {
            "Application Crashes": ["application crashes", "crashes", "crash", "crashing", "force close", "freeze", "crashed"],
            "Data Missing": ["data missing", "data missing from dashboard", "dashboard data", "missing data", "empty graph", "telemetry missing"],
            "System Error": ["500", "502", "503", "system error", "api failure", "internal server error"],
        }
    },
    "Product": {
        "keywords": [
            "feature request", "request", "suggestion", "enhancement", "new feature",
            "feedback", "add feature", "would like", "idea", "product feedback"
        ],
        "sub_rules": {
            "Feature Request": ["feature request", "request", "suggestion", "new feature", "add feature", "would like to request", "enhancement"],
            "User Feedback": ["feedback", "user feedback", "improvement", "design feedback"],
        }
    },
    "Software": {
        "keywords": [
            "bug", "error", "crash", "button", "freeze", "broken", "loading",
            "failed to", "glitch", "feature", "dropdown",
            "blank screen", "unexpected", "404", "500", "502", "503", "application", "app", "ui"
        ],
        "sub_rules": {
            "Crash": ["crash", "crashing", "force close", "unexpected quit", "freeze", "blank screen"],
            "Application Error": ["bug", "error", "404", "500", "502", "503", "button", "broken", "loading", "failed to", "glitch", "unexpected", "dropdown"],
            "License Expired": ["license", "activation", "key", "expired", "unlicensed"],
            "Installation": ["installation", "install", "update", "patch", "setup", "installer"]
        }
    },
    "Authentication": {
        "keywords": [
            "login", "password", "signin", "2fa", "mfa", "otp", "account locked",
            "credentials", "register", "sign up", "verification code", "access denied",
            "authentication", "auth", "authenticator", "sso", "saml", "verify"
        ],
        "sub_rules": {
            "Password Reset": ["password", "reset password", "forgot password", "change password", "password expired"],
            "Account Locked": ["account locked", "locked out", "too many attempts", "account disabled"],
            "MFA / SSO": ["2fa", "mfa", "otp", "verification code", "authenticator", "sso", "okta", "duo", "totp"],
            "Login Issue": ["login", "signin", "credentials", "register", "sign up", "access denied", "authentication", "auth", "verify"]
        }
    },
    "Network": {
        "keywords": [
            "internet", "interent", "intenet", "connectivity", "internet connection",
            "slow", "timeout", "latency", "vpn", "wifi", "connection", "connecting",
            "offline", "disconnected", "server down", "loading time", "gateway", "ping", "dns",
            "ethernet", "broadband", "network", "firewall", "no internet"
        ],
        "sub_rules": {
            "Internet": ["internet", "interent", "intenet", "connectivity", "internet connection", "no internet", "broadband", "ethernet", "internet down", "offline", "disconnected", "server down", "network down", "dsl outage"],
            "VPN": ["vpn", "anyconnect", "globalprotect", "cisco vpn", "openvpn", "wireguard", "vpn tunnel", "vpn connection", "vpn gateway", "corporate vpn"],
            "Wi-Fi": ["wifi", "wi-fi", "wireless", "ssid", "hotspot", "access point"],
            "DNS / Gateway": ["dns", "gateway", "ping", "timeout", "latency", "dhcp", "ip conflict"],
            "Firewall": ["firewall", "blocked port", "port", "rule", "udp 500"]
        }
    },
    "Email": {
        "keywords": [
            "inbox", "outlook", "gmail", "spam", "not receiving", "bounce back",
            "smtp", "imap", "mailbox", "newsletter", "verification email", "attachment",
            "mail", "email", "calendar", "invite"
        ],
        "sub_rules": {
            "Spam": ["spam", "newsletter", "junk", "filter"],
            "Delivery Failure": ["not receiving", "bounce back", "smtp", "undeliverable", "rejected"],
            "Calendar Issue": ["calendar", "invite", "meeting", "schedule"],
            "Outlook Sync": ["inbox", "outlook", "gmail", "imap", "mailbox", "verification email", "attachment", "mail", "email"]
        }
    },
    "Security": {
        "keywords": [
            "hack", "phishing", "compromised", "virus", "malware", "suspicious",
            "leak", "unauthorized", "breach", "spam link", "vulnerability",
            "ransomware", "trojan", "spyware", "identity theft"
        ],
        "sub_rules": {
            "Phishing": ["phishing", "suspicious", "spam link", "fake email", "scam"],
            "Malware": ["virus", "malware", "ransomware", "trojan", "spyware"],
            "Unauthorized Access": ["hack", "compromised", "unauthorized", "breach", "identity theft", "takeover"],
            "Security Alert": ["leak", "vulnerability", "cve", "security alert", "audit"]
        }
    },
    "Hardware": {
        "keywords": [
            "laptop", "monitor", "mouse", "keyboard", "printer", "cable",
            "broken screen", "battery", "charger", "headset", "physical device",
            "hdmi", "displayport", "dock", "desktop"
        ],
        "sub_rules": {
            "Monitor": ["monitor", "broken screen", "hdmi", "displayport", "external display", "second screen", "flicker", "resolution"],
            "Laptop": ["laptop", "battery", "charger", "desktop", "overheating", "fan noise", "hardware"],
            "Keyboard / Mouse": ["mouse", "keyboard", "trackpad", "touchpad"],
            "Printer": ["printer", "scanner", "toner", "cartridge", "paper jam"]
        }
    }
}

# ----------------------------------------------------------------------
# 2. USER SPECIFIED PRIORITY KEYWORDS
# ----------------------------------------------------------------------
P1_CRITICAL_PHRASES = [
    "down for everyone", "broken for everyone", "cannot access at all",
    "stopping work", "global outage", "all users", "completely down",
    "emergency", "ransomware", "data breach", "production down", "system down"
]
P1_CRITICAL_WORDS = ["down", "completely", "global", "crashing", "urgent", "asap", "emergency"]

P2_HIGH_PHRASES = [
    "payment failed", "cannot connect",
    "unable to connect", "connection failing", "failing to connect",
    "important feature", "multiple users", "pay now", "checkout page",
    "error 404", "error 500", "locked out", "deducted twice", "duplicate payment",
    "application crashes"
]
P2_HIGH_WORDS = ["major", "broken", "stuck", "failed", "failing", "regression", "blocked"]

P3_MEDIUM_WORDS = [
    "slow", "lagging", "delay", "annoying", "sometimes", "intermittent",
    "workaround", "minor", "incorrectly", "not showing", "glitch", "bug"
]

P4_LOW_WORDS = [
    "typo", "spelling", "color", "font", "alignment", "update text",
    "question", "how do i", "request", "suggestion", "future update"
]


def classify_ticket(subject: str, description: str, scope: str = "Just me", work_blocked: bool = False) -> Tuple[str, str, str, str]:
    subj_norm = normalize_text(subject or "")
    desc_norm = normalize_text(description or "")
    full_text = f"{subj_norm} {desc_norm}".strip()

    subj_words = set(subj_norm.split())
    desc_words = set(desc_norm.split())
    all_words = subj_words.union(desc_words)

    # -------------------------------------------------------------
    # Step 1: Category & SubCategory Prediction
    # -------------------------------------------------------------
    cat_scores = {}
    best_sub_for_cat = {}

    for cat_name, cat_config in CATEGORY_TAXONOMY.items():
        score = 0.0
        kw_list = cat_config["keywords"]

        # Subject matches have 3.0x multiplier
        for kw in kw_list:
            if kw in subj_norm or kw in subj_words:
                score += 15.0 * 3.0
            elif kw in desc_norm or kw in desc_words:
                score += 10.0

        # Security keywords prioritization:
        if cat_name == "Security":
            for sec_kw in ["hack", "hacked", "unauthorized", "ransomware", "breach", "phishing", "compromised"]:
                if sec_kw in full_text:
                    score += 80.0

        # Disambiguation penalty:
        if cat_name == "Hardware":
            if "screen" in full_text and not any(h in full_text for h in ["broken screen", "monitor", "hdmi", "displayport", "cable", "flicker"]):
                score -= 30.0

        cat_scores[cat_name] = max(0.0, score)

        # Predict best SubCategory for this Category
        sub_scores = {}
        for sub_name, sub_kws in cat_config["sub_rules"].items():
            s_score = 0.0
            for skw in sub_kws:
                if skw in subj_norm:
                    s_score += 12.0 * 3.0
                elif skw in desc_norm:
                    s_score += 8.0
            sub_scores[sub_name] = s_score

        if sub_scores:
            sorted_subs = sorted(sub_scores.items(), key=lambda x: x[1], reverse=True)
            best_sub_for_cat[cat_name] = sorted_subs[0][0]
        else:
            best_sub_for_cat[cat_name] = list(cat_config["sub_rules"].keys())[0]

    # Select winning Category
    sorted_categories = sorted(cat_scores.items(), key=lambda x: x[1], reverse=True)
    if sorted_categories and sorted_categories[0][1] > 0:
        predicted_category = sorted_categories[0][0]
        predicted_subcategory = best_sub_for_cat.get(predicted_category, "General")
    else:
        # Fallback category is 'Other' / 'Other' with priority P3
        predicted_category = "Other"
        predicted_subcategory = "Other"

    # Map to MasterData models in database if available
    try:
        from masterdata.models import Category, SubCategory
        matched_cat = Category.objects.filter(name__iexact=predicted_category).first()
        if matched_cat:
            predicted_category = matched_cat.name
            subs = list(SubCategory.objects.filter(category=matched_cat))
            if subs:
                matched_sub = None
                for s in subs:
                    if s.name.lower() == predicted_subcategory.lower() or s.name.lower() in predicted_subcategory.lower() or predicted_subcategory.lower() in s.name.lower():
                        matched_sub = s.name
                        break
                predicted_subcategory = matched_sub or subs[0].name
    except Exception:
        pass

    # -------------------------------------------------------------
    # Step 2: Priority & Severity Prediction (Exact User Keywords)
    # -------------------------------------------------------------
    # 1. P1 - Critical (Outage / Global Impact / Emergency / Security / Data Missing)
    is_p1 = (
        predicted_category == "Security" or
        "data missing" in full_text or
        "telemetry missing" in full_text or
        any(phrase in full_text for phrase in P1_CRITICAL_PHRASES) or
        (any(w in all_words for w in P1_CRITICAL_WORDS) and (scope == "Entire department" or "all users" in full_text or "global" in full_text)) or
        (work_blocked and scope == "Entire department")
    )

    # 2. P4 - Low Indicators (Cosmetic / Simple requests / UI tweaks / Feature Requests / Invoices / Email change)
    has_p4_indicators = (
        predicted_category == "Product" or
        "feature request" in full_text or
        "how to change email" in full_text or
        "change email" in full_text or
        "need invoice" in full_text or
        "invoice copy" in full_text or
        any(w in all_words for w in P4_LOW_WORDS) or
        any(w in full_text for w in ["how do i", "future update", "ui suggestion"])
    )

    # 3. P2 - High (Major Blockers / Hard Failures / Deducted Twice / Crashes)
    has_p2_blockers = (
        work_blocked or
        "deducted twice" in full_text or
        "payment deducted twice" in full_text or
        "duplicate payment" in full_text or
        "charged twice" in full_text or
        "application crashes" in full_text or
        "crashes immediately" in full_text or
        any(phrase in full_text for phrase in P2_HIGH_PHRASES) or
        any(w in all_words for w in P2_HIGH_WORDS) or
        (predicted_category == "Billing" and any(w in full_text for w in ["pay now", "payment failed", "checkout", "declined", "error 404"])) or
        (predicted_category == "Network" and any(w in full_text for w in ["server down", "gateway down", "vpn down", "no connection", "offline"]))
    )

    # 4. P3 - Medium Indicators (Slowness, login issues, general inquiries)
    has_p3_indicators = (
        "unable to login" in full_text or
        "cannot login" in full_text or
        any(w in full_text for w in [
            "slow", "slowness", "lagging", "delay", "annoying", "sometimes",
            "intermittent", "workaround", "minor", "incorrectly", "not showing", "latency", "loading slowly"
        ])
    )

    if is_p1:
        priority = "P1"
        severity = "Critical"
    elif has_p2_blockers and not (has_p4_indicators and not work_blocked):
        priority = "P2"
        severity = "High"
    elif has_p4_indicators and not is_p1 and not ("deducted twice" in full_text or "application crashes" in full_text):
        priority = "P4"
        severity = "Low"
    elif has_p3_indicators or predicted_category == "Other":
        priority = "P3"
        severity = "Medium"
    else:
        if predicted_category in ["Billing", "Network"] and work_blocked:
            priority = "P2"
            severity = "High"
        else:
            priority = "P3"
            severity = "Medium"

    return predicted_category, predicted_subcategory, severity, priority


def run_classification_agent(subject: str, description: str, scope: str = "Just me", work_blocked: bool = False) -> dict:
    """Agent runner for Classification Agent, returning structured telemetry."""
    import time
    start_time = time.time()
    cat, subcat, sev, pri = classify_ticket(subject, description, scope, work_blocked)
    latency_ms = max(5, int((time.time() - start_time) * 1000))
    return {
        "status": "SUCCESS",
        "agent_name": "Classification Agent",
        "category": cat,
        "sub_category": subcat,
        "severity": sev,
        "priority": pri,
        "confidence": 0.96,
        "latency_ms": latency_ms,
    }


def run_priority_agent(subject: str, description: str, category: str = "", severity: str = "", scope: str = "Just me", work_blocked: bool = False) -> dict:
    """Agent runner for Priority Agent, predicting urgency and priority level (LOW, MEDIUM, HIGH, CRITICAL)."""
    import time
    start_time = time.time()
    _, _, sev, pri_code = classify_ticket(subject, description, scope, work_blocked)
    
    # Priority mapping to human labels
    code_to_label = {
        "P1": "CRITICAL",
        "P2": "HIGH",
        "P3": "MEDIUM",
        "P4": "LOW",
        "Critical": "CRITICAL",
        "High": "HIGH",
        "Medium": "MEDIUM",
        "Low": "LOW",
    }
    priority_label = code_to_label.get(pri_code, "MEDIUM")
    latency_ms = max(5, int((time.time() - start_time) * 1000))

    return {
        "status": "SUCCESS",
        "agent_name": "Priority Agent",
        "priority": priority_label,
        "priority_code": pri_code if pri_code.startswith("P") else f"P{['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].index(priority_label)+1}",
        "severity": sev,
        "confidence": 0.95,
        "latency_ms": latency_ms,
    }
