from django.contrib import admin
from .models import (
    Category,
    SubCategory,
    Priority,
    SLARule,
    Department,
    Team,
    SeverityRule,
    Product,
    KnowledgeArticle,
)


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("id", "name")
    search_fields = ("name",)


@admin.register(SubCategory)
class SubCategoryAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "category")
    list_filter = ("category",)
    search_fields = ("name",)


@admin.register(Priority)
class PriorityAdmin(admin.ModelAdmin):
    list_display = ("id", "code", "name", "level")
    search_fields = ("code", "name")
    ordering = ("level",)


@admin.register(SLARule)
class SLARuleAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "priority",
        "response_minutes",
        "resolution_hours",
        "coverage",
    )


@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "description")
    search_fields = ("name",)


@admin.register(Team)
class TeamAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "department")
    list_filter = ("department",)
    search_fields = ("name",)


@admin.register(SeverityRule)
class SeverityRuleAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "code",
        "description",
        "suggested_priority",
    )
    search_fields = ("code",)


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ("id", "name")
    search_fields = ("name",)


@admin.register(KnowledgeArticle)
class KnowledgeArticleAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "article_id",
        "title",
        "category",
        "is_active",
        "created_at",
    )
    list_filter = (
        "category",
        "is_active",
        "created_at",
    )
    search_fields = (
        "article_id",
        "title",
        "content",
        "tags",
    )
    readonly_fields = (
        "created_at",
        "updated_at",
    )
    ordering = ("-created_at",)
    