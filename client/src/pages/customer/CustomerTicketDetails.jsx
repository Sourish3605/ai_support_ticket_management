import { useEffect, useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  getTicketById,
  updateTicket,
  addComment,
  fetchTicketByIdApi,
  addTicketReplyApi,
} from "../../services/ticketService";
import {
  fetchAgentWorkflowApi,
  simulateWorkflowLocally,
} from "../../services/m3AgentService";
import GmailComposeButton from "../../components/GmailComposeButton";


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
      const apiRes = await addTicketReplyApi(ticket.id, text);
      if (apiRes) {
        setTicket((prev) => ({
          ...prev,
          replies: [...(prev.replies || []), apiRes],
          comments: [
            ...(prev.comments || []),
            {
              id: apiRes.id,
              author: apiRes.author_name || authorName,
              authorRole: "CUSTOMER",
              message: text,
              timestamp: apiRes.created_at || new Date().toISOString(),
            },
          ],
        }));
      } else {
        const newC = addComment(ticket.id, {
          author: authorName,
          authorRole: "CUSTOMER",
          visibility: "Public",
          message: text,
        });
        setTicket((prev) => ({
          ...prev,
          comments: [...(prev.comments || []), newC],
        }));
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

            {/* Bottom Actions Row */}
            <div className="pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
              {ticket.selfResolved || ticket.status === "RESOLVED" || ticket.status === "Resolved" ? (
                <div className="text-xs text-emerald-300 font-semibold flex items-center gap-2">
                  <span>🎉</span>
                  <span><strong>Marked as Solved:</strong> You confirmed this issue was resolved.</span>
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
                      onClick={handleYesSolved}
                      className="bg-[#10b981] hover:bg-[#059669] text-[#0a1b14] font-extrabold px-4 py-2 rounded-lg text-xs transition cursor-pointer"
                    >
                      ✓ Yes, Solved
                    </button>
                    <button
                      type="button"
                      onClick={handleNeedAssistance}
                      className="bg-[#153427] hover:bg-[#1c4534] text-gray-200 border border-[#265942] font-semibold px-4 py-2 rounded-lg text-xs transition cursor-pointer"
                    >
                      Need Agent Assistance
                    </button>
                  </div>
                </>
              )}
            </div>
          </section>

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
            <h2 className="text-base font-bold text-[#1c2430]">
              Ticket Workflow Timeline
            </h2>

            <div className="space-y-4 pl-2 relative border-l-2 border-slate-200 ml-2">
              <div className="relative pl-4">
                <div className="absolute -left-[9px] top-1.5 h-3 w-3 rounded-full bg-[#10b981] border-2 border-white shadow-sm" />
                <div className="text-xs font-bold text-[#1c2430]">Ticket created</div>
                <div className="text-[11px] text-gray-500">Submitted and ingested into SupportPilot queue.</div>
                <div className="text-[10px] text-gray-400 mt-0.5">{dateDisplay}</div>
              </div>

              <div className="relative pl-4">
                <div className="absolute -left-[9px] top-1.5 h-3 w-3 rounded-full bg-[#10b981] border-2 border-white shadow-sm" />
                <div className="text-xs font-bold text-[#1c2430]">AI Classified & Categorized</div>
                <div className="text-[11px] text-gray-500">Predicted Category: {ticket.category || "Network"}, Severity: {ticket.severity || "Medium"}, Priority: {ticket.priority || "P3"}.</div>
                <div className="text-[10px] text-gray-400 mt-0.5">{dateDisplay}</div>
              </div>

              <div className="relative pl-4">
                <div className="absolute -left-[9px] top-1.5 h-3 w-3 rounded-full bg-[#10b981] border-2 border-white shadow-sm" />
                <div className="text-xs font-bold text-[#1c2430]">AI Automated Resolution Guide Ready</div>
                <div className="text-[11px] text-gray-500">Knowledge retrieved from: Enterprise Knowledge Store.</div>
                <div className="text-[10px] text-gray-400 mt-0.5">{dateDisplay}</div>
              </div>

              <div className="relative pl-4">
                <div className="absolute -left-[9px] top-1.5 h-3 w-3 rounded-full bg-[#10b981] border-2 border-white shadow-sm" />
                <div className="text-xs font-bold text-[#1c2430]">Ticket assigned</div>
                <div className="text-[11px] text-gray-500">Assigned to {ticket.assignedAgentName || ticket.assignedAgent || "Support Desk"}.</div>
                <div className="text-[10px] text-gray-400 mt-0.5">{dateDisplay}</div>
              </div>
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
    </div>
  );
}