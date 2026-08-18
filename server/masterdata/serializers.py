from rest_framework import serializers
from .models import Category, SubCategory, Priority, SLARule, Department, Team, SeverityRule, Product, KnowledgeArticle


class SubCategorySerializer(serializers.ModelSerializer):
    category_name = serializers.ReadOnlyField(source="category.name")

    class Meta:
        model = SubCategory
        fields = "__all__"



class CategorySerializer(serializers.ModelSerializer):
    sub_categories = SubCategorySerializer(many=True, read_only=True)

    class Meta:
        model = Category
        fields = "__all__"


class PrioritySerializer(serializers.ModelSerializer):
    class Meta:
        model = Priority
        fields = "__all__"


class SLARuleSerializer(serializers.ModelSerializer):
    priority_name = serializers.ReadOnlyField(source="priority.name")

    class Meta:
        model = SLARule
        fields = "__all__"


class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = "__all__"


class TeamSerializer(serializers.ModelSerializer):
    department_name = serializers.ReadOnlyField(source="department.name")

    class Meta:
        model = Team
        fields = "__all__"


class SeverityRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = SeverityRule
        fields = "__all__"


class ProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = "__all__"


class KnowledgeArticleSerializer(serializers.ModelSerializer):
    class Meta:
        model = KnowledgeArticle
        fields = "__all__"

