from django.urls import path

from .views import (
    TicketListCreateView,
    TicketDetailView,
    TicketClassificationView,
)


urlpatterns = [
    path(
        "tickets/",
        TicketListCreateView.as_view(),
        name="ticket-list-create"
    ),

    path(
        "tickets/<int:pk>/",
        TicketDetailView.as_view(),
        name="ticket-detail"
    ),

    path(
        "classify/",
        TicketClassificationView.as_view(),
        name="ticket-classify"
    ),
]