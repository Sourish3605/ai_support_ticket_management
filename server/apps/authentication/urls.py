from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import GoogleLoginView, LoginView, RegisterView

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token-refresh'),
    path('refresh/', TokenRefreshView.as_view(), name='token-refresh-alias'),
    path('google/', GoogleLoginView.as_view(), name='google-login'),
    path('google-login/', GoogleLoginView.as_view(), name='google-login-alias'),
]
