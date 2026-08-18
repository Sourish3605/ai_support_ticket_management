from django.urls import path
from .views import (
    CategoryListCreateView,
    CategoryDetailView,
    SubCategoryListCreateView,
    SubCategoryDetailView,
    PriorityListCreateView,
    PriorityDetailView,
    KnowledgeArticleListCreateView,
    KnowledgeArticleDetailView,
    KnowledgeArticleUploadPDFView,
    SLARuleListView,
    DepartmentListCreateView,
    TeamListView,
    SeverityRuleListView,
    ProductListView,
)

urlpatterns = [
    path("categories/", CategoryListCreateView.as_view(), name="category-list-create"),
    path("categories/<int:pk>/", CategoryDetailView.as_view(), name="category-detail"),
    path("subcategories/", SubCategoryListCreateView.as_view(), name="subcategory-list-create"),
    path("subcategories/<int:pk>/", SubCategoryDetailView.as_view(), name="subcategory-detail"),
    path("priorities/", PriorityListCreateView.as_view(), name="priority-list-create"),
    path("priorities/<int:pk>/", PriorityDetailView.as_view(), name="priority-detail"),
    path("knowledge-articles/", KnowledgeArticleListCreateView.as_view(), name="knowledge-article-list-create"),
    path("knowledge-articles/upload-pdf/", KnowledgeArticleUploadPDFView.as_view(), name="knowledge-article-upload-pdf"),
    path("knowledge-articles/<int:pk>/", KnowledgeArticleDetailView.as_view(), name="knowledge-article-detail"),
    path("sla-rules/", SLARuleListView.as_view(), name="sla-rule-list"),
    path("departments/", DepartmentListCreateView.as_view(), name="department-list-create"),
    path("teams/", TeamListView.as_view(), name="team-list"),
    path("severity-rules/", SeverityRuleListView.as_view(), name="severity-rule-list"),
    path("products/", ProductListView.as_view(), name="product-list"),
]

