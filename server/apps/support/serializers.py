from rest_framework import serializers
from .models import Ticket

class TicketSerializer(serializers.ModelSerializer):
    created_by_username = serializers.ReadOnlyField(source="created_by.username")
    created_by_name = serializers.SerializerMethodField()
    assigned_to_name = serializers.SerializerMethodField()

    class Meta:
        model = Ticket
        fields = "__all__"
        read_only_fields = ["created_by", "ticket_code", "created_at", "updated_at"]

    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.get_full_name() or obj.created_by.username
        return "Unknown"

    def get_assigned_to_name(self, obj):
        if obj.assigned_to:
            return obj.assigned_to.get_full_name() or obj.assigned_to.username
        return "Unassigned"