from datetime import datetime, timezone, timedelta

from django.db import models
from django.db.models import Q
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

    p_code = priority_code.upper() if priority_code else ""

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
        # Try exact TKT-<clean_num>
        ticket = Ticket.objects.filter(
            ticket_number__iexact=f"TKT-{clean_num}"
        ).first()
        if ticket:
            return ticket

        # Try database ID = clean_num
        ticket = Ticket.objects.filter(
            id=int(clean_num)
        ).first()
        if ticket:
            return ticket

        # If clean_num > 1000: try ID = clean_num - 1000 (e.g. TKT-1008 -> ID 8)
        if int(clean_num) > 1000:
            ticket = Ticket.objects.filter(
                id=int(clean_num) - 1000
            ).first()
            if ticket:
                return ticket

        # If clean_num <= 1000: try ticket_number = TKT-(1000 + clean_num) (e.g. ID 8 -> TKT-1008)
        ticket = Ticket.objects.filter(
            ticket_number__iexact=f"TKT-{1000 + int(clean_num)}"
        ).first()
        if ticket:
            return ticket

        # Fallback suffix match
        ticket = Ticket.objects.filter(
            ticket_number__iendswith=f"-{clean_num}"
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

        # 3. Determine Department & Save Ticket with initial status 'OPEN'
        from .department_assignment import get_department_for_category, auto_assign_ticket_to_department_agent
        department = get_department_for_category(category)

        ticket = serializer.save(
            created_by=self.request.user,
            title=cleaned_title,
            description=cleaned_description,
            category=category,
            sub_category=sub_category,
            department=department,
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
                message=f"Your ticket '{ticket.title}' has been routed to {department} and queued for AI analysis.",
                notification_type="ticket_created",
            )
        except Exception:
            pass

        # 5. Automatic Ticket Assignment to Available Department Agent
        try:
            auto_assign_ticket_to_department_agent(ticket, update_status_if_open=True)
        except Exception as assign_err:
            print(f"[Auto-Assign Notice] {assign_err}")

        # 6. Run Milestone 2 & Milestone 3 End-to-End Multi-Agent AI Workflow
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
        user = self.request.user
        q = models.Q(created_by=user)
        if getattr(user, "email", None):
            q |= models.Q(created_by__email__iexact=user.email.strip())
        if getattr(user, "username", None):
            q |= models.Q(created_by__username__iexact=user.username.strip())

        return (
            Ticket.objects.select_related("created_by", "assigned_to")
            .filter(q)
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
        elif ticket.status in ["RESOLVED", "Resolved", "AI_RESPONDED", "CLOSED", "Closed"] and (
            request.user == ticket.created_by
            or (ticket.created_by and request.user.email and request.user.email.lower() == ticket.created_by.email.lower())
            or (ticket.created_by and request.user.username and request.user.username.lower() == ticket.created_by.username.lower())
            or not is_agent_reply
        ):
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
            # Customer reply on active ticket -> Update timestamp & notify assigned agent / support staff
            try:
                ticket.updated_at = datetime.now(timezone.utc)
                ticket.save(update_fields=["updated_at"])
            except Exception:
                pass

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

            # Notify assigned agent or support staff of customer reply
            try:
                import uuid
                recipients = []
                if ticket.assigned_to:
                    recipients.append(ticket.assigned_to)
                if not recipients:
                    recipients.extend(list(User.objects.filter(is_staff=True)[:5]))
                sender_name = request.user.get_full_name() or request.user.username
                for agent_user in set(recipients):
                    Notification.objects.create(
                        notification_id=f"NOTIF-{uuid.uuid4().hex[:8].upper()}",
                        user=agent_user,
                        ticket=ticket,
                        title=f"Customer Reply on #{ticket.ticket_number}",
                        message=f"{sender_name}: '{reply.message[:100]}'",
                        notification_type="customer_reply"
                    )
            except Exception as notif_err:
                print(f"[TicketReply] Notification error: {notif_err}")

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
        notif.save(update_fields=["is_read"])
        return Response({"status": "success", "is_read": True})


class NotificationMarkAllReadView(APIView):
    """
    POST /api/notifications/mark-all-read/
    Mark all user's notifications as read.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        updated = Notification.objects.filter(user=request.user, is_read=False).update(
            is_read=True
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

        # Enforce Department Boundary: Agent must belong to the Ticket's Department
        from .department_assignment import get_department_for_category
        ticket_dept = ticket.department or get_department_for_category(ticket.category)
        agent_dept = getattr(getattr(agent, "profile", None), "department", None)

        if agent_dept and ticket_dept and agent_dept.lower() != ticket_dept.lower():
            return Response(
                {
                    "detail": f"Department Mismatch: Agent '{agent.get_full_name() or agent.username}' belongs to '{agent_dept}', but ticket #{ticket.ticket_number} belongs to '{ticket_dept}'. Tickets can only be assigned to agents in the same department."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        old_agent = ticket.assigned_to
        old_agent_name = (old_agent.get_full_name() or old_agent.username) if old_agent else "Unassigned"
        new_agent_name = agent.get_full_name() or agent.username
        is_reassignment = old_agent is not None and old_agent.id != agent.id

        ticket.assigned_to = agent
        ticket.department = ticket_dept
        if ticket.status in ["OPEN", "NEW", "Open", "AI_ANALYZING", "AI_RESPONDED", "AI_RESOLUTION_READY", "DRAFT", "REOPENED"]:
            ticket.status = "ASSIGNED"

        ticket.save(
            update_fields=[
                "assigned_to",
                "department",
                "status",
                "updated_at",
            ]
        )

        # Log assignment / reassignment activity
        action_name = "TICKET_REASSIGNED" if is_reassignment else "TICKET_ASSIGNED"
        desc = (
            f"Ticket #{ticket.ticket_number} reassigned from {old_agent_name} to {new_agent_name} ({ticket_dept}) by {request.user.username}."
            if is_reassignment else
            f"Ticket #{ticket.ticket_number} assigned to {new_agent_name} ({ticket_dept}) by {request.user.username}."
        )
        try:
            from .agent_orchestrator import _log_activity
            _log_activity(
                ticket=ticket,
                actor=request.user.username,
                action=action_name,
                description=desc,
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
                title=f"Ticket Reassigned: #{ticket.ticket_number}" if is_reassignment else f"Ticket Assigned: #{ticket.ticket_number}",
                message=f"You have been assigned to handle ticket '{ticket.title}' ({ticket_dept}).",
                notification_type="assignment",
            )
            # Notify previous agent if reassigned
            if is_reassignment and old_agent:
                Notification.objects.create(
                    notification_id=f"NOTIF-{uuid.uuid4().hex[:8].upper()}",
                    user=old_agent,
                    ticket=ticket,
                    title=f"Ticket Reassigned: #{ticket.ticket_number}",
                    message=f"Ticket #{ticket.ticket_number} was reassigned to {new_agent_name} by manager {request.user.username}.",
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
    Automatically assigns ticket based on Category -> Department -> Available Agent (Workload/Round-Robin).
    """
    from .department_assignment import auto_assign_ticket_to_department_agent
    return auto_assign_ticket_to_department_agent(ticket, update_status_if_open=update_status_if_open)



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
    Supports ?department=... and ?available_only=true filters.
    """
    permission_classes = [
        permissions.IsAuthenticated,
        IsSupportAgentOrAdmin,
    ]

    def get(self, request):
        from apps.staff.models import Profile
        from django.db.models import Q

        department_filter = request.query_params.get("department")
        available_only = request.query_params.get("available_only") in ["true", "1", "True"]

        profile_qs = Profile.objects.filter(role__in=["Agent", "Manager", "Admin", "Support Agent"])
        if department_filter and department_filter != "ALL":
            profile_qs = profile_qs.filter(department__iexact=department_filter.strip())
        if available_only:
            profile_qs = profile_qs.filter(availability_status="AVAILABLE")

        profile_map = {p.user_id: p for p in profile_qs}
        staff_users = User.objects.filter(
            Q(id__in=list(profile_map.keys())) | Q(is_staff=True) | Q(is_superuser=True)
        ).distinct()

        data = []
        for u in staff_users:
            profile = profile_map.get(u.id) or getattr(u, "profile", None)
            dept = profile.department if profile else "IT Department"
            if department_filter and department_filter != "ALL" and dept.lower() != department_filter.strip().lower():
                continue

            avail = profile.availability_status if profile else "AVAILABLE"
            if available_only and avail != "AVAILABLE":
                continue

            role = profile.role if profile and profile.role else ("Admin" if u.is_superuser else "Agent")
            title = profile.title if profile and profile.title else "Support Specialist"

            active_tickets = Ticket.objects.filter(assigned_to=u).exclude(
                status__in=["RESOLVED", "Resolved", "CLOSED", "Closed"]
            ).count()

            data.append({
                "id": u.id,
                "username": u.username,
                "name": u.get_full_name() or u.username,
                "email": u.email,
                "role": role,
                "department": dept,
                "availability_status": avail,
                "title": title,
                "active_tickets": active_tickets,
            })
        return Response(data, status=status.HTTP_200_OK)


class AgentAvailabilityUpdateView(APIView):
    """
    PATCH /api/agent/availability/
    PATCH /api/agent/<id>/availability/
    Updates an agent's availability status (AVAILABLE, BUSY, UNAVAILABLE, INACTIVE).
    """
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, pk=None, id=None):
        from apps.staff.models import Profile

        target_id = pk or id or request.data.get("agent_id") or request.data.get("id")
        target_user = request.user
        if target_id and (request.user.is_staff or getattr(getattr(request.user, "profile", None), "role", "") in ["Manager", "Admin"]):
            val_id = str(target_id).strip()
            if val_id.isdigit():
                found_user = User.objects.filter(id=int(val_id)).first()
            else:
                found_user = User.objects.filter(username__iexact=val_id).first() or User.objects.filter(email__iexact=val_id).first()
            if found_user:
                target_user = found_user

        new_status = request.data.get("availability_status") or request.data.get("status")
        if not new_status:
            return Response({"detail": "Missing 'availability_status'."}, status=status.HTTP_400_BAD_REQUEST)

        valid_choices = ["AVAILABLE", "BUSY", "UNAVAILABLE", "INACTIVE"]
        clean_status = str(new_status).strip().upper()
        if clean_status not in valid_choices:
            return Response({"detail": f"Invalid status. Must be one of: {', '.join(valid_choices)}"}, status=status.HTTP_400_BAD_REQUEST)

        profile, _ = Profile.objects.get_or_create(user=target_user)
        profile.availability_status = clean_status
        profile.save(update_fields=["availability_status"])

        return Response({
            "message": f"Availability for {target_user.username} updated to '{clean_status}'.",
            "agent_id": target_user.id,
            "username": target_user.username,
            "availability_status": clean_status,
            "department": profile.department,
        }, status=status.HTTP_200_OK)




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
    
    
    
    