from rest_framework import generics, permissions
from .models import Category, SubCategory, Priority, SLARule, Department, Team, SeverityRule, Product
from .serializers import (
    CategorySerializer,
    SubCategorySerializer,
    PrioritySerializer,
    SLARuleSerializer,
    DepartmentSerializer,
    TeamSerializer,
    SeverityRuleSerializer,
    ProductSerializer,
)


class CategoryListCreateView(generics.ListCreateAPIView):
    queryset = Category.objects.prefetch_related("sub_categories").all()
    serializer_class = CategorySerializer
    permission_classes = [permissions.AllowAny]


class CategoryDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [permissions.AllowAny]


class PriorityListView(generics.ListAPIView):
    queryset = Priority.objects.all().order_by("level")
    serializer_class = PrioritySerializer
    permission_classes = [permissions.AllowAny]


class SLARuleListView(generics.ListAPIView):
    queryset = SLARule.objects.select_related("priority").all()
    serializer_class = SLARuleSerializer
    permission_classes = [permissions.AllowAny]


class DepartmentListCreateView(generics.ListCreateAPIView):
    queryset = Department.objects.all()
    serializer_class = DepartmentSerializer
    permission_classes = [permissions.AllowAny]


class TeamListView(generics.ListAPIView):
    queryset = Team.objects.select_related("department").all()
    serializer_class = TeamSerializer
    permission_classes = [permissions.AllowAny]


class SeverityRuleListView(generics.ListAPIView):
    queryset = SeverityRule.objects.all()
    serializer_class = SeverityRuleSerializer
    permission_classes = [permissions.AllowAny]


class ProductListView(generics.ListAPIView):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    permission_classes = [permissions.AllowAny]
