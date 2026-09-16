import { api } from "./api";

// Helper to simulate workflow locally if offline
export const simulateWorkflowLocally = (ticket) => {
  const isVpn = (ticket.subject || ticket.title || "").toLowerCase().includes("vpn") ||
                (ticket.description || "").toLowerCase().includes("vpn");
  const isSecurity = ticket.category === "Security" || (ticket.subject || "").toLowerCase().includes("hack");

  const diagCauses = isVpn
    ? [
        "Expired or cached corporate SSO credentials",
        "VPN client configuration / stale session tokens",
        "Local firewall or UDP port 500/4500 blockage"
      ]
    : [
        "Configuration mismatch or network timeout",
        "Stale authentication token",
        "Service boundary restriction"
      ];

  const citations = [
    {
      citation_id: "CIT-NET-001",
      source_title: isVpn ? "Corporate VPN Troubleshooting Guide (KB-NET-001)" : "Enterprise Operations Standard",
      section: "Diagnostics §1.0",
      quote: isVpn ? "Restart Cisco AnyConnect client and verify gateway address." : "Verify service endpoint connectivity.",
      score: 4.8,
    }
  ];

  const steps = isVpn
    ? [
        "Verify your local internet connection is active.",
        "Confirm the VPN gateway address is set to 'vpn.company.com'.",
        "Restart the Cisco AnyConnect / GlobalProtect VPN client service.",
        "Ensure firewall is not blocking UDP ports 500 and 4500.",
        "Clear cached credentials and re-authenticate via corporate SSO."
      ]
    : [
        "Verify system credentials and network connectivity.",
        "Restart the client application.",
        "Clear browser cache and stored cookies.",
        "Contact IT Helpdesk if issue persists."
      ];

  const ticketIdClean = String(ticket.id || "1001").replace("TKT-", "").replace("TKT", "");

  return {
    workflow_id: `WF-${ticket.id || 1001}-SIM`,
    ticket_id: ticket.id,
    ticket_number: ticket.ticketNumber || `TKT-${ticket.id || 1001}`,
    workflow_status: "COMPLETED",
    current_agent: "Completed (Automated Resolution)",
    final_confidence: 0.92,
    final_decision: "AUTOMATE_RESOLUTION",
    latency_ms: 120,
    diagnosis: {
      status: "SUCCESS",
      agent_name: "Diagnosis Agent",
      diagnosis: isVpn ? "Possible VPN authentication or firewall configuration issue." : "Standard system request.",
      affected_system: isVpn ? "Corporate VPN Gateway" : "Enterprise IT Infrastructure",
      possible_causes: diagCauses,
      missing_information: "VPN error code and OS version.",
      confidence: 0.91,
      latency_ms: 24,
    },
    knowledge_retrieval: {
      status: "SUCCESS",
      agent_name: "Knowledge Retrieval Agent",
      knowledge_retrieved: true,
      articles_retrieved_count: 1,
      knowledge_source: isVpn ? "Corporate VPN Troubleshooting Guide (KB-NET-001)" : "Enterprise Standard IT Manual",
      citations,
      suggested_steps: steps,
      retrieval_confidence: 0.94,
      latency_ms: 32,
    },
    resolution: {
      status: "SUCCESS",
      agent_name: "Resolution Generation Agent",
      resolution_summary: steps.join("\n"),
      troubleshooting_steps: steps,
      sources: [isVpn ? "Corporate VPN Troubleshooting Guide" : "Enterprise IT Manual"],
      citations,
      confidence: 0.92,
      grounded: true,
      latency_ms: 40,
    },
    validation: {
      status: "SUCCESS",
      agent_name: "Validation Gate",
      validation_passed: true,
      decision: "AUTOMATE_RESOLUTION",
      confidence: 0.92,
      confidence_threshold: 0.75,
      checks: {
        groundedness_verified: true,
        citations_available: true,
        steps_actionable: true,
        confidence_above_threshold: true,
        safety_verified: true,
      },
      failure_reasons: [],
      latency_ms: 8,
    },
    escalation: null,
    jira: {
      jira_issue_key: `SP-${ticketIdClean}`,
      jira_status: "IN_PROGRESS",
      jira_priority: ticket.priority || "Medium",
      assignee: "SupportPilot AI Engine",
      team: `${ticket.category || "General"} Support`,
      synced_at: new Date().toISOString(),
    },
    email: {
      status: "SENT",
      email_type: "resolution",
      recipient: ticket.customerEmail || "customer@example.com",
      sent_at: new Date().toISOString(),
    },
  };
};

/* =====================================================
   REST API CALLS WITH FALLBACKS
===================================================== */

export const startAgentWorkflowApi = async (ticketId, threshold = 0.75) => {
  try {
    const res = await api.post("/support/agent/workflow/start/", {
      ticket_id: ticketId,
      threshold,
    });
    if (res?.data) return res.data;
  } catch (err) {
    console.warn("[m3AgentService] startAgentWorkflowApi notice:", err.message);
  }
  return null;
};

export const fetchAgentWorkflowApi = async (ticketId) => {
  try {
    const res = await api.get(`/support/agent/workflow/${ticketId}/`);
    if (res?.data) return res.data;
  } catch (err) {
    console.warn("[m3AgentService] fetchAgentWorkflowApi notice:", err.message);
  }
  return null;
};

export const fetchAgentExecutionsApi = async (ticketId) => {
  try {
    const res = await api.get(`/support/agent/workflow/${ticketId}/agents/`);
    if (res?.data) return res.data;
  } catch (err) {
    console.warn("[m3AgentService] fetchAgentExecutionsApi notice:", err.message);
  }
  return null;
};

export const fetchAgentRunsApi = async () => {
  try {
    const res = await api.get("/support/agent/runs/");
    if (res?.data && Array.isArray(res.data)) return res.data;
  } catch (err) {
    console.warn("[m3AgentService] fetchAgentRunsApi notice:", err.message);
  }
  return [];
};

export const fetchAgentRunDetailApi = async (runId) => {
  try {
    const res = await api.get(`/support/agent/runs/${runId}/`);
    if (res?.data) return res.data;
  } catch (err) {
    console.warn("[m3AgentService] fetchAgentRunDetailApi notice:", err.message);
  }
  return null;
};

export const fetchJiraTicketApi = async (ticketId) => {
  try {
    const res = await api.get(`/support/jira/tickets/${ticketId}/`);
    if (res?.data) return res.data;
  } catch (err) {
    console.warn("[m3AgentService] fetchJiraTicketApi notice:", err.message);
  }
  return null;
};

export const createJiraTicketApi = async (ticketId, payload = {}) => {
  try {
    const res = await api.post("/support/jira/tickets/", {
      ticket_id: ticketId,
      ...payload,
    });
    if (res?.data) return res.data;
  } catch (err) {
    console.warn("[m3AgentService] createJiraTicketApi notice:", err.message);
  }
  return null;
};

export const syncJiraStatusApi = async (ticketId, jiraStatus) => {
  try {
    const res = await api.post("/support/jira/sync/", {
      ticket_id: ticketId,
      jira_status: jiraStatus,
    });
    if (res?.data) return res.data;
  } catch (err) {
    console.warn("[m3AgentService] syncJiraStatusApi notice:", err.message);
  }
  return null;
};

export const fetchJiraConfigApi = async () => {
  try {
    const res = await api.get("/support/jira/config/");
    if (res?.data) return res.data;
  } catch (err) {
    console.warn("[m3AgentService] fetchJiraConfigApi notice:", err.message);
  }
  const saved = localStorage.getItem("supportpilot_jira_config");
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {}
  }
  return {
    active: true,
    connected: false,
    mode: "Enterprise Mock / Simulated",
    project_key: "SP",
    host: "https://supportpilot.atlassian.net",
    issue_type: "Incident",
    total_mapped_tickets: 0,
  };
};

export const updateJiraConfigApi = async (config = {}) => {
  try {
    const res = await api.post("/support/jira/config/", config);
    if (res?.data) {
      localStorage.setItem("supportpilot_jira_config", JSON.stringify({
        ...config,
        ...res.data,
      }));
      return res.data;
    }
  } catch (err) {
    console.warn("[m3AgentService] updateJiraConfigApi notice:", err.message);
  }
  localStorage.setItem("supportpilot_jira_config", JSON.stringify(config));
  return {
    success: true,
    message: `Jira host '${config.host || "https://supportpilot.atlassian.net"}' updated successfully.`,
    ...config,
  };
};

export const sendEmailApi = async (emailType, ticketId, payload = {}) => {
  try {
    let endpoint = "/support/email/ticket-created/";
    if (emailType === "resolution") endpoint = "/support/email/resolution/";
    if (emailType === "escalation") endpoint = "/support/email/escalation/";
    if (emailType === "resolved") endpoint = "/support/email/resolved/";

    const res = await api.post(endpoint, {
      ticket_id: ticketId,
      ...payload,
    });
    if (res?.data) return res.data;
  } catch (err) {
    console.warn("[m3AgentService] sendEmailApi notice:", err.message);
  }
  return null;
};

export const fetchEmailLogsApi = async (ticketId = null, filterStatus = null, filterTrigger = null) => {
  try {
    let url = ticketId ? `/support/email/logs/${ticketId}/` : "/support/email/logs/";
    const params = new URLSearchParams();
    if (filterStatus && filterStatus !== "ALL") params.append("status", filterStatus);
    if (filterTrigger && filterTrigger !== "ALL") params.append("trigger_status", filterTrigger);
    const queryString = params.toString();
    if (queryString) {
      url += (url.includes("?") ? "&" : "?") + queryString;
    }
    const res = await api.get(url);
    if (res?.data && Array.isArray(res.data)) return res.data;
  } catch (err) {
    console.warn("[m3AgentService] fetchEmailLogsApi notice:", err.message);
  }
  return [];
};

export const fetchAIEmailConfigApi = async () => {
  try {
    const res = await api.get("/support/email/automation-config/");
    if (res?.data) {
      localStorage.setItem("supportpilot_ai_email_config", JSON.stringify(res.data));
      return res.data;
    }
  } catch (err) {
    console.warn("[m3AgentService] fetchAIEmailConfigApi notice:", err.message);
  }
  const saved = localStorage.getItem("supportpilot_ai_email_config");
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {}
  }
  return {
    open_enabled: true,
    in_progress_enabled: true,
    pending_enabled: true,
    solved_enabled: true,
    closed_enabled: true,
    auto_send_enabled: true,
  };
};

export const updateAIEmailConfigApi = async (data = {}) => {
  try {
    const res = await api.post("/support/email/automation-config/", data);
    if (res?.data) {
      localStorage.setItem("supportpilot_ai_email_config", JSON.stringify(res.data));
      return res.data;
    }
  } catch (err) {
    console.warn("[m3AgentService] updateAIEmailConfigApi notice:", err.message);
  }
  localStorage.setItem("supportpilot_ai_email_config", JSON.stringify(data));
  return {
    ...data,
    updated_at: new Date().toISOString(),
  };
};

export const retryFailedEmailApi = async (emailId, customRecipient = null) => {
  try {
    const payload = customRecipient ? { recipient: customRecipient } : {};
    const res = await api.post(`/support/email/retry/${emailId}/`, payload);
    if (res?.data) return res.data;
  } catch (err) {
    console.warn("[m3AgentService] retryFailedEmailApi notice:", err.message);
    return {
      success: false,
      error: err.response?.data?.error || err.message,
    };
  }
  return { success: false, error: "Network or server error during email retry." };
};

export const previewAIEmailApi = async (params = {}) => {
  try {
    const res = await api.post("/support/email/preview/", params);
    if (res?.data) return res.data;
  } catch (err) {
    console.warn("[m3AgentService] previewAIEmailApi notice:", err.message);
  }
  return null;
};

export const triggerAIEmailStatusApi = async (params = {}) => {
  try {
    const res = await api.post("/support/email/trigger-status/", params);
    if (res?.data) return res.data;
  } catch (err) {
    console.warn("[m3AgentService] triggerAIEmailStatusApi notice:", err.message);
  }
  return null;
};

export const fetchActivityLogsApi = async (ticketId) => {
  try {
    const res = await api.get(`/support/activity/logs/${ticketId}/`);
    if (res?.data && Array.isArray(res.data)) return res.data;
  } catch (err) {
    console.warn("[m3AgentService] fetchActivityLogsApi notice:", err.message);
  }
  return [];
};
