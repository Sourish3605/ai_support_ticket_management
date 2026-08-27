from rest_framework import serializers
from .models import (
    Ticket,
    TicketReply,
    AgentWorkflow,
    AgentExecution,
    JiraTicket,
    EmailLog,
    ActivityLog,
)


class TicketReplySerializer(serializers.ModelSerializer):
    author_name = serializers.SerializerMethodField()
    author_role = serializers.SerializerMethodField()
    author_email = serializers.SerializerMethodField()

    class Meta:
        model = TicketReply
        fields = [
            "id",
            "ticket",
            "user",
            "author_name",
            "author_role",
            "author_email",
            "message",
            "attachment",
            "is_internal",
            "created_at",
        ]
        read_only_fields = ["id", "user", "ticket", "created_at"]

    def get_author_name(self, obj):
        if obj.user:
            return obj.user.get_full_name() or obj.user.username
        return "Unknown"

    def get_author_role(self, obj):
        if not obj.user:
            return "customer"
        if getattr(obj.user, "is_superuser", False):
            return "ADMIN"
        if getattr(obj.user, "is_staff", False):
            return "SUPPORT_AGENT"
        return "CUSTOMER"

    def get_author_email(self, obj):
        return obj.user.email if obj.user else ""


class AgentExecutionSerializer(serializers.ModelSerializer):
    class Meta:
        model = AgentExecution
        fields = [
            "id",
            "execution_id",
            "agent_name",
            "input_data",
            "output_data",
            "status",
            "confidence",
            "latency_ms",
            "error_message",
            "started_at",
            "completed_at",
        ]


class AgentWorkflowSerializer(serializers.ModelSerializer):
    executions = AgentExecutionSerializer(many=True, read_only=True)
    ticket_number = serializers.CharField(source="ticket.ticket_number", read_only=True)

    class Meta:
        model = AgentWorkflow
        fields = [
            "id",
            "workflow_id",
            "ticket",
            "ticket_number",
            "workflow_status",
            "current_agent",
            "final_confidence",
            "latency_ms",
            "error_message",
            "started_at",
            "completed_at",
            "executions",
        ]


class JiraTicketSerializer(serializers.ModelSerializer):
    ticket_number = serializers.CharField(source="ticket.ticket_number", read_only=True)

    class Meta:
        model = JiraTicket
        fields = [
            "id",
            "jira_id",
            "ticket",
            "ticket_number",
            "jira_issue_key",
            "jira_issue_id",
            "jira_status",
            "jira_priority",
            "assignee",
            "team",
            "summary",
            "description",
            "raw_payload",
            "last_updated",
            "synced_at",
        ]


class EmailLogSerializer(serializers.ModelSerializer):
    ticket_number = serializers.CharField(source="ticket.ticket_number", read_only=True)

    class Meta:
        model = EmailLog
        fields = [
            "id",
            "email_id",
            "ticket",
            "ticket_number",
            "recipient",
            "subject",
            "email_type",
            "status",
            "body",
            "failure_reason",
            "sent_at",
        ]


class ActivityLogSerializer(serializers.ModelSerializer):
    ticket_number = serializers.CharField(source="ticket.ticket_number", read_only=True)

    class Meta:
        model = ActivityLog
        fields = [
            "id",
            "log_id",
            "ticket",
            "ticket_number",
            "actor",
            "action",
            "description",
            "metadata",
            "timestamp",
        ]


class TicketSerializer(serializers.ModelSerializer):
    ticketNumber = serializers.CharField(source="ticket_number", read_only=True)
    customerId = serializers.IntegerField(source="created_by_id", read_only=True)
    customerName = serializers.SerializerMethodField()
    customerEmail = serializers.SerializerMethodField()
    title = serializers.CharField(required=False)
    subject = serializers.CharField(source="title", required=False)
    subCategory = serializers.CharField(source="sub_category", required=False, allow_blank=True)
    assignedAgentId = serializers.IntegerField(source="assigned_to_id", required=False, allow_null=True)
    assignedAgentName = serializers.SerializerMethodField()
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)
    updatedAt = serializers.DateTimeField(source="updated_at", read_only=True)
    replies = TicketReplySerializer(many=True, read_only=True)
    latest_workflow = serializers.SerializerMethodField()
    jira_integration = serializers.SerializerMethodField()
    activity_count = serializers.SerializerMethodField()

    class Meta:
        model = Ticket
        fields = [
            "id",
            "ticket_number",
            "ticketNumber",
            "title",
            "subject",
            "description",
            "category",
            "sub_category",
            "subCategory",
            "priority",
            "severity",
            "status",
            "attachment",
            "created_by",
            "customerId",
            "customerName",
            "customerEmail",
            "assigned_to",
            "assignedAgentId",
            "assignedAgentName",
            "createdAt",
            "updatedAt",
            "created_at",
            "updated_at",
            "replies",
            "latest_workflow",
            "jira_integration",
            "activity_count",
        ]
        read_only_fields = [
            "id",
            "ticket_number",
            "ticketNumber",
            "created_by",
            "customerId",
            "customerName",
            "customerEmail",
            "created_at",
            "updated_at",
            "createdAt",
            "updatedAt",
            "replies",
            "latest_workflow",
            "jira_integration",
            "activity_count",
        ]

    def get_customerName(self, obj):
        if obj.created_by:
            return obj.created_by.get_full_name() or obj.created_by.username
        return "Unknown"

    def get_customerEmail(self, obj):
        return obj.created_by.email if obj.created_by else ""

    def get_assignedAgentName(self, obj):
        if obj.assigned_to:
            return obj.assigned_to.get_full_name() or obj.assigned_to.username
        return "Unassigned"

    def get_latest_workflow(self, obj):
        wf = obj.agent_workflows.first()
        if wf:
            return AgentWorkflowSerializer(wf).data
        return None

    def get_jira_integration(self, obj):
        jt = obj.jira_tickets.first()
        if jt:
            return JiraTicketSerializer(jt).data
        return None

    def get_activity_count(self, obj):
        return obj.activity_logs.count()

    def validate(self, attrs):
        if "title" not in attrs:
            subj = self.initial_data.get("subject") or self.initial_data.get("title")
            if subj:
                attrs["title"] = str(subj)
            else:
                attrs["title"] = "Support Ticket"
        return attrs

    def create(self, validated_data):
        title = validated_data.get("title") or self.initial_data.get("subject") or self.initial_data.get("title") or "Support Ticket"
        validated_data["title"] = title
        return super().create(validated_data)


class TicketStatusUpdateSerializer(serializers.Serializer):
    status = serializers.ChoiceField(
        choices=[
            "NEW",
            "CLASSIFIED",
            "AI_PROCESSING",
            "AI_RESOLUTION_READY",
            "AI_RESOLVED",
            "IN_PROGRESS",
            "ESCALATED",
            "RESOLVED",
            "CLOSED",
            "Open",
            "Classified",
            "In Progress",
            "Resolved",
            "Closed",
        ]
    )


class TicketReplyCreateSerializer(serializers.Serializer):
    message = serializers.CharField(required=True)
    attachment = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    is_internal = serializers.BooleanField(required=False, default=False)


class TicketAssignSerializer(serializers.Serializer):
    agent_id = serializers.IntegerField(required=False, allow_null=True)
    assignedAgentId = serializers.IntegerField(required=False, allow_null=True)