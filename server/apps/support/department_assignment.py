import uuid
from django.contrib.auth import get_user_model
from django.db.models import Q
from .models import Ticket, Notification

User = get_user_model()

# Official Category to Department Mapping (Aligned with Requirement 7)
CATEGORY_TO_DEPARTMENT_MAP = {
    # IT Department
    "Network": "IT Department",
    "Security": "IT Department",
    "Authentication": "IT Department",
    "Hardware": "IT Department",
    "Software": "IT Department",
    "Email": "IT Department",
    "Technical": "IT Department",
    "Access": "IT Department",
    "Account": "IT Department",
    "Infrastructure": "IT Department",
    "Database": "IT Department",
    "VPN": "IT Department",

    # HR Department
    "HR": "HR Department",
    "HR/Payroll": "HR Department",
    "Payroll": "HR Department",
    "Benefits": "HR Department",
    "Onboarding": "HR Department",
    "Leave": "HR Department",
    "Workplace": "HR Department",

    # Finance Department
    "Billing": "Finance Department",
    "Finance": "Finance Department",
    "Finance/Payments": "Finance Department",
    "Payments": "Finance Department",
    "Invoice": "Finance Department",
    "Subscription": "Finance Department",
    "Tax": "Finance Department",

    # Fallback
    "General": "IT Department",
    "Other": "IT Department",
}


def get_department_for_category(category_name):
    """
    Identifies the appropriate department based on category name.
    Performs case-insensitive direct match, then keyword fallbacks.
    """
    if not category_name:
        return "IT Department"

    clean_cat = str(category_name).strip()

    # 1. Exact match
    for cat_key, dept in CATEGORY_TO_DEPARTMENT_MAP.items():
        if clean_cat.lower() == cat_key.lower():
            return dept

    # 2. Keyword fuzzy matching
    cat_lower = clean_cat.lower()
    if any(k in cat_lower for k in ["hr", "payroll", "benefit", "onboard", "leave", "employee relation"]):
        return "HR Department"
    if any(k in cat_lower for k in ["finan", "pay", "bill", "invoice", "refund", "card", "tax", "charge"]):
        return "Finance Department"
    if any(k in cat_lower for k in ["hardw", "softw", "netw", "wifi", "tech", "secur", "auth", "access", "login", "vpn", "server", "system", "app", "mail", "email"]):
        return "IT Department"

    return "IT Department"


def is_team_lead_or_admin(user):
    """
    Identifies Admins, Managers, and designated Leads.
    """
    if not user:
        return False
    uname = (user.username or "").lower().strip()
    uemail = (user.email or "").lower().strip()

    # System administrative accounts
    if any(k in uname or k in uemail for k in ["admin", "manager", "sourish", "workflow_", "scen_"]):
        return True

    # Profile role & title inspection
    profile = getattr(user, "profile", None)
    if profile:
        role = (profile.role or "").lower().strip()
        if role in ["admin", "manager", "customer"]:
            return True
        title = (profile.title or "").lower().strip()
        if any(k in title for k in ["supervisor", "head", "director", "manager"]):
            return True

    return False


def get_agents_in_department(department_name, available_only=False, exclude_leads=False):
    """
    Returns list of User accounts belonging to a specific department.
    - available_only: filters by availability_status == 'AVAILABLE'
    - exclude_leads: excludes Leads if regular agents exist
    """
    from apps.staff.models import Profile

    dept_query = department_name.strip()
    if not dept_query.endswith("Department") and not dept_query.endswith("department"):
        dept_query = f"{dept_query} Department"

    profile_qs = Profile.objects.filter(
        Q(department__iexact=dept_query) | Q(department__iexact=department_name)
    )
    if available_only:
        profile_qs = profile_qs.filter(availability_status="AVAILABLE")

    # Exclude roles that should never be treated as support agents
    profile_qs = profile_qs.exclude(role__in=["Customer", "Admin", "Manager"])

    agent_user_ids = list(profile_qs.values_list("user_id", flat=True))

    users = list(
        User.objects.filter(id__in=agent_user_ids).filter(
            Q(profile__role__in=["Agent", "Support Agent"]) | Q(is_staff=True)
        ).distinct()
    )

    filtered_users = []
    seen = set()
    for u in users:
        uname = (u.username or "").lower().strip()
        uemail = (u.email or "").lower().strip()

        # Exclude administrative accounts
        if any(k in uname or k in uemail for k in ["admin", "manager", "sourish", "workflow_", "scen_", "customer"]):
            continue

        # Deduplicate users by clean email or base username
        key = uemail or uname
        if key not in seen:
            seen.add(key)
            filtered_users.append(u)

    if exclude_leads:
        regulars = [u for u in filtered_users if not is_team_lead_or_admin(u)]
        # If regular agents exist, use regulars. Otherwise fall back to available leads if needed
        if regulars:
            return regulars

    return filtered_users


def auto_assign_ticket_to_department_agent(ticket, update_status_if_open=True, exclude_leads=True):
    """
    Intelligent Department & Workload Assignment Engine:
    1. Identify Department from Category.
    2. Check available working agents ('AVAILABLE' status only).
    3. Exclude 'UNAVAILABLE', 'BUSY', 'INACTIVE' agents.
    4. Workload balancing: select available agent with the lowest active ticket count.
    5. If ALL suitable agents are busy or unavailable:
       - Ticket is placed in Pending Department Queue (assigned_to = None).
       - Status set to ESCALATED.
       - Logged transparently for Manager and Agent visibility.
    """
    category = ticket.category or "General"
    department = get_department_for_category(category)
    ticket.department = department

    # Find available agents in this department
    eligible_agents = get_agents_in_department(department, available_only=True, exclude_leads=exclude_leads)

    if not eligible_agents:
        # All agents busy or unavailable -> place into department queue
        ticket.assigned_to = None
        ticket.assigned_queue = f"{department} Pending Queue"
        ticket.escalated = True
        ticket.escalation_reason = f"All suitable agents in {department} are currently busy or unavailable. Ticket queued for available agent."
        ticket.status = "ESCALATED"
        ticket.save(update_fields=["department", "assigned_to", "assigned_queue", "escalated", "escalation_reason", "status", "updated_at"])

        try:
            from .agent_orchestrator import _log_activity
            _log_activity(
                ticket=ticket,
                actor="Assignment Engine",
                action="QUEUED_FOR_AGENT",
                description=f"Category '{category}' routed to '{department}'. All suitable agents are currently busy or unavailable. Placed into {department} queue for automatic assignment when an agent becomes available.",
            )
        except Exception:
            pass

        # Notify Managers of queued ticket
        try:
            managers = User.objects.filter(Q(is_superuser=True) | Q(profile__role="Manager"))[:3]
            for mgr in managers:
                Notification.objects.create(
                    notification_id=f"NOTIF-{uuid.uuid4().hex[:8].upper()}",
                    user=mgr,
                    ticket=ticket,
                    title=f"Queued Ticket ({ticket.priority}): #{ticket.ticket_number}",
                    message=f"Ticket '{ticket.title}' is waiting for an available agent in {department}.",
                    notification_type="system",
                )
        except Exception:
            pass

        return None

    # Fair Workload Balancing: Pick agent with fewest non-resolved, non-closed tickets
    def get_active_workload(agent_user):
        return Ticket.objects.filter(assigned_to=agent_user).exclude(
            status__in=["RESOLVED", "Resolved", "CLOSED", "Closed"]
        ).count()

    best_agent = min(eligible_agents, key=get_active_workload)
    workload = get_active_workload(best_agent)

    ticket.assigned_to = best_agent
    ticket.assigned_queue = f"{department} Active Queue"
    if update_status_if_open and ticket.status in ["OPEN", "NEW", "DRAFT", "Classified", "CLASSIFIED", "REOPENED", "ESCALATED"]:
        ticket.status = "ASSIGNED"

    ticket.save(update_fields=["department", "assigned_to", "assigned_queue", "status", "updated_at"])

    # Log Activity
    try:
        from .agent_orchestrator import _log_activity
        agent_display = best_agent.get_full_name() or best_agent.username
        agent_title = getattr(getattr(best_agent, "profile", None), "title", "Support Agent")
        _log_activity(
            ticket=ticket,
            actor="Assignment Engine",
            action="AUTO_ASSIGNED",
            description=f"Routed to '{department}'. Auto-assigned to {agent_display} ({agent_title}). Balanced active workload: {workload} tickets.",
        )
    except Exception:
        pass

    # Notify Assigned Agent
    try:
        Notification.objects.create(
            notification_id=f"NOTIF-{uuid.uuid4().hex[:8].upper()}",
            user=best_agent,
            ticket=ticket,
            title=f"New {department} Ticket Assigned: #{ticket.ticket_number}",
            message=f"Ticket '{ticket.title}' ({ticket.priority} - {category}) assigned to you.",
            notification_type="assignment",
        )
    except Exception:
        pass

    return best_agent


def drain_pending_queue_for_department(department_name=None):
    """
    Drains unassigned queued tickets in priority order (P1 > P2 > P3 > P4, nearest SLA first)
    whenever an agent becomes available or completes existing tickets.
    """
    qs = Ticket.objects.filter(assigned_to__isnull=True).exclude(
        status__in=["RESOLVED", "Resolved", "CLOSED", "Closed"]
    )
    if department_name:
        dept_clean = department_name.strip()
        qs = qs.filter(Q(department__iexact=dept_clean) | Q(department__icontains=dept_clean.replace("Department", "").strip()))

    def priority_sort_key(t):
        p = str(t.priority or "P3").upper()
        weight = 1 if ("1" in p or "CRITICAL" in p) else 2 if ("2" in p or "HIGH" in p) else 3 if ("3" in p or "MEDIUM" in p) else 4
        sla_time = t.sla_resolution_due.timestamp() if t.sla_resolution_due else float("inf")
        return (weight, sla_time, t.created_at.timestamp() if t.created_at else 0)

    queued_tickets = sorted(list(qs), key=priority_sort_key)
    assigned_count = 0

    for ticket in queued_tickets:
        assigned_agent = auto_assign_ticket_to_department_agent(ticket, update_status_if_open=True)
        if assigned_agent:
            assigned_count += 1

    return assigned_count
