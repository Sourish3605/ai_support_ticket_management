import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FiRefreshCw,
  FiSearch,
  FiFilter,
  FiInbox,
  FiClock,
  FiCheckCircle,
  FiAlertCircle,
  FiChevronLeft,
  FiChevronRight,
  FiUser,
  FiSend,
  FiX,
  FiTag,
} from "react-icons/fi";
import { useAuth } from "../../context/AuthContext";
import {
  getAllTickets,
  fetchAgentTicketsApi,
  updateTicketStatusApi,
  assignTicketApi,
  addTicketReplyApi,
  updateTicket,
  addComment,
  deleteTicket,
} from "../../services/ticketService";

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
  CLASSIFIED: { label: "Classified", badge: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  AI_RESOLUTION_READY: { label: "AI Resolution", badge: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  ASSIGNED: { label: "Assigned", badge: "bg-sky-50 text-sky-700 border-sky-200" },
  IN_PROGRESS: { label: "In Progress", badge: "bg-amber-50 text-amber-700 border-amber-200" },
  "In Progress": { label: "In Progress", badge: "bg-amber-50 text-amber-700 border-amber-200" },
  ON_HOLD: { label: "On Hold", badge: "bg-slate-100 text-slate-700 border-slate-200" },
  "On Hold": { label: "On Hold", badge: "bg-slate-100 text-slate-700 border-slate-200" },
  RESOLVED: { label: "Resolved", badge: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  Resolved: { label: "Resolved", badge: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  CLOSED: { label: "Closed", badge: "bg-slate-100 text-slate-600 border-slate-200" },
  Closed: { label: "Closed", badge: "bg-slate-100 text-slate-600 border-slate-200" },
};

function getSlaInfo(ticket) {
  if (["RESOLVED", "Resolved", "CLOSED", "Closed"].includes(ticket.status)) {
    return { status: "met", label: "SLA Met", badge: "bg-emerald-50 text-emerald-700 border-emerald-200" };
  }
  const created = ticket.createdAt || ticket.created_at ? new Date(ticket.createdAt || ticket.created_at).getTime() : Date.now();
  const p = String(ticket.priority || "").toUpperCase();
  const slaHours = ticket.slaHours || (p.includes("P1") || p.includes("CRITICAL") ? 4 : p.includes("P2") || p.includes("HIGH") ? 8 : p.includes("P4") || p.includes("LOW") ? 48 : 24);
  const due = ticket.slaDueAt ? new Date(ticket.slaDueAt).getTime() : created + slaHours * 3600000;
  const diffMinutes = Math.round((due - Date.now()) / 60000);

  if (diffMinutes < 0) {
    return { status: "breached", label: "Breached", badge: "bg-red-50 text-red-700 border-red-200 font-semibold" };
  }
  if (diffMinutes <= 120) {
    const hours = Math.floor(diffMinutes / 60);
    const mins = diffMinutes % 60;
    return {
      status: "warning",
      label: `${hours > 0 ? `${hours}h ` : ""}${mins}m left`,
      badge: "bg-amber-50 text-amber-700 border-amber-200 font-medium",
    };
  }
  const hours = Math.floor(diffMinutes / 60);
  const days = Math.floor(hours / 24);
  const label = days > 0 ? `${days}d ${hours % 24}h left` : `${hours}h left`;
  return { status: "ok", label, badge: "bg-slate-50 text-slate-600 border-slate-200" };
}

export default function AgentAllTicketsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tickets, setTickets] = useState(() => getAllTickets());
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [assignmentFilter, setAssignmentFilter] = useState("all"); // "all", "assigned_to_me", "unassigned"

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Reply modal
  const [activeReplyTicket, setActiveReplyTicket] = useState(null);
  const [replyMessage, setReplyMessage] = useState("");
  const [toast, setToast] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadTickets = async (showToast = false) => {
    setIsRefreshing(true);
    try {
      const apiTickets = await fetchAgentTicketsApi();
      if (apiTickets && Array.isArray(apiTickets)) {
        setTickets(apiTickets);
        if (showToast) {
          setToast({ type: "success", message: `Queue refreshed with ${apiTickets.length} tickets.` });
        }
        setIsRefreshing(false);
        return;
      }
    } catch (e) {}
    const local = getAllTickets();
    setTickets(local);
    if (showToast) {
      setToast({ type: "success", message: `Queue refreshed with ${local.length} tickets.` });
    }
    setIsRefreshing(false);
  };

  useEffect(() => {
    loadTickets();
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const isAssignedToMe = (ticket) => {
    if (!user) return false;
    const myId = String(user.id || "").toLowerCase();
    const myUsername = String(user.username || "").toLowerCase();
    const myName = String(user.name || "").toLowerCase();
    const myEmail = String(user.email || "").toLowerCase();

    const tAgentId = String(ticket.assignedAgentId ?? ticket.assigned_to ?? ticket.assignedTo ?? "").toLowerCase();
    const tAgentName = String(ticket.assignedAgentName || ticket.assignedAgent || "").toLowerCase();

    if (myId && tAgentId && (myId === tAgentId || tAgentId === myId)) return true;
    if (myUsername && (tAgentName.includes(myUsername) || tAgentId === myUsername)) return true;
    if (myName && tAgentName.includes(myName)) return true;
    if (myEmail && (tAgentName.includes(myEmail) || tAgentId === myEmail)) return true;
    return false;
  };

  const isUnassigned = (ticket) => {
    const tAgent = String(ticket.assignedAgentName || ticket.assignedAgent || "").toLowerCase();
    const tAgentId = ticket.assignedAgentId ?? ticket.assigned_to ?? ticket.assignedTo;
    return !tAgentId && (!tAgent || tAgent === "unassigned" || tAgent === "support desk");
  };

  const isAssignedToOther = (ticket) => {
    return !isUnassigned(ticket) && !isAssignedToMe(ticket);
  };

  const categories = useMemo(() => [...new Set(tickets.map((t) => t.category).filter(Boolean))], [tickets]);

  const filtered = useMemo(() => {
    return tickets.filter((ticket) => {
      const ticketCode = String(ticket.ticketNumber || ticket.ticket_number || ticket.id || "").toLowerCase();
      const subject = String(ticket.subject || ticket.title || "").toLowerCase();
      const customer = String(ticket.customerName || ticket.customer || "").toLowerCase();
      const email = String(ticket.customerEmail || "").toLowerCase();
      const cat = String(ticket.category || "").toLowerCase();

      const q = query.toLowerCase().trim();
      const matchesQuery =
        !q ||
        ticketCode.includes(q) ||
        subject.includes(q) ||
        customer.includes(q) ||
        email.includes(q) ||
        cat.includes(q);

      const matchesAssignment =
        assignmentFilter === "all"
          ? true
          : assignmentFilter === "assigned_to_me"
          ? isAssignedToMe(ticket)
          : isUnassigned(ticket);

      const matchesStatus = statusFilter === "ALL" || ticket.status === statusFilter;

      let matchesPriority = true;
      if (priorityFilter !== "ALL") {
        const p = (ticket.priority || "").toUpperCase();
        if (priorityFilter === "P1") matchesPriority = p.includes("P1") || p.includes("CRITICAL");
        else if (priorityFilter === "P2") matchesPriority = p.includes("P2") || p.includes("HIGH");
        else if (priorityFilter === "P3") matchesPriority = p.includes("P3") || p.includes("MEDIUM");
        else if (priorityFilter === "P4") matchesPriority = p.includes("P4") || p.includes("LOW");
      }

      const matchesCategory = categoryFilter === "ALL" || ticket.category === categoryFilter;

      return matchesQuery && matchesAssignment && matchesStatus && matchesPriority && matchesCategory;
    });
  }, [tickets, query, statusFilter, priorityFilter, categoryFilter, assignmentFilter, user]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  const handleAssignToMe = async (ticket) => {
    const agentName = user?.name || user?.username || "Agent";
    const agentId = user?.id || null;

    try {
      await assignTicketApi(ticket.id, agentId, agentName);
    } catch (e) {}

    updateTicket(ticket.id, {
      assignedAgent: agentName,
      assignedAgentName: agentName,
      assignedTo: agentId,
      assignedAgentId: agentId,
      assigned_to: agentId,
      status: "IN_PROGRESS",
      timelineEvent: {
        type: "assigned",
        title: "Ticket Assigned",
        description: `Assigned to ${agentName}.`,
      },
    });

    setToast({ type: "success", message: `Ticket assigned to ${agentName}.` });
    loadTickets();
  };

  const handleStatusChange = async (ticket, newStatus) => {
    try {
      await updateTicketStatusApi(ticket.id, newStatus);
    } catch (e) {}

    updateTicket(ticket.id, {
      status: newStatus,
      timelineEvent: {
        type: "status",
        title: `Status updated to ${newStatus}`,
        description: `Agent updated status to ${newStatus}.`,
      },
    });

    setToast({ type: "success", message: `Status updated to ${newStatus}.` });
    loadTickets();
  };

  const handleQuickResolve = async (ticket) => {
    handleStatusChange(ticket, "RESOLVED");
  };

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!activeReplyTicket || !replyMessage.trim()) return;

    const agentName = user?.name || user?.username || "Support Agent";
    try {
      await addTicketReplyApi(activeReplyTicket.id, replyMessage.trim());
    } catch (e) {}

    addComment(activeReplyTicket.id, {
      author: agentName,
      authorRole: "SUPPORT_AGENT",
      visibility: "Public",
      message: replyMessage.trim(),
    });

    setToast({ type: "success", message: `Reply posted to #${activeReplyTicket.ticketNumber || activeReplyTicket.id}.` });
    setActiveReplyTicket(null);
    setReplyMessage("");
    loadTickets();
  };

  return (
    <div className="space-y-5">
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-3">
          <div className="rounded-lg bg-slate-900 px-4 py-3 text-xs font-semibold text-white shadow-xl border border-slate-700 flex items-center gap-2">
            <FiCheckCircle className="text-emerald-400" />
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Top Header */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">All Support Tickets</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Complete centralized directory of customer requests across all departments.
          </p>
        </div>
        <button
          onClick={() => loadTickets(true)}
          disabled={isRefreshing}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer disabled:opacity-50"
        >
          <FiRefreshCw className={isRefreshing ? "animate-spin text-blue-600" : ""} />
          <span>{isRefreshing ? "Refreshing..." : "Refresh Queue"}</span>
        </button>
      </div>

      {/* Summary KPI Grid */}
      <div className="grid gap-3 sm:grid-cols-4">
        {[
          { label: "Total Tickets", value: tickets.length, color: "text-slate-900" },
          { label: "Open / New", value: tickets.filter((t) => ["NEW", "Open"].includes(t.status)).length, color: "text-blue-600" },
          { label: "In Progress", value: tickets.filter((t) => ["IN_PROGRESS", "In Progress"].includes(t.status)).length, color: "text-amber-600" },
          { label: "High Priority", value: tickets.filter((t) => { const p = String(t.priority || "").toUpperCase(); return p.includes("P1") || p.includes("P2") || p.includes("CRITICAL") || p.includes("HIGH"); }).length, color: "text-red-600" },
        ].map((item) => (
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs" key={item.label}>
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{item.label}</div>
            <div className={`my-1 text-2xl font-bold ${item.color}`}>{item.value}</div>
            <div className="text-[11px] text-slate-400 font-medium">Global Queue</div>
          </div>
        ))}
      </div>

      {/* Filter and Table Card */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        {/* Tab Filters */}
        <div className="flex border-b border-slate-200 bg-slate-50/50 px-4 pt-3 gap-2">
          {[
            { id: "all", label: "All Tickets", count: tickets.length },
            { id: "assigned_to_me", label: "Assigned to Me", count: tickets.filter(isAssignedToMe).length },
            { id: "unassigned", label: "Unassigned Queue", count: tickets.filter(isUnassigned).length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setAssignmentFilter(tab.id);
                setCurrentPage(1);
              }}
              className={`flex items-center gap-1.5 pb-2.5 px-3 text-xs font-semibold border-b-2 transition cursor-pointer ${
                assignmentFilter === tab.id
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <span>{tab.label}</span>
              <span className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                assignmentFilter === tab.id ? "bg-blue-100 text-blue-700 font-bold" : "bg-slate-200 text-slate-600"
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search and Filters Bar */}
        <div className="p-4 bg-white border-b border-slate-200 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search ticket code, subject, customer, email..."
              className="w-full rounded-lg border border-slate-200 pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 outline-none cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="NEW">New</option>
            <option value="ASSIGNED">Assigned</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="ON_HOLD">On Hold</option>
            <option value="RESOLVED">Resolved</option>
            <option value="CLOSED">Closed</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => {
              setPriorityFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 outline-none cursor-pointer"
          >
            <option value="ALL">All Priorities</option>
            <option value="P1">P1 – Critical</option>
            <option value="P2">P2 – High</option>
            <option value="P3">P3 – Medium</option>
            <option value="P4">P4 – Low</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 outline-none cursor-pointer"
          >
            <option value="ALL">All Categories</option>
            {categories.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                <th className="py-3 px-4 w-[110px]">Ticket ID</th>
                <th className="py-3 px-4 min-w-[240px]">Customer & Subject</th>
                <th className="py-3 px-4 w-[160px]">Category & Sub</th>
                <th className="py-3 px-4 w-[120px]">Priority</th>
                <th className="py-3 px-4 w-[110px]">Status</th>
                <th className="py-3 px-4 w-[130px]">SLA Deadline</th>
                <th className="py-3 px-4 w-[130px]">Created</th>
                <th className="py-3 px-4 text-right min-w-[150px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginated.map((ticket) => {
                const ticketCode = ticket.ticketNumber || ticket.ticket_number || ticket.id;
                const assignedToMe = isAssignedToMe(ticket);
                const assignedToOther = isAssignedToOther(ticket);
                const isResolved = ["RESOLVED", "Resolved", "CLOSED", "Closed"].includes(ticket.status);
                const sla = getSlaInfo(ticket);

                return (
                  <tr key={ticket.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Ticket ID */}
                    <td className="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                      <Link
                        to={`/tickets/${ticketCode}`}
                        className="text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        #{ticketCode}
                      </Link>
                    </td>

                    {/* Customer & Subject */}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900 truncate max-w-xs" title={ticket.subject || ticket.title}>
                        {ticket.subject || ticket.title}
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
                        <FiUser className="text-slate-400" />
                        <span className="font-medium text-slate-700">{ticket.customerName || ticket.customer || "Customer"}</span>
                        {ticket.customerEmail && (
                          <>
                            <span className="text-slate-300">•</span>
                            <span className="text-slate-400">{ticket.customerEmail}</span>
                          </>
                        )}
                      </div>
                    </td>

                    {/* Category & Sub-category */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="inline-flex flex-col">
                        <span className="font-semibold text-slate-800">{ticket.category || "General"}</span>
                        <span className="text-[10px] text-slate-500">
                          {ticket.subCategory || ticket.sub_category || "General"}
                        </span>
                      </div>
                    </td>

                    {/* Priority */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      {(() => {
                        const prio = getPriorityInfo(ticket.priority);
                        return (
                          <span className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-semibold ${prio.badge}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${
                              prio.label.includes("P1") ? "bg-red-600" : prio.label.includes("P2") ? "bg-amber-600" : prio.label.includes("P4") ? "bg-slate-400" : "bg-blue-600"
                            }`} />
                            <span>{prio.label}</span>
                          </span>
                        );
                      })()}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`inline-block rounded-md border px-2 py-0.5 text-[11px] font-semibold ${
                          STATUS_CONFIG[ticket.status]?.badge || "bg-slate-50 text-slate-600 border-slate-200"
                        }`}
                      >
                        {STATUS_CONFIG[ticket.status]?.label || ticket.status}
                      </span>
                    </td>

                    {/* SLA Deadline */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <FiClock className="text-slate-400" />
                        <span className={`rounded border px-2 py-0.5 text-[10px] ${sla.badge}`}>
                          {sla.label}
                        </span>
                      </div>
                    </td>

                    {/* Created Date */}
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap text-[11px]">
                      {ticket.createdAt || ticket.created_at
                        ? new Date(ticket.createdAt || ticket.created_at).toLocaleDateString()
                        : "Recently"}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center justify-end gap-1.5">
                        <Link
                          to={`/tickets/${ticketCode}`}
                          className="rounded border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 transition"
                        >
                          View
                        </Link>

                        {assignedToOther ? (
                          <span
                            className="rounded bg-slate-100 px-2 py-1 text-[10px] text-slate-500 border border-slate-200"
                            title={`Assigned to ${ticket.assignedAgentName || ticket.assignedAgent}`}
                          >
                            Assigned
                          </span>
                        ) : (
                          <>
                            {!assignedToMe && (
                              <button
                                onClick={() => handleAssignToMe(ticket)}
                                className="rounded border border-blue-200 bg-blue-50 px-2 py-1 text-[11px] font-semibold text-blue-700 hover:bg-blue-100 transition cursor-pointer"
                              >
                                Claim
                              </button>
                            )}

                            <select
                              value={ticket.status}
                              onChange={(e) => handleStatusChange(ticket, e.target.value)}
                              className="rounded border border-slate-200 bg-white px-1.5 py-1 text-[11px] text-slate-700 outline-none cursor-pointer"
                            >
                              <option value="NEW">New</option>
                              <option value="IN_PROGRESS">In Progress</option>
                              <option value="ON_HOLD">On Hold</option>
                              <option value="RESOLVED">Resolved</option>
                              <option value="CLOSED">Closed</option>
                            </select>

                            <button
                              onClick={() => {
                                setActiveReplyTicket(ticket);
                                setReplyMessage("");
                              }}
                              className="rounded border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                            >
                              Reply
                            </button>

                            {!isResolved && (
                              <button
                                onClick={() => handleQuickResolve(ticket)}
                                className="rounded bg-emerald-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700 transition cursor-pointer shadow-xs"
                              >
                                Resolve
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {!paginated.length && (
          <div className="py-12 text-center text-slate-500">
            <FiInbox className="mx-auto text-3xl text-slate-300 mb-2" />
            <p className="text-xs font-medium">No tickets match your filters.</p>
          </div>
        )}

        {/* Pagination Controls */}
        <div className="border-t border-slate-200 bg-slate-50/50 px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <span>
              Showing {filtered.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} to{" "}
              {Math.min(currentPage * pageSize, filtered.length)} of {filtered.length} tickets
            </span>
            <span className="text-slate-300">•</span>
            <div className="flex items-center gap-1">
              <span>Per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-xs text-slate-700 outline-none cursor-pointer"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-50 transition disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
            >
              <FiChevronLeft />
            </button>
            <span className="px-2 font-medium">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-50 transition disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
            >
              <FiChevronRight />
            </button>
          </div>
        </div>
      </div>

      {/* Reply Modal */}
      {activeReplyTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="font-mono text-xs font-semibold text-blue-600">
                  #{activeReplyTicket.ticketNumber || activeReplyTicket.id}
                </span>
                <h3 className="text-sm font-bold text-slate-900 mt-0.5">
                  Send Response to Customer
                </h3>
              </div>
              <button
                onClick={() => setActiveReplyTicket(null)}
                className="text-slate-400 hover:text-slate-700 transition cursor-pointer"
              >
                <FiX className="text-base" />
              </button>
            </div>

            <div className="mt-3 p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
              <div className="font-semibold text-slate-800">{activeReplyTicket.subject || activeReplyTicket.title}</div>
              <div className="text-slate-500 text-[11px] mt-0.5">
                To: {activeReplyTicket.customerName || "Customer"} ({activeReplyTicket.customerEmail || "customer@example.com"})
              </div>
            </div>

            <form onSubmit={handleSendReply} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Support Response Message
                </label>
                <textarea
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  rows={4}
                  required
                  placeholder="Type troubleshooting advice, next steps, or resolution details..."
                  className="w-full rounded-lg border border-slate-200 p-2.5 text-xs text-slate-900 placeholder-slate-400 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveReplyTicket(null)}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!replyMessage.trim()}
                  className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition cursor-pointer shadow-xs disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  <FiSend className="text-xs" />
                  <span>Send Response</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
