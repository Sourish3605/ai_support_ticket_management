from django.urls import path

from .views import (
    CategoryListView,
    SubCategoryListView,
    PriorityListCreateView,
    SLARuleListView,
    TeamListView,
    ProductListView,
    KnowledgeArticleListCreateView,
    KnowledgeArticleDetailView,
)


urlpatterns = [
    path("categories/", CategoryListView.as_view()),
    path("subcategories/", SubCategoryListView.as_view()),
    path("priorities/", PriorityListCreateView.as_view()),
    path("sla-rules/", SLARuleListView.as_view()),
    path("teams/", TeamListView.as_view()),
    path("products/", ProductListView.as_view()),

    # Knowledge Articles
    path("knowledge-articles/", KnowledgeArticleListCreateView.as_view()),
    path("knowledge-articles/<int:pk>/", KnowledgeArticleDetailView.as_view()),
]