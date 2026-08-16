from django.urls import path
from .views import TicketListCreateView, TicketDetailView, ClassifyTicketAPIView

urlpatterns = [
    path("tickets/", TicketListCreateView.as_view(), name="ticket-list-create"),
    path("tickets/<int:pk>/", TicketDetailView.as_view(), name="ticket-detail"),
    path("classify/", ClassifyTicketAPIView.as_view(), name="ticket-classify"),
]
