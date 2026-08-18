from django.db import models


class Category(models.Model):
    name = models.CharField(max_length=100, unique=True)

    def __str__(self):
        return self.name


class SubCategory(models.Model):
    category = models.ForeignKey(
        Category,
        on_delete=models.CASCADE,
        related_name="sub_categories"
    )
    name = models.CharField(max_length=100)

    def __str__(self):
        return self.name


class Priority(models.Model):
    code = models.CharField(max_length=2, unique=True)
    name = models.CharField(max_length=50)
    level = models.IntegerField()

    def __str__(self):
        return f"{self.code} - {self.name}"


class SLARule(models.Model):
    priority = models.OneToOneField(
        Priority,
        on_delete=models.CASCADE
    )
    response_minutes = models.IntegerField()
    resolution_hours = models.IntegerField()
    coverage = models.CharField(
        max_length=50,
        default="24/7"
    )

    def __str__(self):
        return self.priority.code


class Department(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, default="")

    def __str__(self):
        return self.name


class Team(models.Model):
    name = models.CharField(max_length=100, unique=True)
    department = models.ForeignKey(
        Department,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="teams"
    )

    def __str__(self):
        return self.name


class SeverityRule(models.Model):
    code = models.CharField(max_length=20, unique=True) # Critical, High, Medium, Low
    description = models.TextField(blank=True, default="")
    suggested_priority = models.CharField(max_length=10, default="P2")

    def __str__(self):
        return self.code


class Product(models.Model):
    name = models.CharField(max_length=100, unique=True)

    def __str__(self):
        return self.name