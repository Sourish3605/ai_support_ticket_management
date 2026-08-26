import uuid

from django.db import models
from django.contrib.auth import get_user_model


User = get_user_model()


class Ticket(models.Model):

    STATUS_CHOICES = [
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
        ("P1", "P1"),
        ("P2", "P2"),
        ("P3", "P3"),
        ("P4", "P4"),
    ]

    title = models.CharField(max_length=200)

    description = models.TextField()

    category = models.CharField(max_length=100)

    sub_category = models.CharField(
        max_length=100,
        default="Other"
    )

    severity = models.CharField(
        max_length=20,
        choices=SEVERITY_CHOICES,
        default="Medium"
    )

    priority = models.CharField(
        max_length=2,
        choices=PRIORITY_CHOICES,
        default="P3"
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="Open"
    )

    created_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="tickets"
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    updated_at = models.DateTimeField(
        auto_now=True
    )

    def can_transition(self, new_status):
        allowed = {
            "Open": ["Classified", "In Progress"],
            "Classified": ["In Progress"],
            "In Progress": ["Resolved"],
            "Resolved": ["Closed"],
            "Closed": [],
        }

        return new_status in allowed.get(self.status, [])

    def __str__(self):
        return f"Ticket {self.id} - {self.title}"


class AgentWorkflow(models.Model):

    WORKFLOW_STATUS_CHOICES = [
        ("Started", "Started"),
        ("Running", "Running"),
        ("Completed", "Completed"),
        ("Escalated", "Escalated"),
        ("Failed", "Failed"),
    ]

    AGENT_CHOICES = [
        ("Orchestrator", "Orchestrator"),
        ("Diagnosis", "Diagnosis"),
        ("Knowledge Retrieval", "Knowledge Retrieval"),
        ("Resolution", "Resolution"),
        ("Escalation", "Escalation"),
    ]

    workflow_id = models.UUIDField(
        default=uuid.uuid4,
        unique=True,
        editable=False
    )

    ticket = models.OneToOneField(
        Ticket,
        on_delete=models.CASCADE,
        related_name="agent_workflow"
    )

    workflow_status = models.CharField(
        max_length=20,
        choices=WORKFLOW_STATUS_CHOICES,
        default="Started"
    )

    current_agent = models.CharField(
        max_length=30,
        choices=AGENT_CHOICES,
        default="Orchestrator"
    )

    started_at = models.DateTimeField(
        auto_now_add=True
    )

    completed_at = models.DateTimeField(
        null=True,
        blank=True
    )

    final_confidence = models.FloatField(
        null=True,
        blank=True
    )

    def __str__(self):
        return f"{self.workflow_id} - Ticket {self.ticket.id}"


class AgentExecution(models.Model):

    EXECUTION_STATUS_CHOICES = [
        ("Started", "Started"),
        ("Running", "Running"),
        ("Completed", "Completed"),
        ("Failed", "Failed"),
    ]

    AGENT_CHOICES = [
        ("Orchestrator", "Orchestrator"),
        ("Diagnosis", "Diagnosis"),
        ("Knowledge Retrieval", "Knowledge Retrieval"),
        ("Resolution", "Resolution"),
        ("Escalation", "Escalation"),
    ]

    execution_id = models.UUIDField(
        default=uuid.uuid4,
        unique=True,
        editable=False
    )

    workflow = models.ForeignKey(
        AgentWorkflow,
        on_delete=models.CASCADE,
        related_name="executions"
    )

    agent_name = models.CharField(
        max_length=30,
        choices=AGENT_CHOICES
    )

    input_data = models.JSONField(
        null=True,
        blank=True
    )

    output_data = models.JSONField(
        null=True,
        blank=True
    )

    status = models.CharField(
        max_length=20,
        choices=EXECUTION_STATUS_CHOICES,
        default="Started"
    )

    confidence = models.FloatField(
        null=True,
        blank=True
    )

    started_at = models.DateTimeField(
        auto_now_add=True
    )

    completed_at = models.DateTimeField(
        null=True,
        blank=True
    )

    def __str__(self):
        return f"{self.agent_name} - {self.execution_id}"