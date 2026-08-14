
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
    response_hours = models.IntegerField()
    resolution_hours = models.IntegerField()

    def __str__(self):
        return self.priority.code


class Team(models.Model):
    name = models.CharField(max_length=100, unique=True)

    def __str__(self):
        return self.name


class Product(models.Model):
    name = models.CharField(max_length=100, unique=True)

    def __str__(self):
        return self.name