from django.http import JsonResponse
from django.urls import include, path


def home(request):
    return JsonResponse({'message': 'API is running'})


urlpatterns = [
    path('', home, name='home'),
    path('api/auth/', include('apps.authentication.urls')),
    path('api/support/', include('apps.support.urls')),
    path('api/masterdata/', include('masterdata.urls')),
    # Fallback routes without /api/ prefix
    path('auth/', include('apps.authentication.urls')),
    path('support/', include('apps.support.urls')),
    path('masterdata/', include('masterdata.urls')),
]
