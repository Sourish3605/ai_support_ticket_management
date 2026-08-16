from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()


class Ticket(models.Model):
    STATUS_CHOICES = [
        ("NEW", "NEW"),
        ("CLASSIFIED", "CLASSIFIED"),
        ("AI_RESOLUTION_READY", "AI_RESOLUTION_READY"),
        ("Open", "Open"),
        ("In Progress", "In Progress"),
        ("Pending", "Pending"),
        ("Resolved", "Resolved"),
        ("Closed", "Closed"),
    ]

    SEVERITY_CHOICES = [
        ("Critical", "Critical"),
        ("High", "High"),
        ("Medium", "Medium"),
        ("Low", "Low"),
    ]

    PRIORITY_CHOICES = [
        ("P1", "P1 - Critical"),
        ("P2", "P2 - High"),
        ("P3", "P3 - Medium"),
        ("P4", "P4 - Low"),
        ("High", "High"),
        ("Medium", "Medium"),
        ("Low", "Low"),
    ]

    ticket_code = models.CharField(max_length=20, blank=True, default="")
    title = models.CharField(max_length=200)
    description = models.TextField()
    category = models.CharField(max_length=100, default="General")
    sub_category = models.CharField(max_length=100, blank=True, default="")
    severity = models.CharField(max_length=20, choices=SEVERITY_CHOICES, default="Medium")
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default="P3")
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default="NEW")
    department = models.CharField(max_length=100, blank=True, default="IT Support")

    # M1 AI Classification details
    ai_confidence = models.FloatField(default=0.0)
    ai_path = models.CharField(max_length=30, default="Fast-Path")

    # M2 Knowledge Retrieval & RAG details
    ai_resolution = models.TextField(blank=True, default="")
    knowledge_source = models.CharField(max_length=255, blank=True, default="")
    knowledge_retrieved = models.BooleanField(default=False)

    assigned_to = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_tickets"
    )

    created_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="tickets"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.ticket_code:
            super().save(*args, **kwargs)
            self.ticket_code = f"TKT{self.id:03d}"
            super().save(update_fields=["ticket_code"])
        else:
            super().save(*args, **kwargs)

    def can_transition(self, new_status):
        allowed = {
            "NEW": ["CLASSIFIED", "AI_RESOLUTION_READY", "Open", "In Progress"],
            "CLASSIFIED": ["AI_RESOLUTION_READY", "Open", "In Progress"],
            "AI_RESOLUTION_READY": ["Open", "In Progress", "Resolved", "Closed"],
            "Open": ["In Progress", "Pending", "Resolved", "Closed"],
            "In Progress": ["Pending", "Resolved", "Closed"],
            "Pending": ["In Progress", "Resolved", "Closed"],
            "Resolved": ["Closed", "Open"],
            "Closed": [],
        }
        return new_status in allowed.get(self.status, [])

    def __str__(self):
        return f"{self.ticket_code or 'TK'} - {self.title}"