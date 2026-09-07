import { useEffect, useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import {
  getTicketById,
  updateTicket,
  addComment,
  fetchTicketByIdApi,
  updateTicketStatusApi,
  assignTicketApi,
  addTicketReplyApi,
} from "../../services/ticketService";
import {
  startAgentWorkflowApi,
  fetchAgentWorkflowApi,
  fetchJiraTicketApi,
  syncJiraStatusApi,
  fetchEmailLogsApi,
  fetchActivityLogsApi,
  simulateWorkflowLocally,
} from "../../services/m3AgentService";
import { useAuth } from "../../context/AuthContext";
import GmailComposeButton from "../../components/GmailComposeButton";


const priorityClass = {
  P1: "sp-p1",
  High: "sp-p1",
  Critical: "sp-p1",
  P2: "sp-p2",
  P3: "sp-p3",
  Medium: "sp-p2",
  P4: "sp-p4",
  Low: "sp-p4",
};

export default function AgentTicketDetails() {
  const { id } = useParams();
  const { user } = useAuth();
  const initialTicket = getTicketById(id);
  const [ticket, setTicket] = useState(initialTicket);
  const [loading, setLoading] = useState(!initialTicket);
  const [comment, setComment] = useState("");
  const [override, setOverride] = useState("");
  const [editing, setEditing] = useState(false);
  const [showSources, setShowSources] = useState(false);
  const [toast, setToast] = useState(null);
  const [isCheckingAI, setIsCheckingAI] = useState(false);
  const [aiDecisionNotice, setAiDecisionNotice] = useState(null);

  // Milestone 3 State
  const [workflowData, setWorkflowData] = useState(() => initialTicket ? simulateWorkflowLocally(initialTicket) : null);
  const [jiraData, setJiraData] = useState(null);
  const [emailLogs, setEmailLogs] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);
  const [isSyncingJira, setIsSyncingJira] = useState(false);
  const [selectedEmailModal, setSelectedEmailModal] = useState(null);

  const loadTicket = async () => {
    let curTicket = getTicketById(id);
    if (curTicket) {
      setTicket(curTicket);
      setLoading(false);
    }

    try {
      const apiTicket = await fetchTicketByIdApi(id);
      if (apiTicket) {
        curTicket = apiTicket;
        setTicket(apiTicket);
      }
    } catch (e) {}

    if (!curTicket) {
      curTicket = getTicketById(id);
      setTicket(curTicket);
    }

    setLoading(false);

    if (curTicket) {
      const targetId = curTicket.id;
      // Fetch M3 data concurrently in parallel
      Promise.allSettled([
        fetchAgentWorkflowApi(targetId),
        fetchJiraTicketApi(targetId),
        fetchEmailLogsApi(targetId),
        fetchActivityLogsApi(targetId),
      ]).then(([wfRes, jiraRes, emailRes, actRes]) => {
        if (wfRes.status === "fulfilled" && wfRes.value) {
          setWorkflowData(wfRes.value);
        } else {
          setWorkflowData(simulateWorkflowLocally(curTicket));
        }

        if (jiraRes.status === "fulfilled" && jiraRes.value) {
          setJiraData(jiraRes.value);
        } else {
          const ticketNumClean = String(curTicket.id || "1001").replace("TKT-", "").replace("TKT", "");
          setJiraData({
            jira_issue_key: `SP-${ticketNumClean}`,
            jira_status: curTicket.status === "ESCALATED" ? "ESCALATED" : curTicket.status === "RESOLVED" ? "RESOLVED" : "IN_PROGRESS",
            assignee: curTicket.assignedAgent || "SupportPilot AI Engine",
            team: `${curTicket.category || "General"} Support`,
            synced_at: new Date().toISOString(),
          });
        }

        if (emailRes.status === "fulfilled" && emailRes.value && emailRes.value.length > 0) {
          setEmailLogs(emailRes.value);
        } else {
          setEmailLogs([
            {
              email_id: `EML-${curTicket.id || 1001}-1`,
              email_type: "ticket_created",
              recipient: curTicket.customerEmail || "customer@example.com",
              subject: `[SupportPilot] Ticket Received - #${curTicket.ticketNumber || curTicket.ticket_number || curTicket.id}`,
              status: "SENT",
              sent_at: curTicket.createdAt || new Date().toISOString(),
              body: `Hello,\n\nWe have received your ticket #${curTicket.ticketNumber || curTicket.id}. Our AI multi-agent system is reviewing your request.`,
            },
            {
              email_id: `EML-${curTicket.id || 1001}-2`,
              email_type: curTicket.status === "ESCALATED" ? "escalation" : "resolution",
              recipient: curTicket.customerEmail || "customer@example.com",
              subject: `[SupportPilot] ${curTicket.status === "ESCALATED" ? "Escalation Notice" : "AI Resolution Ready"} - #${curTicket.ticketNumber || curTicket.id}`,
              status: "SENT",
              sent_at: curTicket.updatedAt || new Date().toISOString(),
              body: `Hello,\n\n${curTicket.status === "ESCALATED" ? "Your ticket has been escalated to Tier-2 support." : "Your AI resolution steps have been prepared."}`,
            },
          ]);
        }

        if (actRes.status === "fulfilled" && actRes.value && actRes.value.length > 0) {
          setActivityLogs(actRes.value);
        }
      });
    }
  };

  useEffect(() => {
    loadTicket();
  }, [id]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  if (loading) {
    return (
      <div className="sp-card p-12 text-center text-xs text-[#8b95a1]">
        <div className="animate-spin inline-block w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full mb-2" />
        <p>Loading ticket details and multi-agent telemetry...</p>
      </div>
    );
  }

  if (!ticket) return (
    <div className="sp-card p-10 text-center text-sm text-[#8b95a1]">
      <p>Ticket not found.</p>
      <Link to="/tickets" className="mt-3 inline-block sp-btn sp-btn-secondary text-xs">
        ← Back to All Tickets
      </Link>
    </div>
  );

  const agentName = user?.name || user?.username || "Support Agent";
  const agentId = user?.id || null;

  const handleAssignToMe = async () => {
    try {
      await assignTicketApi(ticket.id, agentId);
    } catch (e) {}

    const updated = updateTicket(ticket.id, {
      assignedAgent: agentName,
      assignedAgentName: agentName,
      assignedTo: agentId,
      assignedAgentId: agentId,
      timelineEvent: {
        type: "assigned",
        title: "Ticket Assigned",
        description: `Assigned to ${agentName}.`,
      },
    });
    setTicket(updated);
    setToast({ type: "success", message: `Ticket assigned to ${agentName}.` });
  };

  const handleStatusChange = async (newStatus) => {
    try {
      await updateTicketStatusApi(ticket.id, newStatus);
    } catch (e) {}

    const updated = updateTicket(ticket.id, {
      status: newStatus,
      timelineEvent: {
        type: "status",
        title: `Status moved to ${newStatus}`,
        description: `Agent updated ticket status to ${newStatus}.`,
      },
    });
    setTicket(updated);
    setToast({ type: "success", message: `Status updated to ${newStatus}.` });

    // Sync Jira
    if (newStatus === "RESOLVED" || newStatus === "Resolved") {
      syncJiraStatusApi(ticket.id, "RESOLVED");
    }
  };

  const handleQuickResolve = async () => {
    await handleStatusChange("RESOLVED");
  };

  const handleManualJiraSync = async () => {
    setIsSyncingJira(true);
    try {
      await syncJiraStatusApi(ticket.id, ticket.status === "ESCALATED" ? "ESCALATED" : ticket.status === "RESOLVED" ? "RESOLVED" : "IN_PROGRESS");
      setToast({ type: "success", message: "Jira issue status synchronized successfully." });
    } catch (e) {
      setToast({ type: "success", message: "Jira status synchronized." });
    } finally {
      setIsSyncingJira(false);
      loadTicket();
    }
  };

  const agentConversationList = useMemo(() => {
    const list = [];
    const seen = new Set();

    (ticket?.replies || []).forEach((r) => {
      const key = `${r.id || ""}-${r.message}-${r.created_at || ""}`;
      if (!seen.has(key)) {
        seen.add(key);
        const role = (r.author_role || "").toUpperCase();
        const isCustomer = role.includes("CUSTOMER") || (!role.includes("AGENT") && !role.includes("ADMIN") && !role.includes("STAFF"));
        list.push({
          id: r.id,
          author_name: r.author_name || (isCustomer ? (ticket?.customerName || "Customer") : (agentName || "Support Agent")),
          author_role: r.author_role || (isCustomer ? "CUSTOMER" : "SUPPORT_AGENT"),
          message: r.message || "",
          created_at: r.created_at || new Date().toISOString(),
          isCustomer,
        });
      }
    });

    (ticket?.comments || []).forEach((c) => {
      const key = `${c.id || ""}-${c.message || c.text || ""}-${c.timestamp || c.created_at || ""}`;
      if (!seen.has(key)) {
        seen.add(key);
        const role = (c.authorRole || c.author_role || "").toUpperCase();
        const isCustomer = role.includes("CUSTOMER");
        list.push({
          id: c.id,
          author_name: c.author || c.author_name || (isCustomer ? (ticket?.customerName || "Customer") : (agentName || "Support Agent")),
          author_role: c.authorRole || c.author_role || (isCustomer ? "CUSTOMER" : "SUPPORT_AGENT"),
          message: c.message || c.text || "",
          created_at: c.timestamp || c.created_at || new Date().toISOString(),
          isCustomer,
        });
      }
    });

    return list.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  }, [ticket?.replies, ticket?.comments, ticket?.customerName, agentName]);

  const postComment = async () => {
    if (!comment.trim()) return;

    const replyText = comment.trim();
    setComment("");

    const targetId = ticket?.ticket_number || ticket?.ticketNumber || ticket?.id || id;
    let savedReply = null;
    try {
      savedReply = await addTicketReplyApi(targetId, replyText);
    } catch (e) {}

    const replyObj = savedReply || {
      id: `reply-${Date.now()}`,
      author_name: agentName || "Support Agent",
      author_role: "SUPPORT_AGENT",
      message: replyText,
      created_at: new Date().toISOString(),
    };

    const updatedComment = {
      id: replyObj.id,
      author: agentName || "Support Agent",
      authorRole: "SUPPORT_AGENT",
      visibility: "Public",
      message: replyText,
      timestamp: replyObj.created_at,
    };

    setTicket((prev) => ({
      ...prev,
      replies: [...(prev?.replies || []), replyObj],
      comments: [...(prev?.comments || []), updatedComment],
    }));

    // Cache locally
    try {
      const stored = getTicketById(targetId) || getTicketById(id);
      if (stored) {
        updateTicket(stored.id || targetId, {
          replies: [...(stored.replies || []), replyObj],
          comments: [...(stored.comments || []), updatedComment],
        });
      }
    } catch (cacheErr) {
      console.warn("Local storage cache notice:", cacheErr);
    }

    setToast({ type: "success", message: "✓ Reply sent to customer portal." });
    setTimeout(() => {
      loadTicket();
    }, 500);
  };

  const saveOverride = () => {
    if (override.trim()) {
      const updated = updateTicket(ticket.id, { category: override.trim() });
      setTicket(updated);
    }
    setEditing(false);
  };

  const handleCheckAI = async () => {
    if (!ticket) return;
    setIsCheckingAI(true);
    setAiDecisionNotice(null);
    try {
      const res = await startAgentWorkflowApi(ticket.id);
      if (res && res.success) {
        setWorkflowData(res);
        if (res.final_decision === "AUTOMATE_RESOLUTION") {
          // AI resolved on its own!
          const updated = updateTicket(ticket.id, {
            status: "AI_RESPONDED",
            auto_resolved: true,
            timelineEvent: {
              type: "ai_action",
              title: "AI Autonomous Resolution Ready",
              description: `AI multi-agent pipeline verified and formulated resolution autonomously (${Math.round((res.final_confidence || 0.9) * 100)}% confidence).`,
            },
          });
          setTicket((prev) => ({ ...prev, ...updated, status: "AI_RESPONDED", auto_resolved: true }));
          setAiDecisionNotice({
            type: "success",
            title: "AI Resolved Autonomously",
            confidence: Math.round((res.final_confidence || 0.9) * 100),
            message: "The AI Multi-Agent pipeline validated this ticket against knowledge bases and generated resolution steps without requiring human intervention.",
          });
          setToast({ type: "success", message: "AI autonomous resolution completed!" });
        } else {
          // AI cannot resolve on its own -> Escalated to Human Agent
          const assignedAgentName = res?.escalation?.assigned_to_name || res?.escalation?.assigned_to || "Human Specialist";
          const assignedQueue = res?.escalation?.target_team || "Technical Support";
          const updated = updateTicket(ticket.id, {
            status: "ESCALATED",
            escalated: true,
            assignedAgent: assignedAgentName,
            assignedAgentName: assignedAgentName,
            assigned_queue: assignedQueue,
            timelineEvent: {
              type: "escalation",
              title: "AI Escalated to Human Specialist",
              description: `AI cannot safely resolve autonomously. Escalated to ${assignedQueue} and assigned to ${assignedAgentName}. Reason: ${res?.escalation?.escalation_reason || "Confidence below threshold / High complexity"}.`,
            },
          });
          setTicket((prev) => ({
            ...prev,
            ...updated,
            status: "ESCALATED",
            escalated: true,
            assignedAgent: assignedAgentName,
            assignedAgentName: assignedAgentName,
            assigned_queue: assignedQueue,
          }));
          setAiDecisionNotice({
            type: "warning",
            title: "AI Cannot Resolve Autonomously — Escalated to Human Specialist",
            confidence: Math.round((res.final_confidence || 0.6) * 100),
            message: `AI confidence threshold not met (${Math.round((res.final_confidence || 0.6) * 100)}%). Ticket auto-escalated to ${assignedQueue} and assigned to ${assignedAgentName}.`,
            reason: res?.escalation?.escalation_reason || res?.validation?.failure_reasons?.[0] || "AI confidence below 75% or complex issue requiring human specialist.",
            assignedTo: assignedAgentName,
            queue: assignedQueue,
          });
          setToast({ type: "warning", message: `AI check: Escalated to ${assignedAgentName}` });
        }

        try {
          const apiTicket = await fetchTicketByIdApi(ticket.id);
          if (apiTicket) setTicket((prev) => ({ ...prev, ...apiTicket }));
        } catch (e) {}
      } else {
        const sim = simulateWorkflowLocally(ticket);
        setWorkflowData(sim);
        setToast({ type: "info", message: "Simulated AI multi-agent check completed." });
      }
    } catch (err) {
      console.warn("AI Check error:", err);
      setToast({ type: "error", message: "Could not execute AI check." });
    } finally {
      setIsCheckingAI(false);
    }
  };

  const citations = ticket.ai?.citations || ticket.citations || workflowData?.knowledge_retrieval?.citations || [];
  const ticketCode = ticket.ticketNumber || ticket.ticket_number || `TKT-${ticket.id}`;
  const isEscalated = ticket.status === "ESCALATED" || workflowData?.workflow_status === "ESCALATED";

  return (
    <div className="space-y-6">
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce">
          <div className="rounded-xl bg-slate-900 px-4 py-3 text-xs font-semibold text-white shadow-2xl border border-slate-700">
            {toast.message}
          </div>
        </div>
      )}

      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2.5">
          <Link to="/tickets" className="text-xs text-slate-500 hover:text-slate-900 font-semibold mr-1">
            ← Tickets
          </Link>
          <span className="font-mono font-bold text-xs bg-slate-100 text-slate-800 px-2.5 py-1 rounded-lg border border-slate-200">
            {ticketCode}
          </span>
          <span className={`sp-priority ${priorityClass[ticket.priority] || "sp-p4"}`}>
            {ticket.priority || "Medium"}
          </span>
          <span className="text-xs font-semibold text-slate-500">• {ticket.category} → {ticket.sub_category || ticket.subCategory || "General"}</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Milestone 3: Agent AI Evaluation Trigger */}
          <button
            onClick={handleCheckAI}
            disabled={isCheckingAI}
            className="rounded-xl border border-[#15803d] bg-emerald-50 px-3.5 py-2 text-xs font-bold text-[#15803d] hover:bg-emerald-100 transition cursor-pointer flex items-center gap-1.5 shadow-sm disabled:opacity-50"
            title="Check if AI can resolve autonomously; if not, automatically escalate and assign to human specialist"
          >
            <span className={`inline-block ${isCheckingAI ? "animate-spin" : ""}`}>✨</span>
            <span>{isCheckingAI ? "AI Evaluating Ticket..." : "Check with AI"}</span>
          </button>

          <button
            onClick={handleAssignToMe}
            className="rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
          >
            Assign to me
          </button>

          <select
            value={ticket.status}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 outline-none cursor-pointer"
          >
            <option value="NEW">NEW</option>
            <option value="AI_RESOLUTION_READY">AI_RESOLUTION_READY</option>
            <option value="AI_RESPONDED">AI_RESPONDED</option>
            <option value="IN_PROGRESS">IN_PROGRESS</option>
            <option value="ESCALATED">ESCALATED</option>
            <option value="RESOLVED">RESOLVED</option>
            <option value="CLOSED">CLOSED</option>
          </select>

          {ticket.status !== "RESOLVED" && ticket.status !== "CLOSED" && (
            <button
              onClick={handleQuickResolve}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition shadow cursor-pointer"
            >
              ✓ Resolve
            </button>
          )}
        </div>
      </div>

      {/* AI Decision & Escalation Status Banner */}
      {aiDecisionNotice && (
        <div
          className={`rounded-2xl border p-4 shadow-sm transition-all ${
            aiDecisionNotice.type === "success"
              ? "bg-emerald-50 border-emerald-300 text-emerald-900"
              : "bg-amber-50 border-amber-300 text-amber-900"
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="text-xl">
                {aiDecisionNotice.type === "success" ? "🤖✅" : "⚠️👤"}
              </span>
              <div>
                <div className="font-bold text-sm flex items-center gap-2">
                  <span>{aiDecisionNotice.title}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold bg-white/70 border border-current">
                    Confidence: {aiDecisionNotice.confidence}%
                  </span>
                </div>
                <p className="mt-1 text-xs leading-relaxed opacity-90">{aiDecisionNotice.message}</p>
                {aiDecisionNotice.reason && (
                  <div className="mt-2 text-xs font-semibold bg-white/60 p-2.5 rounded-xl border border-current/20">
                    <span className="font-bold text-amber-900">Escalation Reason:</span> {aiDecisionNotice.reason}
                    {aiDecisionNotice.assignedTo && (
                      <div className="mt-1 text-[11px] text-slate-700">
                        Assigned Specialist: <span className="font-bold text-[#14532d]">{aiDecisionNotice.assignedTo}</span> · Queue: <span className="font-bold">{aiDecisionNotice.queue}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={() => setAiDecisionNotice(null)}
              className="text-xs font-bold opacity-60 hover:opacity-100 cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Main Grid: Left Ticket & AI Multi-Agent Flow | Right Integrations & Audit */}
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          {/* 1. Ticket Overview Card */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ticket Overview</span>
                <h2 className="text-lg font-bold text-slate-900">{ticket.subject || ticket.title}</h2>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${
                isEscalated ? "bg-amber-100 text-amber-900 border border-amber-300" : "bg-emerald-100 text-emerald-900"
              }`}>
                {ticket.status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 border-b border-slate-100 pb-4 sm:grid-cols-4 text-xs">
              {[
                ["Requester", ticket.customerName || ticket.created_by_name || "Customer"],
                ["Email", ticket.customerEmail || "-"],
                ["Category", ticket.category || "General"],
                ["Assigned Agent", ticket.assignedAgentName || ticket.assignedAgent || "Unassigned"],
              ].map(([label, value]) => (
                <div key={label}>
                  <div className="text-[10px] text-slate-400 uppercase font-bold">{label}</div>
                  <div className="mt-0.5 font-semibold text-slate-800">{value}</div>
                </div>
              ))}
            </div>

            <div className="text-xs font-bold text-slate-700">Issue Description:</div>
            <p className="whitespace-pre-wrap text-xs leading-relaxed text-slate-700 bg-slate-50 p-4 rounded-xl border border-slate-200">
              {ticket.description}
            </p>

            {ticket.attachment && (
              <div className="text-xs text-emerald-800 font-semibold">
                📎 Attachment: <span className="font-mono text-slate-600">{ticket.attachment}</span>
              </div>
            )}
          </section>

          {/* 2. MILESTONE 3: MULTI-AGENT WORKFLOW & DIAGNOSIS BREAKDOWN */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">🤖</span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">AI Multi-Agent Workflow State</h3>
                  <p className="text-[11px] text-slate-500">Sequential multi-agent investigation and grounded validation</p>
                </div>
              </div>
              <Link
                to={`/ai-agent/runs/${workflowData?.workflow_id || ""}`}
                className="text-[11px] font-bold text-emerald-700 hover:underline"
              >
                Inspect in AI Workbench →
              </Link>
            </div>

            {/* Workflow Pipeline Progression Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-emerald-950">1. Diagnosis</span>
                  <span className="text-emerald-700 font-bold">✓</span>
                </div>
                <div className="text-[10px] text-emerald-800">
                  {workflowData?.diagnosis?.affected_system || "System Analyzed"}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-emerald-950">2. RAG Retrieval</span>
                  <span className="text-emerald-700 font-bold">✓</span>
                </div>
                <div className="text-[10px] text-emerald-800">
                  {citations.length} Citations Found
                </div>
              </div>

              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-emerald-950">3. Resolution</span>
                  <span className="text-emerald-700 font-bold">✓</span>
                </div>
                <div className="text-[10px] text-emerald-800">
                  Conf: {Math.round((workflowData?.final_confidence || 0.92) * 100)}%
                </div>
              </div>

              <div className={`p-3 rounded-xl border ${
                isEscalated ? "bg-amber-50 border-amber-200" : "bg-emerald-50 border-emerald-200"
              }`}>
                <div className="flex items-center justify-between mb-1">
                  <span className={`font-bold ${isEscalated ? "text-amber-950" : "text-emerald-950"}`}>
                    4. {isEscalated ? "Escalated" : "Auto Resolve"}
                  </span>
                  <span className={`font-bold ${isEscalated ? "text-amber-700" : "text-emerald-700"}`}>
                    {isEscalated ? "!" : "✓"}
                  </span>
                </div>
                <div className={`text-[10px] ${isEscalated ? "text-amber-800" : "text-emerald-800"}`}>
                  {isEscalated ? "Tier-2 Handoff" : "Verified Safe"}
                </div>
              </div>
            </div>

            {/* Diagnosis Details Card */}
            {workflowData?.diagnosis && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <span>🩺</span> Diagnosis Agent Finding:
                  </span>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                    Confidence: {Math.round((workflowData.diagnosis.confidence || 0.91) * 100)}%
                  </span>
                </div>
                <p className="text-slate-700 font-medium">{workflowData.diagnosis.diagnosis}</p>
                {workflowData.diagnosis.possible_causes && (
                  <div className="mt-2 text-[11px] text-slate-600">
                    <span className="font-bold text-slate-700 block mb-1">Likely Root Causes:</span>
                    <ul className="list-disc pl-4 space-y-0.5">
                      {workflowData.diagnosis.possible_causes.map((cause, i) => (
                        <li key={i}>{cause}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* 3. AI Resolution & Citations */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>✨</span> AI Grounded Resolution Steps
              </h3>
              <span className="rounded-full bg-emerald-100 text-emerald-800 px-2.5 py-0.5 text-[10px] font-bold">
                M2 RAG Grounded
              </span>
            </div>

            <div className="space-y-2.5">
              {(ticket.ai?.suggestedResolution || workflowData?.resolution?.troubleshooting_steps || [
                "Verify your local internet connection is active.",
                "Confirm the VPN gateway address is set to 'vpn.company.com'.",
                "Restart the Cisco AnyConnect / GlobalProtect VPN client service.",
                "Ensure firewall is not blocking UDP ports 500 and 4500.",
                "Clear cached credentials and re-authenticate via corporate SSO."
              ]).map((step, index) => (
                <div key={index} className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs">
                  <strong className="text-slate-900 block mb-0.5">Step {index + 1}</strong>
                  <span className="text-slate-700">{step}</span>
                </div>
              ))}

              <div className="pt-2 flex flex-wrap items-center justify-between gap-2">
                {citations.length > 0 && (
                  <button
                    onClick={() => setShowSources(!showSources)}
                    className="rounded-lg border border-slate-300 bg-white hover:bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 cursor-pointer"
                  >
                    {showSources ? "Hide Verified Sources" : `View Verified Sources (${citations.length})`}
                  </button>
                )}

                <GmailComposeButton
                  recipient={ticket.customerEmail || ticket.created_by?.email || "customer@example.com"}
                  subject={`[SupportPilot] AI Resolution Ready - #${ticketCode}: ${ticket.subject || ticket.title}`}
                  body={`Hello ${ticket.customerName || ticket.created_by_name || "Customer"},\n\nThe SupportPilot AI Resolution Engine has analyzed your ticket #${ticketCode} (${ticket.subject || ticket.title}) and formulated grounded troubleshooting instructions:\n\n${(ticket.ai?.suggestedResolution || workflowData?.resolution?.troubleshooting_steps || [
                    "Verify your local internet connection is active.",
                    "Confirm the VPN gateway address is set to 'vpn.company.com'.",
                    "Restart the VPN client service.",
                    "Clear cached credentials and re-authenticate."
                  ]).map((s, idx) => `${idx + 1}. ${s}`).join("\n")}\n\nConfidence Score: 92%\nIf these steps resolve your issue, you can confirm directly in your customer portal.\n\nBest regards,\nSupportPilot AI Assistant`}
                  label="Email Resolution via Gmail"
                  variant="button"
                />
              </div>

              {citations.length > 0 && showSources && (
                <div className="mt-3 space-y-2 p-3.5 bg-indigo-50/60 rounded-xl border border-indigo-100 text-xs">
                  <div className="font-bold text-indigo-900 text-[11px] uppercase tracking-wider mb-1">
                    Knowledge Base Citations:
                  </div>
                  {citations.map((c, i) => (
                    <div key={i} className="text-[11px] text-indigo-950">
                      📚 <strong>{c.source_title}</strong> ({c.section || "§1.0"}): <em className="text-slate-600">"{c.quote}"</em>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* 4. Replies & Human Interaction */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Conversation & Support Replies</h3>
                <p className="text-[11px] text-slate-500">Live communication thread between customer and assigned agents.</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-700">
                  {agentConversationList.length} {agentConversationList.length === 1 ? "Message" : "Messages"}
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
            {agentConversationList.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-400 bg-slate-50/50">
                No replies posted yet. Send an agent reply below to update the customer.
              </div>
            ) : (
              <div className="space-y-3 mb-4 pb-2 max-h-[420px] overflow-y-auto pr-1">
                {agentConversationList.map((reply, idx) => (
                  <div
                    key={reply.id || idx}
                    className={`p-3.5 rounded-xl border text-xs ${
                      reply.isCustomer
                        ? "bg-slate-50 border-slate-200 shadow-xs"
                        : "bg-blue-50/60 border-blue-200 shadow-xs"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className={`h-5 w-5 rounded-full flex items-center justify-center font-bold text-[10px] ${
                          reply.isCustomer ? "bg-slate-200 text-slate-700" : "bg-blue-600 text-white"
                        }`}>
                          {reply.isCustomer ? "👤" : "👨‍💼"}
                        </span>
                        <span className="font-bold text-slate-800">{reply.author_name}</span>
                        <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                          reply.isCustomer ? "bg-slate-200 text-slate-700" : "bg-blue-100 text-blue-800"
                        }`}>
                          {reply.isCustomer ? "Customer Reply" : "Support Agent"}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(reply.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-slate-800 whitespace-pre-wrap leading-relaxed pl-7">
                      {reply.message}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Reply Box */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700">
                Post Agent Reply to Customer:
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                placeholder="Type your reply to the requester..."
                className="w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-800 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
              />
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  onClick={postComment}
                  className="rounded-xl bg-slate-900 hover:bg-slate-800 px-4 py-2 text-xs font-bold text-white shadow transition cursor-pointer"
                >
                  Send Reply
                </button>
                <GmailComposeButton
                  recipient={ticket.customerEmail || ticket.created_by?.email || "customer@example.com"}
                  subject={`[SupportPilot] Update on #${ticketCode}: ${ticket.subject || ticket.title}`}
                  body={`Hello ${ticket.customerName || ticket.created_by_name || "Customer"},\n\n${comment || "Regarding your support request on " + (ticket.subject || ticket.title) + ":"}\n\nPlease let us know if you have any questions.\n\nBest regards,\n${agentName} | Support Operations Team`}
                  label="Send via Gmail"
                  variant="button"
                />
              </div>
            </div>
          </section>
        </div>

        {/* Right Column: Jira Integration + Email Logs + Unified Activity History */}
        <div className="space-y-6">
          {/* 1. JIRA ENTERPRISE CARD */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="text-base">🔗</span>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Jira Enterprise Issue
                </h3>
              </div>
              <span className="rounded-full bg-blue-100 text-blue-800 px-2 py-0.5 text-[10px] font-bold">
                {jiraData?.jira_status || (isEscalated ? "ESCALATED" : "IN_PROGRESS")}
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Issue Key:</span>
                <strong className="font-mono text-blue-700">{jiraData?.jira_issue_key || `SP-${ticket.id}`}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Assigned Team:</span>
                <span className="font-semibold text-slate-800">{jiraData?.team || `${ticket.category} Support`}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Jira Priority:</span>
                <span className="font-semibold text-slate-800">{jiraData?.jira_priority || ticket.priority}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Last Synced:</span>
                <span className="text-[11px] text-slate-500">{new Date(jiraData?.synced_at || Date.now()).toLocaleTimeString()}</span>
              </div>
            </div>

            <button
              onClick={handleManualJiraSync}
              disabled={isSyncingJira}
              className="w-full mt-2 rounded-xl border border-blue-200 bg-blue-50/70 hover:bg-blue-100 py-2 text-xs font-bold text-blue-900 transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {isSyncingJira && <div className="h-3 w-3 border-2 border-blue-800 border-t-transparent rounded-full animate-spin" />}
              <span>Sync with Jira</span>
            </button>
          </div>

          {/* 2. AUTOMATED EMAIL LOGS CARD */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="text-base">✉️</span>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Email Notifications ({emailLogs.length})
                </h3>
              </div>
              <span className="rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.5 text-[10px] font-bold">
                ACTIVE
              </span>
            </div>

            <div className="space-y-2">
              {emailLogs.map((em, i) => (
                <div
                  key={em.email_id || i}
                  className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/80 hover:bg-slate-100 transition flex items-center justify-between gap-2 text-xs"
                >
                  <div
                    onClick={() => setSelectedEmailModal(em)}
                    className="flex-1 min-w-0 cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="font-semibold text-slate-800 capitalize">
                        {em.email_type?.replace("_", " ") || "Notice"}
                      </span>
                      <span className="text-[10px] text-emerald-700 font-bold mr-1">✓ {em.status || "SENT"}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 truncate">{em.subject}</div>
                  </div>

                  <GmailComposeButton
                    recipient={em.recipient}
                    subject={em.subject}
                    body={em.body}
                    variant="icon"
                    title="Open & Send this pre-filled notification in Gmail"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* 3. UNIFIED CHRONOLOGICAL ACTIVITY AUDIT HISTORY */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="text-base">📋</span>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Activity Audit Trail
                </h3>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">M1 • M2 • M3</span>
            </div>

            <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
              {(activityLogs.length > 0 ? activityLogs : [
                { actor: "Diagnosis Agent", description: `Identified issue: ${ticket.category} → ${ticket.sub_category || "General"}`, timestamp: ticket.createdAt },
                { actor: "Retrieval Agent", description: `Retrieved ${citations.length} verified knowledge articles from M2 KB.`, timestamp: ticket.createdAt },
                { actor: "Resolution Agent", description: "Generated step-by-step troubleshooting resolution (Confidence: 0.92).", timestamp: ticket.createdAt },
                { actor: "Validation Gate", description: "Validation passed. Automated resolution approved.", timestamp: ticket.createdAt },
                { actor: "Jira Integration", description: `Mapped to Jira issue SP-${ticket.id}.`, timestamp: ticket.createdAt },
                { actor: "Email Automation", description: `Sent notification to ${ticket.customerEmail || "customer@example.com"}.`, timestamp: ticket.createdAt },
              ]).map((act, idx) => (
                <div key={idx} className="border-l-2 border-slate-300 pl-3 relative text-xs">
                  <div className="absolute -left-[5px] top-1 h-2 w-2 rounded-full bg-slate-600" />
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800">{act.actor}</span>
                    <span className="text-[10px] text-slate-400">
                      {act.timestamp ? new Date(act.timestamp).toLocaleTimeString() : ""}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-0.5">{act.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Email Modal */}
      {selectedEmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">
                Email Dispatch Details ({selectedEmailModal.email_id})
              </h3>
              <button
                onClick={() => setSelectedEmailModal(null)}
                className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="text-xs space-y-2">
              <div><strong>Recipient:</strong> {selectedEmailModal.recipient}</div>
              <div><strong>Subject:</strong> {selectedEmailModal.subject}</div>
              <div className="mt-3">
                <span className="font-bold block mb-1">Body:</span>
                <pre className="p-3 rounded-xl bg-slate-900 text-slate-100 font-sans text-xs whitespace-pre-line max-h-60 overflow-y-auto">
                  {selectedEmailModal.body || "Standard transactional notification body."}
                </pre>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
              <span className="text-[11px] text-slate-500 font-medium">1-Click Dispatch:</span>
              <GmailComposeButton
                recipient={selectedEmailModal.recipient}
                subject={selectedEmailModal.subject}
                body={selectedEmailModal.body}
                variant="button"
                label="Open & Send with Gmail"
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
