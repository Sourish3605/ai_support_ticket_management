import uuid
from django.contrib.auth import get_user_model
from django.db.models import Q
from .models import Ticket, Notification

User = get_user_model()

# Official Category to Department Mapping
CATEGORY_TO_DEPARTMENT_MAP = {
    # IT Department categories
    "Hardware": "IT Department",
    "Software/Application": "IT Department",
    "Software": "IT Department",
    "Application": "IT Department",
    "Network": "IT Department",
    "Technical": "IT Department",
    "Security": "IT Department",
    "Access": "IT Department",
    "Account": "IT Department",
    "Infrastructure": "IT Department",
    "Database": "IT Department",
    "VPN": "IT Department",
    "Email": "IT Department",

    # HR Department categories
    "HR/Payroll": "HR Department",
    "HR": "HR Department",
    "Payroll": "HR Department",
    "Benefits": "HR Department",
    "Onboarding": "HR Department",
    "Leave": "HR Department",
    "Workplace": "HR Department",

    # Finance Department categories
    "Finance/Payments": "Finance Department",
    "Finance": "Finance Department",
    "Payments": "Finance Department",
    "Billing": "Finance Department",
    "Invoice": "Finance Department",
    "Subscription": "Finance Department",
    "Tax": "Finance Department",

    # Default fallback
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
    if any(k in cat_lower for k in ["hardw", "softw", "netw", "wifi", "tech", "secur", "access", "login", "vpn", "server", "system", "app"]):
        return "IT Department"

    return "IT Department"


def get_agents_in_department(department_name, available_only=False):
    """
    Returns QuerySet or list of User accounts belonging to a specific department.
    Optionally filters by availability_status == 'AVAILABLE'.
    """
    from apps.staff.models import Profile

    profile_qs = Profile.objects.filter(department__iexact=department_name)
    if available_only:
        profile_qs = profile_qs.filter(availability_status="AVAILABLE")

    agent_user_ids = list(profile_qs.values_list("user_id", flat=True))

    users = list(
        User.objects.filter(id__in=agent_user_ids).filter(
            Q(is_staff=True) | Q(profile__role__in=["Agent", "Support Agent", "Manager", "Admin"])
        ).distinct()
    )

    # Fallback heuristic if no profiles seeded yet: match known usernames or staff
    if not users and department_name == "IT Department":
        users = list(
            User.objects.filter(
                is_staff=True
            ).exclude(
                username__in=["workflow_manager", "scen_mgr"]
            )[:4]
        )

    return users


def auto_assign_ticket_to_department_agent(ticket, update_status_if_open=True):
    """
    Full Category -> Department -> Available Agent -> Fair Assignment workflow.
    1. Identify Category -> Determine Department.
    2. Check availability status of agents in that department.
    3. Exclude 'UNAVAILABLE', 'BUSY', 'INACTIVE' agents.
    4. Fair workload balancing: select eligible agent with lowest active ticket count.
    5. If no agent available: mark unassigned, retain department, queue for Manager.
    """
    category = ticket.category or "General"
    department = get_department_for_category(category)
    ticket.department = department

    # Find available agents in this department
    eligible_agents = get_agents_in_department(department, available_only=True)

    if not eligible_agents:
        # No agent available right now in this department
        ticket.assigned_to = None
        ticket.save(update_fields=["department", "assigned_to", "updated_at"])

        try:
            from .agent_orchestrator import _log_activity
            _log_activity(
                ticket=ticket,
                actor="Department Router",
                action="PENDING_ASSIGNMENT",
                description=f"Routed to '{department}' for Category '{category}'. All department agents are currently unavailable/busy. Queued for Manager assignment.",
            )
        except Exception:
            pass

        # Notify Managers of unassigned ticket
        try:
            managers = User.objects.filter(Q(is_superuser=True) | Q(profile__role="Manager"))[:3]
            for mgr in managers:
                Notification.objects.create(
                    notification_id=f"NOTIF-{uuid.uuid4().hex[:8].upper()}",
                    user=mgr,
                    ticket=ticket,
                    title=f"Unassigned {department} Ticket: #{ticket.ticket_number}",
                    message=f"No agents available in {department} for ticket '{ticket.title}'. Manual assignment required.",
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
    if update_status_if_open and ticket.status in ["OPEN", "NEW", "DRAFT", "Classified", "CLASSIFIED"]:
        ticket.status = "ASSIGNED"

    ticket.save(update_fields=["department", "assigned_to", "status", "updated_at"])

    # Log Activity
    try:
        from .agent_orchestrator import _log_activity
        agent_display = best_agent.get_full_name() or best_agent.username
        _log_activity(
            ticket=ticket,
            actor="Department Router",
            action="AUTO_ASSIGNED",
            description=f"Category '{category}' routed to '{department}'. Auto-assigned to {agent_display} (Current workload: {workload} active tickets).",
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
            message=f"Ticket '{ticket.title}' ({ticket.priority} - {category}) has been assigned to you.",
            notification_type="assignment",
        )
    except Exception:
        pass

    return best_agent
