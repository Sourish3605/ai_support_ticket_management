from datetime import datetime, timezone, timedelta
from rest_framework import generics, permissions, serializers, status
from rest_framework.views import APIView
from rest_framework.response import Response

from .models import Ticket
from .serializers import TicketSerializer
from .classification import classify_ticket
from .preprocessing import preprocess_ticket
from .knowledge_service import retrieve_knowledge_and_generate_resolution

from mongodb import (
    tickets_collection,
    classifications_collection,
    sla_calculations_collection,
)


def get_sla_metrics(priority_code: str):
    """Calculate SLA response minutes, resolution hours, and coverage."""
    sla_defaults = {
        "P1": {"response_minutes": 15, "resolution_hours": 4, "coverage": "24/7"},
        "P2": {"response_minutes": 30, "resolution_hours": 8, "coverage": "24/7"},
        "P3": {"response_minutes": 60, "resolution_hours": 24, "coverage": "Business Hours"},
        "P4": {"response_minutes": 120, "resolution_hours": 48, "coverage": "Business Hours"},
    }
    return sla_defaults.get(priority_code, {"response_minutes": 60, "resolution_hours": 24, "coverage": "Business Hours"})


class TicketListCreateView(generics.ListCreateAPIView):
    serializer_class = TicketSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user

        # Admin and Agent can see all tickets
        if hasattr(user, "profile") and user.profile.role in ["Admin", "Agent"]:
            queryset = Ticket.objects.all()
        else:
            # Customer can see only their own tickets
            queryset = Ticket.objects.filter(created_by=user)

        # Filters
        status_filter = self.request.query_params.get("status")
        priority = self.request.query_params.get("priority")

        if status_filter:
            queryset = queryset.filter(status=status_filter)

        if priority:
            queryset = queryset.filter(priority=priority)

        return queryset

    def perform_create(self, serializer):
        raw_title = self.request.data.get("title", "")
        raw_description = self.request.data.get("description", "")

        # 1. Milestone 1 Text Preprocessing & PII Masking
        preprocessed = preprocess_ticket(raw_title, raw_description)
        cleaned_title = preprocessed.get("subject", raw_title)
        cleaned_description = preprocessed.get("description", raw_description)

        # 2. Milestone 1 Automated Classification
        category, sub_category, severity, priority = classify_ticket(
            cleaned_title,
            cleaned_description
        )

        # 3. Milestone 1 SLA Calculation
        sla_info = get_sla_metrics(priority)
        now_dt = datetime.now(timezone.utc)
        sla_due_dt = now_dt + timedelta(hours=sla_info["resolution_hours"])

        # 4. Save ticket in SQL Database
        ticket = serializer.save(
            created_by=self.request.user,
            title=cleaned_title,
            description=cleaned_description,
            category=category,
            sub_category=sub_category,
            severity=severity,
            priority=priority,
            status="Classified"
        )

        # 5. Milestone 2 RAG Knowledge Retrieval & Grounded Resolution Generation
        rag_result = retrieve_knowledge_and_generate_resolution(
            category=category,
            sub_category=sub_category,
            subject=cleaned_title,
            description=cleaned_description,
            ticket_id=ticket.id
        )

        # 6. Save M1 & M2 Collections in MongoDB
        # A. tickets collection
        tickets_collection.insert_one({
            "ticket_id": ticket.id,
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
            "grounded_resolution": rag_result.get("suggested_steps", []),
            "citations": rag_result.get("citations", []),
            "created_by": ticket.created_by.username,
            "created_at": str(ticket.created_at)
        })

        # B. classifications collection
        classifications_collection.insert_one({
            "ticket_id": ticket.id,
            "category": category,
            "sub_category": sub_category,
            "severity": severity,
            "priority": priority,
            "confidence": 0.95,
            "model_path": "Rule+TFIDF",
            "created_at": now_dt.isoformat()
        })

        # C. sla_calculations collection
        sla_calculations_collection.insert_one({
            "ticket_id": ticket.id,
            "priority": priority,
            "response_minutes": sla_info["response_minutes"],
            "resolution_hours": sla_info["resolution_hours"],
            "coverage": sla_info["coverage"],
            "due_date": sla_due_dt.isoformat(),
            "calculated_at": now_dt.isoformat()
        })


class TicketDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = TicketSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user

        # Admin and Agent can access all tickets
        if hasattr(user, "profile") and user.profile.role in ["Admin", "Agent"]:
            return Ticket.objects.all()

        # Customer can access only their own tickets
        return Ticket.objects.filter(created_by=user)

    def perform_update(self, serializer):
        ticket = self.get_object()
        new_status = self.request.data.get("status")

        if new_status and new_status != ticket.status:
            if not ticket.can_transition(new_status):
                raise serializers.ValidationError(
                    {
                        "status": (
                            f"Cannot change status from "
                            f"'{ticket.status}' to '{new_status}'."
                        )
                    }
                )

        serializer.save()


class TicketClassificationView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        subject = request.data.get("subject", "")
        description = request.data.get("description", "")

        if not subject and not description:
            return Response(
                {"error": "Subject or description is required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # 1. Milestone 1 Preprocessing & PII Masking
        preprocessed = preprocess_ticket(subject, description)
        cleaned_sub = preprocessed.get("subject", subject)
        cleaned_desc = preprocessed.get("description", description)

        # 2. Milestone 1 Classification
        category, sub_category, severity, priority = classify_ticket(
            cleaned_sub,
            cleaned_desc
        )

        # 3. Milestone 1 SLA Calculation
        sla_info = get_sla_metrics(priority)

        # 4. Milestone 2 Knowledge Base RAG & Resolution Generation with Citations
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
            "status": "Classified",
            "confidence": 0.95,
            "sla_hours": sla_info["resolution_hours"],
            "response_minutes": sla_info["response_minutes"],
            "coverage": sla_info["coverage"],
            "team": f"{category} Support" if category != "General" else "Service Desk",
            "knowledge_source": rag_result.get("knowledge_source", "Enterprise Knowledge Store"),
            "suggested_resolution": rag_result.get("suggested_steps", []),
            "citations": rag_result.get("citations", []),
            "classification_path": "AI Engine (M1 + M2 Hybrid RAG)",
            "reason": f"Classified as {category} → {sub_category} ({priority}) based on issue description.",
        })