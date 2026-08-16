import json
from rest_framework import generics, permissions, serializers
from .models import Ticket
from .serializers import TicketSerializer
from .preprocessing import preprocess_ticket
from .classification import classify_ticket
from .knowledge_service import retrieve_knowledge_and_generate_resolution

try:
    from mongodb import tickets_collection
except Exception:
    tickets_collection = None


from apps.authentication.authentication import SafeJWTAuthentication


class TicketListCreateView(generics.ListCreateAPIView):

    serializer_class = TicketSerializer
    authentication_classes = [SafeJWTAuthentication]
    permission_classes = [permissions.AllowAny]


    def get_queryset(self):
        user = self.request.user
        if not user or not user.is_authenticated:
            email = self.request.query_params.get("email") or self.request.query_params.get("customer_email")
            if email:
                return Ticket.objects.filter(created_by__email=email).order_by("-id")
            return Ticket.objects.all().order_by("-id")

        # Admin and Agent can see all tickets
        if user.is_staff or user.is_superuser or (hasattr(user, "profile") and user.profile.role in ["Admin", "Agent"]):
            queryset = Ticket.objects.all().order_by("-id")
        else:
            # Customer can see only their own tickets
            queryset = Ticket.objects.filter(created_by=user).order_by("-id")

        # Filters
        status = self.request.query_params.get("status")
        priority = self.request.query_params.get("priority")
        category = self.request.query_params.get("category")
        severity = self.request.query_params.get("severity")

        if status:
            queryset = queryset.filter(status=status)
        if priority:
            queryset = queryset.filter(priority=priority)
        if category:
            queryset = queryset.filter(category=category)
        if severity:
            queryset = queryset.filter(severity=severity)

        return queryset

    def perform_create(self, serializer):
        from django.contrib.auth import get_user_model
        UserModel = get_user_model()

        # 1. Resolve Creator / Customer in Database
        user = self.request.user if (self.request.user and self.request.user.is_authenticated) else None
        if not user:
            customer_email = (
                self.request.data.get("customer_email")
                or self.request.data.get("email")
                or "arun@company.com"
            )
            customer_name = (
                self.request.data.get("customer_name")
                or self.request.data.get("name")
                or "Arun Kumar"
            )
            name_parts = customer_name.split() if customer_name else ["Customer", "User"]
            user, _ = UserModel.objects.get_or_create(
                email=customer_email,
                defaults={
                    "username": customer_email,
                    "first_name": name_parts[0],
                    "last_name": name_parts[-1] if len(name_parts) > 1 else "",
                }
            )

        # 2. Preprocessing
        raw_title = self.request.data.get("title") or self.request.data.get("subject", "")
        raw_description = self.request.data.get("description", "")
        scope = self.request.data.get("scope", "Just me")
        work_blocked = bool(self.request.data.get("work_blocked", False))
        cleaned = preprocess_ticket(raw_title, raw_description)

        # 3. Milestone 1 — AI Classification
        ai_result = classify_ticket(
            cleaned["subject"] or raw_title,
            cleaned["description"] or raw_description,
            scope=scope,
            work_blocked=work_blocked,
        )

        category = self.request.data.get("category") or ai_result["category"]
        sub_category = self.request.data.get("sub_category") or ai_result["sub_category"]
        severity = self.request.data.get("severity") or ai_result["severity"]
        priority = self.request.data.get("priority") or ai_result["priority"]
        department = self.request.data.get("department") or ai_result["team"]

        # 4. Milestone 2 — Knowledge Retrieval & Resolution
        rag_result = retrieve_knowledge_and_generate_resolution(
            category=category,
            sub_category=sub_category,
            subject=cleaned["subject"] or raw_title,
            description=cleaned["description"] or raw_description,
        )

        resolution_json = json.dumps(rag_result["suggested_steps"])

        ticket = serializer.save(
            created_by=user,
            title=cleaned["subject"] or raw_title,
            description=cleaned["description"] or raw_description,
            category=category,
            sub_category=sub_category,
            severity=severity,
            priority=priority,
            department=department,
            status="AI_RESOLUTION_READY",
            ai_confidence=ai_result["confidence"],
            ai_path=ai_result["classification_path"],
            ai_resolution=resolution_json,
            knowledge_source=rag_result["article_title"],
            knowledge_retrieved=True,
        )


        # MongoDB audit ingestion
        if tickets_collection is not None:
            try:
                tickets_collection.insert_one({
                    "ticket_id": ticket.id,
                    "ticket_code": ticket.ticket_code,
                    "title": ticket.title,
                    "description": ticket.description,
                    "category": ticket.category,
                    "sub_category": ticket.sub_category,
                    "severity": ticket.severity,
                    "priority": ticket.priority,
                    "status": ticket.status,
                    "ai_confidence": ticket.ai_confidence,
                    "ai_path": ticket.ai_path,
                    "knowledge_source": ticket.knowledge_source,
                    "created_by": ticket.created_by.username,
                    "created_at": str(ticket.created_at),
                    "preprocessing": cleaned,
                })
            except Exception:
                pass


class TicketDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = TicketSerializer
    authentication_classes = [SafeJWTAuthentication]
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        user = self.request.user
        if not user or not user.is_authenticated:
            return Ticket.objects.all()

        if user.is_staff or user.is_superuser or (hasattr(user, "profile") and user.profile.role in ["Admin", "Agent"]):
            return Ticket.objects.all()

        return Ticket.objects.filter(created_by=user)

    def perform_update(self, serializer):
        ticket = self.get_object()
        new_status = self.request.data.get("status")

        if new_status and new_status != ticket.status:
            if not ticket.can_transition(new_status):
                raise serializers.ValidationError(
                    {
                        "status": f"Cannot change status from '{ticket.status}' to '{new_status}'."
                    }
                )

        serializer.save()


class ClassifyTicketAPIView(generics.GenericAPIView):
    """
    Dedicated AI ticket classification endpoint.
    Takes complete subject, description, scope, and work_blocked.
    Returns normalized category, sub_category, severity, priority, confidence, and suggested steps.
    """
    authentication_classes = [SafeJWTAuthentication]
    permission_classes = [permissions.AllowAny]


    def post(self, request, *args, **kwargs):
        from rest_framework.response import Response

        raw_subject = request.data.get("subject", "")
        raw_description = request.data.get("description", "")
        scope = request.data.get("scope", "Just me")
        work_blocked = bool(request.data.get("work_blocked", False))

        cleaned = preprocess_ticket(raw_subject, raw_description)
        ai_result = classify_ticket(
            cleaned["subject"] or raw_subject,
            cleaned["description"] or raw_description,
            scope=scope,
            work_blocked=work_blocked,
        )

        rag_result = retrieve_knowledge_and_generate_resolution(
            category=ai_result["category"],
            sub_category=ai_result["sub_category"],
            subject=cleaned["subject"] or raw_subject,
            description=cleaned["description"] or raw_description,
        )

        sla_hours = 4 if ai_result["priority"] == "P1" else 8 if ai_result["priority"] == "P2" else 24 if ai_result["priority"] == "P3" else 48

        return Response({
            "category": ai_result["category"],
            "sub_category": ai_result["sub_category"],
            "severity": ai_result["severity"],
            "priority": ai_result["priority"],
            "team": ai_result["team"],
            "confidence": ai_result["confidence"],
            "classification_path": ai_result["classification_path"],
            "sla_hours": sla_hours,
            "knowledge_source": rag_result["article_title"],
            "suggested_resolution": rag_result["suggested_steps"],
        })
