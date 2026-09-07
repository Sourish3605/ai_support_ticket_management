from django.db import models
from django.contrib.auth.models import User


class Profile(models.Model):
    ROLE_CHOICES = [
        ("Admin", "Admin"),
        ("Manager", "Support Manager"),
        ("Agent", "Agent"),
        ("Customer", "Customer"),
    ]

    AVAILABILITY_CHOICES = [
        ("AVAILABLE", "Working / Available"),
        ("BUSY", "Busy"),
        ("UNAVAILABLE", "Not Working / Unavailable"),
        ("INACTIVE", "Inactive"),
    ]

    DEPARTMENT_CHOICES = [
        ("IT Department", "IT Department"),
        ("HR Department", "HR Department"),
        ("Finance Department", "Finance Department"),
        ("Operations", "Operations"),
    ]

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="profile"
    )

    role = models.CharField(
        max_length=20,
        choices=ROLE_CHOICES,
        default="Customer"
    )

    department = models.CharField(
        max_length=100,
        choices=DEPARTMENT_CHOICES,
        default="IT Department",
        db_index=True
    )

    availability_status = models.CharField(
        max_length=20,
        choices=AVAILABILITY_CHOICES,
        default="AVAILABLE",
        db_index=True
    )

    title = models.CharField(
        max_length=150,
        blank=True,
        default="Support Specialist"
    )

    def __str__(self):
        return f"{self.user.username} - {self.role} ({self.department}, {self.availability_status})"