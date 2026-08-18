from django.urls import path

from .views import (
    CategoryListView,
    SubCategoryListView,
    PriorityListView,
    SLARuleListView,
    TeamListView,
    ProductListView,
)


urlpatterns = [
    path("categories/", CategoryListView.as_view()),
    path("subcategories/", SubCategoryListView.as_view()),
    path("priorities/", PriorityListView.as_view()),
    path("sla-rules/", SLARuleListView.as_view()),
    path("teams/", TeamListView.as_view()),
    path("products/", ProductListView.as_view()),
]