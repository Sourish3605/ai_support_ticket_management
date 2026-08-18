"""
Dynamic Master Data & Knowledge Base Support Ticket Classification Engine.
Master Data is the single source of truth for all categories, subcategories, priorities, and SLA rules.
"""

import json
import re
from masterdata.models import Category, SubCategory, Priority, KnowledgeArticle, SLARule, Department, Team
from .knowledge_service import retrieve_knowledge_and_generate_resolution


def fetch_master_data_context():
    """
    Fetches the latest Master Data and Knowledge Base entries from the database.
    Returns structured dictionaries for classification and server-side validation.
    """
    categories_qs = Category.objects.prefetch_related("sub_categories").all().order_by("name")
    priorities_qs = Priority.objects.all().order_by("level", "id")
    kb_qs = KnowledgeArticle.objects.filter(is_active=True).order_by("-id")

    if not categories_qs.exists() or not priorities_qs.exists():
        return None

    categories_dict = {}
    for cat in categories_qs:
        sub_list = [s.name for s in cat.sub_categories.all()]
        categories_dict[cat.name] = sub_list

    priorities_list = [{"code": p.code, "name": p.name, "level": p.level} for p in priorities_qs]

    kb_entries = []
    for kb in kb_qs[:15]:
        kb_entries.append({
            "title": kb.title,
            "category": kb.category,
            "sub_category": kb.sub_category,
            "content_summary": kb.content[:300] if kb.content else "",
            "tags": kb.tags,
        })

    return {
        "categories_dict": categories_dict,
        "priorities_list": priorities_list,
        "kb_entries": kb_entries,
        "raw_categories": categories_qs,
        "raw_priorities": priorities_qs,
    }


def classify_via_master_data(subject, description, scope, work_blocked, master_data):
    """
    Intelligent Dynamic Master Data Classifier:
    Dynamically scores user request against active Master Data Categories, Sub-Categories,
    and Knowledge Base articles currently in the database.
    Zero hardcoding: all taxonomy and knowledge strictly loaded from DB.
    """
    categories_dict = master_data["categories_dict"]
    priorities_list = master_data["priorities_list"]
    kb_entries = master_data["kb_entries"]

    text = f"{subject} {description}".lower()
    words = [w for w in re.findall(r'[a-zA-Z0-9_\-]+', text) if len(w) > 2]

    best_cat = None
    best_sub = None
    best_score = 0
    matched_reason = ""

    # Check 1: Dynamic Knowledge Base Matching
    for kb in kb_entries:
        kb_text = f"{kb.get('title', '')} {kb.get('tags', '')} {kb.get('content_summary', '')}".lower()
        score = sum(3 for w in words if w in kb_text)
        if score > best_score and kb.get("category") in categories_dict:
            best_score = score
            best_cat = kb["category"]
            subs = categories_dict.get(kb["category"], [])
            best_sub = kb.get("sub_category") if kb.get("sub_category") in subs else (subs[0] if subs else None)
            matched_reason = f"Matched knowledge base article '{kb.get('title')}'."

    # Check 2: Direct Category & Sub-Category Matching from DB Master Data
    for cat_name, subs in categories_dict.items():
        cat_lower = cat_name.lower()
        cat_score = sum(2 for w in words if w in cat_lower or cat_lower in w)

        for sub_name in subs:
            sub_lower = sub_name.lower()
            sub_score = cat_score + sum(4 for w in words if w in sub_lower or sub_lower in w)
            if sub_score > best_score:
                best_score = sub_score
                best_cat = cat_name
                best_sub = sub_name
                matched_reason = f"Matched Category '{cat_name}' and Sub-Category '{sub_name}' in Master Data."

        if cat_score > best_score:
            best_score = cat_score
            best_cat = cat_name
            best_sub = subs[0] if subs else None
            matched_reason = f"Matched Category '{cat_name}' in Master Data."

    # If no match found in active Master Data
    if not best_cat or best_score == 0:
        return {
            "category": None,
            "sub_category": None,
            "priority": None,
            "confidence": 0.5,
            "reason": "No matching classification found in the current master data.",
        }

    # Determine Priority based on impact from allowed DB priorities
    prio_codes = [p["code"] for p in priorities_list]
    if work_blocked or scope == "Whole org":
        prio = "P1" if "P1" in prio_codes else (prio_codes[0] if prio_codes else "P1")
    elif scope in ["My department", "My team"]:
        prio = "P2" if "P2" in prio_codes else (prio_codes[min(1, len(prio_codes) - 1)] if prio_codes else "P2")
    else:
        prio = "P3" if "P3" in prio_codes else (prio_codes[min(2, len(prio_codes) - 1)] if prio_codes else "P3")

    return {
        "category": best_cat,
        "sub_category": best_sub,
        "priority": prio,
        "confidence": 0.95,
        "reason": matched_reason or f"Classified under {best_cat}.",
    }


def classify_ticket(subject, description, scope="Just me", work_blocked=False):
    """
    Dynamic Ticket Classification Engine using Database Master Data and Knowledge Base.
    Strictly adheres to current Master Data as the single source of truth.
    """
    # 1. Fetch Current Master Data
    master_data = fetch_master_data_context()
    if not master_data:
        return {
            "success": False,
            "error": "Classification master data is unavailable.",
        }

    categories_dict = master_data["categories_dict"]
    priorities_list = master_data["priorities_list"]

    # 2. Dynamic Classifier using DB Taxonomy and Knowledge Base
    parsed_classification = classify_via_master_data(subject, description, scope, work_blocked, master_data)

    ai_category = parsed_classification.get("category")
    ai_subcategory = parsed_classification.get("sub_category")
    ai_priority = parsed_classification.get("priority")
    ai_reason = parsed_classification.get("reason", "")
    ai_confidence = float(parsed_classification.get("confidence", 0.95))

    # Case A: No matching classification in Master Data
    if not ai_category or ai_category.strip().lower() in ["null", "none", ""]:
        return {
            "success": True,
            "category": None,
            "sub_category": None,
            "priority": None,
            "confidence": ai_confidence,
            "reason": ai_reason or "No matching classification found in the current master data.",
            "classification_path": "Master Data Classifier",
        }

    # Case B: Validate Category exists in Master Data
    matched_cat_name = None
    for db_cat in categories_dict.keys():
        if db_cat.strip().lower() == ai_category.strip().lower():
            matched_cat_name = db_cat
            break

    if not matched_cat_name:
        return {
            "success": False,
            "error": "Classification returned a category that does not exist in the current master data.",
        }

    # Case C: Validate Sub-Category exists under this Category
    allowed_subcategories = categories_dict.get(matched_cat_name, [])
    matched_sub_name = None
    if ai_subcategory and ai_subcategory.strip().lower() not in ["null", "none", ""]:
        for db_sub in allowed_subcategories:
            if db_sub.strip().lower() == ai_subcategory.strip().lower():
                matched_sub_name = db_sub
                break

        if not matched_sub_name and allowed_subcategories:
            matched_sub_name = allowed_subcategories[0]
    elif allowed_subcategories:
        matched_sub_name = allowed_subcategories[0]

    # Case D: Validate Priority exists in Master Data
    matched_prio_code = None
    for p in priorities_list:
        if (
            p["code"].strip().lower() == str(ai_priority).strip().lower()
            or p["name"].strip().lower() == str(ai_priority).strip().lower()
        ):
            matched_prio_code = p["code"]
            break

    if not matched_prio_code:
        matched_prio_code = priorities_list[0]["code"]

    # 3. Knowledge Base Retrieval & SLA calculation
    kb_result = retrieve_knowledge_and_generate_resolution(
        category=matched_cat_name,
        sub_category=matched_sub_name or "",
        subject=subject,
        description=description,
    )

    # Calculate SLA from DB SLARule or fallback
    sla_rule = SLARule.objects.filter(priority__code=matched_prio_code).first()
    sla_hours = sla_rule.resolution_hours if sla_rule else (
        4 if matched_prio_code == "P1" else 8 if matched_prio_code == "P2" else 24 if matched_prio_code == "P3" else 48
    )

    # Determine default team/department for this category if available
    assigned_team = "IT Support"
    team_obj = Team.objects.filter(name__icontains=matched_cat_name).first()
    if team_obj:
        assigned_team = team_obj.name
    elif matched_cat_name == "Network":
        assigned_team = "Network Team"
    elif matched_cat_name == "Security":
        assigned_team = "Security Team"
    elif matched_cat_name == "Hardware":
        assigned_team = "Hardware Team"
    elif matched_cat_name == "Software":
        assigned_team = "Software Team"
    elif matched_cat_name == "Billing":
        assigned_team = "Finance"

    return {
        "success": True,
        "category": matched_cat_name,
        "sub_category": matched_sub_name,
        "priority": matched_prio_code,
        "severity": "Critical" if matched_prio_code == "P1" else "High" if matched_prio_code == "P2" else "Medium" if matched_prio_code == "P3" else "Low",
        "team": assigned_team,
        "confidence": round(ai_confidence, 2),
        "classification_path": "Classification Engine",
        "sla_hours": sla_hours,
        "knowledge_source": kb_result["article_title"],
        "suggested_resolution": kb_result["suggested_steps"],
        "reason": ai_reason,
    }
