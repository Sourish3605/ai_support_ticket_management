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

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

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
        return self.title

    