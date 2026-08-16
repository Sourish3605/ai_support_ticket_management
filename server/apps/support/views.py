from rest_framework import generics, permissions, serializers
from .models import Ticket
from .serializers import TicketSerializer
from .preprocessing import preprocess_ticket
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
        status = self.request.query_params.get("status")
        priority = self.request.query_params.get("priority")

        if status:
            queryset = queryset.filter(status=status)

        if priority:
            queryset = queryset.filter(priority=priority)

        return queryset

    def perform_create(self, serializer):
        # --- Preprocessing ---
        raw_title = self.request.data.get("title", "")
        raw_description = self.request.data.get("description", "")
        cleaned = preprocess_ticket(raw_title, raw_description)

        # --- AI Classification ---
        ai_category, ai_sub_category, ai_priority = classify_ticket(
            cleaned["subject"], cleaned["description"]
        )

        # Use AI priority only if none supplied
        priority = self.request.data.get("priority") or ai_priority

        ticket = serializer.save(
            created_by=self.request.user,
            category=self.request.data.get("category") or ai_category,
            priority=priority,
        )

        tickets_collection.insert_one({
            "ticket_id": ticket.id,
            "title": ticket.title,
            "description": ticket.description,
            "category": ticket.category,
            "ai_sub_category": ai_sub_category,
            "priority": ticket.priority,
            "status": ticket.status,
            "created_by": ticket.created_by.username,
            "created_at": str(ticket.created_at),
            "preprocessing": cleaned,
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
                        "status": f"Cannot change status from '{ticket.status}' to '{new_status}'."
                    }
                )

        serializer.save()