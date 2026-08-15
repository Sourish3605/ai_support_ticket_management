
from rest_framework import generics, permissions

from .models import (
    Category,
    SubCategory,
    Priority,
    SLARule,
    Team,
    Product,
)

from .serializers import (
    CategorySerializer,
    SubCategorySerializer,
    PrioritySerializer,
    SLARuleSerializer,
    TeamSerializer,
    ProductSerializer,
)


class CategoryListView(generics.ListAPIView):
    queryset = Category.objects.prefetch_related("sub_categories").all()
    serializer_class = CategorySerializer
    permission_classes = [permissions.IsAuthenticated]


class SubCategoryListView(generics.ListAPIView):
    queryset = SubCategory.objects.all()
    serializer_class = SubCategorySerializer
    permission_classes = [permissions.IsAuthenticated]


class PriorityListView(generics.ListAPIView):
    queryset = Priority.objects.all().order_by("level")
    serializer_class = PrioritySerializer
    permission_classes = [permissions.IsAuthenticated]


class SLARuleListView(generics.ListAPIView):
    queryset = SLARule.objects.select_related("priority").all()
    serializer_class = SLARuleSerializer
    permission_classes = [permissions.IsAuthenticated]


class TeamListView(generics.ListAPIView):
    queryset = Team.objects.all()
    serializer_class = TeamSerializer
    permission_classes = [permissions.IsAuthenticated]


class ProductListView(generics.ListAPIView):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    permission_classes = [permissions.IsAuthenticated]