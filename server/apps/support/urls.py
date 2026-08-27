from django.urls import path, re_path

from .views import (
    TicketListCreateView,
    CustomerTicketListView,
    AgentTicketListView,
    TicketDetailView,
    TicketStatusUpdateView,
    TicketReplyCreateView,
    TicketAssignView,
    TicketClassificationView,
)
from .views_m3 import (
    AgentWorkflowStartView,
    AgentWorkflowDetailView,
    AgentWorkflowExecutionsView,
    DiagnosisAgentAPIView,
    RetrievalAgentAPIView,
    ResolutionAgentAPIView,
    EscalationAgentAPIView,
    AgentRunsListView,
    AgentRunDetailView,
    JiraTicketView,
    JiraSyncView,
    JiraConfigView,
    EmailTicketCreatedView,
    EmailResolutionView,
    EmailEscalationView,
    EmailResolvedView,
    EmailLogsView,
    ActivityLogsView,
)

urlpatterns = [
    # Customer / General Ticket Routes
    path("tickets", TicketListCreateView.as_view(), name="ticket-list-create-no-slash"),
    path("tickets/", TicketListCreateView.as_view(), name="ticket-list-create"),
    path("tickets/my", CustomerTicketListView.as_view(), name="customer-tickets-no-slash"),
    path("tickets/my/", CustomerTicketListView.as_view(), name="customer-tickets"),

    # Agent Queue Route
    path("agent/tickets", AgentTicketListView.as_view(), name="agent-tickets-no-slash"),
    path("agent/tickets/", AgentTicketListView.as_view(), name="agent-tickets"),

    # Individual Ticket Operations (by numeric ID or string ticket_number like TKT-1001)
    re_path(r"^tickets/(?P<pk>[A-Za-z0-9_-]+)/status/?$", TicketStatusUpdateView.as_view(), name="ticket-status-update"),
    re_path(r"^tickets/(?P<pk>[A-Za-z0-9_-]+)/reply/?$", TicketReplyCreateView.as_view(), name="ticket-reply-create"),
    re_path(r"^tickets/(?P<pk>[A-Za-z0-9_-]+)/assign/?$", TicketAssignView.as_view(), name="ticket-assign"),
    re_path(r"^tickets/(?P<pk>[A-Za-z0-9_-]+)/?$", TicketDetailView.as_view(), name="ticket-detail"),

    # Classification & Knowledge Routes (M1 / M2)
    path("classify", TicketClassificationView.as_view(), name="ticket-classify-no-slash"),
    path("classify/", TicketClassificationView.as_view(), name="ticket-classify"),

    # =====================================================
    # Milestone 3 Multi-Agent AI Workflow Routes
    # =====================================================
    path("agent/workflow/start", AgentWorkflowStartView.as_view(), name="agent-workflow-start-no-slash"),
    path("agent/workflow/start/", AgentWorkflowStartView.as_view(), name="agent-workflow-start"),
    re_path(r"^agent/workflow/(?P<ticketId>[A-Za-z0-9_-]+)/agents/?$", AgentWorkflowExecutionsView.as_view(), name="agent-workflow-executions"),
    re_path(r"^agent/workflow/(?P<ticketId>[A-Za-z0-9_-]+)/?$", AgentWorkflowDetailView.as_view(), name="agent-workflow-detail"),
    path("agent/diagnosis", DiagnosisAgentAPIView.as_view(), name="agent-diagnosis-no-slash"),
    path("agent/diagnosis/", DiagnosisAgentAPIView.as_view(), name="agent-diagnosis"),
    path("agent/retrieve", RetrievalAgentAPIView.as_view(), name="agent-retrieve-no-slash"),
    path("agent/retrieve/", RetrievalAgentAPIView.as_view(), name="agent-retrieve"),
    path("agent/resolve", ResolutionAgentAPIView.as_view(), name="agent-resolve-no-slash"),
    path("agent/resolve/", ResolutionAgentAPIView.as_view(), name="agent-resolve"),
    path("agent/escalate", EscalationAgentAPIView.as_view(), name="agent-escalate-no-slash"),
    path("agent/escalate/", EscalationAgentAPIView.as_view(), name="agent-escalate"),
    path("agent/runs", AgentRunsListView.as_view(), name="agent-runs-list-no-slash"),
    path("agent/runs/", AgentRunsListView.as_view(), name="agent-runs-list"),
    re_path(r"^agent/runs/(?P<runId>[A-Za-z0-9_-]+)/?$", AgentRunDetailView.as_view(), name="agent-run-detail"),

    # =====================================================
    # Milestone 3 Jira Integration Routes
    # =====================================================
    path("jira/tickets", JiraTicketView.as_view(), name="jira-tickets-create-no-slash"),
    path("jira/tickets/", JiraTicketView.as_view(), name="jira-tickets-create"),
    re_path(r"^jira/tickets/(?P<ticketId>[A-Za-z0-9_-]+)/?$", JiraTicketView.as_view(), name="jira-tickets-detail"),
    path("jira/sync", JiraSyncView.as_view(), name="jira-sync-no-slash"),
    path("jira/sync/", JiraSyncView.as_view(), name="jira-sync"),
    path("jira/config", JiraConfigView.as_view(), name="jira-config-no-slash"),
    path("jira/config/", JiraConfigView.as_view(), name="jira-config"),

    # =====================================================
    # Milestone 3 Email Automation Routes
    # =====================================================
    path("email/ticket-created", EmailTicketCreatedView.as_view(), name="email-ticket-created-no-slash"),
    path("email/ticket-created/", EmailTicketCreatedView.as_view(), name="email-ticket-created"),
    path("email/resolution", EmailResolutionView.as_view(), name="email-resolution-no-slash"),
    path("email/resolution/", EmailResolutionView.as_view(), name="email-resolution"),
    path("email/escalation", EmailEscalationView.as_view(), name="email-escalation-no-slash"),
    path("email/escalation/", EmailEscalationView.as_view(), name="email-escalation"),
    path("email/resolved", EmailResolvedView.as_view(), name="email-resolved-no-slash"),
    path("email/resolved/", EmailResolvedView.as_view(), name="email-resolved"),
    re_path(r"^email/logs/(?P<ticketId>[A-Za-z0-9_-]+)/?$", EmailLogsView.as_view(), name="email-logs-ticket"),
    path("email/logs", EmailLogsView.as_view(), name="email-logs-all-no-slash"),
    path("email/logs/", EmailLogsView.as_view(), name="email-logs-all"),

    # =====================================================
    # Milestone 3 Activity Logs Routes
    # =====================================================
    re_path(r"^activity/logs/(?P<ticketId>[A-Za-z0-9_-]+)/?$", ActivityLogsView.as_view(), name="activity-logs-ticket"),
]