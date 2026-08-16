from django.contrib import admin
from .models import Ticket


@admin.register(Ticket)
class TicketAdmin(admin.ModelAdmin):
    list_display = (
        "ticket_code",
        "title",
        "category",
        "sub_category",
        "severity",
        "priority",
        "status",
        "department",
        "ai_confidence",
        "created_by",
        "created_at",
    )
    list_filter = (
        "status",
        "priority",
        "severity",
        "category",
        "department",
        "created_at",
    )
    search_fields = (
        "ticket_code",
        "title",
        "description",
        "created_by__username",
        "created_by__email",
    )
    readonly_fields = (
        "ticket_code",
        "ai_confidence",
        "ai_path",
        "knowledge_source",
        "created_at",
        "updated_at",
    )
    ordering = ("-created_at",)