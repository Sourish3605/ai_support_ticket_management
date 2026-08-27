from django.http import JsonResponse
from django.urls import include, path


def home(request):
    return JsonResponse({
        'name': 'AI Support Ticket Management API',
        'status': 'running',
        'version': '1.0.0',
        'endpoints': {
            'login': 'POST /api/auth/login',
            'create_ticket': 'POST /api/tickets',
            'my_tickets': 'GET /api/tickets/my',
            'ticket_detail': 'GET /api/tickets/:id',
            'agent_tickets': 'GET /api/agent/tickets',
            'update_status': 'PATCH /api/tickets/:id/status',
            'ticket_reply': 'POST /api/tickets/:id/reply',
            'ticket_assign': 'PATCH /api/tickets/:id/assign',
        }
    })


urlpatterns = [
    path('', home, name='home'),
    path('api/auth/', include('apps.authentication.urls')),
    path('api/support/', include('apps.support.urls')),
    path('api/masterdata/', include('masterdata.urls')),
    # Direct /api/tickets and /api/agent/ routing
    path('api/', include('apps.support.urls')),
    # Fallback routes without /api/ prefix
    path('auth/', include('apps.authentication.urls')),
    path('support/', include('apps.support.urls')),
    path('masterdata/', include('masterdata.urls')),
]
