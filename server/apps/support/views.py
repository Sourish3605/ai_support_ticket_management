from datetime import datetime, timezone, timedelta

from django.contrib.auth import get_user_model
from rest_framework import generics, permissions, serializers, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.exceptions import NotFound

from .models import Ticket, TicketReply
from .serializers import (
    TicketSerializer,
    TicketReplySerializer,
    TicketStatusUpdateSerializer,
    TicketReplyCreateSerializer,
    TicketAssignSerializer,
)
from .permissions import (
    IsSupportAgentOrAdmin,
    IsTicketOwnerOrAgentOrAdmin,
    is_user_agent_or_admin,
)
from .classification import classify_ticket
from .preprocessing import preprocess_ticket
from .knowledge_service import retrieve_knowledge_and_generate_resolution
from .workflow_service import run_m3_workflow


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
    - Ticket number such as TKT-1001
    """

    val_str = str(lookup_val).strip()

    # Try database ID
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

    # Try TKT-1001 / TKT1001
    clean_num = (
        val_str.upper()
        .replace("TKT-", "")
        .replace("TKT", "")
    )

    if clean_num.isdigit():

        ticket = Ticket.objects.filter(
            ticket_number__icontains=clean_num
        ).first()

        if ticket:
            return ticket

        # Optional fallback:
        # TKT-1001 -> ID 1
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
    # CREATE TICKET
    # -----------------------------------------------------

    def perform_create(self, serializer):

        req_data = (
            self.request.data
            if isinstance(self.request.data, dict)
            else {}
        )

        # -------------------------------------------------
        # 1. GET RAW TICKET DATA
        # -------------------------------------------------

        raw_title = str(
            req_data.get("subject", "")
            or req_data.get("title", "")
            or "Support Ticket"
        )

        raw_description = str(
            req_data.get("description", "")
        )

        user_attachment = req_data.get(
            "attachment",
            ""
        )

        # -------------------------------------------------
        # 2. MILESTONE 1
        # TEXT PREPROCESSING + PII MASKING
        # -------------------------------------------------

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

        # -------------------------------------------------
        # 3. MILESTONE 1
        # AUTOMATED CLASSIFICATION
        # -------------------------------------------------

        category, sub_category, severity, priority = (
            classify_ticket(
                cleaned_title,
                cleaned_description,
            )
        )

        # -------------------------------------------------
        # 4. MILESTONE 1
        # SLA CALCULATION
        # -------------------------------------------------

        sla_info = get_sla_metrics(priority)

        now_dt = datetime.now(timezone.utc)

        sla_due_dt = (
            now_dt
            + timedelta(
                hours=sla_info["resolution_hours"]
            )
        )

        # -------------------------------------------------
        # 5. SAVE TICKET IN SQL DATABASE
        # -------------------------------------------------

        ticket = serializer.save(
            created_by=self.request.user,

            title=cleaned_title,

            description=cleaned_description,

            category=category,

            sub_category=sub_category,

            severity=severity,

            priority=priority,

            status="NEW",

            attachment=(
                user_attachment
                or None
            ),
        )

        print(
            f"[Ticket Created] "
            f"Ticket ID: {ticket.id}"
        )

        # -------------------------------------------------
        # 6. MILESTONE 2
        # RAG KNOWLEDGE RETRIEVAL
        # -------------------------------------------------

        try:

            rag_result = (
                retrieve_knowledge_and_generate_resolution(
                    category=category,
                    sub_category=sub_category,
                    subject=cleaned_title,
                    description=cleaned_description,
                    ticket_id=ticket.id,
                )
            )

        except Exception as e:

            print(
                f"[RAG Notice] {e}"
            )

            rag_result = {
                "knowledge_source":
                    "Enterprise Knowledge Store",

                "suggested_steps": [],

                "citations": [],
            }

        # -------------------------------------------------
        # 7. SAVE M1 + M2 DATA TO MONGODB
        # -------------------------------------------------

        try:

            # A. Tickets collection
            if tickets_collection:

                tickets_collection.insert_one(
                    {
                        "ticket_id": ticket.id,

                        "ticket_number":
                            getattr(
                                ticket,
                                "ticket_number",
                                None,
                            ),

                        "title":
                            ticket.title,

                        "description":
                            ticket.description,

                        "category":
                            ticket.category,

                        "sub_category":
                            ticket.sub_category,

                        "severity":
                            ticket.severity,

                        "priority":
                            ticket.priority,

                        "status":
                            ticket.status,

                        "sla": {
                            "response_minutes":
                                sla_info[
                                    "response_minutes"
                                ],

                            "resolution_hours":
                                sla_info[
                                    "resolution_hours"
                                ],

                            "coverage":
                                sla_info[
                                    "coverage"
                                ],

                            "due_date":
                                sla_due_dt.isoformat(),
                        },

                        "grounded_resolution":
                            rag_result.get(
                                "suggested_steps",
                                [],
                            ),

                        "citations":
                            rag_result.get(
                                "citations",
                                [],
                            ),

                        "created_by":
                            getattr(
                                ticket.created_by,
                                "username",
                                "Unknown",
                            ),

                        "created_at":
                            str(
                                ticket.created_at
                            ),
                    }
                )

            # B. Classification collection
            if classifications_collection:

                classifications_collection.insert_one(
                    {
                        "ticket_id":
                            ticket.id,

                        "category":
                            category,

                        "sub_category":
                            sub_category,

                        "severity":
                            severity,

                        "priority":
                            priority,

                        "confidence":
                            0.95,

                        "model_path":
                            "Rule+TFIDF",

                        "created_at":
                            now_dt.isoformat(),
                    }
                )

            # C. SLA collection
            if sla_calculations_collection:

                sla_calculations_collection.insert_one(
                    {
                        "ticket_id":
                            ticket.id,

                        "priority":
                            priority,

                        "response_minutes":
                            sla_info[
                                "response_minutes"
                            ],

                        "resolution_hours":
                            sla_info[
                                "resolution_hours"
                            ],

                        "coverage":
                            sla_info[
                                "coverage"
                            ],

                        "due_date":
                            sla_due_dt.isoformat(),

                        "calculated_at":
                            now_dt.isoformat(),
                    }
                )

        except Exception as e:

            print(
                f"[MongoDB Notice] {e}"
            )

        # -------------------------------------------------
        # 8. MILESTONE 3
        # MULTI-AGENT WORKFLOW
        # -------------------------------------------------

        try:

            workflow = run_m3_workflow(
                ticket
            )

            print(
                f"[M3] Workflow completed "
                f"for Ticket {ticket.id}"
            )

        except Exception as e:

            print(
                f"[M3 Workflow Error] {e}"
            )

            # Do not prevent ticket creation
            # if M3 workflow fails.


# =========================================================
# CUSTOMER TICKET LIST
# =========================================================

class CustomerTicketListView(generics.ListAPIView):

    """
    GET /api/tickets/my/

    Customer sees only their own tickets.
    """

    serializer_class = TicketSerializer
    permission_classes = [
        permissions.IsAuthenticated
    ]

    def get_queryset(self):

        return Ticket.objects.filter(
            created_by=self.request.user
        ).order_by("-created_at")


# =========================================================
# AGENT TICKET LIST
# =========================================================

class AgentTicketListView(generics.ListAPIView):

    """
    GET /api/agent/tickets/

    Agent/Admin can see all tickets.
    """

    serializer_class = TicketSerializer

    permission_classes = [
        IsSupportAgentOrAdmin
    ]

    def get_queryset(self):

        queryset = Ticket.objects.all().order_by(
            "-created_at"
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

            message=serializer.validated_data[
                "message"
            ],

            attachment=(
                serializer.validated_data.get(
                    "attachment"
                )
            ),

            is_internal=(
                serializer.validated_data.get(
                    "is_internal",
                    False,
                )
            ),
        )

        return Response(
            TicketReplySerializer(reply).data,
            status=status.HTTP_201_CREATED,
        )


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
            serializer.validated_data.get(
                "agent_id"
            )
            or
            serializer.validated_data.get(
                "assignedAgentId"
            )
        )

        if agent_id:

            agent = User.objects.filter(
                id=agent_id
            ).first()

            if not agent:

                return Response(
                    {
                        "error":
                            "Assigned agent "
                            "not found."
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            ticket.assigned_to = agent

        else:

            ticket.assigned_to = request.user

        ticket.save(
            update_fields=[
                "assigned_to",
                "updated_at",
            ]
        )

        return Response(
            TicketSerializer(ticket).data,
            status=status.HTTP_200_OK,
        )


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
    
    
    
    