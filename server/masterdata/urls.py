from django.urls import path
from .views import (
    CategoryListCreateView,
    CategoryDetailView,
    PriorityListView,
    SLARuleListView,
    DepartmentListCreateView,
    TeamListView,
    SeverityRuleListView,
    ProductListView,
)

urlpatterns = [
    path("categories/", CategoryListCreateView.as_view(), name="category-list-create"),
    path("categories/<int:pk>/", CategoryDetailView.as_view(), name="category-detail"),
    path("priorities/", PriorityListView.as_view(), name="priority-list"),
    path("sla-rules/", SLARuleListView.as_view(), name="sla-rule-list"),
    path("departments/", DepartmentListCreateView.as_view(), name="department-list-create"),
    path("teams/", TeamListView.as_view(), name="team-list"),
    path("severity-rules/", SeverityRuleListView.as_view(), name="severity-rule-list"),
    path("products/", ProductListView.as_view(), name="product-list"),
]
