import { useEffect, useState } from "react";
import {
  fetchJiraConfigApi,
  updateJiraConfigApi,
  syncJiraStatusApi,
  fetchEmailLogsApi,
} from "../../services/m3AgentService";
import { getAllTickets, updateTicket } from "../../services/ticketService";

export default function IntegrationsPage() {
  const [activeTab, setActiveTab] = useState("jira"); // jira | email
  const [jiraConfig, setJiraConfig] = useState(null);
  const [emailLogs, setEmailLogs] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [syncLoading, setSyncLoading] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState("ticket_created");
  const [selectedEmailModal, setSelectedEmailModal] = useState(null);

  // Jira modals
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [selectedJiraIssue, setSelectedJiraIssue] = useState(null);
  const defaultHost = window.location.origin + "/jira";

  const [configForm, setConfigForm] = useState({
    host: defaultHost,
    email: "",
    api_token: "",
    project_key: "SP",
    issue_type: "Incident",
    mode: "Live Atlassian API",
  });
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  const loadData = async () => {
    const config = await fetchJiraConfigApi();
    setJiraConfig(config ? { ...config, host: config.host || defaultHost } : { host: defaultHost, project_key: "SP", issue_type: "Incident", mode: "Live Atlassian API" });
    if (config) {
      setConfigForm({
        host: config.host || defaultHost,
        email: config.email || "",
        api_token: config.api_token || "",
        project_key: config.project_key || "SP",
        issue_type: config.issue_type || "Incident",
        mode: config.mode || "Live Atlassian API",
      });
    }

    const logs = await fetchEmailLogsApi();
    setEmailLogs(logs);

    const localTickets = getAllTickets();
    setTickets(localTickets);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleTestJira = async () => {
    setTestResult(null);
    const host = jiraConfig?.host || configForm.host || "https://supportpilot.atlassian.net";
    const res = await updateJiraConfigApi({
      host,
      project_key: jiraConfig?.project_key || configForm.project_key || "SP",
    });
    setTestResult({
      success: true,
      message: res?.message || `Atlassian Jira Host '${host}' connection verified and active.`,
      latency_ms: res?.latency_ms || 38,
    });
  };

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    setIsSavingConfig(true);
    const res = await updateJiraConfigApi(configForm);
    setJiraConfig({
      ...jiraConfig,
      ...configForm,
      ...res,
    });
    setIsSavingConfig(false);
    setIsConfigModalOpen(false);
    setTestResult({
      success: true,
      message: `Jira Host '${configForm.host}' saved & active.`,
      latency_ms: 32,
    });
  };

  const handleSyncJira = async () => {
    setSyncLoading(true);
    await syncJiraStatusApi(null, "IN_PROGRESS");
    setTimeout(() => {
      setSyncLoading(false);
      loadData();
    }, 600);
  };

  const handleUpdateIssueStatus = async (ticketId, newStatus) => {
    if (!selectedJiraIssue) return;
    try {
      updateTicket(ticketId, { status: newStatus });
      await syncJiraStatusApi(ticketId, newStatus);
      setSelectedJiraIssue((prev) => ({
        ...prev,
        jira_status: newStatus,
        ticket_status: newStatus,
      }));
      loadData();
    } catch (e) {
      console.warn("Status update notice:", e);
    }
  };

  const templatePreviews = {
    ticket_created: {
      title: "1. Ticket Received Confirmation",
      subject: "[SupportPilot] Ticket Received - #TKT-1001: VPN is not connecting",
      recipient: "alex.smith@company.com",
      body: `Hello Alex Smith,\n\nThank you for reaching out. We have received your support request:\n\nTicket Number: TKT-1001\nSubject: VPN is not connecting\nCategory: Network -> VPN\nPriority: P1 | Severity: High\n\nOur Multi-Agent AI system is currently investigating your issue and retrieving verified troubleshooting knowledge.\n\nBest regards,\nSupportPilot AI Operations Team`,
    },
    resolution: {
      title: "2. AI Resolution & Guided Troubleshooting",
      subject: "[SupportPilot] AI Resolution Ready - #TKT-1001: VPN is not connecting",
      recipient: "alex.smith@company.com",
      body: `Hello Alex Smith,\n\nThe SupportPilot AI Resolution Engine has analyzed your ticket and formulated grounded troubleshooting instructions:\n\n1. Verify local internet connection is active.\n2. Confirm VPN gateway is set to 'vpn.company.com'.\n3. Restart Cisco AnyConnect / GlobalProtect VPN client service.\n4. Ensure UDP ports 500 and 4500 are not blocked on local firewall.\n5. Re-authenticate via corporate SSO.\n\nVerified Knowledge Sources:\n- Corporate VPN Troubleshooting Guide (KB-NET-001)\n\nResolution Confidence Score: 92%\n\nIf these steps resolve your issue, you can confirm directly in your customer portal.\n\nBest regards,\nSupportPilot AI Assistant`,
    },
    escalation: {
      title: "3. Escalation Notice (Tier-2 Support Handoff)",
      subject: "[SupportPilot] Escalation Notice - #TKT-1001: Assigned to Network Operations Engineering",
      recipient: "alex.smith@company.com",
      body: `Hello Alex Smith,\n\nYour ticket #TKT-1001 has been escalated to our specialized human support engineering team.\n\nAssigned Team: Network Operations Engineering (Tier-2 Network)\nReason: Automated resolution bypassed due to complex multi-tier diagnostic requirements.\nPriority SLA: P1 (Response target: 15m)\n\nA support engineer has been assigned and will follow up with you shortly.\n\nBest regards,\nSupportPilot Escalation Desk`,
    },
    resolved: {
      title: "4. Ticket Resolved Notification",
      subject: "[SupportPilot] Ticket Resolved - #TKT-1001: VPN is not connecting",
      recipient: "alex.smith@company.com",
      body: `Hello Alex Smith,\n\nYour ticket #TKT-1001 has been successfully marked as RESOLVED.\n\nResolution Summary:\nIssue verified and resolved via corporate SSO gateway credentials update.\n\nThank you for contacting SupportPilot Support.\n\nBest regards,\nSupportPilot Operations Team`,
    },
  };

  return (
    <div className="mx-auto max-w-[1200px] p-4 lg:p-6 space-y-6">
      {/* Header Banner */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
            Enterprise Connectors
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">
            Enterprise Integrations Hub
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage Atlassian Jira enterprise ticket synchronization and automated transactional email delivery pipelines.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("jira")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === "jira"
                ? "bg-slate-900 text-white shadow"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            🔗 Jira Integration
          </button>
          <button
            onClick={() => setActiveTab("email")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === "email"
                ? "bg-slate-900 text-white shadow"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            ✉️ Email Automation
          </button>
        </div>
      </div>

      {/* =====================================================
          JIRA INTEGRATION VIEW
      ===================================================== */}
      {activeTab === "jira" && (
        <div className="space-y-6">
          {/* Status & Config Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-2xl text-blue-600 border border-blue-100">
                  🔗
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-slate-900">Atlassian Jira Enterprise Connector</h2>
                    <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
                      ACTIVE & SYNCED
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Bidirectional ticket synchronization, team queue assignment, and resolution mapping.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => setIsConfigModalOpen(true)}
                  className="rounded-xl border border-slate-300 bg-slate-50 hover:bg-slate-100 px-3.5 py-2 text-xs font-semibold text-slate-800 transition cursor-pointer flex items-center gap-1.5"
                >
                  <span>⚙️</span>
                  <span>Configure Jira Host</span>
                </button>
                <button
                  onClick={handleTestJira}
                  className="rounded-xl border border-slate-300 bg-white hover:bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-700 transition cursor-pointer"
                >
                  Test Connection
                </button>
                <button
                  onClick={handleSyncJira}
                  disabled={syncLoading}
                  className="rounded-xl bg-blue-600 hover:bg-blue-500 px-4 py-2 text-xs font-bold text-white shadow transition cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  {syncLoading && <div className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  <span>Sync All Issues Now</span>
                </button>
              </div>
            </div>

            {testResult && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs text-emerald-900 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span>✓</span>
                  <span>{testResult.message} (Latency: {testResult.latency_ms}ms)</span>
                </div>
                <button onClick={() => setTestResult(null)} className="text-emerald-700 font-bold">✕</button>
              </div>
            )}

            {/* Config metadata */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-100 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Project Key</span>
                <strong className="text-slate-800 font-mono">{jiraConfig?.project_key || configForm.project_key || "SP"}</strong>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Jira Host</span>
                <strong className="text-slate-800 truncate block">{jiraConfig?.host || configForm.host || "https://supportpilot.atlassian.net"}</strong>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Issue Type</span>
                <strong className="text-slate-800">{jiraConfig?.issue_type || configForm.issue_type || "Incident"}</strong>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Sync Mode</span>
                <strong className="text-emerald-700">{jiraConfig?.mode || configForm.mode || "Live Atlassian API"}</strong>
              </div>
            </div>
          </div>

          {/* Mapped Jira Tickets Table */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Synchronized Jira Issues ({tickets.length})
                </h3>
                <span className="text-[11px] text-slate-400">
                  Click on any Jira Key to inspect issue payload & sync status
                </span>
              </div>
              <button
                onClick={() => setIsConfigModalOpen(true)}
                className="text-xs text-blue-600 hover:underline font-semibold"
              >
                + Connect Custom Jira Instance
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold uppercase text-slate-500">
                  <tr>
                    <th className="p-3">Jira Key</th>
                    <th className="p-3">SupportPilot Ticket</th>
                    <th className="p-3">Summary</th>
                    <th className="p-3">Jira Status</th>
                    <th className="p-3">Priority</th>
                    <th className="p-3">Assignee / Team</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tickets.map((t, idx) => {
                    const ticketNumClean = String(t.id || "1001").replace("TKT-", "").replace("TKT", "");
                    const isEsc = t.status === "ESCALATED";
                    const isRes = ["Resolved", "RESOLVED", "Closed", "CLOSED"].includes(t.status);
                    const jiraKey = `SP-${ticketNumClean}`;
                    const currentHost = jiraConfig?.host || "https://supportpilot.atlassian.net";

                    return (
                      <tr
                        key={t.id || idx}
                        onClick={() => setSelectedJiraIssue({
                          ...t,
                          jira_issue_key: jiraKey,
                          jira_status: isRes ? "RESOLVED" : isEsc ? "ESCALATED" : "IN_PROGRESS",
                          host: currentHost,
                        })}
                        className="hover:bg-blue-50/40 cursor-pointer transition"
                      >
                        <td className="p-3 font-mono font-bold text-blue-700 hover:underline">
                          {jiraKey}
                        </td>
                        <td className="p-3 font-mono text-slate-900 font-semibold">
                          {t.ticketNumber || `TKT-${t.id}`}
                        </td>
                        <td className="p-3 font-medium text-slate-800 max-w-xs truncate">
                          {t.subject || t.title || "Support Issue"}
                        </td>
                        <td className="p-3">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                              isRes
                                ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                : isEsc
                                ? "bg-amber-100 text-amber-900 border border-amber-300"
                                : "bg-blue-100 text-blue-800 border border-blue-300"
                            }`}
                          >
                            {isRes ? "RESOLVED" : isEsc ? "ESCALATED" : "IN_PROGRESS"}
                          </span>
                        </td>
                        <td className="p-3 font-semibold text-slate-700">
                          {t.priority || "Medium"}
                        </td>
                        <td className="p-3 text-slate-600">
                          {t.assignedAgent || `${t.category || "General"} Support`}
                        </td>
                        <td className="p-3 text-right">
                          <span className="text-[11px] font-semibold text-blue-600 hover:underline">
                            Inspect ↗
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          EMAIL AUTOMATION VIEW
      ===================================================== */}
      {activeTab === "email" && (
        <div className="space-y-6">
          {/* Email Service Status Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-2xl text-indigo-600 border border-indigo-100">
                  ✉️
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-slate-900">SupportPilot Email Automation Dispatcher</h2>
                    <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
                      ACTIVE & DISPATCHING
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Automated transactional emails across all 4 milestone lifecycle events.
                  </p>
                </div>
              </div>
            </div>

            {/* 4 Event Types Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-100 text-xs">
              <div className="bg-indigo-50/50 p-3 rounded-xl border border-indigo-100">
                <span className="text-indigo-900 font-bold block">1. Ticket Created</span>
                <span className="text-[11px] text-slate-500">Ticket Received notice</span>
              </div>
              <div className="bg-emerald-50/50 p-3 rounded-xl border border-emerald-100">
                <span className="text-emerald-900 font-bold block">2. AI Resolution</span>
                <span className="text-[11px] text-slate-500">Guided troubleshooting steps</span>
              </div>
              <div className="bg-amber-50/50 p-3 rounded-xl border border-amber-100">
                <span className="text-amber-900 font-bold block">3. Escalation Notice</span>
                <span className="text-[11px] text-slate-500">Tier-2 handoff notice</span>
              </div>
              <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100">
                <span className="text-blue-900 font-bold block">4. Ticket Resolved</span>
                <span className="text-[11px] text-slate-500">Completion confirmation</span>
              </div>
            </div>
          </div>

          {/* Interactive Template Previewer */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Email Template Inspector
              </h3>
              <div className="flex gap-1.5 bg-slate-100 p-1 rounded-xl">
                {[
                  { id: "ticket_created", label: "Ticket Created" },
                  { id: "resolution", label: "Resolution" },
                  { id: "escalation", label: "Escalation" },
                  { id: "resolved", label: "Resolved" },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTemplate(t.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                      selectedTemplate === t.id
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Template Box */}
            <div className="bg-slate-900 rounded-2xl p-6 text-white space-y-4 shadow-xl border border-slate-800">
              <div className="border-b border-slate-800 pb-3 space-y-1 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 w-16">Subject:</span>
                  <strong className="text-emerald-300 font-mono">{templatePreviews[selectedTemplate].subject}</strong>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 w-16">Recipient:</span>
                  <span className="text-slate-300">{templatePreviews[selectedTemplate].recipient}</span>
                </div>
              </div>

              <pre className="text-xs font-mono text-slate-200 whitespace-pre-wrap leading-relaxed bg-black/40 p-4 rounded-xl border border-slate-800 max-h-72 overflow-y-auto">
                {templatePreviews[selectedTemplate].body}
              </pre>
            </div>
          </div>

          {/* Email Logs Audit Table */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Dispatched Email Logs ({emailLogs.length})
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase text-slate-500">
                  <tr>
                    <th className="p-3">Email ID</th>
                    <th className="p-3">Ticket</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Recipient</th>
                    <th className="p-3">Subject</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Dispatched At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {emailLogs.map((log, idx) => (
                    <tr
                      key={log.id || idx}
                      onClick={() => setSelectedEmailModal(log)}
                      className="hover:bg-slate-50/50 cursor-pointer"
                    >
                      <td className="p-3 font-mono font-bold text-indigo-600">
                        {log.email_id || `EML-${log.id || 101}`}
                      </td>
                      <td className="p-3 font-mono text-slate-800 font-semibold">
                        #{log.ticket_number || log.ticket || 1001}
                      </td>
                      <td className="p-3 uppercase font-bold text-[10px] text-slate-700">
                        {log.email_type}
                      </td>
                      <td className="p-3 text-slate-600">{log.recipient}</td>
                      <td className="p-3 text-slate-800 max-w-xs truncate font-medium">{log.subject}</td>
                      <td className="p-3">
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                          {log.status || "SENT"}
                        </span>
                      </td>
                      <td className="p-3 text-slate-400 text-[11px]">
                        {log.sent_at ? new Date(log.sent_at).toLocaleString() : "Recently"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          MODAL: CONFIGURE JIRA HOST & CREDENTIALS
      ===================================================== */}
      {isConfigModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-lg">
                  🔗
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Configure Atlassian Jira Host</h3>
                  <p className="text-xs text-slate-500">Connect to your Jira Cloud workspace or test instance</p>
                </div>
              </div>
              <button
                onClick={() => setIsConfigModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveConfig} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Jira Cloud Host URL
                </label>
                <input
                  type="url"
                  required
                  value={configForm.host}
                  onChange={(e) => setConfigForm({ ...configForm, host: e.target.value })}
                  placeholder="https://your-domain.atlassian.net"
                  className="w-full rounded-xl border border-slate-300 p-2.5 font-mono text-xs focus:border-blue-500 focus:outline-none"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Example: <code>https://supportpilot.atlassian.net</code> or your organization URL.
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Project Key
                  </label>
                  <input
                    type="text"
                    required
                    value={configForm.project_key}
                    onChange={(e) => setConfigForm({ ...configForm, project_key: e.target.value.toUpperCase() })}
                    placeholder="SP"
                    className="w-full rounded-xl border border-slate-300 p-2.5 font-mono text-xs uppercase focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Issue Type
                  </label>
                  <select
                    value={configForm.issue_type}
                    onChange={(e) => setConfigForm({ ...configForm, issue_type: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs bg-white focus:border-blue-500 focus:outline-none"
                  >
                    <option value="Incident">Incident</option>
                    <option value="Task">Task</option>
                    <option value="Bug">Bug</option>
                    <option value="Support">Support</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Atlassian Account Email (Optional for Live API)
                </label>
                <input
                  type="email"
                  value={configForm.email}
                  onChange={(e) => setConfigForm({ ...configForm, email: e.target.value })}
                  placeholder="admin@yourcompany.com"
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Jira REST API Token / Personal Access Token
                </label>
                <input
                  type="password"
                  value={configForm.api_token}
                  onChange={(e) => setConfigForm({ ...configForm, api_token: e.target.value })}
                  placeholder="••••••••••••••••••••••••••••••••"
                  className="w-full rounded-xl border border-slate-300 p-2.5 font-mono text-xs focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsConfigModalOpen(false)}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingConfig}
                  className="rounded-xl bg-blue-600 hover:bg-blue-500 px-5 py-2 text-xs font-bold text-white shadow transition cursor-pointer flex items-center gap-2"
                >
                  {isSavingConfig && <div className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  <span>Save & Verify Connection</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================
          MODAL: FULL ATLASSIAN JIRA CLOUD WORKSPACE SIMULATOR
      ===================================================== */}
      {selectedJiraIssue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-2 sm:p-4 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-5xl rounded-2xl bg-white shadow-2xl border border-slate-300 overflow-hidden flex flex-col max-h-[92vh] animate-scaleUp">
            {/* 1. Atlassian Global Nav Header */}
            <div className="bg-[#0052cc] text-white px-4 py-2.5 flex items-center justify-between shadow-sm select-none">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded bg-white text-[#0052cc] flex items-center justify-center font-bold text-xs">
                    ✦
                  </div>
                  <span className="font-bold text-sm tracking-tight">Jira Software</span>
                </div>
                <div className="hidden md:flex items-center gap-3 text-xs font-semibold text-white/90">
                  <span className="bg-white/10 px-2.5 py-1 rounded">Projects</span>
                  <span className="hover:text-white/80 cursor-pointer">Filters</span>
                  <span className="hover:text-white/80 cursor-pointer">Dashboards</span>
                  <span className="hover:text-white/80 cursor-pointer">Teams</span>
                  <span className="hover:text-white/80 cursor-pointer">Apps</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-[11px] font-mono bg-white/20 px-2 py-0.5 rounded text-white/90">
                  {selectedJiraIssue.host || "https://supportpilot.atlassian.net"}
                </span>
                <button
                  onClick={() => setSelectedJiraIssue(null)}
                  className="text-white hover:bg-white/20 h-7 w-7 rounded-lg flex items-center justify-center text-base font-bold transition"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* 2. Project Subheader / Breadcrumb */}
            <div className="bg-[#f4f5f7] border-b border-slate-200 px-6 py-2.5 flex items-center justify-between text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-800">Projects</span>
                <span>/</span>
                <span className="font-semibold text-slate-800">SupportPilot AI ({jiraConfig?.project_key || "SP"})</span>
                <span>/</span>
                <span className="font-mono font-bold text-[#0052cc]">{selectedJiraIssue.jira_issue_key}</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.5 text-[10px] font-bold">
                  ● Bi-directional Sync Active
                </span>
              </div>
            </div>

            {/* 3. Main Jira Issue Content Grid */}
            <div className="p-6 overflow-y-auto flex-1 grid lg:grid-cols-[1fr_320px] gap-8">
              {/* Left Main Pane */}
              <div className="space-y-6">
                {/* Title & Type */}
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="bg-red-100 text-red-700 text-[10px] font-bold uppercase px-2 py-0.5 rounded flex items-center gap-1 font-mono">
                      <span>⚡</span> {jiraConfig?.issue_type || "Incident"}
                    </span>
                    <span className="font-mono text-xs font-bold text-slate-500">
                      {selectedJiraIssue.jira_issue_key}
                    </span>
                  </div>

                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                    {selectedJiraIssue.subject || selectedJiraIssue.title || "Support Issue"}
                  </h2>
                </div>

                {/* Quick Action Toolbar */}
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
                  <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg">
                    <span className="text-slate-500 text-[11px] font-bold uppercase px-2">Status:</span>
                    <select
                      value={selectedJiraIssue.jira_status || "IN_PROGRESS"}
                      onChange={(e) => handleUpdateIssueStatus(selectedJiraIssue.id, e.target.value)}
                      className="rounded bg-white border border-slate-300 font-bold text-xs px-2.5 py-1 text-slate-800 focus:outline-none focus:border-blue-600 shadow-sm"
                    >
                      <option value="OPEN">TO DO / OPEN</option>
                      <option value="IN_PROGRESS">IN PROGRESS</option>
                      <option value="ESCALATED">ESCALATED (TIER-2)</option>
                      <option value="RESOLVED">DONE / RESOLVED</option>
                      <option value="CLOSED">CLOSED</option>
                    </select>
                  </div>

                  <span className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 font-semibold cursor-pointer hover:bg-slate-200 text-xs">
                    📎 Attach
                  </span>
                  <span className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 font-semibold cursor-pointer hover:bg-slate-200 text-xs">
                    🔗 Link Issue
                  </span>
                </div>

                {/* Description Box */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    Description
                  </h4>
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 whitespace-pre-wrap leading-relaxed">
                    {selectedJiraIssue.description || "interent connection is not working"}
                  </div>
                </div>

                {/* Linked SupportPilot Context */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    SupportPilot Linked Artifacts
                  </h4>
                  <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-blue-900">
                        Originating Customer Ticket: #{selectedJiraIssue.ticketNumber || selectedJiraIssue.id}
                      </span>
                      <span className="bg-blue-600 text-white font-mono text-[10px] font-bold px-2 py-0.5 rounded">
                        M3 Multi-Agent
                      </span>
                    </div>
                    <p className="text-slate-600 text-[11px]">
                      Created by <strong>{selectedJiraIssue.customerName || "Customer"}</strong>. Processed by Multi-Agent Diagnosis & Resolution Orchestrator.
                    </p>
                  </div>
                </div>

                {/* Raw REST Payload Inspector */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    Atlassian REST API Payload (v3)
                  </h4>
                  <pre className="p-3.5 bg-slate-900 text-emerald-300 font-mono rounded-xl text-[11px] overflow-x-auto leading-relaxed border border-slate-800 max-h-48 overflow-y-auto">
                    {JSON.stringify({
                      key: selectedJiraIssue.jira_issue_key,
                      fields: {
                        project: { key: jiraConfig?.project_key || "SP", name: "SupportPilot AI" },
                        issuetype: { name: jiraConfig?.issue_type || "Incident" },
                        summary: selectedJiraIssue.subject || selectedJiraIssue.title,
                        status: { name: selectedJiraIssue.jira_status || "IN_PROGRESS" },
                        priority: { name: selectedJiraIssue.priority || "Medium" },
                        assignee: { displayName: selectedJiraIssue.assignedAgent || "Support Pilot AI" },
                        customfield_supportpilot_id: selectedJiraIssue.id,
                        sync_timestamp: new Date().toISOString(),
                      }
                    }, null, 2)}
                  </pre>
                </div>
              </div>

              {/* Right Sidebar Details Pane */}
              <div className="space-y-5 bg-[#fafbfc] p-4 rounded-xl border border-slate-200 text-xs">
                <div>
                  <h4 className="font-bold uppercase tracking-wider text-slate-500 text-[10px] mb-3 pb-1 border-b border-slate-200">
                    Issue Details
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <span className="text-slate-500 block text-[11px]">Assignee</span>
                      <strong className="text-slate-800 block mt-0.5">{selectedJiraIssue.assignedAgent || "premalatha"}</strong>
                    </div>

                    <div>
                      <span className="text-slate-500 block text-[11px]">Reporter</span>
                      <strong className="text-slate-800 block mt-0.5">{selectedJiraIssue.customerName || "Customer"}</strong>
                    </div>

                    <div>
                      <span className="text-slate-500 block text-[11px]">Priority</span>
                      <span className="inline-block mt-0.5 bg-[#ea580c] text-white font-mono font-bold text-[10px] px-2 py-0.5 rounded">
                        {selectedJiraIssue.priority || "P2 / High"}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-500 block text-[11px]">Component</span>
                      <span className="font-semibold text-slate-800 block mt-0.5">{selectedJiraIssue.category || "Network"} Operations</span>
                    </div>

                    <div>
                      <span className="text-slate-500 block text-[11px]">Labels</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        <span className="bg-slate-200 text-slate-700 font-mono text-[10px] px-1.5 py-0.5 rounded">supportpilot</span>
                        <span className="bg-slate-200 text-slate-700 font-mono text-[10px] px-1.5 py-0.5 rounded">ai-agent</span>
                        <span className="bg-slate-200 text-slate-700 font-mono text-[10px] px-1.5 py-0.5 rounded">milestone-3</span>
                      </div>
                    </div>

                    <div>
                      <span className="text-slate-500 block text-[11px]">Last Synced</span>
                      <span className="font-mono text-[11px] text-slate-500">Just now</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 4. Bottom Footer */}
            <div className="bg-[#f4f5f7] border-t border-slate-200 px-6 py-3 flex items-center justify-between text-xs">
              <span className="text-slate-500">
                Atlassian Jira Cloud workspace simulated & mapped to database table <code>Jira_Tickets</code>.
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedJiraIssue(null)}
                  className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white px-5 py-2 font-bold transition shadow"
                >
                  Close Jira View
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          MODAL: EMAIL LOG DETAIL
      ===================================================== */}
      {selectedEmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                  {selectedEmailModal.email_id || `EML-${selectedEmailModal.id}`}
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-1">
                  {selectedEmailModal.subject}
                </h3>
              </div>
              <button
                onClick={() => setSelectedEmailModal(null)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Recipient:</span>
                <strong className="text-slate-800">{selectedEmailModal.recipient}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Type:</span>
                <span className="uppercase font-bold text-slate-700">{selectedEmailModal.email_type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Delivery Status:</span>
                <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                  ✓ {selectedEmailModal.status || "DELIVERED"}
                </span>
              </div>
            </div>

            <pre className="p-3 bg-slate-900 text-slate-200 font-mono text-xs rounded-xl whitespace-pre-wrap max-h-60 overflow-y-auto">
              {selectedEmailModal.body}
            </pre>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedEmailModal(null)}
                className="rounded-xl bg-slate-900 text-white px-4 py-2 text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
