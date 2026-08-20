from rest_framework import serializers
from .models import (
    Category,
    SubCategory,
    Priority,
    SLARule,
    Team,
    Product,
    KnowledgeArticle,
)


class SubCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = SubCategory
        fields = ["id", "name", "category"]


class CategorySerializer(serializers.ModelSerializer):
    sub_categories = SubCategorySerializer(many=True, read_only=True)

    class Meta:
        model = Category
        fields = ["id", "name", "sub_categories"]


class PrioritySerializer(serializers.ModelSerializer):
    class Meta:
        model = Priority
        fields = ["id", "code", "name", "level"]


class SLARuleSerializer(serializers.ModelSerializer):
    priority = PrioritySerializer(read_only=True)

    class Meta:
        model = SLARule
        fields = [
            "id",
            "priority",
            "response_minutes",
            "resolution_hours",
            "coverage",
        ]


class TeamSerializer(serializers.ModelSerializer):
    class Meta:
        model = Team
        fields = ["id", "name"]


class ProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = ["id", "name"]
class KnowledgeArticleSerializer(serializers.ModelSerializer):
    class Meta:
        model = KnowledgeArticle
        fields = [
            "id",
            "article_id",
            "title",
            "category",
            "sub_category",
            "tags",
            "content",
            "steps",
            "source",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
        ]