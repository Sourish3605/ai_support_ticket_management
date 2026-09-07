from django.urls import path, re_path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    GoogleLoginView,
    LoginView,
    RegisterView,
    UserListCreateView,
    UserDetailDeleteView,
)

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token-refresh'),
    path('refresh/', TokenRefreshView.as_view(), name='token-refresh-alias'),
    path('google/', GoogleLoginView.as_view(), name='google-login'),
    path('google-login/', GoogleLoginView.as_view(), name='google-login-alias'),
    path('users/', UserListCreateView.as_view(), name='user-list-create'),
    re_path(r'^users/(?P<identifier>[^/]+)/?$', UserDetailDeleteView.as_view(), name='user-detail-delete'),
]

