from django.urls import path

from .views import (
    CategoryListCreateView,
    CategoryDetailView,
    SubCategoryListCreateView,
    SubCategoryDetailView,
    PriorityListCreateView,
    PriorityDetailView,
    SLARuleListView,
    DepartmentListCreateView,
    TeamListView,
    SeverityRuleListView,
    ProductListView,
    KnowledgeArticleListCreateView,
    KnowledgeArticleDetailView,
    KnowledgeArticleUploadPDFView,
)


urlpatterns = [
    # Categories
    path("categories/", CategoryListCreateView.as_view(), name="category-list-create"),
    path("categories/<int:pk>/", CategoryDetailView.as_view(), name="category-detail"),

    # Subcategories
    path("subcategories/", SubCategoryListCreateView.as_view(), name="subcategory-list-create"),
    path("subcategories/<int:pk>/", SubCategoryDetailView.as_view(), name="subcategory-detail"),

    # Priorities
    path("priorities/", PriorityListCreateView.as_view(), name="priority-list-create"),
    path("priorities/<int:pk>/", PriorityDetailView.as_view(), name="priority-detail"),

    # Rules & Department Data
    path("sla-rules/", SLARuleListView.as_view(), name="sla-rules-list"),
    path("departments/", DepartmentListCreateView.as_view(), name="department-list-create"),
    path("teams/", TeamListView.as_view(), name="team-list"),
    path("severity-rules/", SeverityRuleListView.as_view(), name="severity-rules-list"),
    path("products/", ProductListView.as_view(), name="product-list"),

    # Knowledge Articles & PDF Upload
    path("knowledge-articles/", KnowledgeArticleListCreateView.as_view(), name="knowledge-article-list-create"),
    path("knowledge-articles/<int:pk>/", KnowledgeArticleDetailView.as_view(), name="knowledge-article-detail"),
    path("knowledge-articles/upload-pdf/", KnowledgeArticleUploadPDFView.as_view(), name="knowledge-article-upload-pdf"),
]