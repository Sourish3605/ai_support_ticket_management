from datetime import datetime, timezone, timedelta
from django.shortcuts import get_object_or_404
from django.contrib.auth import get_user_model
=======

from rest_framework import generics, permissions, serializers, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied, NotFound


from .models import Ticket, TicketReply
from .serializers import (
    TicketSerializer,
    TicketReplySerializer,
    TicketStatusUpdateSerializer,
    TicketReplyCreateSerializer,
    TicketAssignSerializer,
)
from .permissions import IsSupportAgentOrAdmin, IsTicketOwnerOrAgentOrAdmin, is_user_agent_or_admin
from .classification import classify_ticket
from .preprocessing import preprocess_ticket
from .knowledge_service import retrieve_knowledge_and_generate_resolution
from .models import Ticket
from .serializers import TicketSerializer
from .classification import classify_ticket
from .preprocessing import preprocess_ticket
from .knowledge_service import retrieve_knowledge_and_generate_resolution
from .workflow_service import run_m3_workflow


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


def get_sla_metrics(priority_code: str):
    """Calculate SLA response minutes, resolution hours, and coverage."""

    p_code = str(priority_code).upper()
    if p_code in ["CRITICAL", "HIGH", "P1"]:
        return {"response_minutes": 15, "resolution_hours": 4, "coverage": "24/7"}
    elif p_code in ["P2"]:
        return {"response_minutes": 30, "resolution_hours": 8, "coverage": "24/7"}
    elif p_code in ["MEDIUM", "P3"]:
        return {"response_minutes": 60, "resolution_hours": 24, "coverage": "Business Hours"}
    elif p_code in ["LOW", "P4"]:
        return {"response_minutes": 120, "resolution_hours": 48, "coverage": "Business Hours"}
    return {"response_minutes": 60, "resolution_hours": 24, "coverage": "Business Hours"}


def get_ticket_by_id_or_number(lookup_val):
    """Safely find ticket by integer ID or string ticketNumber (e.g. TKT-1001)."""
    val_str = str(lookup_val).strip()
    if val_str.isdigit():
        ticket = Ticket.objects.filter(id=int(val_str)).first()
        if ticket:
            return ticket
    # Try exact ticket_number match
    ticket = Ticket.objects.filter(ticket_number__iexact=val_str).first()
    if ticket:
        return ticket
    # Try parsing number from TKT-1001 or TKT1001
    clean_num = val_str.upper().replace("TKT-", "").replace("TKT", "")
    if clean_num.isdigit():
        ticket = Ticket.objects.filter(ticket_number__icontains=clean_num).first()
        if ticket:
            return ticket
        # Also try ID offset (1001 -> id 1)
        ticket = Ticket.objects.filter(id=int(clean_num) - 1000).first()
        if ticket:
            return ticket
    return None

    sla_defaults = {
        "P1": {
            "response_minutes": 15,
            "resolution_hours": 4,
            "coverage": "24/7",
        },
        "P2": {
            "response_minutes": 30,
            "resolution_hours": 8,
            "coverage": "24/7",
        },
        "P3": {
            "response_minutes": 60,
            "resolution_hours": 24,
            "coverage": "Business Hours",
        },
        "P4": {
            "response_minutes": 120,
            "resolution_hours": 48,
            "coverage": "Business Hours",
        },
    }

    return sla_defaults.get(
        priority_code,
        {
            "response_minutes": 60,
            "resolution_hours": 24,
            "coverage": "Business Hours",
        },
    )


class TicketListCreateView(generics.ListCreateAPIView):
    """
    POST /api/tickets - Customer creates a ticket
    GET  /api/tickets - List tickets (filtered for customer, all for agent/admin)
    """
    serializer_class = TicketSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user

        if is_user_agent_or_admin(user):
            queryset = Ticket.objects.all().order_by("-created_at")
=======

        # Admin and Agent can see all tickets
        is_admin_or_agent = (
            getattr(user, "is_superuser", False)
            or getattr(user, "is_staff", False)
            or (
                hasattr(user, "profile")
                and getattr(user.profile, "role", "")
                in ["Admin", "Agent"]
            )
        )

        if is_admin_or_agent:
            queryset = Ticket.objects.all()
        else:
            queryset = Ticket.objects.filter(created_by=user).order_by("-created_at")

        status_filter = self.request.query_params.get("status")
        priority = self.request.query_params.get("priority")
        category = self.request.query_params.get("category")

        if status_filter and status_filter != "All statuses":
            queryset = queryset.filter(status=status_filter)
        if priority and priority != "All priorities":
            queryset = queryset.filter(priority=priority)
        if category and category != "All categories":
            queryset = queryset.filter(category=category)

        return queryset

    def perform_create(self, serializer):
        req_data = self.request.data if isinstance(self.request.data, dict) else {}
        raw_title = str(req_data.get("subject", "") or req_data.get("title", "Support Ticket"))
        raw_description = str(req_data.get("description", ""))
        user_category = req_data.get("category")
        user_priority = req_data.get("priority")
        user_severity = req_data.get("severity")
        user_attachment = req_data.get("attachment", "")

        # 1. Text Preprocessing & PII Masking
        preprocessed = preprocess_ticket(raw_title, raw_description)
        cleaned_title = preprocessed.get("subject", raw_title)
        cleaned_description = preprocessed.get("description", raw_description)

        # 2. Automated Classification (if not explicitly provided)
        category, sub_category, severity, priority = classify_ticket(
            cleaned_title,
            cleaned_description
        )

        final_category = user_category or category or "General"
        final_priority = user_priority or priority or "Medium"
        final_severity = user_severity or severity or "Medium"

        # 3. Save ticket

        req_data = (
            self.request.data
            if isinstance(self.request.data, dict)
            else {}
        )

        raw_title = str(
            req_data.get("title", "")
            or req_data.get("subject", "")
        )

        raw_description = str(
            req_data.get("description", "")
        )

        # --------------------------------------------------
        # 1. MILESTONE 1 - TEXT PREPROCESSING & PII MASKING
        # --------------------------------------------------

        preprocessed = preprocess_ticket(
            raw_title,
            raw_description,
        )

        cleaned_title = preprocessed.get(
            "subject",
            raw_title,
        )

        cleaned_description = preprocessed.get(
            "description",
            raw_description,
        )

        # --------------------------------------------------
        # 2. MILESTONE 1 - AUTOMATED CLASSIFICATION
        # --------------------------------------------------

        category, sub_category, severity, priority = classify_ticket(
            cleaned_title,
            cleaned_description,
        )

        # --------------------------------------------------
        # 3. MILESTONE 1 - SLA CALCULATION
        # --------------------------------------------------

        sla_info = get_sla_metrics(priority)

        now_dt = datetime.now(timezone.utc)

        sla_due_dt = (
            now_dt
            + timedelta(
                hours=sla_info["resolution_hours"]
            )
        )

        # --------------------------------------------------
        # 4. SAVE TICKET IN SQL DATABASE
        # --------------------------------------------------


        ticket = serializer.save(
            created_by=self.request.user,
            title=cleaned_title,
            description=cleaned_description,
            category=final_category,
            sub_category=sub_category,
            severity=final_severity,
            priority=final_priority,
            status="NEW",
            attachment=user_attachment or None,
        )

        # 4. Safe sync to MongoDB if active
        try:
            if tickets_collection:
                sla_info = get_sla_metrics(final_priority)
                now_dt = datetime.now(timezone.utc)
                sla_due_dt = now_dt + timedelta(hours=sla_info["resolution_hours"])
                tickets_collection.insert_one({
                    "ticket_id": ticket.id,
                    "ticket_number": ticket.ticket_number,
                    "title": ticket.title,
                    "description": ticket.description,
                    "category": ticket.category,
                    "sub_category": ticket.sub_category,
                    "severity": ticket.severity,
                    "priority": ticket.priority,
                    "status": ticket.status,
                    "sla": {
                        "response_minutes": sla_info["response_minutes"],
                        "resolution_hours": sla_info["resolution_hours"],
                        "coverage": sla_info["coverage"],
                        "due_date": sla_due_dt.isoformat(),
                    },
                    "created_by": getattr(ticket.created_by, "username", "Unknown"),
                    "created_at": str(ticket.created_at)
                })
        except Exception:
            pass

        # 5. Milestone 3 Multi-Agent Orchestrator Execution (Async processing in runtime)
        try:
            import sys
            is_testing = "test" in sys.argv
            if not is_testing:
                import threading
                from .agent_orchestrator import run_multi_agent_workflow
                threading.Thread(
                    target=run_multi_agent_workflow,
                    args=(ticket,),
                    kwargs={"send_creation_email": True},
                    daemon=True
                ).start()
        except Exception as e:
            print(f"[Milestone 3 Workflow Notice] Non-blocking execution notice: {e}")


class CustomerTicketListView(generics.ListAPIView):
    """
    GET /api/tickets/my - Customer views their own tickets
    """

            severity=severity,
            priority=priority,
            status="Classified",
        )

        # --------------------------------------------------
        # 5. MILESTONE 2 - RAG KNOWLEDGE RETRIEVAL
        # --------------------------------------------------

        rag_result = retrieve_knowledge_and_generate_resolution(
            category=category,
            sub_category=sub_category,
            subject=cleaned_title,
            description=cleaned_description,
            ticket_id=ticket.id,
        )

        # --------------------------------------------------
        # 6. SAVE M1 & M2 DATA IN MONGODB
        # --------------------------------------------------

        # A. tickets collection
        tickets_collection.insert_one(
            {
                "ticket_id": ticket.id,
                "title": ticket.title,
                "description": ticket.description,
                "category": ticket.category,
                "sub_category": ticket.sub_category,
                "severity": ticket.severity,
                "priority": ticket.priority,
                "status": ticket.status,
                "sla": {
                    "response_minutes": sla_info[
                        "response_minutes"
                    ],
                    "resolution_hours": sla_info[
                        "resolution_hours"
                    ],
                    "coverage": sla_info[
                        "coverage"
                    ],
                    "due_date": sla_due_dt.isoformat(),
                },
                "grounded_resolution": rag_result.get(
                    "suggested_steps",
                    [],
                ),
                "citations": rag_result.get(
                    "citations",
                    [],
                ),
                "created_by": getattr(
                    ticket.created_by,
                    "username",
                    "Unknown",
                ),
                "created_at": str(
                    ticket.created_at
                ),
            }
        )

        # B. classifications collection
        classifications_collection.insert_one(
            {
                "ticket_id": ticket.id,
                "category": category,
                "sub_category": sub_category,
                "severity": severity,
                "priority": priority,
                "confidence": 0.95,
                "model_path": "Rule+TFIDF",
                "created_at": now_dt.isoformat(),
            }
        )

        # C. sla_calculations collection
        sla_calculations_collection.insert_one(
            {
                "ticket_id": ticket.id,
                "priority": priority,
                "response_minutes": sla_info[
                    "response_minutes"
                ],
                "resolution_hours": sla_info[
                    "resolution_hours"
                ],
                "coverage": sla_info[
                    "coverage"
                ],
                "due_date": sla_due_dt.isoformat(),
                "calculated_at": now_dt.isoformat(),
            }
        )

        # --------------------------------------------------
        # 7. MILESTONE 3 - MULTI-AGENT WORKFLOW
        # --------------------------------------------------

        run_m3_workflow(ticket)


class TicketDetailView(
    generics.RetrieveUpdateDestroyAPIView
):

    serializer_class = TicketSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = Ticket.objects.filter(created_by=user).order_by("-created_at")


        status_filter = self.request.query_params.get("status")
        priority = self.request.query_params.get("priority")
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        if priority:
            queryset = queryset.filter(priority=priority)

        return queryset


class AgentTicketListView(generics.ListAPIView):
    """
    GET /api/agent/tickets - Support Agent & Admin view ticket queue
    Enforces 403 Forbidden for regular Customers.
    """
    serializer_class = TicketSerializer
    permission_classes = [IsSupportAgentOrAdmin]

    def get_queryset(self):
        queryset = Ticket.objects.all().order_by("-created_at")

        status_filter = self.request.query_params.get("status")
        priority = self.request.query_params.get("priority")
        category = self.request.query_params.get("category")
        assigned_to = self.request.query_params.get("assigned_to")

        if status_filter and status_filter != "All statuses":
            queryset = queryset.filter(status=status_filter)
        if priority and priority != "All priorities":
            queryset = queryset.filter(priority=priority)
        if category and category != "All categories":
            queryset = queryset.filter(category=category)
        if assigned_to:
            if assigned_to == "unassigned":
                queryset = queryset.filter(assigned_to__isnull=True)
            elif assigned_to == "me":
                queryset = queryset.filter(assigned_to=self.request.user)
            elif str(assigned_to).isdigit():
                queryset = queryset.filter(assigned_to_id=int(assigned_to))

        return queryset


class TicketDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET /api/tickets/:id - Retrieve ticket details
    Enforces 403 Forbidden if Customer B attempts to view Customer A's ticket.
    Support Agents and Admins have access to all tickets.
    """
    serializer_class = TicketSerializer
    permission_classes = [permissions.IsAuthenticated, IsTicketOwnerOrAgentOrAdmin]

    def get_object(self):
        lookup = self.kwargs.get("pk") or self.kwargs.get("id")
        ticket = get_ticket_by_id_or_number(lookup)
        if not ticket:
            raise NotFound(f"Ticket with ID or number '{lookup}' not found.")

        # Check object permissions -> Raises PermissionDenied (403 Forbidden) if customer is not owner
        self.check_object_permissions(self.request, ticket)
        return ticket
=======
        # Admin and Agent can access all tickets
        is_admin_or_agent = (
            getattr(user, "is_superuser", False)
            or getattr(user, "is_staff", False)
            or (
                hasattr(user, "profile")
                and getattr(user.profile, "role", "")
                in ["Admin", "Agent"]
            )
        )

        if is_admin_or_agent:
            return Ticket.objects.all()

        # Customer can access only their own tickets
        return Ticket.objects.filter(
            created_by=user
        )


    def perform_update(self, serializer):
        ticket = self.get_object()

        req_data = (
            self.request.data
            if isinstance(self.request.data, dict)
            else {}
        )

        new_status = req_data.get("status")

        if new_status and new_status != ticket.status:
            if not ticket.can_transition(new_status):
                raise serializers.ValidationError(
                    {
                        "status": (

                            f"Cannot change status from '{ticket.status}' to '{new_status}'."
=======
                            f"Cannot change status from "
                            f"'{ticket.status}' to "
                            f"'{new_status}'."
                        )
                    }
                )

        serializer.save()


class TicketStatusUpdateView(APIView):
    """
    PATCH /api/tickets/:id/status - Update ticket status
    """
    permission_classes = [permissions.IsAuthenticated, IsTicketOwnerOrAgentOrAdmin]

    def patch(self, request, pk=None, id=None):
        lookup = pk or id
        ticket = get_ticket_by_id_or_number(lookup)
        if not ticket:
            return Response({"detail": f"Ticket '{lookup}' not found."}, status=status.HTTP_404_NOT_FOUND)

        self.check_object_permissions(request, ticket)

        serializer = TicketStatusUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        new_status = serializer.validated_data["status"]

        if not ticket.can_transition(new_status):
            return Response(
                {"error": f"Invalid status transition from {ticket.status} to {new_status}."},
                status=status.HTTP_400_BAD_REQUEST
            )

        ticket.status = new_status
        ticket.save(update_fields=["status", "updated_at"])

        return Response(TicketSerializer(ticket).data, status=status.HTTP_200_OK)


class TicketReplyCreateView(APIView):
    """
    POST /api/tickets/:id/reply - Add a reply to a ticket
    """
    permission_classes = [permissions.IsAuthenticated, IsTicketOwnerOrAgentOrAdmin]

    def post(self, request, pk=None, id=None):
        lookup = pk or id
        ticket = get_ticket_by_id_or_number(lookup)
        if not ticket:
            return Response({"detail": f"Ticket '{lookup}' not found."}, status=status.HTTP_404_NOT_FOUND)

        self.check_object_permissions(request, ticket)

        serializer = TicketReplyCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        reply = TicketReply.objects.create(
            ticket=ticket,
            user=request.user,
            message=serializer.validated_data["message"],
            attachment=serializer.validated_data.get("attachment"),
            is_internal=serializer.validated_data.get("is_internal", False),
        )

        return Response(TicketReplySerializer(reply).data, status=status.HTTP_201_CREATED)


class TicketAssignView(APIView):
    """
    PATCH /api/tickets/:id/assign - Assign ticket to an agent
    """
    permission_classes = [IsSupportAgentOrAdmin]

    def patch(self, request, pk=None, id=None):
        lookup = pk or id
        ticket = get_ticket_by_id_or_number(lookup)
        if not ticket:
            return Response({"detail": f"Ticket '{lookup}' not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = TicketAssignSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        agent_id = serializer.validated_data.get("agent_id") or serializer.validated_data.get("assignedAgentId")
        if agent_id:
            agent = User.objects.filter(id=agent_id).first()
            if not agent:
                return Response({"error": "Assigned agent not found."}, status=status.HTTP_400_BAD_REQUEST)
            ticket.assigned_to = agent
        else:
            ticket.assigned_to = request.user

        ticket.save(update_fields=["assigned_to", "updated_at"])
        return Response(TicketSerializer(ticket).data, status=status.HTTP_200_OK)


class TicketClassificationView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        subject = request.data.get(
            "subject",
            "",
        )

        description = request.data.get(
            "description",
            "",
        )

        scope = request.data.get(
            "scope",
            "Just me",
        )

        work_blocked = bool(
            request.data.get(
                "work_blocked",
                False,
            )
        )

        if not subject and not description:
            return Response(
                {
                    "error": (
                        "Subject or description "
                        "is required."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )


        # 1. Text Preprocessing & PII Masking
        preprocessed = preprocess_ticket(subject, description)
        cleaned_sub = preprocessed.get("subject", subject)
        cleaned_desc = preprocessed.get("description", description)

        # 2. Classification based on Master Data rules

        # --------------------------------------------------
        # 1. MILESTONE 1 - PREPROCESSING & PII MASKING
        # --------------------------------------------------

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

        # --------------------------------------------------
        # 2. MILESTONE 1 - CLASSIFICATION
        # --------------------------------------------------

        category, sub_category, severity, priority = classify_ticket(
            cleaned_sub,
            cleaned_desc,
            scope=scope,
            work_blocked=work_blocked,
        )


        # 3. SLA Calculation
        sla_info = get_sla_metrics(priority)

        # 4. Knowledge Base RAG & Resolution Generation
        # --------------------------------------------------
        # 3. MILESTONE 1 - SLA CALCULATION
        # --------------------------------------------------

        sla_info = get_sla_metrics(priority)

        # --------------------------------------------------
        # 4. MILESTONE 2 - RAG KNOWLEDGE RETRIEVAL
        # --------------------------------------------------

        rag_result = retrieve_knowledge_and_generate_resolution(
            category=category,
            sub_category=sub_category,
            subject=cleaned_sub,
            description=cleaned_desc,
        )


        return Response({
            "success": True,
            "category": category,
            "sub_category": sub_category,
            "severity": severity,
            "priority": priority,
            "status": "NEW",
            "confidence": 0.95,
            "sla_hours": sla_info["resolution_hours"],
            "response_minutes": sla_info["response_minutes"],
            "coverage": sla_info["coverage"],
            "team": f"{category} Support" if category != "General" else "Service Desk",
            "knowledge_source": rag_result.get("knowledge_source", "Enterprise Knowledge Store"),
            "suggested_resolution": rag_result.get("suggested_steps", []),
            "citations": rag_result.get("citations", []),
            "classification_path": "AI Engine (Hybrid RAG)",
            "reason": f"Classified as {category} → {sub_category} ({priority}) based on issue description.",
        })
        return Response(
            {
                "success": True,
                "category": category,
                "sub_category": sub_category,
                "severity": severity,
                "priority": priority,
                "status": "Classified",
                "confidence": 0.95,
                "sla_hours": sla_info[
                    "resolution_hours"
                ],
                "response_minutes": sla_info[
                    "response_minutes"
                ],
                "coverage": sla_info[
                    "coverage"
                ],
                "team": (
                    f"{category} Support"
                    if category != "General"
                    else "Service Desk"
                ),
                "knowledge_source": rag_result.get(
                    "knowledge_source",
                    "Enterprise Knowledge Store",
                ),
                "suggested_resolution": rag_result.get(
                    "suggested_steps",
                    [],
                ),
                "citations": rag_result.get(
                    "citations",
                    [],
                ),
                "classification_path": (
                    "AI Engine (M1 + M2 Hybrid RAG)"
                ),
                "reason": (
                    f"Classified as "
                    f"{category} → "
                    f"{sub_category} "
                    f"({priority}) based on "
                    f"issue description."
                ),
            }
        )
    