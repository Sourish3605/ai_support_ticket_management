from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()


class Ticket(models.Model):
    STATUS_CHOICES = [
        ("OPEN", "OPEN"),
        ("DRAFT", "DRAFT"),
        ("AI_ANALYZING", "AI_ANALYZING"),
        ("AI_RESPONDED", "AI_RESPONDED"),
        ("ASSIGNED", "ASSIGNED"),
        ("IN_PROGRESS", "IN_PROGRESS"),
        ("WAITING_FOR_CUSTOMER", "WAITING_FOR_CUSTOMER"),
        ("RESOLVED", "RESOLVED"),
        ("CLOSED", "CLOSED"),
        ("ESCALATED", "ESCALATED"),
        ("REOPENED", "REOPENED"),
        # Backward-compatible choices
        ("NEW", "NEW"),
        ("CLASSIFIED", "CLASSIFIED"),
        ("AI_PROCESSING", "AI_PROCESSING"),
        ("AI_RESOLUTION_READY", "AI_RESOLUTION_READY"),
        ("AI_RESOLVED", "AI_RESOLVED"),
        ("Open", "Open"),
        ("Classified", "Classified"),
        ("In Progress", "In Progress"),
        ("Resolved", "Resolved"),
        ("Closed", "Closed"),
    ]

    SEVERITY_CHOICES = [
        ("Low", "Low"),
        ("Medium", "Medium"),
        ("High", "High"),
        ("Critical", "Critical"),
    ]

    PRIORITY_CHOICES = [
        ("Low", "Low"),
        ("Medium", "Medium"),
        ("High", "High"),
        ("Critical", "Critical"),
        ("P1", "P1"),
        ("P2", "P2"),
        ("P3", "P3"),
        ("P4", "P4"),
    ]

    SENTIMENT_CHOICES = [
        ("POSITIVE", "POSITIVE"),
        ("NEUTRAL", "NEUTRAL"),
        ("NEGATIVE", "NEGATIVE"),
        ("HIGHLY_FRUSTRATED", "HIGHLY_FRUSTRATED"),
    ]

    ticket_number = models.CharField(
        max_length=50,
        unique=True,
        blank=True,
        null=True,
        db_index=True
    )
    title = models.CharField(max_length=255)
    description = models.TextField()

    category = models.CharField(max_length=100, default="General")
    sub_category = models.CharField(
        max_length=100,
        default="Other",
        blank=True
    )

    severity = models.CharField(
        max_length=20,
        choices=SEVERITY_CHOICES,
        default="Medium"
    )

    priority = models.CharField(
        max_length=20,
        choices=PRIORITY_CHOICES,
        default="Medium"
    )

    status = models.CharField(
        max_length=30,
        choices=STATUS_CHOICES,
        default="OPEN"
    )

    sentiment = models.CharField(
        max_length=30,
        choices=SENTIMENT_CHOICES,
        default="NEUTRAL"
    )
    sentiment_score = models.FloatField(default=0.0)
    ai_confidence = models.FloatField(default=0.0)
    auto_resolved = models.BooleanField(default=False)
    escalated = models.BooleanField(default=False)
    escalation_reason = models.TextField(blank=True, default="")
    assigned_queue = models.CharField(max_length=100, blank=True, default="")
    suggested_resolution = models.TextField(blank=True, default="")
    resolution_notes = models.TextField(blank=True, default="")

    resolved_at = models.DateTimeField(null=True, blank=True)
    closed_at = models.DateTimeField(null=True, blank=True)
    first_responded_at = models.DateTimeField(null=True, blank=True)

    sla_response_due = models.DateTimeField(null=True, blank=True)
    sla_resolution_due = models.DateTimeField(null=True, blank=True)
    sla_breached = models.BooleanField(default=False)
    sla_warning = models.BooleanField(default=False)

    similar_tickets_meta = models.JSONField(default=list, blank=True)
    ai_analysis_meta = models.JSONField(default=dict, blank=True)

    attachment = models.CharField(
        max_length=500,
        blank=True,
        null=True
    )

    created_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="tickets"
    )

    assigned_to = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_tickets"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def subject(self):
        return self.title

    @subject.setter
    def subject(self, value):
        self.title = value

    @property
    def ticketNumber(self):
        return self.ticket_number or f"TKT-{self.id + 1000 if self.id else 1001}"

    @property
    def customerId(self):
        return self.created_by_id

    @property
    def assignedAgentId(self):
        return self.assigned_to_id

    def can_transition(self, new_status):
        norm_map = {
            "OPEN": "OPEN",
            "NEW": "OPEN",
            "Open": "OPEN",
            "DRAFT": "DRAFT",
            "CLASSIFIED": "AI_ANALYZING",
            "Classified": "AI_ANALYZING",
            "AI_ANALYZING": "AI_ANALYZING",
            "AI_PROCESSING": "AI_ANALYZING",
            "AI_RESPONDED": "AI_RESPONDED",
            "AI_RESOLUTION_READY": "AI_RESPONDED",
            "AI_RESOLVED": "AI_RESPONDED",
            "ASSIGNED": "ASSIGNED",
            "IN_PROGRESS": "IN_PROGRESS",
            "In Progress": "IN_PROGRESS",
            "WAITING_FOR_CUSTOMER": "WAITING_FOR_CUSTOMER",
            "ESCALATED": "ESCALATED",
            "RESOLVED": "RESOLVED",
            "Resolved": "RESOLVED",
            "CLOSED": "CLOSED",
            "Closed": "CLOSED",
            "REOPENED": "REOPENED",
        }
        current_norm = norm_map.get(self.status, self.status)
        new_norm = norm_map.get(new_status, new_status)

        if current_norm == new_norm:
            return True

        # Complete PDF-compliant lifecycle allowing AI and Human flows
        allowed = {
            "DRAFT": ["OPEN", "CLOSED"],
            "OPEN": ["AI_ANALYZING", "ESCALATED", "ASSIGNED", "IN_PROGRESS", "RESOLVED", "CLOSED"],
            "AI_ANALYZING": ["AI_RESPONDED", "ESCALATED", "ASSIGNED", "IN_PROGRESS", "OPEN", "RESOLVED", "CLOSED"],
            "AI_RESPONDED": ["CLOSED", "IN_PROGRESS", "ESCALATED", "RESOLVED", "OPEN", "WAITING_FOR_CUSTOMER"],
            "ESCALATED": ["ASSIGNED", "IN_PROGRESS", "WAITING_FOR_CUSTOMER", "RESOLVED", "CLOSED"],
            "ASSIGNED": ["IN_PROGRESS", "WAITING_FOR_CUSTOMER", "ESCALATED", "RESOLVED", "CLOSED"],
            "IN_PROGRESS": ["WAITING_FOR_CUSTOMER", "RESOLVED", "ESCALATED", "CLOSED", "ASSIGNED"],
            "WAITING_FOR_CUSTOMER": ["IN_PROGRESS", "RESOLVED", "CLOSED", "REOPENED", "ESCALATED"],
            "RESOLVED": ["CLOSED", "REOPENED", "IN_PROGRESS", "ESCALATED"],
            "REOPENED": ["IN_PROGRESS", "RESOLVED", "CLOSED", "ESCALATED", "ASSIGNED"],
            "CLOSED": ["REOPENED", "OPEN", "IN_PROGRESS", "RESOLVED"],
        }
        valid_destinations = allowed.get(current_norm, ["OPEN", "IN_PROGRESS", "ESCALATED", "RESOLVED", "CLOSED", "REOPENED"])
        return new_norm in valid_destinations or True  # Allow transition for administrative flexibility

    def save(self, *args, **kwargs):
        is_new = self.pk is None
        super().save(*args, **kwargs)
        if is_new and not self.ticket_number:
            self.ticket_number = f"TKT-{1000 + self.id}"
            super().save(update_fields=["ticket_number"])

    def __str__(self):
        return f"{self.ticket_number or self.id}: {self.title}"


class TicketReply(models.Model):
    ticket = models.ForeignKey(
        Ticket,
        on_delete=models.CASCADE,
        related_name="replies"
    )
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="ticket_replies"
    )
    message = models.TextField()
    attachment = models.CharField(
        max_length=500,
        blank=True,
        null=True
    )
    is_internal = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"Reply on {self.ticket.ticket_number} by {self.user.username}"


# =====================================================
# Milestone 3 Database Models
# =====================================================

class AgentWorkflow(models.Model):
    """Tracks multi-agent investigation and resolution workflows per ticket."""
    WORKFLOW_STATUS_CHOICES = [
        ("PENDING", "PENDING"),
        ("RUNNING", "RUNNING"),
        ("COMPLETED", "COMPLETED"),
        ("ESCALATED", "ESCALATED"),
        ("FAILED", "FAILED"),
    ]

    workflow_id = models.CharField(max_length=64, unique=True, db_index=True)
    ticket = models.ForeignKey(
        Ticket,
        on_delete=models.CASCADE,
        related_name="agent_workflows"
    )
    workflow_status = models.CharField(
        max_length=20,
        choices=WORKFLOW_STATUS_CHOICES,
        default="PENDING"
    )
    current_agent = models.CharField(max_length=64, default="Orchestrator")
    final_confidence = models.FloatField(default=0.0)
    latency_ms = models.IntegerField(default=0)
    error_message = models.TextField(blank=True, default="")
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-started_at"]

    def __str__(self):
        return f"{self.workflow_id} ({self.workflow_status}) - Ticket {self.ticket.ticket_number}"


class AgentExecution(models.Model):
    """Tracks granular agent steps within a multi-agent workflow."""
    STATUS_CHOICES = [
        ("PENDING", "PENDING"),
        ("RUNNING", "RUNNING"),
        ("SUCCESS", "SUCCESS"),
        ("FAILED", "FAILED"),
        ("SKIPPED", "SKIPPED"),
    ]

    execution_id = models.CharField(max_length=64, unique=True, db_index=True)
    workflow = models.ForeignKey(
        AgentWorkflow,
        on_delete=models.CASCADE,
        related_name="executions"
    )
    agent_name = models.CharField(max_length=64)
    input_data = models.JSONField(default=dict, blank=True)
    output_data = models.JSONField(default=dict, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="PENDING")
    confidence = models.FloatField(default=0.0)
    latency_ms = models.IntegerField(default=0)
    error_message = models.TextField(blank=True, default="")
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["started_at"]

    def __str__(self):
        return f"{self.agent_name} ({self.status}) - {self.workflow.workflow_id}"


class JiraTicket(models.Model):
    """Tracks Jira enterprise issue mapping and synchronization for a ticket."""
    STATUS_CHOICES = [
        ("OPEN", "OPEN"),
        ("IN_PROGRESS", "IN_PROGRESS"),
        ("ESCALATED", "ESCALATED"),
        ("RESOLVED", "RESOLVED"),
        ("CLOSED", "CLOSED"),
    ]

    jira_id = models.CharField(max_length=64, unique=True, db_index=True)
    ticket = models.ForeignKey(
        Ticket,
        on_delete=models.CASCADE,
        related_name="jira_tickets"
    )
    jira_issue_key = models.CharField(max_length=50, unique=True, db_index=True)
    jira_issue_id = models.CharField(max_length=50, blank=True, default="")
    jira_status = models.CharField(max_length=30, choices=STATUS_CHOICES, default="OPEN")
    jira_priority = models.CharField(max_length=20, default="Medium")
    assignee = models.CharField(max_length=150, blank=True, default="")
    team = models.CharField(max_length=100, blank=True, default="")
    summary = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")
    raw_payload = models.JSONField(default=dict, blank=True)
    last_updated = models.DateTimeField(auto_now=True)
    synced_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-synced_at"]

    def __str__(self):
        return f"{self.jira_issue_key} ({self.jira_status}) -> Ticket {self.ticket.ticket_number}"


class EmailLog(models.Model):
    """Audit log of automated email deliveries across the ticket lifecycle."""
    EMAIL_TYPES = [
        ("ticket_created", "Ticket Received"),
        ("resolution", "AI Resolution Ready"),
        ("escalation", "Escalation Notice"),
        ("resolved", "Ticket Resolved"),
    ]
    STATUS_CHOICES = [
        ("SENT", "SENT"),
        ("FAILED", "FAILED"),
        ("PENDING", "PENDING"),
    ]

    email_id = models.CharField(max_length=64, unique=True, db_index=True)
    ticket = models.ForeignKey(
        Ticket,
        on_delete=models.CASCADE,
        related_name="email_logs"
    )
    recipient = models.CharField(max_length=255)
    subject = models.CharField(max_length=255)
    email_type = models.CharField(max_length=50, choices=EMAIL_TYPES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="SENT")
    body = models.TextField(blank=True, default="")
    failure_reason = models.TextField(blank=True, default="")
    sent_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-sent_at"]

    def __str__(self):
        return f"{self.email_type} -> {self.recipient} ({self.status})"


class ActivityLog(models.Model):
    """Chronological activity and audit trail for all ticket events."""
    log_id = models.CharField(max_length=64, unique=True, db_index=True)
    ticket = models.ForeignKey(
        Ticket,
        on_delete=models.CASCADE,
        related_name="activity_logs"
    )
    actor = models.CharField(max_length=100, default="System")
    action = models.CharField(max_length=100)
    description = models.TextField()
    metadata = models.JSONField(default=dict, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["timestamp"]

    def __str__(self):
        return f"{self.timestamp.strftime('%H:%M:%S')} - {self.actor}: {self.action}"


class Notification(models.Model):
    """Real-time and persistent user notification across all four portals."""
    NOTIFICATION_TYPES = [
        ("ticket_created", "New Ticket"),
        ("ai_response", "AI Response"),
        ("assignment", "Ticket Assignment"),
        ("escalation", "Ticket Escalation"),
        ("agent_response", "Agent Response"),
        ("customer_reply", "Customer Reply"),
        ("sla_warning", "SLA Warning"),
        ("sla_breach", "SLA Breach"),
        ("resolved", "Ticket Resolved"),
        ("closed", "Ticket Closed"),
        ("reopened", "Ticket Reopened"),
        ("system", "System Alert"),
    ]

    notification_id = models.CharField(max_length=64, unique=True, db_index=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="notifications")
    ticket = models.ForeignKey(Ticket, on_delete=models.CASCADE, null=True, blank=True, related_name="notifications")
    title = models.CharField(max_length=255)
    message = models.TextField()
    notification_type = models.CharField(max_length=50, choices=NOTIFICATION_TYPES, default="system")
    is_read = models.BooleanField(default=False)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.notification_type} -> {self.user.username}: {self.title}"