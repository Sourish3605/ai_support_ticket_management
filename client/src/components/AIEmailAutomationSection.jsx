import { useState, useEffect, useRef } from "react";
import {
  fetchAIEmailConfigApi,
  updateAIEmailConfigApi,
  fetchEmailLogsApi,
  retryFailedEmailApi,
  previewAIEmailApi,
  triggerAIEmailStatusApi,
} from "../services/m3AgentService";
import { getAllTickets } from "../services/ticketService";
import {
  FiMail,
  FiCheck,
  FiX,
  FiRefreshCw,
  FiEye,
  FiSend,
  FiInfo,
  FiSliders,
  FiClock,
  FiAlertTriangle,
  FiCheckCircle,
  FiLayers,
  FiZap,
} from "react-icons/fi";

const STATUS_ITEMS = [
  {
    statusKey: "OPEN",
    configKey: "open_enabled",
    statusLabel: "Open",
    emailTypeLabel: "Acknowledgement",
    badgeBg: "bg-blue-50 text-blue-700 border-blue-200",
    dotColor: "bg-blue-600",
    description: "Sends customer an acknowledgement with Ticket ID, subject, description summary, current status, and next step.",
    samplePrompt: "Generates customer greeting, ticket intake summary, department routing notice, and expected triage timeframe.",
  },
  {
    statusKey: "IN_PROGRESS",
    configKey: "in_progress_enabled",
    statusLabel: "In Progress",
    emailTypeLabel: "Progress Update",
    badgeBg: "bg-sky-50 text-sky-700 border-sky-200",
    dotColor: "bg-sky-600",
    description: "Informs the customer that their issue is actively being diagnosed by the assigned specialist.",
    samplePrompt: "Updates customer with assigned engineer details, active diagnosis status, and troubleshooting milestones.",
  },
  {
    statusKey: "PENDING",
    configKey: "pending_enabled",
    statusLabel: "Pending",
    emailTypeLabel: "Pending Information",
    badgeBg: "bg-amber-50 text-amber-700 border-amber-200",
    dotColor: "bg-amber-500",
    description: "Explains that the ticket is waiting for additional information/action; explicitly details what customer details are required.",
    samplePrompt: "Identifies missing logs, error codes, or account details and prompts customer with clear action instructions.",
  },
  {
    statusKey: "SOLVED",
    configKey: "solved_enabled",
    statusLabel: "Solved",
    emailTypeLabel: "Resolution",
    badgeBg: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dotColor: "bg-emerald-600",
    description: "Sends resolution summary, applied fix, and instructions/options if the issue is not actually resolved.",
    samplePrompt: "Summarizes the verified solution, knowledge base steps taken, and provides 48h reopen instructions.",
  },
  {
    statusKey: "CLOSED",
    configKey: "closed_enabled",
    statusLabel: "Closed",
    emailTypeLabel: "Closure",
    badgeBg: "bg-slate-100 text-slate-700 border-slate-200",
    dotColor: "bg-slate-500",
    description: "Sends a professional closure email thanking the customer and providing the ticket reference number.",
    samplePrompt: "Delivers a cordial thank you note, formal ticket reference, and invitation to submit future requests.",
  },
];

export default function AIEmailAutomationSection() {
  const [config, setConfig] = useState({
    open_enabled: true,
    in_progress_enabled: true,
    pending_enabled: true,
    solved_enabled: true,
    closed_enabled: true,
    auto_send_enabled: true,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [emailLogs, setEmailLogs] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [deliveryFilter, setDeliveryFilter] = useState("ALL");
  const [activeTab, setActiveTab] = useState("matrix"); // matrix | history | tester

  // Toast State
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState("success");
  const toastTimeoutRef = useRef(null);

  // Preview Modal
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [selectedStatusForPreview, setSelectedStatusForPreview] = useState("OPEN");
  const [selectedTicketId, setSelectedTicketId] = useState("");

  // Retry State
  const [retryingEmailId, setRetryingEmailId] = useState(null);

  // Email Detail View Modal
  const [viewEmailModal, setViewEmailModal] = useState(null);

  const triggerToast = (msg, type = "success") => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage(msg);
    setToastType(type);
    setShowToast(true);
    toastTimeoutRef.current = setTimeout(() => setShowToast(false), 3600);
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const cfg = await fetchAIEmailConfigApi();
      if (cfg) setConfig(cfg);
      const localTickets = getAllTickets();
      setTickets(localTickets);
      if (localTickets.length > 0 && !selectedTicketId) {
        setSelectedTicketId(localTickets[0].ticketNumber || localTickets[0].id);
      }
      const logs = await fetchEmailLogsApi(null, deliveryFilter, statusFilter);
      setEmailLogs(logs);
    } catch (e) {
      console.warn("Failed loading AI email data:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [deliveryFilter, statusFilter]);

  const handleToggle = async (key) => {
    const newConfig = {
      ...config,
      [key]: !config[key],
    };
    setConfig(newConfig);
    setIsSaving(true);
    try {
      const res = await updateAIEmailConfigApi(newConfig);
      if (res) setConfig((prev) => ({ ...prev, ...res }));
      triggerToast(`AI Email Automation setting '${key}' updated to ${newConfig[key] ? "ON" : "OFF"}.`, "success");
    } catch (e) {
      triggerToast(`Failed to update setting: ${e.message}`, "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenPreview = async (statusKey) => {
    setSelectedStatusForPreview(statusKey);
    setPreviewModalOpen(true);
    setPreviewLoading(true);

    const targetTkt = tickets.find((t) => (t.ticketNumber === selectedTicketId || String(t.id) === String(selectedTicketId))) || tickets[0] || {};

    try {
      const res = await previewAIEmailApi({
        status: statusKey,
        ticket_id: targetTkt.id || targetTkt.ticketNumber,
        title: targetTkt.subject || targetTkt.title || "VPN connectivity failing during peak hours",
        description: targetTkt.description || "User unable to connect to corporate gateway from home office network.",
        category: targetTkt.category || "Network",
        sub_category: targetTkt.subCategory || targetTkt.sub_category || "VPN",
        priority: targetTkt.priority || "High",
        recipient: targetTkt.customerEmail || "customer@example.com",
        extra_context: {
          resolution_notes: targetTkt.resolutionNotes || "Applied DNS flush and updated Cisco AnyConnect VPN profile v4.9.",
          info_needed: "Please provide VPN error code and Windows 11 build number.",
        }
      });
      if (res?.preview) {
        setPreviewData(res.preview);
      }
    } catch (e) {
      console.warn("Preview error:", e);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleRetryEmail = async (emailId) => {
    setRetryingEmailId(emailId);
    try {
      const res = await retryFailedEmailApi(emailId);
      if (res?.success) {
        triggerToast(`Email '${emailId}' retried successfully! Marked as SENT.`, "success");
        loadData();
      } else {
        triggerToast(`Retry failed: ${res?.error || "Unknown error"}`, "error");
      }
    } catch (e) {
      triggerToast(`Retry exception: ${e.message}`, "error");
    } finally {
      setRetryingEmailId(null);
    }
  };

  const handleTriggerTestEmail = async (statusKey) => {
    const targetTkt = tickets.find((t) => (t.ticketNumber === selectedTicketId || String(t.id) === String(selectedTicketId))) || tickets[0];
    if (!targetTkt) {
      triggerToast("No ticket selected for test trigger.", "error");
      return;
    }

    try {
      const res = await triggerAIEmailStatusApi({
        ticket_id: targetTkt.id || targetTkt.ticketNumber,
        status: statusKey,
        force: true,
        trigger_source: "Admin Manual Test Trigger",
      });
      if (res?.success) {
        triggerToast(`AI ${statusKey} email dispatched for #${targetTkt.ticketNumber || targetTkt.id}!`, "success");
        loadData();
      } else {
        triggerToast(`Email dispatch notice: ${res?.message || res?.failure_reason || "Suppressed or failed"}`, "info");
      }
    } catch (e) {
      triggerToast(`Error sending test email: ${e.message}`, "error");
    }
  };

  return (
    <div className="space-y-6">
      {/* Floating Toast Notification */}
      {showToast && (
        <div className="fixed top-6 right-6 z-50 animate-bounce">
          <div className={`flex items-start gap-3 rounded-2xl p-4 shadow-2xl border backdrop-blur-md max-w-md ${
            toastType === "success"
              ? "bg-slate-900/95 text-white border-emerald-500/40 shadow-emerald-950/40"
              : toastType === "error"
              ? "bg-slate-900/95 text-white border-rose-500/40 shadow-rose-950/40"
              : "bg-slate-900/95 text-white border-blue-500/40 shadow-blue-950/40"
          }`}>
            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl font-bold text-sm ${
              toastType === "success" ? "bg-emerald-500/20 text-emerald-400" : toastType === "error" ? "bg-rose-500/20 text-rose-400" : "bg-blue-500/20 text-blue-400"
            }`}>
              {toastType === "success" ? <FiCheck className="w-4 h-4" /> : toastType === "error" ? <FiAlertTriangle className="w-4 h-4" /> : <FiInfo className="w-4 h-4" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  {toastType === "success" ? "Operation Successful" : toastType === "error" ? "Action Notice" : "Information"}
                </h4>
                <button type="button" onClick={() => setShowToast(false)} className="text-slate-400 hover:text-white p-1 cursor-pointer">
                  <FiX className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">{toastMessage}</p>
            </div>
          </div>
        </div>
      )}

      {/* HEADER BANNER */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white rounded-2xl p-6 sm:p-7 shadow-lg border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-400 mb-1.5">
              <FiZap className="w-3.5 h-3.5 text-blue-400" />
              <span>AI-Based Automatic Email Notification System</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              AI Email Automation
            </h1>
            <p className="mt-1.5 max-w-2xl text-xs sm:text-sm text-slate-300 leading-relaxed">
              Automatically generates and dispatches context-rich, professional emails to customers whenever a support ticket transitions between statuses.
            </p>
          </div>

          {/* MASTER TOGGLE & REFRESH */}
          <div className="flex items-center gap-3 self-start md:self-auto">
            <button
              type="button"
              onClick={loadData}
              disabled={isLoading}
              className="flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 text-white px-3.5 py-2 text-xs font-semibold transition cursor-pointer border border-white/10"
              title="Refresh configuration and delivery logs"
            >
              <FiRefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
              <span>Sync</span>
            </button>

            <div className="flex items-center gap-2.5 bg-slate-800/80 border border-slate-700/80 rounded-xl px-4 py-2">
              <span className="text-xs font-bold text-slate-200">Master Automatic Send:</span>
              <button
                type="button"
                onClick={() => handleToggle("auto_send_enabled")}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  config.auto_send_enabled ? "bg-emerald-500" : "bg-slate-600"
                }`}
                role="switch"
                aria-checked={config.auto_send_enabled}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    config.auto_send_enabled ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
              <span className={`text-xs font-extrabold ${config.auto_send_enabled ? "text-emerald-400" : "text-slate-400"}`}>
                {config.auto_send_enabled ? "ON" : "OFF"}
              </span>
            </div>
          </div>
        </div>

        {/* NAVIGATION TABS */}
        <div className="mt-6 flex items-center gap-2 border-t border-slate-800/80 pt-4 overflow-x-auto">
          {[
            { id: "matrix", label: "Status & AI Email Matrix", icon: FiSliders },
            { id: "history", label: "Email Delivery History & Audit Logs", icon: FiClock, badge: emailLogs.length },
            { id: "tester", label: "Live AI Email Simulator & Tester", icon: FiEye },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition cursor-pointer shrink-0 ${
                  isActive
                    ? "bg-blue-600 text-white shadow-md shadow-blue-900/30"
                    : "bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {tab.badge !== undefined && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${isActive ? "bg-white text-blue-700" : "bg-slate-800 text-slate-300"}`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* =========================================================
          TAB 1: STATUS & AI EMAIL CONFIGURATION MATRIX (REQUIRED)
      ========================================================= */}
      {activeTab === "matrix" && (
        <div className="space-y-6">
          {/* Main Automation Table Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <FiSliders className="text-blue-600 w-4 h-4" />
                  <span>AI Email Automation Matrix</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Configure automatic AI email dispatch per ticket lifecycle status.
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-semibold text-slate-700">5 Status Transition Triggers Active</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-100/70 text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
                    <th className="py-3.5 px-6">Ticket Status</th>
                    <th className="py-3.5 px-6">AI Email Type</th>
                    <th className="py-3.5 px-6">Context &amp; Trigger Description</th>
                    <th className="py-3.5 px-6 text-center">Automatic Send</th>
                    <th className="py-3.5 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {STATUS_ITEMS.map((item) => {
                    const isEnabled = Boolean(config[item.configKey]);
                    return (
                      <tr key={item.statusKey} className="hover:bg-slate-50/80 transition-colors">
                        {/* Status */}
                        <td className="py-4 px-6 align-middle font-bold">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${item.badgeBg}`}>
                            <span className={`h-2 w-2 rounded-full ${item.dotColor}`} />
                            <span>{item.statusLabel}</span>
                          </span>
                        </td>

                        {/* AI Email Type */}
                        <td className="py-4 px-6 align-middle">
                          <div className="font-extrabold text-slate-900 text-sm">{item.emailTypeLabel}</div>
                          <span className="text-[10px] text-blue-600 font-semibold tracking-wide uppercase">AI Dynamically Composed</span>
                        </td>

                        {/* Description */}
                        <td className="py-4 px-6 align-middle max-w-md">
                          <p className="text-slate-600 leading-relaxed text-xs">{item.description}</p>
                        </td>

                        {/* Automatic Send Toggle */}
                        <td className="py-4 px-6 align-middle text-center">
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleToggle(item.configKey)}
                              disabled={isSaving}
                              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                isEnabled ? "bg-emerald-500" : "bg-slate-300"
                              }`}
                              role="switch"
                              aria-checked={isEnabled}
                            >
                              <span
                                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                  isEnabled ? "translate-x-5" : "translate-x-0"
                                }`}
                              />
                            </button>
                            <span className={`text-xs font-black min-w-[28px] text-left ${isEnabled ? "text-emerald-700" : "text-slate-400"}`}>
                              {isEnabled ? "ON" : "OFF"}
                            </span>
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="py-4 px-6 align-middle text-right space-x-2">
                          <button
                            type="button"
                            onClick={() => handleOpenPreview(item.statusKey)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition cursor-pointer shadow-2xs"
                          >
                            <FiEye className="w-3.5 h-3.5 text-blue-600" />
                            <span>Preview</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* AI Email Generation Principles Card */}
          <div className="grid md:grid-cols-3 gap-5">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
              <div className="flex items-center gap-2 text-blue-700 font-bold text-xs uppercase tracking-wider">
                <FiZap className="w-4 h-4" />
                <span>Dynamic Context Synthesis</span>
              </div>
              <h3 className="font-bold text-sm text-slate-900">No Generic Email Templates</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                AI dynamically generates each subject, greeting, diagnosis note, resolution steps, and instructions tailored to the customer's exact issue, priority, and category.
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
              <div className="flex items-center gap-2 text-emerald-700 font-bold text-xs uppercase tracking-wider">
                <FiCheckCircle className="w-4 h-4" />
                <span>Deduplication &amp; State Guard</span>
              </div>
              <h3 className="font-bold text-sm text-slate-900">Transition-Only Trigger</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Emails are dispatched strictly upon genuine status transitions. Redundant page refreshes or duplicate triggers are suppressed by backend state guards.
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
              <div className="flex items-center gap-2 text-indigo-700 font-bold text-xs uppercase tracking-wider">
                <FiLayers className="w-4 h-4" />
                <span>Privacy &amp; Leak Prevention</span>
              </div>
              <h3 className="font-bold text-sm text-slate-900">Zero Internal Leakage</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                System prompts, database credentials, internal agent chatter, and raw system metadata are strictly shielded and never exposed in customer-facing emails.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          TAB 2: EMAIL DELIVERY HISTORY & AUDIT LOGS
      ========================================================= */}
      {activeTab === "history" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-4">
          <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FiClock className="text-blue-600 w-4 h-4" />
                <span>Email Delivery History &amp; Audit Logs</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Complete audit trail of all automated AI email notifications sent to customers.
              </p>
            </div>

            {/* Filter Controls */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1.5 text-xs">
                <span className="font-bold text-slate-600">Status Trigger:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 focus:border-blue-500 focus:outline-none"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="OPEN">Open</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="PENDING">Pending</option>
                  <option value="SOLVED">Solved</option>
                  <option value="CLOSED">Closed</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5 text-xs">
                <span className="font-bold text-slate-600">Delivery:</span>
                <select
                  value={deliveryFilter}
                  onChange={(e) => setDeliveryFilter(e.target.value)}
                  className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 focus:border-blue-500 focus:outline-none"
                >
                  <option value="ALL">All Deliveries</option>
                  <option value="SENT">Delivered (SENT)</option>
                  <option value="FAILED">Failed (FAILED)</option>
                </select>
              </div>

              <button
                type="button"
                onClick={loadData}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1 text-xs font-bold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                Refresh
              </button>
            </div>
          </div>

          <div className="overflow-x-auto px-4 pb-4">
            {emailLogs.length === 0 ? (
              <div className="p-12 text-center text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
                <FiMail className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                <p className="font-bold text-sm text-slate-700">No email delivery logs recorded yet</p>
                <p className="text-xs text-slate-500 mt-1">Create a support ticket or update a ticket status to see automatic AI emails recorded here.</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-100/70 text-[10px] font-extrabold uppercase tracking-wider text-slate-600">
                    <th className="py-3 px-4">Ticket ID</th>
                    <th className="py-3 px-4">Customer Email</th>
                    <th className="py-3 px-4">Status Trigger</th>
                    <th className="py-3 px-4">AI Email Subject</th>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4 text-center">Delivery Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {emailLogs.map((log) => {
                    const isFailed = log.status === "FAILED";
                    const trigKey = log.trigger_status || log.email_type?.toUpperCase() || "OPEN";
                    return (
                      <tr key={log.email_id || log.id} className="hover:bg-slate-50/80 transition-colors">
                        {/* Ticket Number */}
                        <td className="py-3.5 px-4 font-mono font-bold text-blue-600">
                          {log.ticket_number || `TKT-${log.ticket}`}
                        </td>

                        {/* Customer Email */}
                        <td className="py-3.5 px-4 text-slate-800 font-medium">
                          {log.recipient}
                        </td>

                        {/* Trigger Status */}
                        <td className="py-3.5 px-4">
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-slate-100 text-slate-700 border border-slate-200">
                            {trigKey}
                          </span>
                        </td>

                        {/* Subject */}
                        <td className="py-3.5 px-4 max-w-xs truncate text-slate-900 font-medium" title={log.subject}>
                          {log.subject}
                        </td>

                        {/* Timestamp */}
                        <td className="py-3.5 px-4 text-slate-500 text-[11px] whitespace-nowrap">
                          {log.sent_at ? new Date(log.sent_at).toLocaleString() : "Just now"}
                        </td>

                        {/* Delivery Status */}
                        <td className="py-3.5 px-4 text-center">
                          {isFailed ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 border border-rose-200 px-2.5 py-0.5 text-[11px] font-bold text-rose-700" title={log.failure_reason}>
                              <FiAlertTriangle className="w-3 h-3 text-rose-600" />
                              <span>FAILED</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">
                              <FiCheck className="w-3 h-3 text-emerald-600" />
                              <span>SENT</span>
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap space-x-2">
                          <button
                            type="button"
                            onClick={() => setViewEmailModal(log)}
                            className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                          >
                            View
                          </button>

                          {isFailed && (
                            <button
                              type="button"
                              onClick={() => handleRetryEmail(log.email_id || log.id)}
                              disabled={retryingEmailId === (log.email_id || log.id)}
                              className="rounded-lg bg-rose-600 hover:bg-rose-500 text-white px-2.5 py-1 text-xs font-bold transition cursor-pointer shadow-xs"
                            >
                              {retryingEmailId === (log.email_id || log.id) ? "Retrying..." : "Retry"}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* =========================================================
          TAB 3: LIVE AI EMAIL SIMULATOR & TESTER
      ========================================================= */}
      {activeTab === "tester" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FiEye className="text-blue-600 w-4 h-4" />
              <span>Live AI Email Generation Simulator</span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Select any ticket and simulate how AI crafts personalized email content across each of the 5 statuses.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Controls */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Select Ticket Context:
                </label>
                <select
                  value={selectedTicketId}
                  onChange={(e) => setSelectedTicketId(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs font-semibold text-slate-800 bg-white focus:border-blue-500 focus:outline-none"
                >
                  {tickets.map((t) => (
                    <option key={t.id} value={t.ticketNumber || t.id}>
                      {t.ticketNumber || `TKT-${t.id}`} — {t.subject || t.title} ({t.category})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Target Status Transition:
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {STATUS_ITEMS.map((st) => (
                    <button
                      key={st.statusKey}
                      type="button"
                      onClick={() => handleOpenPreview(st.statusKey)}
                      className="py-2.5 px-2 text-center rounded-xl border border-slate-200 bg-slate-50 hover:border-blue-500 hover:bg-blue-50/50 text-xs font-bold text-slate-800 transition cursor-pointer"
                    >
                      {st.statusLabel}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2">
                <p className="text-xs text-slate-500 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <strong>Trigger Behavior:</strong> When you transition a ticket to any status in the Agent Workspace or Customer Portal, SupportPilot automatically invokes this AI email engine to dispatch the email instantly from the backend.
                </p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-slate-900 text-white rounded-2xl p-5 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-blue-400">
                Trigger Manual Test Dispatch
              </h3>
              <p className="text-xs text-slate-300">
                Send a real test transactional email for the selected ticket to verify SMTP credentials and template rendering.
              </p>

              <div className="grid grid-cols-2 gap-2.5 pt-2">
                {STATUS_ITEMS.map((st) => (
                  <button
                    key={st.statusKey}
                    type="button"
                    onClick={() => handleTriggerTestEmail(st.statusKey)}
                    className="flex items-center justify-between rounded-xl bg-slate-800 hover:bg-blue-600 px-3.5 py-2.5 text-xs font-bold text-white transition cursor-pointer border border-slate-700"
                  >
                    <span>Test {st.statusLabel}</span>
                    <FiSend className="w-3.5 h-3.5 opacity-80" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          MODAL: LIVE AI EMAIL PREVIEW
      ========================================================= */}
      {previewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-blue-100 text-blue-700 font-bold text-xs">AI Preview</span>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    AI-Generated {selectedStatusForPreview} Email
                  </h3>
                  <p className="text-xs text-slate-500">Live dynamic synthesis preview</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPreviewModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 cursor-pointer"
              >
                <FiX className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {previewLoading ? (
                <div className="py-16 text-center text-slate-500">
                  <FiRefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-2" />
                  <p className="text-xs font-bold">Synthesizing personalized AI email...</p>
                </div>
              ) : previewData ? (
                <div className="space-y-4">
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-1">
                    <div><span className="font-bold text-slate-600">Subject:</span> <span className="text-slate-900 font-semibold">{previewData.subject}</span></div>
                    <div><span className="font-bold text-slate-600">Trigger Status:</span> <span className="text-blue-700 font-bold uppercase">{previewData.trigger_status || selectedStatusForPreview}</span></div>
                  </div>

                  {/* HTML Box */}
                  <div className="border border-slate-200 rounded-xl p-4 bg-white shadow-inner max-h-96 overflow-y-auto">
                    <div dangerouslySetInnerHTML={{ __html: previewData.html_body }} />
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-xs text-slate-500">Preview could not be loaded.</div>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 flex items-center justify-end bg-slate-50 gap-2">
              <button
                type="button"
                onClick={() => setPreviewModalOpen(false)}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          MODAL: VIEW FULL EMAIL LOG
      ========================================================= */}
      {viewEmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="font-bold text-sm text-slate-900">
                  Email Audit Log: {viewEmailModal.email_id}
                </h3>
                <p className="text-xs text-slate-500">Dispatched to {viewEmailModal.recipient}</p>
              </div>
              <button
                type="button"
                onClick={() => setViewEmailModal(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 cursor-pointer"
              >
                <FiX className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-1.5">
                <div><span className="font-bold text-slate-600">Ticket:</span> <span className="font-bold text-blue-600">{viewEmailModal.ticket_number || `TKT-${viewEmailModal.ticket}`}</span></div>
                <div><span className="font-bold text-slate-600">Recipient:</span> <span className="text-slate-900 font-medium">{viewEmailModal.recipient}</span></div>
                <div><span className="font-bold text-slate-600">Subject:</span> <span className="text-slate-900 font-bold">{viewEmailModal.subject}</span></div>
                <div><span className="font-bold text-slate-600">Status Trigger:</span> <span className="text-slate-900 font-semibold">{viewEmailModal.trigger_status || viewEmailModal.email_type}</span></div>
                <div><span className="font-bold text-slate-600">Delivery Status:</span> <span className={`font-bold ${viewEmailModal.status === "SENT" ? "text-emerald-700" : "text-rose-700"}`}>{viewEmailModal.status}</span></div>
                {viewEmailModal.failure_reason && (
                  <div className="text-rose-700"><span className="font-bold">Failure Reason:</span> {viewEmailModal.failure_reason}</div>
                )}
              </div>

              {viewEmailModal.html_body ? (
                <div className="border border-slate-200 rounded-xl p-4 bg-white max-h-80 overflow-y-auto shadow-inner">
                  <div dangerouslySetInnerHTML={{ __html: viewEmailModal.html_body }} />
                </div>
              ) : (
                <pre className="p-4 bg-slate-900 text-slate-100 rounded-xl text-xs font-mono whitespace-pre-wrap">
                  {viewEmailModal.body}
                </pre>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50">
              <span className="text-xs text-slate-400 font-mono">ID: {viewEmailModal.email_id}</span>
              <button
                type="button"
                onClick={() => setViewEmailModal(null)}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
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
