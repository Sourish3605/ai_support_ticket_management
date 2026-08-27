from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()


class Ticket(models.Model):
    STATUS_CHOICES = [
        ("NEW", "NEW"),
        ("CLASSIFIED", "CLASSIFIED"),
        ("AI_PROCESSING", "AI_PROCESSING"),
        ("AI_RESOLUTION_READY", "AI_RESOLUTION_READY"),
        ("AI_RESOLVED", "AI_RESOLVED"),
        ("IN_PROGRESS", "IN_PROGRESS"),
        ("ESCALATED", "ESCALATED"),
        ("RESOLVED", "RESOLVED"),
        ("CLOSED", "CLOSED"),
        # Backward-compatible choices
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
        default="NEW"
    )

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
            "NEW": "NEW",
            "Open": "NEW",
            "Classified": "CLASSIFIED",
            "CLASSIFIED": "CLASSIFIED",
            "AI_PROCESSING": "AI_PROCESSING",
            "AI_RESOLUTION_READY": "AI_RESOLUTION_READY",
            "AI_RESOLVED": "AI_RESOLVED",
            "IN_PROGRESS": "IN_PROGRESS",
            "In Progress": "IN_PROGRESS",
            "ESCALATED": "ESCALATED",
            "RESOLVED": "RESOLVED",
            "Resolved": "RESOLVED",
            "CLOSED": "CLOSED",
            "Closed": "CLOSED",
        }
        current_norm = norm_map.get(self.status, self.status)
        new_norm = norm_map.get(new_status, new_status)

        if current_norm == new_norm:
            return True

        # Permissive lifecycle allowing AI and Human agent flow
        allowed = {
            "NEW": ["CLASSIFIED", "AI_PROCESSING", "AI_RESOLUTION_READY", "AI_RESOLVED", "IN_PROGRESS", "ESCALATED", "RESOLVED", "CLOSED"],
            "CLASSIFIED": ["AI_PROCESSING", "AI_RESOLUTION_READY", "AI_RESOLVED", "IN_PROGRESS", "ESCALATED", "RESOLVED", "CLOSED"],
            "AI_PROCESSING": ["AI_RESOLUTION_READY", "AI_RESOLVED", "IN_PROGRESS", "ESCALATED", "RESOLVED", "CLOSED", "NEW"],
            "AI_RESOLUTION_READY": ["AI_RESOLVED", "IN_PROGRESS", "ESCALATED", "RESOLVED", "CLOSED", "NEW"],
            "AI_RESOLVED": ["RESOLVED", "CLOSED", "IN_PROGRESS", "ESCALATED", "NEW"],
            "IN_PROGRESS": ["RESOLVED", "CLOSED", "ESCALATED", "AI_PROCESSING", "NEW"],
            "ESCALATED": ["IN_PROGRESS", "RESOLVED", "CLOSED", "NEW"],
            "RESOLVED": ["CLOSED", "IN_PROGRESS", "ESCALATED", "NEW"],
            "CLOSED": ["IN_PROGRESS", "NEW", "RESOLVED", "ESCALATED"],
        }
        return new_norm in allowed.get(current_norm, ["NEW", "IN_PROGRESS", "ESCALATED", "RESOLVED", "CLOSED"])

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