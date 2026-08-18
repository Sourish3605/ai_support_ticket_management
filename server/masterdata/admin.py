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


class SubCategoryInline(admin.TabularInline):
    model = SubCategory
    extra = 1


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "get_subcategories_count")
    search_fields = ("name",)
    inlines = [SubCategoryInline]

    def get_subcategories_count(self, obj):
        return obj.sub_categories.count()
    get_subcategories_count.short_description = "Sub-Categories"


@admin.register(SubCategory)
class SubCategoryAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "category")
    list_filter = ("category",)
    search_fields = ("name", "category__name")


@admin.register(Priority)
class PriorityAdmin(admin.ModelAdmin):
    list_display = ("id", "code", "name", "level")
    ordering = ("level",)
    search_fields = ("code", "name")


@admin.register(SLARule)
class SLARuleAdmin(admin.ModelAdmin):
    list_display = ("id", "priority", "response_minutes", "resolution_hours", "coverage")
    list_filter = ("priority",)


@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "description")
    search_fields = ("name",)


@admin.register(Team)
class TeamAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "department")
    list_filter = ("department",)
    search_fields = ("name", "department__name")


@admin.register(SeverityRule)
class SeverityRuleAdmin(admin.ModelAdmin):
    list_display = ("id", "code", "suggested_priority", "description")
    search_fields = ("code",)


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ("id", "name")
    search_fields = ("name",)


@admin.register(KnowledgeArticle)
class KnowledgeArticleAdmin(admin.ModelAdmin):
    list_display = ("article_id", "title", "category", "sub_category", "is_active", "updated_at")
    list_filter = ("category", "is_active")
    search_fields = ("article_id", "title", "tags", "content")
