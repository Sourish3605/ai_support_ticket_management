from datetime import datetime, timezone, timedelta

from django.contrib.auth import get_user_model
from rest_framework import generics, permissions, serializers, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.exceptions import NotFound

from .models import Ticket, TicketReply, Notification
from .serializers import (
    TicketSerializer,
    TicketListSerializer,
    TicketReplySerializer,
    TicketStatusUpdateSerializer,
    TicketReplyCreateSerializer,
    TicketAssignSerializer,
    NotificationSerializer,
)
from .permissions import (
    IsSupportAgentOrAdmin,
    IsTicketOwnerOrAgentOrAdmin,
    is_user_agent_or_admin,
)
from .classification import classify_ticket
from .preprocessing import preprocess_ticket
from .knowledge_service import retrieve_knowledge_and_generate_resolution
from .agent_orchestrator import run_multi_agent_workflow


# ---------------------------------------------------------
# OPTIONAL MONGODB
# ---------------------------------------------------------

try:
    from mongodb import (
        tickets_collection,
        classifications_collection,
        sla_calculations_collection,
    )
except Exception:
    tickets_collection = None
    classifications_collection = None
    sla_calculations_collection = None


User = get_user_model()


# ---------------------------------------------------------
# SLA CALCULATION
# ---------------------------------------------------------

def get_sla_metrics(priority_code: str):
    """
    Calculate SLA response time, resolution time and coverage.
    """

    p_code = str(priority_code).upper()

    if p_code in ["CRITICAL", "HIGH", "P1"]:
        return {
            "response_minutes": 15,
            "resolution_hours": 4,
            "coverage": "24/7",
        }

    elif p_code == "P2":
        return {
            "response_minutes": 30,
            "resolution_hours": 8,
            "coverage": "24/7",
        }

    elif p_code in ["MEDIUM", "P3"]:
        return {
            "response_minutes": 60,
            "resolution_hours": 24,
            "coverage": "Business Hours",
        }

    elif p_code in ["LOW", "P4"]:
        return {
            "response_minutes": 120,
            "resolution_hours": 48,
            "coverage": "Business Hours",
        }

    return {
        "response_minutes": 60,
        "resolution_hours": 24,
        "coverage": "Business Hours",
    }


# ---------------------------------------------------------
# FIND TICKET BY ID OR TICKET NUMBER
# ---------------------------------------------------------

def get_ticket_by_id_or_number(lookup_val):
    """
    Find ticket using:
    - Database ID
    - Ticket number such as TKT-1001 or TKT1001
    """
    if lookup_val is None:
        return None

    val_str = str(lookup_val).strip()
    if not val_str:
        return None

    # Try database ID directly
    if val_str.isdigit():
        ticket = Ticket.objects.filter(id=int(val_str)).first()
        if ticket:
            return ticket

    # Try exact ticket number
    ticket = Ticket.objects.filter(
        ticket_number__iexact=val_str
    ).first()
    if ticket:
        return ticket

    # Try TKT-1001 / TKT1001 / TKT001 / TKT15
    clean_num = (
        val_str.upper()
        .replace("TKT-", "")
        .replace("TKT", "")
        .strip()
    )

    if clean_num.isdigit():
        ticket = Ticket.objects.filter(
            ticket_number__iexact=f"TKT-{clean_num}"
        ).first()
        if ticket:
            return ticket

        ticket = Ticket.objects.filter(
            ticket_number__icontains=clean_num
        ).first()
        if ticket:
            return ticket

        ticket = Ticket.objects.filter(
            id=int(clean_num)
        ).first()
        if ticket:
            return ticket

        # Optional fallback: TKT-1001 -> ID 1
        if int(clean_num) > 1000:
            ticket = Ticket.objects.filter(
                id=int(clean_num) - 1000
            ).first()
            if ticket:
                return ticket

    return None


# =========================================================
# TICKET LIST + CREATE
# =========================================================

class TicketListCreateView(generics.ListCreateAPIView):

    """
    POST /api/tickets/
        Customer creates a ticket.

    GET /api/tickets/
        Customer sees own tickets.
        Agent/Admin sees all tickets.
    """

    serializer_class = TicketSerializer
    permission_classes = [permissions.IsAuthenticated]

    # -----------------------------------------------------
    # GET TICKETS
    # -----------------------------------------------------

    def get_queryset(self):

        user = self.request.user

        if is_user_agent_or_admin(user):

            queryset = Ticket.objects.all().order_by(
                "-created_at"
            )

        else:

            queryset = Ticket.objects.filter(
                created_by=user
            ).order_by("-created_at")

        # Filters
        status_filter = self.request.query_params.get(
            "status"
        )

        priority = self.request.query_params.get(
            "priority"
        )

        category = self.request.query_params.get(
            "category"
        )

        if status_filter and status_filter != "All statuses":
            queryset = queryset.filter(
                status=status_filter
            )

        if priority and priority != "All priorities":
            queryset = queryset.filter(
                priority=priority
            )

        if category and category != "All categories":
            queryset = queryset.filter(
                category=category
            )

        return queryset

    # -----------------------------------------------------
    # CREATE TICKET WITH VALIDATION & MULTI-AGENT WORKFLOW
    # -----------------------------------------------------

    def create(self, request, *args, **kwargs):
        req_data = request.data if isinstance(request.data, dict) else {}
        raw_subject = str(req_data.get("subject", "") or req_data.get("title", "")).strip()
        raw_description = str(req_data.get("description", "")).strip()

        # Test Scenario 2: Missing subject or description must return validation error (400)
        if not raw_subject or not raw_description:
            return Response(
                {"detail": "Subject and description are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        import uuid
        req_data = self.request.data if isinstance(self.request.data, dict) else {}

        raw_title = str(req_data.get("subject", "") or req_data.get("title", "") or "Support Ticket").strip()
        raw_description = str(req_data.get("description", "")).strip()
        user_attachment = req_data.get("attachment", "")

        # 1. PII Masking & Preprocessing (M1)
        preprocessed = preprocess_ticket(raw_title, raw_description)
        cleaned_title = preprocessed.get("subject", raw_title)
        cleaned_description = preprocessed.get("description", raw_description)

        # 2. Initial Classification & Priority (M1)
        category, sub_category, severity, priority = classify_ticket(cleaned_title, cleaned_description)
        if req_data.get("priority"):
            priority = req_data.get("priority")
        if req_data.get("category"):
            category = req_data.get("category")
        if req_data.get("sub_category") or req_data.get("subCategory"):
            sub_category = req_data.get("sub_category") or req_data.get("subCategory")

        # 3. Save Ticket with initial status 'OPEN'
        ticket = serializer.save(
            created_by=self.request.user,
            title=cleaned_title,
            description=cleaned_description,
            category=category,
            sub_category=sub_category,
            severity=severity,
            priority=priority,
            status="OPEN",
            attachment=(user_attachment or None),
        )

        if not ticket.ticket_number:
            ticket.ticket_number = f"TKT-{1000 + ticket.id}"
            ticket.save(update_fields=["ticket_number"])

        # 4. Notify Customer of Ticket Creation
        try:
            Notification.objects.create(
                notification_id=f"NOTIF-{uuid.uuid4().hex[:8].upper()}",
                user=self.request.user,
                ticket=ticket,
                title=f"Ticket Received: #{ticket.ticket_number}",
                message=f"Your ticket '{ticket.title}' has been received and queued for AI analysis.",
                notification_type="ticket_created",
            )
        except Exception:
            pass

        # 5. Run Milestone 2 & Milestone 3 End-to-End Multi-Agent AI Workflow
        try:
            run_multi_agent_workflow(ticket)
        except Exception as e:
            print(f"[Multi-Agent Pipeline Notice] {e}")


# =========================================================
# CUSTOMER TICKET LIST
# =========================================================

class CustomerTicketListView(generics.ListAPIView):

    """
    GET /api/tickets/my/

    Customer sees only their own tickets.
    """

    serializer_class = TicketListSerializer
    permission_classes = [
        permissions.IsAuthenticated
    ]

    def get_queryset(self):

        return (
            Ticket.objects.select_related("created_by", "assigned_to")
            .filter(created_by=self.request.user)
            .order_by("-created_at")
        )


# =========================================================
# AGENT TICKET LIST
# =========================================================

class AgentTicketListView(generics.ListAPIView):

    """
    GET /api/agent/tickets/

    Agent/Admin can see all tickets.
    """

    serializer_class = TicketListSerializer

    permission_classes = [
        IsSupportAgentOrAdmin
    ]

    def get_queryset(self):

        queryset = (
            Ticket.objects.select_related("created_by", "assigned_to")
            .all()
            .order_by("-created_at")
        )

        status_filter = (
            self.request.query_params.get(
                "status"
            )
        )

        priority = (
            self.request.query_params.get(
                "priority"
            )
        )

        category = (
            self.request.query_params.get(
                "category"
            )
        )

        assigned_to = (
            self.request.query_params.get(
                "assigned_to"
            )
        )

        if (
            status_filter
            and status_filter != "All statuses"
        ):
            queryset = queryset.filter(
                status=status_filter
            )

        if (
            priority
            and priority != "All priorities"
        ):
            queryset = queryset.filter(
                priority=priority
            )

        if (
            category
            and category != "All categories"
        ):
            queryset = queryset.filter(
                category=category
            )

        if assigned_to:

            if assigned_to == "unassigned":

                queryset = queryset.filter(
                    assigned_to__isnull=True
                )

            elif assigned_to == "me":

                queryset = queryset.filter(
                    assigned_to=self.request.user
                )

            elif str(assigned_to).isdigit():

                queryset = queryset.filter(
                    assigned_to_id=int(
                        assigned_to
                    )
                )

        return queryset


# =========================================================
# TICKET DETAIL
# =========================================================

class TicketDetailView(
    generics.RetrieveUpdateDestroyAPIView
):

    """
    GET    /api/tickets/<id>/
    PUT    /api/tickets/<id>/
    PATCH  /api/tickets/<id>/
    DELETE /api/tickets/<id>/
    """

    serializer_class = TicketSerializer

    permission_classes = [
        permissions.IsAuthenticated,
        IsTicketOwnerOrAgentOrAdmin,
    ]

    def get_object(self):

        lookup = (
            self.kwargs.get("pk")
            or self.kwargs.get("id")
        )

        ticket = get_ticket_by_id_or_number(
            lookup
        )

        if not ticket:

            raise NotFound(
                f"Ticket with ID or number "
                f"'{lookup}' not found."
            )

        self.check_object_permissions(
            self.request,
            ticket
        )

        return ticket

    def perform_update(self, serializer):

        ticket = self.get_object()

        req_data = (
            self.request.data
            if isinstance(
                self.request.data,
                dict
            )
            else {}
        )

        new_status = req_data.get(
            "status"
        )

        if (
            new_status
            and new_status != ticket.status
        ):

            if not ticket.can_transition(
                new_status
            ):

                raise serializers.ValidationError(
                    {
                        "status":
                            (
                                f"Cannot change "
                                f"status from "
                                f"'{ticket.status}' "
                                f"to "
                                f"'{new_status}'."
                            )
                    }
                )

        serializer.save()


# =========================================================
# TICKET STATUS UPDATE
# =========================================================

class TicketStatusUpdateView(APIView):

    """
    PATCH /api/tickets/<id>/status/
    """

    permission_classes = [
        permissions.IsAuthenticated,
        IsTicketOwnerOrAgentOrAdmin,
    ]

    def patch(
        self,
        request,
        pk=None,
        id=None,
    ):

        lookup = pk or id

        ticket = get_ticket_by_id_or_number(
            lookup
        )

        if not ticket:

            return Response(
                {
                    "detail":
                        f"Ticket '{lookup}' "
                        f"not found."
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        self.check_object_permissions(
            request,
            ticket
        )

        serializer = (
            TicketStatusUpdateSerializer(
                data=request.data
            )
        )

        serializer.is_valid(
            raise_exception=True
        )

        new_status = (
            serializer.validated_data[
                "status"
            ]
        )

        if not ticket.can_transition(
            new_status
        ):

            return Response(
                {
                    "error":
                        (
                            f"Invalid status "
                            f"transition from "
                            f"{ticket.status} "
                            f"to "
                            f"{new_status}."
                        )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        ticket.status = new_status

        ticket.save(
            update_fields=[
                "status",
                "updated_at",
            ]
        )

        return Response(
            TicketSerializer(ticket).data,
            status=status.HTTP_200_OK,
        )


# =========================================================
# TICKET REPLY
# =========================================================

class TicketReplyCreateView(APIView):

    """
    POST /api/tickets/<id>/reply/
    """

    permission_classes = [
        permissions.IsAuthenticated,
        IsTicketOwnerOrAgentOrAdmin,
    ]

    def post(
        self,
        request,
        pk=None,
        id=None,
    ):

        lookup = pk or id

        ticket = get_ticket_by_id_or_number(
            lookup
        )

        if not ticket:

            return Response(
                {
                    "detail":
                        f"Ticket '{lookup}' "
                        f"not found."
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        self.check_object_permissions(
            request,
            ticket
        )

        serializer = (
            TicketReplyCreateSerializer(
                data=request.data
            )
        )

        serializer.is_valid(
            raise_exception=True
        )

        reply = TicketReply.objects.create(
            ticket=ticket,
            user=request.user,
            message=serializer.validated_data["message"],
            attachment=serializer.validated_data.get("attachment"),
            is_internal=serializer.validated_data.get("is_internal", False),
        )

        is_agent_reply = is_user_agent_or_admin(request.user)

        # Agent / Staff reply -> Status moves to IN_PROGRESS and notify customer
        if is_agent_reply and request.user != ticket.created_by:
            if ticket.status in ["OPEN", "ASSIGNED", "NEW", "AI_ANALYZING", "AI_RESPONDED", "AI_RESOLUTION_READY"]:
                ticket.status = "IN_PROGRESS"
                ticket.save(update_fields=["status", "updated_at"])

            try:
                from .agent_orchestrator import _log_activity
                _log_activity(
                    ticket=ticket,
                    actor=request.user.username,
                    action="AGENT_REPLY",
                    description=f"Support Agent {request.user.get_full_name() or request.user.username} sent a reply to the customer.",
                )
            except Exception:
                pass

            # Notify customer of agent reply
            try:
                import uuid
                if ticket.created_by:
                    Notification.objects.create(
                        notification_id=f"NOTIF-{uuid.uuid4().hex[:8].upper()}",
                        user=ticket.created_by,
                        ticket=ticket,
                        title=f"New Agent Reply on #{ticket.ticket_number}",
                        message=f"{request.user.get_full_name() or request.user.username}: '{reply.message[:80]}'",
                        notification_type="agent_response"
                    )
            except Exception:
                pass

        # Test Scenario 9: Customer reply to resolved ticket -> status transitions to REOPENED
        elif ticket.status in ["RESOLVED", "Resolved", "AI_RESPONDED", "CLOSED", "Closed"] and request.user == ticket.created_by:
            ticket.status = "REOPENED"
            ticket.save(update_fields=["status", "updated_at"])
            try:
                from .agent_orchestrator import _log_activity
                _log_activity(
                    ticket=ticket,
                    actor=request.user.username,
                    action="TICKET_REOPENED",
                    description=f"Ticket #{ticket.ticket_number} auto-reopened by customer reply.",
                )
            except Exception:
                pass

            # Notify support team of reopened ticket
            try:
                import uuid
                recipients = []
                if ticket.assigned_to:
                    recipients.append(ticket.assigned_to)
                recipients.extend(list(User.objects.filter(is_staff=True)[:5]))
                for staff_user in set(recipients):
                    Notification.objects.create(
                        notification_id=f"NOTIF-{uuid.uuid4().hex[:8].upper()}",
                        user=staff_user,
                        ticket=ticket,
                        title=f"Ticket Reopened: #{ticket.ticket_number}",
                        message=f"Customer replied: '{reply.message[:60]}...'",
                        notification_type="status_change"
                    )
            except Exception:
                pass
        else:
            try:
                from .agent_orchestrator import _log_activity
                _log_activity(
                    ticket=ticket,
                    actor=request.user.username,
                    action="CUSTOMER_REPLY",
                    description=f"Customer {request.user.username} posted a follow-up reply.",
                )
            except Exception:
                pass

        return Response(
            TicketReplySerializer(reply).data,
            status=status.HTTP_201_CREATED,
        )


class ConfirmResolutionView(APIView):
    """
    POST /api/tickets/<lookup>/confirm-resolution/
    Test Scenario 8: Customer confirms resolution -> Status changes to 'Closed'.
    """
    permission_classes = [permissions.IsAuthenticated, IsTicketOwnerOrAgentOrAdmin]

    def post(self, request, pk=None, id=None):
        lookup = pk or id
        ticket = get_ticket_by_id_or_number(lookup)
        if not ticket:
            return Response({"detail": f"Ticket '{lookup}' not found."}, status=status.HTTP_404_NOT_FOUND)
        self.check_object_permissions(request, ticket)

        ticket.status = "CLOSED"
        ticket.closed_at = datetime.now(timezone.utc)
        ticket.save(update_fields=["status", "closed_at", "updated_at"])

        try:
            from .agent_orchestrator import _log_activity
            _log_activity(
                ticket=ticket,
                actor=request.user.username,
                action="RESOLUTION_CONFIRMED",
                description=f"Ticket #{ticket.ticket_number} closed: customer confirmed resolution.",
            )
        except Exception:
            pass

        return Response({
            "status": "CLOSED",
            "detail": "Resolution confirmed and ticket successfully closed.",
            "ticket": TicketSerializer(ticket).data,
        })


class ReopenTicketView(APIView):
    """
    POST /api/tickets/<lookup>/reopen/
    Explicitly reopen a resolved or closed ticket.
    """
    permission_classes = [permissions.IsAuthenticated, IsTicketOwnerOrAgentOrAdmin]

    def post(self, request, pk=None, id=None):
        lookup = pk or id
        ticket = get_ticket_by_id_or_number(lookup)
        if not ticket:
            return Response({"detail": f"Ticket '{lookup}' not found."}, status=status.HTTP_404_NOT_FOUND)
        self.check_object_permissions(request, ticket)

        ticket.status = "REOPENED"
        ticket.save(update_fields=["status", "updated_at"])

        try:
            from .agent_orchestrator import _log_activity
            _log_activity(
                ticket=ticket,
                actor=request.user.username,
                action="TICKET_REOPENED",
                description=f"Ticket #{ticket.ticket_number} explicitly reopened by {request.user.username}.",
            )
        except Exception:
            pass

        return Response({
            "status": "REOPENED",
            "detail": "Ticket has been reopened.",
            "ticket": TicketSerializer(ticket).data,
        })


class NotificationListView(generics.ListAPIView):
    """
    GET /api/notifications/
    List authenticated user's notifications and unread count.
    """
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user).order_by("-created_at")

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        unread_count = queryset.filter(is_read=False).count()
        serializer = self.get_serializer(queryset[:50], many=True)
        return Response({
            "notifications": serializer.data,
            "unread_count": unread_count,
            "total_count": queryset.count(),
        })


class NotificationMarkReadView(APIView):
    """
    POST /api/notifications/<id>/read/
    Mark a notification as read.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk=None):
        notif = Notification.objects.filter(id=pk, user=request.user).first()
        if not notif:
            return Response({"detail": "Notification not found."}, status=status.HTTP_404_NOT_FOUND)
        notif.is_read = True
        notif.read_at = datetime.now(timezone.utc)
        notif.save(update_fields=["is_read", "read_at"])
        return Response({"status": "success", "is_read": True})


class NotificationMarkAllReadView(APIView):
    """
    POST /api/notifications/mark-all-read/
    Mark all user's notifications as read.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        updated = Notification.objects.filter(user=request.user, is_read=False).update(
            is_read=True,
            read_at=datetime.now(timezone.utc)
        )
        return Response({"status": "success", "updated_count": updated})


# =========================================================
# ASSIGN TICKET
# =========================================================

class TicketAssignView(APIView):

    """
    PATCH /api/tickets/<id>/assign/
    """

    permission_classes = [
        IsSupportAgentOrAdmin
    ]

    def patch(
        self,
        request,
        pk=None,
        id=None,
    ):

        lookup = pk or id

        ticket = get_ticket_by_id_or_number(
            lookup
        )

        if not ticket:

            return Response(
                {
                    "detail":
                        f"Ticket '{lookup}' "
                        f"not found."
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = TicketAssignSerializer(
            data=request.data
        )

        serializer.is_valid(
            raise_exception=True
        )

        agent_id = (
            serializer.validated_data.get("agent_id")
            or serializer.validated_data.get("assignedAgentId")
            or request.data.get("agent_id")
            or request.data.get("assignedAgentId")
        )
        agent_name = (
            serializer.validated_data.get("agent_name")
            or serializer.validated_data.get("agentName")
            or request.data.get("agent_name")
            or request.data.get("agentName")
            or request.data.get("selectedAgent")
        )

        agent = None
        if agent_id:
            val_agent = str(agent_id).strip()
            if val_agent.isdigit():
                agent = User.objects.filter(id=int(val_agent)).first()
            if not agent:
                agent = User.objects.filter(username__iexact=val_agent).first() or \
                        User.objects.filter(email__iexact=val_agent).first()

        if not agent and agent_name:
            val_name = str(agent_name).strip()
            clean_name = val_name.split("(")[0].strip()
            agent = User.objects.filter(username__iexact=clean_name).first() or \
                    User.objects.filter(email__iexact=clean_name).first() or \
                    User.objects.filter(first_name__iexact=clean_name).first() or \
                    User.objects.filter(username__icontains=clean_name).first()

        if not agent and not agent_id and not agent_name:
            agent = request.user

        if not agent:
            return Response(
                {
                    "error":
                        f"Assigned agent '{agent_id or agent_name}' not found."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        ticket.assigned_to = agent
        if ticket.status in ["OPEN", "NEW", "Open", "AI_ANALYZING", "AI_RESPONDED", "AI_RESOLUTION_READY", "DRAFT", "REOPENED"]:
            ticket.status = "ASSIGNED"

        ticket.save(
            update_fields=[
                "assigned_to",
                "status",
                "updated_at",
            ]
        )

        # Log assignment activity
        try:
            from .agent_orchestrator import _log_activity
            _log_activity(
                ticket=ticket,
                actor=request.user.username,
                action="TICKET_ASSIGNED",
                description=f"Ticket #{ticket.ticket_number} assigned to {agent.get_full_name() or agent.username} by {request.user.username}.",
            )
        except Exception:
            pass

        # Send notification to assigned agent
        try:
            import uuid
            Notification.objects.create(
                notification_id=f"NOTIF-{uuid.uuid4().hex[:8].upper()}",
                user=agent,
                ticket=ticket,
                title=f"Ticket Assigned: #{ticket.ticket_number}",
                message=f"You have been assigned to handle ticket '{ticket.title}'.",
                notification_type="assignment",
            )
        except Exception:
            pass

        return Response(
            TicketSerializer(ticket).data,
            status=status.HTTP_200_OK,
        )


def auto_assign_single_ticket(ticket, update_status_if_open=True):
    """
    Automatically assigns a ticket to the most appropriate agent based on category and priority.
    Balances workload among matching specialists:
    - Network -> Network Support Specialist (premalatha)
    - Technical / Product / Software -> Technical Specialist (yogitha)
    - Billing / Account / Security / General -> Support Desk Specialist (agent)
    """
    import uuid
    from django.contrib.auth import get_user_model
    User = get_user_model()

    cat = (ticket.category or "").strip().lower()
    prio = (ticket.priority or "").strip().upper()

    # Find staff users who are agents
    staff_users = list(User.objects.filter(is_staff=True).exclude(username__in=["workflow_manager", "scen_mgr"]))
    if not staff_users:
        return None

    # Determine domain keyword
    if any(k in cat for k in ["network", "wifi", "vpn", "internet", "connectivity"]):
        candidates = [u for u in staff_users if "premalatha" in u.username.lower() or "network" in u.username.lower()]
    elif any(k in cat for k in ["tech", "software", "product", "bug", "database", "app", "crash"]):
        candidates = [u for u in staff_users if "yogitha" in u.username.lower() or "tech" in u.username.lower()]
    elif any(k in cat for k in ["security", "hack", "auth", "breach"]):
        candidates = [u for u in staff_users if "agent" in u.username.lower() or "admin" in u.username.lower()]
    else:
        candidates = [u for u in staff_users if "agent" in u.username.lower() and "workflow" not in u.username.lower() and "scen" not in u.username.lower()]

    if not candidates:
        candidates = [u for u in staff_users if "agent" in u.username.lower()] or staff_users

    # Workload balance: pick candidate with lowest active ticket count
    def active_ticket_count(u):
        return Ticket.objects.filter(assigned_to=u).exclude(status__in=["RESOLVED", "Resolved", "CLOSED", "Closed"]).count()

    best_agent = min(candidates, key=active_ticket_count)

    ticket.assigned_to = best_agent
    if update_status_if_open and ticket.status in ["OPEN", "NEW", "DRAFT"]:
        ticket.status = "ASSIGNED"

    ticket.save(update_fields=["assigned_to", "status", "updated_at"])

    # Create ActivityLog
    try:
        from .agent_orchestrator import _log_activity
        _log_activity(
            ticket=ticket,
            actor="AI Auto-Router",
            action="AUTO_ASSIGNED",
            description=f"Auto-assigned to {best_agent.get_full_name() or best_agent.username} based on Category '{ticket.category}' and Priority '{ticket.priority}'.",
        )
    except Exception:
        pass

    # Create Notification
    try:
        Notification.objects.create(
            notification_id=f"NOTIF-{uuid.uuid4().hex[:8].upper()}",
            user=best_agent,
            ticket=ticket,
            title=f"Auto-Assigned: #{ticket.ticket_number}",
            message=f"Ticket '{ticket.title}' ({ticket.priority} - {ticket.category}) auto-assigned to you.",
            notification_type="assignment",
        )
    except Exception:
        pass

    return best_agent


class TicketAutoAssignView(APIView):
    """
    POST /api/tickets/auto-assign/
    POST /api/tickets/<lookup>/auto-assign/
    Automatically assigns unassigned tickets or a specific ticket based on category & priority.
    """
    permission_classes = [IsSupportAgentOrAdmin]

    def post(self, request, pk=None, id=None):
        lookup = pk or id or request.data.get("ticket_id") or request.data.get("id")

        if lookup:
            ticket = get_ticket_by_id_or_number(lookup)
            if not ticket:
                return Response({"detail": f"Ticket '{lookup}' not found."}, status=status.HTTP_404_NOT_FOUND)
            agent = auto_assign_single_ticket(ticket, update_status_if_open=True)
            return Response({
                "message": f"Ticket #{ticket.ticket_number} auto-assigned to {agent.get_full_name() or agent.username} based on category '{ticket.category}' and priority '{ticket.priority}'.",
                "ticket": TicketSerializer(ticket).data
            })

        # Batch auto-assign unassigned tickets
        unassigned_tickets = Ticket.objects.filter(assigned_to__isnull=True).exclude(
            status__in=["RESOLVED", "Resolved", "CLOSED", "Closed"]
        )
        assigned_list = []
        for t in unassigned_tickets:
            ag = auto_assign_single_ticket(t, update_status_if_open=True)
            if ag:
                assigned_list.append(t)

        return Response({
            "message": f"Successfully auto-assigned {len(assigned_list)} tickets based on category and priority.",
            "assigned_count": len(assigned_list),
            "tickets": TicketSerializer(assigned_list, many=True).data,
        })



class AgentListView(APIView):
    """
    GET /api/agent/list/ or /api/agents/
    List active support agents and staff for ticket assignment.
    """
    permission_classes = [
        permissions.IsAuthenticated,
        IsSupportAgentOrAdmin,
    ]

    def get(self, request):
        from apps.staff.models import Profile
        from django.db.models import Q

        profile_user_ids = set(Profile.objects.filter(role__in=["Agent", "Manager", "Admin"]).values_list("user_id", flat=True))
        staff_users = User.objects.filter(
            Q(id__in=profile_user_ids) | Q(is_staff=True) | Q(is_superuser=True)
        ).distinct()

        data = []
        for u in staff_users:
            role = "Agent"
            if hasattr(u, "profile") and u.profile.role:
                role = u.profile.role
            elif u.is_superuser:
                role = "Admin"
            elif u.is_staff:
                role = "Agent"

            active_tickets = Ticket.objects.filter(assigned_to=u).exclude(
                status__in=["RESOLVED", "Resolved", "CLOSED", "Closed"]
            ).count()

            data.append({
                "id": u.id,
                "username": u.username,
                "name": u.get_full_name() or u.username,
                "email": u.email,
                "role": role,
                "department": getattr(getattr(u, "profile", None), "department", "IT Support"),
                "active_tickets": active_tickets,
            })
        return Response(data, status=status.HTTP_200_OK)



# =========================================================
# CLASSIFICATION API
# =========================================================

class TicketClassificationView(APIView):

    """
    POST /api/tickets/classify/

    Performs:
    M1 - preprocessing
    M1 - classification
    M1 - SLA
    M2 - RAG knowledge retrieval
    """

    permission_classes = [
        permissions.AllowAny
    ]

    def post(self, request):

        subject = request.data.get(
            "subject",
            ""
        )

        description = request.data.get(
            "description",
            ""
        )

        scope = request.data.get(
            "scope",
            "Just me"
        )

        work_blocked = bool(
            request.data.get(
                "work_blocked",
                False
            )
        )

        # -------------------------------------------------
        # VALIDATION
        # -------------------------------------------------

        if not subject and not description:

            return Response(
                {
                    "error":
                        "Subject or description "
                        "is required."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # -------------------------------------------------
        # M1 - PREPROCESSING
        # -------------------------------------------------

        preprocessed = preprocess_ticket(
            subject,
            description,
        )

        cleaned_sub = preprocessed.get(
            "subject",
            subject,
        )

        cleaned_desc = preprocessed.get(
            "description",
            description,
        )

        # -------------------------------------------------
        # M1 - CLASSIFICATION
        # -------------------------------------------------

        (
            category,
            sub_category,
            severity,
            priority,
        ) = classify_ticket(
            cleaned_sub,
            cleaned_desc,
            scope=scope,
            work_blocked=work_blocked,
        )

        # -------------------------------------------------
        # M1 - SLA
        # -------------------------------------------------

        sla_info = get_sla_metrics(
            priority
        )

        # -------------------------------------------------
        # M2 - RAG
        # -------------------------------------------------

        try:

            rag_result = (
                retrieve_knowledge_and_generate_resolution(
                    category=category,
                    sub_category=sub_category,
                    subject=cleaned_sub,
                    description=cleaned_desc,
                )
            )

        except Exception as e:

            print(
                f"[Classification RAG Notice] {e}"
            )

            rag_result = {
                "knowledge_source":
                    "Enterprise Knowledge Store",

                "suggested_steps": [],

                "citations": [],
            }

        # -------------------------------------------------
        # RESPONSE
        # -------------------------------------------------

        return Response(
            {
                "success": True,

                "category":
                    category,

                "sub_category":
                    sub_category,

                "severity":
                    severity,

                "priority":
                    priority,

                "status":
                    "Classified",

                "confidence":
                    0.95,

                "sla_hours":
                    sla_info[
                        "resolution_hours"
                    ],

                "response_minutes":
                    sla_info[
                        "response_minutes"
                    ],

                "coverage":
                    sla_info[
                        "coverage"
                    ],

                "team":
                    (
                        f"{category} Support"
                        if category != "General"
                        else "Service Desk"
                    ),

                "knowledge_source":
                    rag_result.get(
                        "knowledge_source",
                        "Enterprise Knowledge Store",
                    ),

                "suggested_resolution":
                    rag_result.get(
                        "suggested_steps",
                        [],
                    ),

                "citations":
                    rag_result.get(
                        "citations",
                        [],
                    ),

                "classification_path":
                    "AI Engine (M1 + M2 Hybrid RAG)",

                "reason":
                    (
                        f"Classified as "
                        f"{category} → "
                        f"{sub_category} "
                        f"({priority}) based on "
                        f"issue description."
                    ),
            }
        )
    
    
    
    