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
                or "devipriya@gmail.com"
            )
            customer_name = (
                self.request.data.get("customer_name")
                or self.request.data.get("name")
                or "devipriya"
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

        # 3. Dynamic AI Classification
        ai_result = classify_ticket(
            cleaned["subject"] or raw_title,
            cleaned["description"] or raw_description,
            scope=scope,
            work_blocked=work_blocked,
        )

        if ai_result.get("success") and ai_result.get("category"):
            category = self.request.data.get("category") or ai_result["category"]
            sub_category = self.request.data.get("sub_category") or (ai_result["sub_category"] or "")
            severity = self.request.data.get("severity") or ai_result["severity"]
            priority = self.request.data.get("priority") or ai_result["priority"]
            department = self.request.data.get("department") or ai_result.get("team", "IT Support")
            ai_confidence = ai_result.get("confidence", 0.95)
            ai_path = ai_result.get("classification_path", "AI Engine")
            knowledge_source = ai_result.get("knowledge_source", "")
            suggested_steps = ai_result.get("suggested_resolution", [])
        else:
            category = self.request.data.get("category") or "General"
            sub_category = self.request.data.get("sub_category") or ""
            severity = self.request.data.get("severity") or "Medium"
            priority = self.request.data.get("priority") or "P3"
            department = self.request.data.get("department") or "IT Support"
            ai_confidence = 0.0
            ai_path = "Manual / Unclassified"
            knowledge_source = ""
            suggested_steps = []

        resolution_json = json.dumps(suggested_steps)

        ticket = serializer.save(
            created_by=user,
            title=cleaned["subject"] or raw_title,
            description=cleaned["description"] or raw_description,
            category=category,
            sub_category=sub_category,
            severity=severity,
            priority=priority,
            department=department,
            status="AI_RESOLUTION_READY" if suggested_steps else "Open",
            ai_confidence=ai_confidence,
            ai_path=ai_path,
            ai_resolution=resolution_json,
            knowledge_source=knowledge_source,
            knowledge_retrieved=bool(knowledge_source),
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
    Dynamically loads Master Data + Knowledge Base to classify tickets.
    Returns normalized, validated category, sub_category, priority, SLA, and KB steps.
    """
    authentication_classes = [SafeJWTAuthentication]
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        from rest_framework.response import Response
        from rest_framework import status

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

        # Handle errors
        if not ai_result.get("success", True):
            return Response(
                {
                    "success": False,
                    "error": ai_result.get("error", "Classification failed."),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Handle null classification (no matching classification found in Master Data)
        if ai_result.get("category") is None:
            return Response({
                "success": True,
                "category": None,
                "sub_category": None,
                "priority": None,
                "reason": ai_result.get("reason", "No matching classification found in the current master data."),
            })

        return Response({
            "success": True,
            "category": ai_result["category"],
            "sub_category": ai_result["sub_category"],
            "severity": ai_result.get("severity", "Medium"),
            "priority": ai_result["priority"],
            "team": ai_result.get("team", "IT Support"),
            "confidence": ai_result.get("confidence", 0.95),
            "classification_path": ai_result.get("classification_path", "AI Engine"),
            "sla_hours": ai_result.get("sla_hours", 24),
            "knowledge_source": ai_result.get("knowledge_source", ""),
            "suggested_resolution": ai_result.get("suggested_resolution", []),
            "reason": ai_result.get("reason", ""),
        })

