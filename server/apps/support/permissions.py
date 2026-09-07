from rest_framework import permissions


def is_user_agent_or_admin(user):
    if not user or not user.is_authenticated:
        return False
    if getattr(user, "is_superuser", False) or getattr(user, "is_staff", False):
        return True
    if hasattr(user, "profile"):
        role = getattr(user.profile, "role", "")
        if str(role).lower() in ["admin", "agent", "support_agent", "support agent", "engineer", "lead", "manager", "support manager", "support_manager"]:
            return True
    return False


class IsSupportAgentOrAdmin(permissions.BasePermission):
    """
    Permission check: Only Support Agents and Administrators can access this endpoint.
    Regular Customers receive a 403 Forbidden.
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and is_user_agent_or_admin(request.user))


class IsTicketOwnerOrAgentOrAdmin(permissions.BasePermission):
    """
    Object-level permission check:
    - Customer A can only access Customer A's ticket.
    - Customer B attempting to access Customer A's ticket receives 403 Forbidden.
    - Support Agents and Administrators have access to all tickets.
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False

        # Support Agents and Admins can view/modify any ticket
        if is_user_agent_or_admin(request.user):
            return True

        # Customer can view/modify their own tickets
        if obj.created_by_id == request.user.id:
            return True

        # Match by email (case-insensitive)
        if request.user.email and obj.created_by and obj.created_by.email:
            if obj.created_by.email.strip().lower() == request.user.email.strip().lower():
                return True

        # Match by username (case-insensitive)
        if request.user.username and obj.created_by and obj.created_by.username:
            if obj.created_by.username.strip().lower() == request.user.username.strip().lower():
                return True

        return False
