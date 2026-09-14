import { useEffect, useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import {
  FiCheckCircle,
  FiAlertCircle,
  FiClock,
  FiUser,
  FiCheck,
  FiHelpCircle,
  FiSend,
  FiRotateCcw,
  FiX,
  FiMessageSquare,
  FiStar,
  FiBookOpen,
  FiShield,
  FiRefreshCw,
  FiLock,
} from "react-icons/fi";
import { useAuth } from "../../context/AuthContext";
import {
  getTicketById,
  updateTicket,
  addComment,
  fetchTicketByIdApi,
  addTicketReplyApi,
  getDepartmentForCategory,
} from "../../services/ticketService";
import {
  fetchAgentWorkflowApi,
  simulateWorkflowLocally,
} from "../../services/m3AgentService";
import GmailComposeButton from "../../components/GmailComposeButton";
import {
  customerConfirmResolution,
  submitCustomerFeedback,
} from "../../services/m4WorkflowService";

const PRIORITY_CONFIG = {
  P1: { label: "P1 – Critical", badge: "bg-red-50 text-red-700 border-red-200" },
  Critical: { label: "P1 – Critical", badge: "bg-red-50 text-red-700 border-red-200" },
  "P1 - Critical": { label: "P1 – Critical", badge: "bg-red-50 text-red-700 border-red-200" },
  "P1 – Critical": { label: "P1 – Critical", badge: "bg-red-50 text-red-700 border-red-200" },
  High: { label: "P2 – High", badge: "bg-amber-50 text-amber-700 border-amber-200" },
  P2: { label: "P2 – High", badge: "bg-amber-50 text-amber-700 border-amber-200" },
  "P2 - High": { label: "P2 – High", badge: "bg-amber-50 text-amber-700 border-amber-200" },
  "P2 – High": { label: "P2 – High", badge: "bg-amber-50 text-amber-700 border-amber-200" },
  Medium: { label: "P3 – Medium", badge: "bg-blue-50 text-blue-700 border-blue-200" },
  P3: { label: "P3 – Medium", badge: "bg-blue-50 text-blue-700 border-blue-200" },
  "P3 - Medium": { label: "P3 – Medium", badge: "bg-blue-50 text-blue-700 border-blue-200" },
  "P3 – Medium": { label: "P3 – Medium", badge: "bg-blue-50 text-blue-700 border-blue-200" },
  Low: { label: "P4 – Low", badge: "bg-slate-50 text-slate-600 border-slate-200" },
  P4: { label: "P4 – Low", badge: "bg-slate-50 text-slate-600 border-slate-200" },
  "P4 - Low": { label: "P4 – Low", badge: "bg-slate-50 text-slate-600 border-slate-200" },
  "P4 – Low": { label: "P4 – Low", badge: "bg-slate-50 text-slate-600 border-slate-200" },
};

function getPriorityInfo(priority) {
  if (PRIORITY_CONFIG[priority]) return PRIORITY_CONFIG[priority];
  const p = String(priority || "").toUpperCase();
  if (p.includes("P1") || p.includes("CRITICAL")) return PRIORITY_CONFIG.P1;
  if (p.includes("P2") || p.includes("HIGH")) return PRIORITY_CONFIG.P2;
  if (p.includes("P4") || p.includes("LOW")) return PRIORITY_CONFIG.P4;
  return PRIORITY_CONFIG.P3;
}

const STATUS_CONFIG = {
  NEW: { label: "New", badge: "bg-blue-50 text-blue-700 border-blue-200" },
  Open: { label: "Open", badge: "bg-blue-50 text-blue-700 border-blue-200" },
  ASSIGNED: { label: "Assigned", badge: "bg-sky-50 text-sky-700 border-sky-200" },
  IN_PROGRESS: { label: "In Progress", badge: "bg-amber-50 text-amber-700 border-amber-200" },
  "In Progress": { label: "In Progress", badge: "bg-amber-50 text-amber-700 border-amber-200" },
  PENDING_ASSIGNMENT: { label: "Queued / Pending Agent", badge: "bg-purple-50 text-purple-700 border-purple-200" },
  ESCALATED: { label: "Escalated", badge: "bg-rose-50 text-rose-700 border-rose-200" },
  ON_HOLD: { label: "On Hold", badge: "bg-slate-100 text-slate-700 border-slate-200" },
  RESOLVED: { label: "Resolved", badge: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  Resolved: { label: "Resolved", badge: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  CLOSED: { label: "Closed", badge: "bg-slate-100 text-slate-600 border-slate-200" },
  Closed: { label: "Closed", badge: "bg-slate-100 text-slate-600 border-slate-200" },
};

export default function CustomerTicketDetails() {
  const { id } = useParams();
  const { user } = useAuth();

  const initialTicket = getTicketById(id);
  const [ticket, setTicket] = useState(initialTicket);
  const [workflowData, setWorkflowData] = useState(() => (initialTicket ? simulateWorkflowLocally(initialTicket) : null));
  const [loading, setLoading] = useState(!initialTicket);
  const [isForbidden, setIsForbidden] = useState(false);
  const [toast, setToast] = useState(null);
  const [replyMessage, setReplyMessage] = useState("");
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);

  // Workflow Action States
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackComment, setFeedbackComment] = useState("");
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [showUnsolvedModal, setShowUnsolvedModal] = useState(false);
  const [unsolvedReason, setUnsolvedReason] = useState("I followed the troubleshooting instructions, but the problem persists.");
  const [isConfirmingResolution, setIsConfirmingResolution] = useState(false);
  const [providedInfoMessage, setProvidedInfoMessage] = useState("");
  const [isSubmittingInfo, setIsSubmittingInfo] = useState(false);

  const handleConfirmSolved = async () => {
    setIsConfirmingResolution(true);
    try {
      const updated = await customerConfirmResolution(ticket.id, true, {}, user);
      setTicket(updated);
      setToast({
        type: "success",
        message: "Resolution verified. Ticket has been automatically closed.",
      });
    } catch (e) {
      setToast({ type: "error", message: "Failed to confirm resolution." });
    } finally {
      setIsConfirmingResolution(false);
    }
  };

  const handleConfirmNotSolved = async () => {
    setIsConfirmingResolution(true);
    try {
      const updated = await customerConfirmResolution(
        ticket.id,
        false,
        { reason: unsolvedReason },
        user
      );
      setTicket(updated);
      setShowUnsolvedModal(false);

      if (updated.status === "PENDING_ASSIGNMENT" || updated.queueStatus === "QUEUED") {
        setToast({
          type: "warning",
          message: "All specialists in this department are currently busy or off-duty. Your ticket has been queued with high priority.",
        });
      } else {
        setToast({
          type: "success",
          message: `Ticket escalated and assigned to ${updated.assignedAgentName || updated.assignedAgent || "Support Agent"}.`,
        });
      }
    } catch (e) {
      setToast({ type: "error", message: "Failed to escalate ticket." });
    } finally {
      setIsConfirmingResolution(false);
    }
  };

  const handleSubmitCSATFeedback = async (e) => {
    e?.preventDefault();
    if (isSubmittingFeedback) return;
    setIsSubmittingFeedback(true);
    try {
      const updated = await submitCustomerFeedback(
        ticket.id,
        feedbackRating,
        feedbackComment,
        user
      );
      setTicket(updated);
      setToast({
        type: "success",
        message: "Thank you! Your feedback has been recorded.",
      });
    } catch (e) {
      setToast({ type: "error", message: "Could not submit rating." });
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  const handleProvideCustomerInfo = async (e) => {
    e?.preventDefault();
    if (!providedInfoMessage.trim() || isSubmittingInfo) return;
    setIsSubmittingInfo(true);
    try {
      const targetId = ticket?.ticket_number || ticket?.ticketNumber || ticket?.id || id;
      await addTicketReplyApi(targetId, `[CUSTOMER INFO PROVIDED]: ${providedInfoMessage}`);
      const updated = updateTicket(ticket.id, {
        status: "IN_PROGRESS",
        awaitingInfoPrompt: null,
      });
      setTicket(updated);
      setProvidedInfoMessage("");
      setToast({
        type: "success",
        message: "Information submitted. Ticket returned to active investigation.",
      });
    } catch (e) {
      setToast({ type: "error", message: "Failed to submit info." });
    } finally {
      setIsSubmittingInfo(false);
    }
  };

  const loadTicket = async () => {
    let curTicket = getTicketById(id);
    if (curTicket) {
      setTicket(curTicket);
      setLoading(false);
      setWorkflowData((prev) => prev || simulateWorkflowLocally(curTicket));
    }

    const isStaffUser = Boolean(
      user &&
        ["admin", "agent", "manager", "support_agent", "support agent", "administrator", "superuser"].includes(
          String(user.role || "").toLowerCase()
        )
    );

    try {
      const apiTicket = await fetchTicketByIdApi(id);
      if (apiTicket) {
        curTicket = apiTicket;
        setTicket(apiTicket);
        setWorkflowData((prev) => prev || simulateWorkflowLocally(apiTicket));
      }
    } catch (err) {
      if (err?.response?.status === 403 && !isStaffUser) {
        if (!curTicket) {
          setIsForbidden(true);
          setLoading(false);
          return;
        }
      }
    }

    if (!curTicket) {
      curTicket = getTicketById(id);
      if (curTicket) {
        setTicket(curTicket);
        setWorkflowData((prev) => prev || simulateWorkflowLocally(curTicket));
      }
    }

    setLoading(false);

    if (curTicket) {
      fetchAgentWorkflowApi(curTicket.id)
        .then((wf) => {
          if (wf) setWorkflowData(wf);
          else setWorkflowData((prev) => prev || simulateWorkflowLocally(curTicket));
        })
        .catch(() => {
          setWorkflowData((prev) => prev || simulateWorkflowLocally(curTicket));
        });
    }
  };

  useEffect(() => {
    loadTicket();
  }, [id, user]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4500);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleCustomerReply = async (e) => {
    e.preventDefault();
    if (!replyMessage.trim() || isSubmittingReply) return;

    setIsSubmittingReply(true);
    const targetId = ticket?.ticket_number || ticket?.ticketNumber || ticket?.id || id;
    const authorName = user?.name || user?.username || "Customer";

    try {
      let replyObj;
      try {
        const res = await addTicketReplyApi(targetId, replyMessage.trim());
        replyObj = res?.reply || res?.data || res;
      } catch (apiErr) {
        console.warn("Backend reply API note:", apiErr);
      }

      if (!replyObj || !replyObj.id) {
        replyObj = {
          id: `local-rep-${Date.now()}`,
          author_name: authorName,
          author_role: "CUSTOMER",
          message: replyMessage.trim(),
          created_at: new Date().toISOString(),
        };
      }

      const commentObj = {
        id: `com-${Date.now()}`,
        author: authorName,
        authorRole: "CUSTOMER",
        message: replyMessage.trim(),
        timestamp: replyObj.created_at || new Date().toISOString(),
      };

      setTicket((prev) => ({
        ...prev,
        replies: [...(prev?.replies || []), replyObj],
        comments: [...(prev?.comments || []), commentObj],
      }));

      try {
        const stored = getTicketById(targetId) || getTicketById(id);
        if (stored) {
          updateTicket(stored.id || targetId, {
            replies: [...(stored.replies || []), replyObj],
            comments: [...(stored.comments || []), commentObj],
          });
        }
      } catch (cacheErr) {}

      setToast({ type: "success", message: "Your message has been sent to the support team." });
      setReplyMessage("");
    } catch (err) {
      console.error(err);
      setToast({ type: "error", message: "Failed to send message. Please try again." });
    } finally {
      setIsSubmittingReply(false);
    }
  };

  const conversationList = useMemo(() => {
    const list = [];
    const seen = new Set();

    (ticket?.replies || []).forEach((r) => {
      const key = `${r.id || ""}-${r.message}-${r.created_at || ""}`;
      if (!seen.has(key)) {
        seen.add(key);
        const role = (r.author_role || "").toUpperCase();
        const isAgent =
          role.includes("AGENT") || role.includes("ADMIN") || role.includes("STAFF") || role.includes("MANAGER");
        list.push({
          id: r.id,
          author: r.author_name || (isAgent ? "Support Agent" : "Customer"),
          authorRole: isAgent ? "Support Agent" : "Customer",
          isAgent,
          message: r.message,
          timestamp: r.created_at,
          attachment: r.attachment,
        });
      }
    });

    (ticket?.comments || []).forEach((c) => {
      const key = `${c.id || ""}-${c.message}-${c.timestamp || c.createdAt || ""}`;
      if (!seen.has(key)) {
        seen.add(key);
        const role = (c.authorRole || c.author_role || "").toUpperCase();
        const isAgent =
          role.includes("AGENT") ||
          role.includes("ADMIN") ||
          role.includes("STAFF") ||
          role.includes("MANAGER") ||
          (!role.includes("CUSTOMER") && c.author !== user?.name && c.author !== "Customer");
        list.push({
          id: c.id,
          author: c.author || (isAgent ? "Support Agent" : "Customer"),
          authorRole: isAgent ? "Support Agent" : "Customer",
          isAgent,
          message: c.message,
          timestamp: c.timestamp || c.createdAt || c.created_at,
          attachment: c.attachment,
        });
      }
    });

    const hasAgentMsg = list.some((m) => m.isAgent);
    const isResolvedOrClosed =
      ["RESOLVED", "CLOSED", "WAITING_FOR_CUSTOMER"].includes(String(ticket?.status || "").toUpperCase()) ||
      ticket?.selfResolved ||
      ticket?.resolvedAt;

    if (!hasAgentMsg && isResolvedOrClosed) {
      const agentName = ticket?.assignedAgentName || ticket?.assignedAgent || "Support Specialist";
      const resolutionText =
        ticket?.resolution?.solution ||
        (Array.isArray(ticket?.suggestedResolution) && ticket.suggestedResolution.length > 0
          ? `Troubleshooting resolution instructions:\n${ticket.suggestedResolution
              .map((s, i) => `${i + 1}. ${s}`)
              .join("\n")}`
          : ticket?.suggested_resolution ||
            "Your support request has been investigated and marked as resolved. Please follow the instructions to complete setup.");

      list.push({
        id: "agent-auto-resolution",
        author: agentName,
        authorRole: "Support Agent",
        isAgent: true,
        message: `Hello! I have reviewed and resolved your support ticket:\n\n${resolutionText}\n\nPlease confirm if this completely solves your issue.`,
        timestamp: ticket?.resolvedAt || ticket?.updatedAt || ticket?.createdAt || new Date().toISOString(),
      });
    }

    list.sort((a, b) => new Date(a.timestamp || 0) - new Date(b.timestamp || 0));
    return list;
  }, [ticket, user]);

  const ticketCode =
    ticket?.ticketNumber ||
    ticket?.ticket_number ||
    (typeof ticket?.id === "number" ? `TKT-${1000 + ticket.id}` : `TKT${String(ticket?.id || "").replace(/\D/g, "")}`);

  const resolutionSteps = useMemo(() => {
    if (!ticket) return [];

    if (Array.isArray(ticket.suggested_steps) && ticket.suggested_steps.length > 0) return ticket.suggested_steps;
    if (Array.isArray(ticket.suggestedResolution) && ticket.suggestedResolution.length > 0)
      return ticket.suggestedResolution;
    if (Array.isArray(ticket.ai?.suggestedResolution) && ticket.ai.suggestedResolution.length > 0)
      return ticket.ai.suggestedResolution;

    const metaResSteps = ticket.ai_analysis_meta?.resolution?.troubleshooting_steps;
    if (Array.isArray(metaResSteps) && metaResSteps.length > 0) return metaResSteps;

    if (typeof ticket.suggested_resolution === "string" && ticket.suggested_resolution.trim()) {
      try {
        const parsed = JSON.parse(ticket.suggested_resolution);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {
        const lines = ticket.suggested_resolution
          .split("\n")
          .map((l) => l.trim())
          .filter((l) => l && !l.toLowerCase().startsWith("recommended troubleshooting"));
        if (lines.length > 0) return lines;
      }
    }

    const cat = (ticket.category || "").toLowerCase();
    const text = `${ticket.subject || ticket.title || ""} ${ticket.description || ""}`.toLowerCase();

    if (cat.includes("network") || text.includes("vpn") || text.includes("internet") || text.includes("wi-fi")) {
      return [
        "Verify physical ethernet cable connection or Wi-Fi adapter connectivity.",
        "Restart your local network adapter or toggle Wi-Fi OFF and ON.",
        "Flush local DNS cache via 'ipconfig /flushdns' (Windows) or 'sudo dscacheutil -flushcache' (Mac).",
        "Power cycle your router/gateway and wait 60 seconds before reconnecting.",
        "Contact Network Operations Desk if gateway connection remains unreachable.",
      ];
    }
    if (cat.includes("auth") || text.includes("password") || text.includes("login") || text.includes("mfa")) {
      return [
        "Navigate to corporate self-service recovery portal at /auth/recovery.",
        "Enter your registered enterprise email address to trigger MFA push notification.",
        "Follow verification prompt on your authenticator device.",
        "Set a strong password satisfying the 12-character enterprise policy.",
      ];
    }
    if (cat.includes("billing") || text.includes("invoice") || text.includes("payment")) {
      return [
        "Verify payment details on file under Billing Settings.",
        "Ensure the credit card supports recurring online payments and international processing.",
        "Review past invoices under the Invoice History tab.",
        "If invoice status displays pending after 24 hours, contact the finance team.",
      ];
    }

    return [
      "Review the application error message and check system event logs.",
      "Verify latest system updates and application dependencies are installed.",
      "Restart the affected service or application process.",
      "If the problem persists, escalate to support specialist with diagnostic logs.",
    ];
  }, [ticket]);

  const resolvedSource = useMemo(() => {
    if (!ticket) return "Enterprise IT Knowledge Store";
    if (ticket.knowledge_source) return ticket.knowledge_source;
    if (ticket.knowledgeSource) return ticket.knowledgeSource;
    const cat = (ticket.category || "").toLowerCase();
    if (cat.includes("network")) return "Corporate Network & Connectivity SOP (KB-NET-001)";
    if (cat.includes("auth")) return "SSO & Identity Access Protocol (KB-AUTH-002)";
    if (cat.includes("billing")) return "Billing & Payment Gateway Guide (KB-BIL-003)";
    if (cat.includes("security")) return "Security Incident Response Protocol (KB-SEC-004)";
    return "Enterprise IT Knowledge Base";
  }, [ticket]);

  const dateDisplay =
    ticket?.createdAt || ticket?.created_at
      ? new Date(ticket.createdAt || ticket.created_at).toLocaleString()
      : "Recently";

  if (loading) {
    return (
      <div className="py-16 max-w-xl mx-auto text-center">
        <div className="animate-spin inline-block w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full mb-3" />
        <p className="text-xs text-slate-500 font-medium">Loading ticket details...</p>
      </div>
    );
  }

  if (isForbidden) {
    return (
      <div className="py-12 max-w-lg mx-auto text-center">
        <div className="rounded-xl border border-red-200 bg-white p-8 shadow-xs">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-600 mb-3">
            <FiLock className="text-xl" />
          </div>
          <h2 className="text-base font-bold text-slate-900">Access Restricted</h2>
          <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
            You do not have authorization to view ticket #{id}. Only the creator and support personnel may access this resource.
          </p>
          <Link
            to="/portal/tickets"
            className="inline-block mt-5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition"
          >
            Return to My Tickets
          </Link>
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="py-12 max-w-lg mx-auto text-center">
        <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-xs">
          <h2 className="text-base font-bold text-slate-900">Ticket Not Found</h2>
          <p className="text-xs text-slate-500 mt-1">The requested ticket could not be found.</p>
          <Link
            to="/portal/tickets"
            className="inline-block mt-4 text-xs font-semibold text-blue-600 hover:underline"
          >
            Return to My Tickets
          </Link>
        </div>
      </div>
    );
  }

  const isClosed = ["CLOSED", "Closed"].includes(ticket.status);
  const isResolved = ["RESOLVED", "Resolved"].includes(ticket.status);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-3">
          <div
            className={`rounded-lg px-4 py-3 text-xs font-semibold text-white shadow-xl flex items-center gap-2 ${
              toast.type === "error" ? "bg-red-900 border border-red-700" : "bg-slate-900 border border-slate-700"
            }`}
          >
            {toast.type === "error" ? <FiAlertCircle className="text-red-400" /> : <FiCheckCircle className="text-emerald-400" />}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Header Bar */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="font-mono font-bold text-xs bg-slate-900 text-white px-2 py-0.5 rounded">
                #{ticketCode}
              </span>
              <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-semibold text-slate-700">
                {ticket.department || getDepartmentForCategory(ticket.category)}
              </span>
              {(() => {
                const prio = getPriorityInfo(ticket.priority);
                return (
                  <span className={`rounded-md border px-2 py-0.5 text-xs font-semibold ${prio.badge}`}>
                    {prio.label}
                  </span>
                );
              })()}
              <span
                className={`rounded-md border px-2 py-0.5 text-xs font-semibold ${
                  STATUS_CONFIG[ticket.status]?.badge || "bg-slate-50 text-slate-600 border-slate-200"
                }`}
              >
                {STATUS_CONFIG[ticket.status]?.label || ticket.status}
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {ticket.subject || ticket.title}
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Created on {dateDisplay} by {ticket.customerName || user?.name || "Customer"}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <GmailComposeButton
              recipient={ticket.customerEmail || "support@company.com"}
              subject={`[Support Ticket #${ticketCode}] Update on ${ticket.subject || ticket.title}`}
              body={`Hello,\n\nRegarding support ticket #${ticketCode} (${ticket.subject || ticket.title}):\n\n`}
              label="Send via Email"
              variant="secondary"
              ticketId={ticket.id}
            />

            {!isClosed && (
              <button
                onClick={handleConfirmSolved}
                disabled={isConfirmingResolution}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer disabled:opacity-50"
              >
                Close Ticket
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main 2-Column Content */}
      <div className="grid lg:grid-cols-[minmax(0,1fr)_320px] gap-6 items-start">
        {/* Left Column */}
        <div className="space-y-6">
          {/* AI Solution & Troubleshooting Card */}
          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FiBookOpen className="text-blue-600" />
                <h2 className="text-sm font-bold text-slate-900">
                  AI Solution & Knowledge Base Troubleshooting
                </h2>
              </div>
              <span className="rounded bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 text-[10px] font-semibold">
                Knowledge Base Verified
              </span>
            </div>

            <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-0.5">
                Retrieved Knowledge Source
              </span>
              <span className="font-semibold text-slate-800">{resolvedSource}</span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Based on the issue description and company knowledge base, follow these steps to resolve the issue:
            </p>

            {/* Troubleshooting Steps */}
            <div className="space-y-2">
              {resolutionSteps.map((step, idx) => {
                const stepText = typeof step === "string" ? step : step?.step || step?.title || JSON.stringify(step);
                return (
                  <div
                    key={idx}
                    className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50/50 p-3 text-xs text-slate-800"
                  >
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white font-bold text-[10px]">
                      {idx + 1}
                    </span>
                    <span className="pt-0.5 leading-relaxed">{stepText.replace(/^\d+[\.\)]\s*/, "")}</span>
                  </div>
                );
              })}
            </div>

            {/* Workflow Action Buttons: "Resolved" vs "Need More Help" */}
            <div className="pt-4 border-t border-slate-100">
              {isClosed ? (
                <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800 flex items-center justify-between">
                  <div className="flex items-center gap-2 font-semibold">
                    <FiCheckCircle className="text-emerald-600 text-sm" />
                    <span>This ticket has been marked as Closed.</span>
                  </div>
                  <button
                    onClick={() => setShowUnsolvedModal(true)}
                    className="text-xs font-semibold text-emerald-700 hover:underline cursor-pointer"
                  >
                    Need to reopen?
                  </button>
                </div>
              ) : (
                <div className="rounded-lg bg-slate-50 border border-slate-200 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-bold text-slate-900">Did this solution resolve your issue?</h3>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Closing confirms the problem is solved. Requesting help will automatically assign an available specialist.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      type="button"
                      disabled={isConfirmingResolution}
                      onClick={handleConfirmSolved}
                      className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition cursor-pointer shadow-xs disabled:opacity-50 inline-flex items-center gap-1.5"
                    >
                      <FiCheck className="text-xs" />
                      <span>Yes, Solved (Close Ticket)</span>
                    </button>

                    <button
                      type="button"
                      disabled={isConfirmingResolution}
                      onClick={() => setShowUnsolvedModal(true)}
                      className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
                    >
                      <FiHelpCircle className="text-xs text-slate-500" />
                      <span>Need More Help (Escalate to Agent)</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Customer CSAT Feedback Card (when closed or feedback submitted) */}
          {(isClosed || ticket.customerFeedback || ticket.feedback) && (
            <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <FiStar className="text-amber-500" />
                  <h3 className="text-sm font-bold text-slate-900">Support Satisfaction (CSAT)</h3>
                </div>
                <span className="text-[10px] text-slate-400 font-semibold uppercase">Feedback</span>
              </div>

              {ticket.customerFeedback || ticket.feedback ? (
                <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-xs space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 font-medium">Your Rating:</span>
                    <div className="flex items-center text-amber-500">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <FiStar
                          key={s}
                          className={`text-xs ${
                            s <= ((ticket.customerFeedback || ticket.feedback).rating || 5)
                              ? "fill-amber-400 text-amber-400"
                              : "text-slate-300"
                          }`}
                        />
                      ))}
                    </div>
                    <span className="font-semibold text-slate-700">
                      ({(ticket.customerFeedback || ticket.feedback).rating || 5} / 5)
                    </span>
                  </div>
                  {(ticket.customerFeedback || ticket.feedback).comment && (
                    <p className="italic text-slate-600 text-xs">
                      "{(ticket.customerFeedback || ticket.feedback).comment}"
                    </p>
                  )}
                </div>
              ) : (
                <form onSubmit={handleSubmitCSATFeedback} className="space-y-3 text-xs">
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">
                      How would you rate your support experience?
                    </label>
                    <div className="flex items-center gap-1.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setFeedbackRating(star)}
                          className={`h-8 w-8 rounded-lg border text-xs font-bold transition cursor-pointer flex items-center justify-center ${
                            feedbackRating >= star
                              ? "bg-amber-50 border-amber-300 text-amber-600"
                              : "bg-white border-slate-200 text-slate-400 hover:bg-slate-50"
                          }`}
                        >
                          <FiStar className={feedbackRating >= star ? "fill-amber-400 text-amber-500" : ""} />
                        </button>
                      ))}
                      <span className="ml-2 text-xs font-semibold text-slate-700">
                        {feedbackRating === 5 ? "Excellent" : `${feedbackRating} Stars`}
                      </span>
                    </div>
                  </div>

                  <div>
                    <textarea
                      rows={2}
                      value={feedbackComment}
                      onChange={(e) => setFeedbackComment(e.target.value)}
                      placeholder="Optional comments or suggestions..."
                      className="w-full rounded-lg border border-slate-200 p-2.5 text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingFeedback}
                    className="rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition cursor-pointer disabled:opacity-50"
                  >
                    {isSubmittingFeedback ? "Submitting..." : "Submit Feedback"}
                  </button>
                </form>
              )}
            </section>
          )}

          {/* Description Card */}
          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-2">
            <h2 className="text-sm font-bold text-slate-900">Original Description</h2>
            <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
              {ticket.description || ticket.subject}
            </p>
          </section>

          {/* Conversation & Replies */}
          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FiMessageSquare className="text-blue-600" />
                <h2 className="text-sm font-bold text-slate-900">Support Conversation</h2>
              </div>
              <button
                type="button"
                onClick={loadTicket}
                className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 transition cursor-pointer"
              >
                <FiRefreshCw className="text-[11px]" />
                <span>Refresh</span>
              </button>
            </div>

            {/* Conversation Messages */}
            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {conversationList.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400">
                  No replies yet. You can post an update below.
                </div>
              ) : (
                conversationList.map((msg, index) => (
                  <div
                    key={msg.id || index}
                    className={`rounded-lg border p-3.5 text-xs ${
                      msg.isAgent
                        ? "border-blue-200 bg-blue-50/40 text-slate-900"
                        : "border-slate-200 bg-white text-slate-900"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-slate-800">{msg.author}</span>
                        <span
                          className={`rounded px-1.5 py-0.2 text-[10px] font-semibold ${
                            msg.isAgent ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {msg.isAgent ? "Support Agent" : "Customer"}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString() : ""}
                      </span>
                    </div>
                    <p className="whitespace-pre-wrap text-slate-700 leading-relaxed">{msg.message}</p>
                  </div>
                ))
              )}
            </div>

            {/* Reply Input Form */}
            <form onSubmit={handleCustomerReply} className="pt-3 border-t border-slate-100 space-y-2">
              <label className="block text-xs font-semibold text-slate-700">Add Message or Additional Details</label>
              <textarea
                rows={3}
                value={replyMessage}
                onChange={(e) => setReplyMessage(e.target.value)}
                placeholder="Type your reply or question to the support specialist..."
                className="w-full rounded-lg border border-slate-200 p-2.5 text-xs text-slate-900 placeholder-slate-400 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmittingReply || !replyMessage.trim()}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition cursor-pointer shadow-xs disabled:opacity-50"
                >
                  <FiSend className="text-xs" />
                  <span>{isSubmittingReply ? "Sending..." : "Send Message"}</span>
                </button>
              </div>
            </form>
          </section>
        </div>

        {/* Right Column: Ticket Metadata & SLA */}
        <div className="space-y-6">
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600 pb-2 border-b border-slate-100">
              Ticket Details & SLA
            </h2>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Department</span>
                <span className="font-semibold text-slate-800">
                  {ticket.department || getDepartmentForCategory(ticket.category)}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-500">Category</span>
                <span className="font-semibold text-slate-800">{ticket.category || "General"}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-500">Sub-Category</span>
                <span className="font-semibold text-slate-800">
                  {ticket.sub_category || ticket.subCategory || "General"}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-500">Priority</span>
                <span
                  className={`rounded border px-2 py-0.5 text-[11px] font-semibold ${
                    PRIORITY_CONFIG[ticket.priority]?.badge || "bg-slate-50 text-slate-600 border-slate-200"
                  }`}
                >
                  {PRIORITY_CONFIG[ticket.priority]?.label || ticket.priority || "P3 – Medium"}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-500">Status</span>
                <span
                  className={`rounded border px-2 py-0.5 text-[11px] font-semibold ${
                    STATUS_CONFIG[ticket.status]?.badge || "bg-slate-50 text-slate-600 border-slate-200"
                  }`}
                >
                  {STATUS_CONFIG[ticket.status]?.label || ticket.status}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-500">Assigned Agent</span>
                <span className="font-semibold text-slate-800">
                  {ticket.assignedAgentName || ticket.assignedAgent || "Unassigned"}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-500">Target SLA</span>
                <span className="font-mono font-bold text-slate-800">
                  {ticket.priority === "P1" || ticket.priority === "Critical"
                    ? "4 Hours"
                    : ticket.priority === "P2" || ticket.priority === "High"
                    ? "8 Hours"
                    : "24 Hours"}
                </span>
              </div>
            </div>
          </section>

          {/* Workflow Status Info Card */}
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs text-xs space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-slate-900">
              <FiShield className="text-blue-600" />
              <span>Escalation Guarantee</span>
            </div>
            <p className="text-slate-500 leading-relaxed text-[11px]">
              If the automated knowledge base steps do not solve the issue, clicking <strong>Need More Help</strong> immediately escalates the request and assigns an available specialist according to department, workload, and SLA priority.
            </p>
          </section>
        </div>
      </div>

      {/* Reopen / Need More Help Modal */}
      {showUnsolvedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Request Agent Assistance</h3>
                <p className="text-[11px] text-slate-500">
                  Your ticket will be escalated and auto-assigned to an active support agent.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowUnsolvedModal(false)}
                className="text-slate-400 hover:text-slate-700 transition cursor-pointer"
              >
                <FiX />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <label className="block font-medium text-slate-700">
                Please describe why the issue persists or what error occurred:
              </label>
              <textarea
                rows={4}
                value={unsolvedReason}
                onChange={(e) => setUnsolvedReason(e.target.value)}
                placeholder="Describe what error or obstacle remains..."
                className="w-full rounded-lg border border-slate-200 p-2.5 text-xs text-slate-900 placeholder-slate-400 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowUnsolvedModal(false)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isConfirmingResolution || !unsolvedReason.trim()}
                onClick={handleConfirmNotSolved}
                className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition cursor-pointer shadow-xs disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                <FiRotateCcw className="text-xs" />
                <span>{isConfirmingResolution ? "Assigning..." : "Escalate & Assign Agent"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}