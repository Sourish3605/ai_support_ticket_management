from rest_framework import generics, permissions, serializers, status
from rest_framework.views import APIView
from rest_framework.response import Response

from .models import Ticket
from .serializers import TicketSerializer
from .classification import classify_ticket

from mongodb import tickets_collection


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
        title = self.request.data.get("title", "")
        description = self.request.data.get("description", "")

        # Automatically classify the ticket
        category, sub_category, severity, priority = classify_ticket(
            title,
            description
        )

        # Save ticket with classification result
        ticket = serializer.save(
            created_by=self.request.user,
            category=category,
            sub_category=sub_category,
            severity=severity,
            priority=priority,
            status="Classified"
        )

        # Save ticket information to MongoDB
        tickets_collection.insert_one({
            "ticket_id": ticket.id,
            "title": ticket.title,
            "description": ticket.description,
            "category": ticket.category,
            "sub_category": ticket.sub_category,
            "severity": ticket.severity,
            "priority": ticket.priority,
            "status": ticket.status,
            "created_by": ticket.created_by.username,
            "created_at": str(ticket.created_at)
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
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        subject = request.data.get("subject", "")
        description = request.data.get("description", "")

        if not subject and not description:
            return Response(
                {"error": "Subject or description is required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        category, sub_category, severity, priority = classify_ticket(
            subject,
            description
        )

        return Response({
            "category": category,
            "sub_category": sub_category,
            "severity": severity,
            "priority": priority,
            "status": "Classified"
        })