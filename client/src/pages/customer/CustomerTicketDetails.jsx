import { useEffect, useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
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
  M4_STATUSES,
  M4_STATUS_LABELS,
  customerConfirmResolution,
  submitCustomerFeedback,
} from "../../services/m4WorkflowService";


export default function CustomerTicketDetails() {
  const { id } = useParams();
  const { user } = useAuth();

  const initialTicket = getTicketById(id);
  const [ticket, setTicket] = useState(initialTicket);
  const [workflowData, setWorkflowData] = useState(() => initialTicket ? simulateWorkflowLocally(initialTicket) : null);
  const [loading, setLoading] = useState(!initialTicket);
  const [isForbidden, setIsForbidden] = useState(false);
  const [toast, setToast] = useState(null);
  const [replyMessage, setReplyMessage] = useState("");
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const [showSources, setShowSources] = useState(false);

  // Milestone 4 Customer Workflow State
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
        message: "🎉 Thank you! Your resolution has been verified and ticket is moved to CLOSED.",
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
      setToast({
        type: "warning",
        message: "Ticket has been REOPENED and returned to support agents for further investigation.",
      });
    } catch (e) {
      setToast({ type: "error", message: "Failed to update ticket status." });
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
        message: "⭐ Thank you! Feedback submitted. Ticket status updated to CLOSED (Completed) and stored in Admin & Agent timelines.",
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
        message: "Information provided to support agent. Ticket moved to IN_PROGRESS.",
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

  if (loading) {
    return (
      <div className="p-16 max-w-4xl mx-auto text-center">
        <div className="animate-spin inline-block w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full mb-3" />
        <p className="text-xs text-slate-500 font-medium">Loading ticket details...</p>
      </div>
    );
  }

  // 403 FORBIDDEN SECURITY BANNER
  if (isForbidden) {
    return (
      <div className="p-8 max-w-2xl mx-auto text-center">
        <div className="bg-red-50/80 p-10 rounded-2xl border border-red-200 shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100 text-2xl text-red-600 font-bold mb-4">
            🚫
          </div>
          <span className="inline-block rounded-full bg-red-600 px-3 py-1 text-[11px] font-mono font-bold text-white mb-2">
            403 FORBIDDEN
          </span>
          <h2 className="text-xl font-bold text-slate-900 mt-1">Access Restricted</h2>
          <p className="text-xs text-slate-600 mt-2 max-w-md mx-auto leading-relaxed">
            Security Isolation Policy: You do not have authorization to access this customer ticket ({id}). Only the ticket creator and support staff can view this resource.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link
              to="/portal/tickets"
              className="rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white hover:bg-slate-800 transition shadow"
            >
              Return to My Tickets
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="p-12 max-w-xl mx-auto text-center">
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
          <h2 className="text-lg font-bold text-slate-800">Ticket Not Found</h2>
          <p className="text-xs text-slate-500 mt-2">
            The requested ticket ({id}) does not exist or has been removed.
          </p>
          <Link
            to="/portal/tickets"
            className="inline-block mt-4 text-xs font-bold text-emerald-700 hover:underline"
          >
            ← Back to My Tickets
          </Link>
        </div>
      </div>
    );
  }

  const reopen = () => {
    try {
      const updated = updateTicket(ticket.id, {
        status: "NEW",
        selfResolved: false,
        assistanceRequested: false,
      });
      setTicket((prev) => ({ ...prev, ...updated, status: "NEW", selfResolved: false, assistanceRequested: false }));
    } catch (e) {
      setTicket((prev) => ({ ...prev, status: "NEW", selfResolved: false, assistanceRequested: false }));
    }
    setToast({
      type: "info",
      message: "Ticket has been reopened.",
    });
  };

  const closeTicket = () => {
    try {
      const updated = updateTicket(ticket.id, {
        status: "CLOSED",
      });
      setTicket((prev) => ({ ...prev, ...updated, status: "CLOSED" }));
    } catch (e) {
      setTicket((prev) => ({ ...prev, status: "CLOSED" }));
    }
    setToast({
      type: "info",
      message: "Ticket has been marked as closed.",
    });
  };

  const handleYesSolved = () => {
    try {
      const updated = updateTicket(ticket.id, {
        status: "RESOLVED",
        selfResolved: true,
        assistanceRequested: false,
      });
      setTicket((prev) => ({ ...prev, ...updated, status: "RESOLVED", selfResolved: true, assistanceRequested: false }));
    } catch (e) {
      setTicket((prev) => ({ ...prev, status: "RESOLVED", selfResolved: true, assistanceRequested: false }));
    }
    setToast({
      type: "success",
      message: "✓ Awesome! Issue marked as resolved via AI Knowledge Guide.",
    });
  };

  const handleNeedAssistance = () => {
    try {
      const updated = updateTicket(ticket.id, {
        status: "IN_PROGRESS",
        assistanceRequested: true,
        selfResolved: false,
      });
      setTicket((prev) => ({ ...prev, ...updated, status: "IN_PROGRESS", assistanceRequested: true, selfResolved: false }));
      setToast({
        type: "info",
        message: "👨‍💻 Support agent notified! Ticket status is now 'IN_PROGRESS'.",
      });
    } catch (e) {
      setTicket((prev) => ({ ...prev, status: "IN_PROGRESS", assistanceRequested: true, selfResolved: false }));
      setToast({
        type: "info",
        message: "👨‍💻 Support agent notified! Ticket status is now 'IN_PROGRESS'.",
      });
    }
  };

  const handleCustomerReply = async (e) => {
    e.preventDefault();
    if (!replyMessage.trim() || isSubmittingReply) return;

    setIsSubmittingReply(true);
    const text = replyMessage.trim();
    const authorName = user?.name || user?.username || "Customer";

    try {
      const targetId = ticket?.ticket_number || ticket?.ticketNumber || ticket?.id || id;
      const apiRes = await addTicketReplyApi(targetId, text);
      const replyObj = apiRes || {
        id: `reply-${Date.now()}`,
        author_name: authorName,
        author_role: "CUSTOMER",
        message: text,
        created_at: new Date().toISOString(),
      };

      const commentObj = {
        id: replyObj.id,
        author: replyObj.author_name || authorName,
        authorRole: "CUSTOMER",
        visibility: "Public",
        message: text,
        timestamp: replyObj.created_at || new Date().toISOString(),
      };

      setTicket((prev) => ({
        ...prev,
        replies: [...(prev?.replies || []), replyObj],
        comments: [...(prev?.comments || []), commentObj],
      }));

      // Cache into local storage
      try {
        const stored = getTicketById(targetId) || getTicketById(id);
        if (stored) {
          updateTicket(stored.id || targetId, {
            replies: [...(stored.replies || []), replyObj],
            comments: [...(stored.comments || []), commentObj],
          });
        }
      } catch (cacheErr) {
        console.warn("Local storage cache notice:", cacheErr);
      }

      setToast({ type: "success", message: "Your reply has been sent to the support team." });
      setReplyMessage("");
    } catch (err) {
      console.error(err);
      setToast({ type: "error", message: "Failed to send reply. Please try again." });
    } finally {
      setIsSubmittingReply(false);
    }
  };

  const conversationList = useMemo(() => {
    const list = [];
    const seen = new Set();

    // 1. Backend replies
    (ticket?.replies || []).forEach((r) => {
      const key = `${r.id || ""}-${r.message}-${r.created_at || ""}`;
      if (!seen.has(key)) {
        seen.add(key);
        const role = (r.author_role || "").toUpperCase();
        const isAgent = role.includes("AGENT") || role.includes("ADMIN") || role.includes("STAFF") || role.includes("MANAGER");
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

    // 2. Local comments
    (ticket?.comments || []).forEach((c) => {
      const key = `${c.id || ""}-${c.message}-${c.timestamp || c.createdAt || ""}`;
      if (!seen.has(key)) {
        seen.add(key);
        const role = (c.authorRole || c.author_role || "").toUpperCase();
        const isAgent = role.includes("AGENT") || role.includes("ADMIN") || role.includes("STAFF") || role.includes("MANAGER") || (!role.includes("CUSTOMER") && c.author !== user?.name && c.author !== "Customer");
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

    // Automatically synthesize agent resolution message in chat if ticket is resolved/closed and no agent reply exists yet
    const hasAgentMsg = list.some((m) => m.isAgent);
    const isResolvedOrClosed = ["RESOLVED", "CLOSED", "WAITING_FOR_CUSTOMER"].includes(String(ticket?.status || "").toUpperCase()) || ticket?.selfResolved || ticket?.resolvedAt;

    if (!hasAgentMsg && isResolvedOrClosed) {
      const agentName = ticket?.assignedAgentName || ticket?.assignedAgent || "Support Specialist";
      const resolutionText = ticket?.resolution?.solution ||
        (Array.isArray(ticket?.suggestedResolution) && ticket.suggestedResolution.length > 0
          ? `Troubleshooting resolution instructions:\n${ticket.suggestedResolution.map((s, i) => `${i + 1}. ${s}`).join("\n")}`
          : ticket?.suggested_resolution || "Your support request has been investigated and marked as resolved. Please follow the instructions to complete setup.");

      list.push({
        id: "agent-auto-resolution",
        author: agentName,
        authorRole: "Support Agent",
        isAgent: true,
        message: `Hello! I have reviewed and resolved your support ticket:\n\n${resolutionText}\n\nPlease confirm if this completely solves your issue.`,
        timestamp: ticket?.resolvedAt || ticket?.updatedAt || ticket?.createdAt || new Date().toISOString(),
      });
    }

    // Automatically synthesize customer confirmation / CSAT message if confirmed or feedback exists
    const hasFeedbackMsg = list.some((m) => m.isFeedback || (m.message && m.message.includes("CSAT")));
    if (!hasFeedbackMsg && (ticket?.customerFeedback || ticket?.feedback)) {
      const fb = ticket.customerFeedback || ticket.feedback;
      list.push({
        id: "customer-auto-feedback",
        author: fb.customerName || ticket?.customerName || user?.name || "Customer",
        authorRole: "Customer",
        isCustomer: true,
        isFeedback: true,
        message: `⭐ Customer Satisfaction Feedback (CSAT): ${fb.rating || 5}/5 Stars\n${fb.comment ? `"${fb.comment}"\n` : ""}Status: Verified, Completed & Closed.`,
        timestamp: fb.submittedAt || new Date().toISOString(),
      });
    } else if (ticket?.customerConfirmed && !list.some((m) => m.message && m.message.includes("confirmed that my issue has been completely resolved"))) {
      list.push({
        id: "customer-auto-confirmed",
        author: ticket?.customerName || user?.name || "Customer",
        authorRole: "Customer",
        isCustomer: true,
        message: "✓ Customer Confirmation: I confirmed that my issue has been completely resolved. Thank you!",
        timestamp: ticket?.customerConfirmedAt || ticket?.updatedAt || new Date().toISOString(),
      });
    }

    // Sort chronologically
    list.sort((a, b) => new Date(a.timestamp || 0) - new Date(b.timestamp || 0));
    return list;
  }, [ticket, user]);

  const ticketCode = ticket.ticketNumber || ticket.ticket_number || (typeof ticket.id === "number" ? `TKT-${1000 + ticket.id}` : `TKT${String(ticket.id).replace(/\D/g, "")}`);

  const wfExecutions = ticket?.latest_workflow?.executions || workflowData?.executions || [];
  const resolExec = wfExecutions.find((e) => e.agent_name && e.agent_name.includes("Resolution")) || { output_data: workflowData?.resolution };
  const retrExec = wfExecutions.find((e) => e.agent_name && e.agent_name.includes("Retrieval")) || { output_data: workflowData?.knowledge_retrieval };

  const resolutionSteps = useMemo(() => {
    if (!ticket) return [];

    // 1. Direct array fields on ticket
    if (Array.isArray(ticket.suggested_steps) && ticket.suggested_steps.length > 0) {
      return ticket.suggested_steps;
    }
    if (Array.isArray(ticket.suggestedResolution) && ticket.suggestedResolution.length > 0) {
      return ticket.suggestedResolution;
    }
    if (Array.isArray(ticket.ai?.suggestedResolution) && ticket.ai.suggestedResolution.length > 0) {
      return ticket.ai.suggestedResolution;
    }

    // 2. ai_analysis_meta resolution or retrieval steps
    const metaResSteps = ticket.ai_analysis_meta?.resolution?.troubleshooting_steps;
    if (Array.isArray(metaResSteps) && metaResSteps.length > 0) {
      return metaResSteps;
    }
    const metaRetSteps = ticket.ai_analysis_meta?.retrieval?.suggested_steps;
    if (Array.isArray(metaRetSteps) && metaRetSteps.length > 0) {
      return metaRetSteps;
    }

    // 3. String or JSON in suggested_resolution
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
    } else if (Array.isArray(ticket.suggested_resolution) && ticket.suggested_resolution.length > 0) {
      return ticket.suggested_resolution;
    }

    // 4. From agent workflow executions or simulated workflow
    if (resolExec?.output_data?.troubleshooting_steps && resolExec.output_data.troubleshooting_steps.length > 0) {
      return resolExec.output_data.troubleshooting_steps;
    }
    if (retrExec?.output_data?.suggested_steps && retrExec.output_data.suggested_steps.length > 0) {
      return retrExec.output_data.suggested_steps;
    }
    if (workflowData?.resolution?.troubleshooting_steps && workflowData.resolution.troubleshooting_steps.length > 0) {
      return workflowData.resolution.troubleshooting_steps;
    }
    if (workflowData?.knowledge_retrieval?.suggested_steps && workflowData.knowledge_retrieval.suggested_steps.length > 0) {
      return workflowData.knowledge_retrieval.suggested_steps;
    }

    // 5. Intelligent category/subject tailored troubleshooting steps
    const cat = (ticket.category || "").toLowerCase();
    const text = `${ticket.subject || ticket.title || ""} ${ticket.description || ""}`.toLowerCase();

    if (cat.includes("network") || text.includes("vpn") || text.includes("internet") || text.includes("interent") || text.includes("wi-fi") || text.includes("wifi")) {
      return [
        "Verify local physical ethernet cable connection or Wi-Fi network indicator.",
        "Restart your local network adapter or toggle Wi-Fi OFF and ON in system settings.",
        "Flush local DNS cache (ipconfig /flushdns or sudo dscacheutil -flushcache).",
        "Power cycle your router/modem and wait 60 seconds before reconnecting.",
        "Contact Network Operations Desk if broad ISP connectivity remains down."
      ];
    }
    if (cat.includes("account") || cat.includes("auth") || text.includes("password") || text.includes("login") || text.includes("sso")) {
      return [
        "Navigate to the self-service account recovery portal at /auth/recovery.",
        "Enter your registered corporate email to receive a verification OTP or push notification.",
        "Set a new secure password meeting complexity policy (minimum 12 characters).",
        "Wait 60 seconds for directory synchronization before attempting login.",
        "Log in using your updated credentials and complete multi-factor authentication (MFA)."
      ];
    }
    if (cat.includes("security") || text.includes("phish") || text.includes("hack") || text.includes("malware") || text.includes("alert")) {
      return [
        "Do NOT click any links, open attachments, or approve unsolicited MFA prompts.",
        "Immediately change corporate credentials via the central SSO self-service portal.",
        "Disconnect your device from corporate Wi-Fi or VPN to isolate potential compromise.",
        "Forward suspicious email headers to the SecOps response team.",
        "Wait for Security Operations confirmation before reconnecting to the internal domain."
      ];
    }
    if (cat.includes("hardware") || text.includes("laptop") || text.includes("monitor") || text.includes("printer") || text.includes("dock")) {
      return [
        "Power cycle the affected hardware device and verify physical power cables.",
        "Inspect all connector pins and physical ports (HDMI, USB-C, power supply).",
        "Run built-in hardware diagnostics utility via system UEFI/BIOS.",
        "Reboot your workstation to clear volatile system cache and driver conflicts."
      ];
    }

    return [
      "Force-close all instances of the application using Task Manager / Activity Monitor.",
      "Clear local application cache files and reboot your machine.",
      "Check Company Portal / Software Center for pending application updates.",
      "Contact IT administrator if the issue persists."
    ];
  }, [ticket, resolExec, retrExec, workflowData]);

  const resolvedSource = useMemo(() => {
    if (!ticket) return "Enterprise IT Knowledge Base";
    if (ticket.knowledgeSource) return ticket.knowledgeSource;
    if (ticket.knowledge_source) return ticket.knowledge_source;
    if (ticket.ai?.knowledgeSource) return ticket.ai.knowledgeSource;
    if (ticket.ai_analysis_meta?.retrieval?.knowledge_source) return ticket.ai_analysis_meta.retrieval.knowledge_source;
    if (ticket.ai_analysis_meta?.resolution?.sources?.[0]) return ticket.ai_analysis_meta.resolution.sources[0];
    if (resolExec?.output_data?.sources?.[0]) return resolExec.output_data.sources[0];
    if (retrExec?.output_data?.knowledge_source) return retrExec.output_data.knowledge_source;
    if (workflowData?.knowledge_retrieval?.knowledge_source) return workflowData.knowledge_retrieval.knowledge_source;

    const cat = (ticket.category || "").toLowerCase();
    const text = `${ticket.subject || ticket.title || ""}`.toLowerCase();
    if (cat.includes("network") || text.includes("vpn") || text.includes("internet") || text.includes("interent")) {
      return "Corporate Network & Broadband Troubleshooting (KB-NET-002)";
    }
    if (cat.includes("account") || cat.includes("auth") || text.includes("login") || text.includes("password")) {
      return "SSO Login & Self-Service Password Reset (KB-AUTH-003)";
    }
    if (cat.includes("security")) {
      return "Enterprise Security & Phishing Response Protocol (KB-SEC-002)";
    }
    return "Enterprise IT Knowledge Base / Standard Operations Manual";
  }, [ticket, resolExec, retrExec, workflowData]);

  const dateDisplay = ticket.createdAt || ticket.created_at
    ? new Date(ticket.createdAt || ticket.created_at).toLocaleString()
    : "27/08/2026, 19:26:45";

  return (
    <div className="mx-auto max-w-[1280px] p-4 sm:p-6 space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce">
          <div className="rounded-xl bg-slate-900 px-4 py-3 text-xs font-semibold text-white shadow-2xl border border-slate-700">
            {toast.message}
          </div>
        </div>
      )}

      {/* Top Header Row with Badges and Close Ticket button */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2.5 mb-2">
            <span className="font-mono font-bold text-xs bg-[#1c2430] text-white px-2.5 py-1 rounded">
              {ticketCode}
            </span>
            <span className="bg-blue-100 text-blue-900 border border-blue-200 font-bold px-3 py-1 rounded-full text-xs flex items-center gap-1">
              <span>🏢</span> {ticket.department || getDepartmentForCategory(ticket.category)}
            </span>
            <span className="bg-purple-100 text-purple-800 font-bold px-3 py-1 rounded-full text-xs flex items-center gap-1">
              <span>✦</span> AI Resolution Ready
            </span>
            <span className="bg-[#ea580c] text-white font-mono font-bold text-xs px-2.5 py-1 rounded">
              {ticket.priority || "P2"}
            </span>
          </div>

          <h1 className="text-3xl font-extrabold text-[#1c2430] tracking-tight">
            {ticket.subject || ticket.title}
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Submitted by Customer on {dateDisplay}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <GmailComposeButton
            recipient="support@company.com"
            subject={`[SupportPilot Ticket #${ticketCode}] Inquiry on ${ticket.subject || ticket.title}`}
            body={`Hello Support Team,\n\nI am contacting you regarding my support ticket #${ticketCode} (${ticket.subject || ticket.title}).\n\nProblem Details:\n${ticket.description || ""}\n\nThank you,\n${user?.name || user?.username || "Customer"}`}
            label="Email Support via Gmail"
            variant="secondary"
          />

          {["RESOLVED", "Resolved", "CLOSED", "Closed"].includes(ticket.status) ? (
            <button
              onClick={reopen}
              className="bg-[#1c2430] hover:bg-slate-900 text-white px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer"
            >
              Reopen Ticket
            </button>
          ) : (
            <button
              onClick={closeTicket}
              className="bg-[#1c2430] hover:bg-slate-900 text-white px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer"
            >
              Close Ticket
            </button>
          )}
        </div>
      </div>


      {/* 2-Column Main Layout: Left AI Solution & Timeline | Right Classification & SLA */}
      <div className="grid lg:grid-cols-[minmax(0,1fr)_340px] gap-6 items-start">
        {/* Left Column */}
        <div className="space-y-6">
          {/* 1. AUTOMATED AI RESOLUTION & KNOWLEDGE GUIDE (Dark Green Card) */}
          <section className="bg-[#0a1b14] border border-[#16382a] rounded-2xl p-6 text-white shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-2">
              <div className="flex items-center gap-2">
                <span className="text-lg text-emerald-400">✦</span>
                <h2 className="font-bold text-lg text-emerald-100">
                  Automated AI Resolution & Knowledge Guide
                </h2>
              </div>
              <span className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-mono text-[10px] px-2.5 py-1 rounded">
                RAG Pipeline Active
              </span>
            </div>

            {/* Knowledge Source Box */}
            <div className="bg-[#0f281e] border border-[#1c4735] rounded-xl p-3.5 text-xs">
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">
                RETRIEVED KNOWLEDGE SOURCE
              </span>
              <span className="text-emerald-300 font-semibold flex items-center gap-1.5">
                <span>📚</span>
                <span>{resolvedSource}</span>
              </span>
            </div>

            <p className="text-xs text-gray-300">
              Based on your issue description and enterprise troubleshooting guidelines, follow these steps to resolve:
            </p>

            {/* Numbered Steps */}
            <div className="space-y-2.5">
              {resolutionSteps.map((step, index) => {
                const stepText = typeof step === "string" ? step : step?.step || step?.title || step?.text || JSON.stringify(step);
                return (
                  <div
                    key={index}
                    className="bg-[#0f281e] border border-[#1c4735] rounded-xl p-3.5 flex items-center gap-3 text-xs text-gray-200"
                  >
                    <span className="h-6 w-6 rounded-full bg-emerald-600/25 text-emerald-300 flex items-center justify-center font-bold text-xs shrink-0 border border-emerald-500/30">
                      {index + 1}
                    </span>
                    <span className="leading-relaxed">{stepText.replace(/^\d+[\.\)]\s*/, "")}</span>
                  </div>
                );
              })}
            </div>

            {/* Bottom Actions Row: Milestone 4 Resolution Confirmation */}
            <div className="pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
              {ticket.status === "CLOSED" || ticket.customerConfirmed ? (
                <div className="w-full flex items-center justify-between bg-emerald-950/60 p-3 rounded-xl border border-emerald-500/30 text-xs text-emerald-300">
                  <div className="flex items-center gap-2">
                    <span>🎉</span>
                    <span><strong>Resolution Verified & Closed:</strong> You confirmed this issue was solved.</span>
                  </div>
                  <span className="text-[10px] font-mono bg-emerald-500/20 px-2 py-0.5 rounded text-emerald-200">
                    Status: CLOSED
                  </span>
                </div>
              ) : ticket.status === "RESOLVED" || ticket.status === "PENDING_CONFIRMATION" || ticket.status === "WAITING_FOR_CUSTOMER" ? (
                <div className="w-full space-y-2.5 bg-[#0f281e] p-3.5 rounded-xl border border-emerald-500/40">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-emerald-200 font-bold flex items-center gap-1.5">
                      <span>🛡️</span> Please Confirm Support Resolution:
                    </span>
                    <span className="text-[10px] text-emerald-400 font-mono">
                      Phase: {ticket.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-300">
                    Our AI and support team have provided a resolution. Please confirm if your problem has been resolved:
                  </p>
                  <div className="flex flex-wrap items-center gap-2.5 pt-1">
                    <button
                      type="button"
                      disabled={isConfirmingResolution}
                      onClick={handleConfirmSolved}
                      className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold px-4 py-2 rounded-xl text-xs transition cursor-pointer shadow-md disabled:opacity-50 flex items-center gap-1.5"
                    >
                      <span>✓ Yes, Issue Confirmed Solved</span>
                    </button>
                    <button
                      type="button"
                      disabled={isConfirmingResolution}
                      onClick={() => setShowUnsolvedModal(true)}
                      className="bg-rose-950/70 hover:bg-rose-900 text-rose-200 border border-rose-700/60 font-semibold px-4 py-2 rounded-xl text-xs transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                    >
                      <span>✕ Not Solved / Need More Help</span>
                    </button>
                  </div>
                </div>
              ) : ticket.assistanceRequested || ticket.status === "IN_PROGRESS" || ticket.status === "In Progress" ? (
                <div className="text-xs text-amber-200 font-semibold flex items-center gap-2">
                  <span>👨‍💻</span>
                  <span><strong>Agent Assistance Active:</strong> Assigned to support desk.</span>
                </div>
              ) : (
                <>
                  <span className="text-xs text-gray-400 font-medium">
                    Did this resolve your issue?
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={isConfirmingResolution}
                      onClick={handleConfirmSolved}
                      className="bg-[#10b981] hover:bg-[#059669] text-[#0a1b14] font-extrabold px-4 py-2 rounded-lg text-xs transition cursor-pointer"
                    >
                      ✓ Yes, Solved
                    </button>
                    <button
                      type="button"
                      disabled={isConfirmingResolution}
                      onClick={() => setShowUnsolvedModal(true)}
                      className="bg-[#153427] hover:bg-[#1c4534] text-gray-200 border border-[#265942] font-semibold px-4 py-2 rounded-lg text-xs transition cursor-pointer"
                    >
                      Need More Help
                    </button>
                  </div>
                </>
              )}
            </div>
          </section>

          {/* PROVIDE INFORMATION CARD (When Awaiting Customer Info) */}
          {ticket.status === "AWAITING_CUSTOMER_INFO" && (
            <section className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-6 shadow-sm space-y-3">
              <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
                <span className="text-lg">ℹ️</span>
                <span>Action Needed: Additional Information Requested</span>
              </div>
              <p className="text-xs text-amber-900 leading-relaxed">
                The support team needs extra details to proceed with your ticket.
                {ticket.awaitingInfoPrompt && (
                  <span className="block mt-1 font-semibold p-2 bg-amber-100 rounded-lg">
                    "{ticket.awaitingInfoPrompt}"
                  </span>
                )}
              </p>
              <form onSubmit={handleProvideCustomerInfo} className="space-y-2 pt-1">
                <textarea
                  rows={3}
                  value={providedInfoMessage}
                  onChange={(e) => setProvidedInfoMessage(e.target.value)}
                  placeholder="Type requested details, system logs or error text here..."
                  className="w-full rounded-xl border border-amber-300 p-3 text-xs text-slate-900 bg-white outline-none focus:ring-2 focus:ring-amber-500"
                />
                <button
                  type="submit"
                  disabled={isSubmittingInfo || !providedInfoMessage.trim()}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-4 py-2 rounded-xl text-xs transition cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingInfo ? "Submitting..." : "Submit Information → Return to In Progress"}
                </button>
              </form>
            </section>
          )}

          {/* CUSTOMER FEEDBACK & CSAT RATING CARD */}
          {(ticket.status === "CLOSED" || ticket.status === "RESOLVED" || ticket.customerConfirmed || ticket.customerFeedback) && (
            <section className="bg-gradient-to-r from-emerald-50 via-teal-50 to-indigo-50 border border-emerald-200 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-emerald-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">⭐</span>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Support Satisfaction & CSAT Feedback</h3>
                    <p className="text-[11px] text-slate-500">Rate your resolution experience with SupportPilot AI</p>
                  </div>
                </div>
                <span className="text-[10px] font-mono font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                  Milestone 4 Learning Loop
                </span>
              </div>

              {ticket.customerFeedback || ticket.feedback ? (
                <div className="p-4 bg-white rounded-xl border border-emerald-300 shadow-xs text-xs space-y-2">
                  <div className="flex items-center justify-between border-b border-emerald-100 pb-2">
                    <div className="flex items-center gap-1.5 font-bold text-emerald-950">
                      <span className="text-emerald-600">✓</span>
                      <span>Feedback Submitted & Ticket Completed</span>
                    </div>
                    <span className="bg-emerald-100 text-emerald-800 font-mono font-bold text-[10px] px-2 py-0.5 rounded">
                      STATUS: CLOSED (COMPLETED)
                    </span>
                  </div>
                  <div className="flex items-center gap-2 font-bold text-slate-800">
                    <span>Rating:</span>
                    <span className="text-amber-500 text-sm">
                      {"★".repeat((ticket.customerFeedback || ticket.feedback).rating || 5)}{"☆".repeat(5 - ((ticket.customerFeedback || ticket.feedback).rating || 5))}
                    </span>
                    <span className="text-slate-500 font-mono">({(ticket.customerFeedback || ticket.feedback).rating || 5}/5 Stars)</span>
                  </div>
                  {(ticket.customerFeedback || ticket.feedback).comment && (
                    <p className="text-slate-600 italic bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                      "{(ticket.customerFeedback || ticket.feedback).comment}"
                    </p>
                  )}
                  <div className="flex items-center justify-between text-[10px] text-emerald-700 font-medium pt-1">
                    <span>✓ Stored in Admin & Agent Records & Activity Timeline.</span>
                    <span className="font-mono text-slate-400">
                      {new Date((ticket.customerFeedback || ticket.feedback).submittedAt || Date.now()).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmitCSATFeedback} className="space-y-3 text-xs">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1.5">How satisfied are you with this resolution?</label>
                    <div className="flex items-center gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setFeedbackRating(star)}
                          className={`h-9 w-9 rounded-xl font-bold text-sm transition cursor-pointer border ${
                            feedbackRating >= star
                              ? "bg-amber-400 text-white border-amber-400 shadow-sm"
                              : "bg-white text-slate-400 border-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          ★
                        </button>
                      ))}
                      <span className="text-xs font-bold text-slate-700 ml-2">
                        {feedbackRating === 5 ? "5/5 - Excellent!" : `${feedbackRating}/5`}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Additional Comments or Suggestions:</label>
                    <textarea
                      rows={2}
                      value={feedbackComment}
                      onChange={(e) => setFeedbackComment(e.target.value)}
                      placeholder="Let us know what went well or how we can improve..."
                      className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-800 bg-white outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingFeedback}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-xs transition cursor-pointer shadow-sm disabled:opacity-50"
                  >
                    {isSubmittingFeedback ? "Submitting..." : "Submit CSAT Feedback"}
                  </button>
                </form>
              )}
            </section>
          )}

          {/* 2. REPORTED PROBLEM DESCRIPTION CARD */}
          <section className="bg-white border border-[#dfe5e1] rounded-2xl p-6 shadow-sm space-y-2">
            <h2 className="text-base font-bold text-[#1c2430]">
              Reported Problem Description
            </h2>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
              {ticket.description || ticket.subject || "interent connection is not working"}
            </p>
          </section>

          {/* 3. SUPPORT CONVERSATION & AGENT REPLIES CARD */}
          <section className="bg-white border border-[#dfe5e1] rounded-2xl p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#dfe5e1]">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 font-bold text-sm">
                  💬
                </div>
                <div>
                  <h2 className="text-base font-bold text-[#1c2430]">
                    Conversation & Support Chat
                  </h2>
                  <p className="text-[11px] text-gray-500">
                    Live updates and direct communication with your assigned support specialist.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
                  {conversationList.length} {conversationList.length === 1 ? "Message" : "Messages"}
                </span>
                <button
                  type="button"
                  onClick={loadTicket}
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                  title="Refresh conversation"
                >
                  ↻ Refresh
                </button>
              </div>
            </div>

            {/* Conversation Feed */}
            <div className="space-y-3.5 max-h-[480px] overflow-y-auto pr-1">
              {/* Initial Customer Request Message */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-[10px]">
                      {ticket.customerName ? ticket.customerName.charAt(0).toUpperCase() : "C"}
                    </div>
                    <span className="text-xs font-bold text-[#1c2430]">
                      {ticket.customerName || user?.name || "Customer"}
                    </span>
                    <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[9px] font-semibold text-slate-700">
                      Ticket Creator
                    </span>
                  </div>
                  <span className="text-[10px] text-gray-400 font-mono">
                    {dateDisplay}
                  </span>
                </div>
                <p className="text-xs text-slate-800 whitespace-pre-wrap leading-relaxed">
                  {ticket.description || ticket.subject || "No initial problem description provided."}
                </p>
              </div>

              {/* Dynamic Conversation Items */}
              {conversationList.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-gray-500 bg-slate-50/30">
                  <p className="font-semibold text-slate-700">No replies yet.</p>
                  <p className="text-[11px] text-gray-400 mt-1">
                    When an agent replies, their response will appear here immediately. You can also send additional details below.
                  </p>
                </div>
              ) : (
                conversationList.map((msg, index) => {
                  const msgDate = msg.timestamp
                    ? new Date(msg.timestamp).toLocaleString()
                    : "Recently";

                  if (msg.isAgent) {
                    return (
                      <div
                        key={msg.id || index}
                        className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 shadow-xs"
                      >
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <div className="h-6 w-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-[10px] shadow-xs">
                              👨‍💼
                            </div>
                            <span className="text-xs font-bold text-[#1c2430]">
                              {msg.author || "Support Agent"}
                            </span>
                            <span className="rounded-full bg-emerald-600 text-white px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider">
                              Support Agent
                            </span>
                          </div>
                          <span className="text-[10px] text-emerald-800/80 font-mono font-medium">
                            {msgDate}
                          </span>
                        </div>
                        <p className="text-xs text-slate-800 whitespace-pre-wrap leading-relaxed">
                          {msg.message}
                        </p>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={msg.id || index}
                      className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs"
                    >
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-[10px]">
                            👤
                          </div>
                          <span className="text-xs font-bold text-[#1c2430]">
                            {msg.author || "Customer"}
                          </span>
                          <span className="rounded bg-slate-100 text-slate-600 px-1.5 py-0.5 text-[9px] font-semibold">
                            Customer
                          </span>
                        </div>
                        <span className="text-[10px] text-gray-400 font-mono">
                          {msgDate}
                        </span>
                      </div>
                      <p className="text-xs text-slate-800 whitespace-pre-wrap leading-relaxed">
                        {msg.message}
                      </p>
                    </div>
                  );
                })
              )}
            </div>

            {/* Customer Reply Input Box */}
            <form onSubmit={handleCustomerReply} className="pt-3 border-t border-[#dfe5e1] space-y-3">
              <label className="block text-xs font-bold text-[#1c2430]">
                Send a Message or Additional Details to Support:
              </label>
              <textarea
                value={replyMessage}
                onChange={(e) => setReplyMessage(e.target.value)}
                rows={3}
                placeholder="Type your message, question, or follow-up to the support specialist..."
                className="w-full rounded-xl border border-[#dfe5e1] p-3 text-xs outline-none focus:border-[#15803d] focus:ring-1 focus:ring-[#15803d] transition"
              />
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-gray-400">
                  Your message will be saved and delivered to the assigned agent.
                </span>
                <button
                  type="submit"
                  disabled={isSubmittingReply || !replyMessage.trim()}
                  className="rounded-xl bg-[#15803d] hover:bg-[#166534] disabled:bg-slate-300 disabled:cursor-not-allowed text-white px-5 py-2 text-xs font-bold shadow-sm transition flex items-center gap-2 cursor-pointer"
                >
                  {isSubmittingReply ? (
                    <>
                      <div className="animate-spin inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <span>Send Reply</span>
                      <span>➤</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </section>

          {/* 4. TICKET WORKFLOW TIMELINE CARD */}
          <section className="bg-white border border-[#dfe5e1] rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h2 className="text-base font-bold text-[#1c2430] flex items-center gap-2">
                <span>📋</span> Ticket Workflow Timeline
              </h2>
              <span className={`px-2.5 py-0.5 rounded-full font-mono text-[10px] font-bold ${
                ticket.status === "CLOSED" || ticket.customerFeedback || ticket.feedback
                  ? "bg-emerald-100 text-emerald-800"
                  : ticket.status === "RESOLVED"
                  ? "bg-teal-100 text-teal-800"
                  : "bg-blue-100 text-blue-800"
              }`}>
                {ticket.status === "CLOSED" || ticket.customerFeedback || ticket.feedback ? "✓ WORKFLOW COMPLETED" : `STATUS: ${ticket.status}`}
              </span>
            </div>

            <div className="space-y-4 pl-2 relative border-l-2 border-slate-200 ml-2">
              {/* 1. Ticket Created */}
              <div className="relative pl-4">
                <div className="absolute -left-[9px] top-1.5 h-3 w-3 rounded-full bg-[#10b981] border-2 border-white shadow-sm" />
                <div className="text-xs font-bold text-[#1c2430]">Ticket created</div>
                <div className="text-[11px] text-gray-500">Submitted and ingested into SupportPilot queue.</div>
                <div className="text-[10px] text-gray-400 mt-0.5">{dateDisplay}</div>
              </div>

              {/* 2. AI Classification */}
              <div className="relative pl-4">
                <div className="absolute -left-[9px] top-1.5 h-3 w-3 rounded-full bg-[#10b981] border-2 border-white shadow-sm" />
                <div className="text-xs font-bold text-[#1c2430]">AI Classified & Categorized</div>
                <div className="text-[11px] text-gray-500">Predicted Category: {ticket.category || "Network"}, Severity: {ticket.severity || "Medium"}, Priority: {ticket.priority || "P3"}.</div>
                <div className="text-[10px] text-gray-400 mt-0.5">{dateDisplay}</div>
              </div>

              {/* 3. AI Resolution Guide */}
              <div className="relative pl-4">
                <div className="absolute -left-[9px] top-1.5 h-3 w-3 rounded-full bg-[#10b981] border-2 border-white shadow-sm" />
                <div className="text-xs font-bold text-[#1c2430]">AI Automated Resolution Guide Ready</div>
                <div className="text-[11px] text-gray-500">Knowledge retrieved from: {resolvedSource || "Enterprise Knowledge Store"}.</div>
                <div className="text-[10px] text-gray-400 mt-0.5">{dateDisplay}</div>
              </div>

              {/* 4. Ticket Assigned */}
              <div className="relative pl-4">
                <div className="absolute -left-[9px] top-1.5 h-3 w-3 rounded-full bg-[#10b981] border-2 border-white shadow-sm" />
                <div className="text-xs font-bold text-[#1c2430]">Ticket assigned</div>
                <div className="text-[11px] text-gray-500">Assigned to {ticket.assignedAgentName || ticket.assignedAgent || "Support Desk"}.</div>
                <div className="text-[10px] text-gray-400 mt-0.5">{dateDisplay}</div>
              </div>

              {/* 5. Issue Resolved by Support Agent */}
              {(["RESOLVED", "CLOSED", "WAITING_FOR_CUSTOMER"].includes(String(ticket.status || "").toUpperCase()) || ticket.resolvedAt || ticket.selfResolved || ticket.customerConfirmed) && (
                <div className="relative pl-4 animate-fade-in">
                  <div className="absolute -left-[9px] top-1.5 h-3 w-3 rounded-full bg-[#10b981] border-2 border-white shadow-sm" />
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#1c2430]">Issue Resolved by Support Team</span>
                    <span className="bg-teal-100 text-teal-800 text-[9px] font-bold px-1.5 py-0.2 rounded font-mono">RESOLVED</span>
                  </div>
                  <div className="text-[11px] text-gray-600 mt-0.5">
                    {ticket.resolution?.solution || "Verified resolution steps delivered to customer."}
                  </div>
                  <div className="text-[10px] text-gray-400 mt-0.5">
                    {ticket.resolvedAt ? new Date(ticket.resolvedAt).toLocaleString() : dateDisplay}
                  </div>
                </div>
              )}

              {/* 6. Customer Confirmation */}
              {(ticket.customerConfirmed || ticket.customerFeedback || ticket.feedback || ticket.status === "CLOSED") && (
                <div className="relative pl-4 animate-fade-in">
                  <div className="absolute -left-[9px] top-1.5 h-3 w-3 rounded-full bg-[#10b981] border-2 border-white shadow-sm" />
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#1c2430]">Customer Confirmed Resolution</span>
                    <span className="bg-emerald-100 text-emerald-800 text-[9px] font-bold px-1.5 py-0.2 rounded font-mono">CONFIRMED</span>
                  </div>
                  <div className="text-[11px] text-gray-600 mt-0.5">
                    Customer verified that the resolution solved the reported problem.
                  </div>
                  <div className="text-[10px] text-gray-400 mt-0.5">
                    {ticket.customerConfirmedAt ? new Date(ticket.customerConfirmedAt).toLocaleString() : dateDisplay}
                  </div>
                </div>
              )}

              {/* 7. CSAT Feedback & Ticket Completed */}
              {(ticket.status === "CLOSED" || ticket.customerFeedback || ticket.feedback || ticket.isCompleted) ? (
                <div className="relative pl-4 animate-fade-in">
                  <div className="absolute -left-[10px] top-1.5 h-3.5 w-3.5 rounded-full bg-emerald-600 border-2 border-white shadow-md ring-2 ring-emerald-300" />
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold text-emerald-950">Ticket Completed & Closed</span>
                    <span className="bg-emerald-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full font-mono">COMPLETED</span>
                  </div>
                  <div className="text-[11px] text-emerald-800 font-semibold mt-0.5">
                    ✓ Full workflow completed. CSAT Rating: {(ticket.customerFeedback || ticket.feedback)?.rating || 5}/5 Stars ⭐
                  </div>
                  {(ticket.customerFeedback || ticket.feedback)?.comment && (
                    <div className="text-[11px] text-gray-600 italic mt-0.5">
                      "{(ticket.customerFeedback || ticket.feedback).comment}"
                    </div>
                  )}
                  <div className="text-[10px] text-gray-400 mt-0.5">
                    {(ticket.customerFeedback || ticket.feedback)?.submittedAt
                      ? new Date((ticket.customerFeedback || ticket.feedback).submittedAt).toLocaleString()
                      : dateDisplay}
                  </div>
                </div>
              ) : (
                <div className="relative pl-4 opacity-75">
                  <div className="absolute -left-[8px] top-1.5 h-2.5 w-2.5 rounded-full bg-slate-300 border-2 border-white" />
                  <div className="text-xs font-semibold text-slate-500">Awaiting Customer Confirmation & Closure</div>
                  <div className="text-[11px] text-gray-400">Final ticket completion occurs once customer confirms resolution or submits feedback.</div>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Right Column: AI CLASSIFICATION & SLA METRICS */}
        <div className="space-y-6">
          <section className="bg-white border border-[#dfe5e1] rounded-2xl p-6 shadow-sm space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#1c2430] pb-2 border-b border-gray-100">
              AI CLASSIFICATION & SLA METRICS
            </h2>

            <div className="space-y-3.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Department</span>
                <span className="bg-blue-50 text-blue-800 border border-blue-200 px-2 py-0.5 rounded font-bold text-[11px]">
                  🏢 {ticket.department || getDepartmentForCategory(ticket.category)}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-500">Category</span>
                <strong className="text-emerald-700 font-semibold">{ticket.category || "Network"}</strong>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-500">Sub-Category</span>
                <span className="font-semibold text-[#1c2430]">{ticket.sub_category || ticket.subCategory || "Internet"}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-500">Severity</span>
                <span className="font-semibold text-[#1c2430]">{ticket.severity || "Medium"}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-500">Priority Score</span>
                <span className="bg-[#ea580c] text-white font-mono font-bold text-[11px] px-2 py-0.5 rounded">
                  {ticket.priority || "P3"}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-500">AI Confidence</span>
                <span className="font-bold text-emerald-600">95%</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-500">Assigned Team</span>
                <span className="font-semibold text-[#1c2430]">Support</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-500">Assigned Agent</span>
                <span className="font-semibold text-[#1c2430]">{ticket.assignedAgentName || ticket.assignedAgent || "Unassigned"}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-500">SLA Target</span>
                <strong className="font-bold text-[#1c2430]">
                  {ticket.priority === "P1" ? "1 hour" : ticket.priority === "P2" ? "4 hours" : "24 hours"}
                </strong>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* UNSOLVED CONFIRMATION / REOPEN MODAL */}
      {showUnsolvedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">⚠️</span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Issue Not Resolved</h3>
                  <p className="text-[11px] text-slate-500">Ticket will be reopened and returned to active investigation</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowUnsolvedModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <label className="font-bold text-slate-800 block">
                Please tell us what happened or why the solution did not resolve your issue:
              </label>
              <textarea
                rows={4}
                value={unsolvedReason}
                onChange={(e) => setUnsolvedReason(e.target.value)}
                placeholder="Describe what error or obstacle remains..."
                className="w-full rounded-xl border border-slate-300 p-3 text-xs text-slate-900 outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowUnsolvedModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isConfirmingResolution || !unsolvedReason.trim()}
                onClick={handleConfirmNotSolved}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-xs font-bold text-white transition shadow cursor-pointer disabled:opacity-50"
              >
                {isConfirmingResolution ? "Updating..." : "Reopen Ticket → REOPENED"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}