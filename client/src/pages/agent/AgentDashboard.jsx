import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import {
  FiCheckCircle,
  FiClock,
  FiAlertCircle,
  FiAlertTriangle,
  FiSearch,
  FiFilter,
  FiRefreshCw,
  FiUser,
  FiSend,
  FiCheck,
  FiLayers,
  FiChevronLeft,
  FiChevronRight,
  FiX,
  FiActivity,
  FiTag,
  FiInbox,
} from "react-icons/fi";
import { useAuth } from "../../context/AuthContext";
import { storage, STORAGE_KEYS } from "../../services/storageService";
import {
  getAllTickets,
  fetchAgentTicketsApi,
  fetchAndSyncAllTickets,
  updateTicketStatusApi,
  assignTicketApi,
  addTicketReplyApi,
  updateTicket,
  addComment,
  updateAgentAvailabilityApi,
  getDepartmentForCategory,
  isTicketAssignedToAgent,
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

const AVAILABILITY_OPTIONS = [
  { value: "AVAILABLE", label: "Working / Available", dot: "bg-emerald-500", text: "text-emerald-700" },
  { value: "BUSY", label: "Busy", dot: "bg-amber-500", text: "text-amber-700" },
  { value: "UNAVAILABLE", label: "Not Working / Off-duty", dot: "bg-slate-400", text: "text-slate-600" },
];

function getSlaInfo(ticket) {
  if (["RESOLVED", "Resolved", "CLOSED", "Closed"].includes(ticket.status)) {
    return { status: "met", label: "SLA Met", badge: "bg-emerald-50 text-emerald-700 border-emerald-200", minutes: 9999 };
  }
  const created = ticket.createdAt || ticket.created_at ? new Date(ticket.createdAt || ticket.created_at).getTime() : Date.now();
  const p = String(ticket.priority || "").toUpperCase();
  const slaHours = ticket.slaHours || (p.includes("P1") || p.includes("CRITICAL") ? 4 : p.includes("P2") || p.includes("HIGH") ? 8 : p.includes("P4") || p.includes("LOW") ? 48 : 24);
  const due = ticket.slaDueAt ? new Date(ticket.slaDueAt).getTime() : created + slaHours * 3600000;
  const diffMinutes = Math.round((due - Date.now()) / 60000);

  if (diffMinutes < 0) {
    return { status: "breached", label: "Breached", badge: "bg-red-50 text-red-700 border-red-200 font-semibold", minutes: diffMinutes };
  }
  if (diffMinutes <= 120) {
    const hours = Math.floor(diffMinutes / 60);
    const mins = diffMinutes % 60;
    return {
      status: "warning",
      label: `${hours > 0 ? `${hours}h ` : ""}${mins}m left`,
      badge: "bg-amber-50 text-amber-700 border-amber-200 font-medium",
      minutes: diffMinutes,
    };
  }
  const hours = Math.floor(diffMinutes / 60);
  const days = Math.floor(hours / 24);
  const label = days > 0 ? `${days}d ${hours % 24}h left` : `${hours}h left`;
  return { status: "ok", label, badge: "bg-slate-50 text-slate-600 border-slate-200", minutes: diffMinutes };
}

export default function AgentDashboard() {
  const { user, updateUser } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [activeReplyTicket, setActiveReplyTicket] = useState(null);
  const [replyMessage, setReplyMessage] = useState("");
  const [toast, setToast] = useState(null);
  const [availability, setAvailability] = useState(
    user?.availability_status || user?.availabilityStatus || "AVAILABLE"
  );
  const [isUpdatingAvailability, setIsUpdatingAvailability] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filters and search
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const agentFilterParam = searchParams.get("agent");
  const [searchQuery, setSearchQuery] = useState("");
  const [queueTab, setQueueTab] = useState("assigned_to_me"); // assigned_to_me, in_progress, unassigned, high_priority, resolved, all
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("sla"); // sla, newest, priority

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // If accessed with legacy query parameter ?agent=..., immediately redirect to dedicated AgentTaskView
  useEffect(() => {
    if (agentFilterParam) {
      navigate(`/agent/tasks/${encodeURIComponent(agentFilterParam)}`, { replace: true });
    }
  }, [agentFilterParam, navigate]);

  useEffect(() => {
    const current = user?.availability_status || user?.availabilityStatus || "AVAILABLE";
    setAvailability(current);
  }, [user?.email, user?.id, user?.availability_status, user?.availabilityStatus]);

  const handleAvailabilityChange = async (newStatus) => {
    setIsUpdatingAvailability(true);
    setAvailability(newStatus);

    if (updateUser) {
      updateUser({
        availability_status: newStatus,
        availabilityStatus: newStatus,
      });
    }

    try {
      const storedUsers = storage.get(STORAGE_KEYS.users, []);
      if (Array.isArray(storedUsers) && user?.email) {
        const uEmail = user.email.toLowerCase().trim();
        const updated = storedUsers.map((u) => {
          if (u.email?.toLowerCase().trim() === uEmail || u.id === user?.id) {
            return { ...u, availabilityStatus: newStatus, availability_status: newStatus };
          }
          return u;
        });
        storage.set(STORAGE_KEYS.users, updated);
        window.dispatchEvent(new CustomEvent("supportpilot_users_changed", { detail: updated }));
      }
    } catch (e) {
      console.warn("Error updating local users store:", e);
    }

    try {
      await updateAgentAvailabilityApi(newStatus, user?.id, user?.email);
    } catch (e) {}

    setToast({
      type: "success",
      message: `Status updated to ${AVAILABILITY_OPTIONS.find((o) => o.value === newStatus)?.label || newStatus}.`,
    });
    setIsUpdatingAvailability(false);
  };

  const loadTickets = async () => {
    setIsRefreshing(true);
    try {
      const synced = await fetchAndSyncAllTickets();
      if (synced && Array.isArray(synced) && synced.length > 0) {
        setTickets(synced);
      } else {
        setTickets(getAllTickets());
      }
    } catch (e) {
      setTickets(getAllTickets());
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadTickets();
    const handleSync = () => {
      setTickets(getAllTickets());
    };
    window.addEventListener("supportpilot_tickets_changed", handleSync);
    window.addEventListener("storage", handleSync);
    return () => {
      window.removeEventListener("supportpilot_tickets_changed", handleSync);
      window.removeEventListener("storage", handleSync);
    };
  }, [user?.id, user?.username, user?.email]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const isAssignedToMe = (ticket) => {
    return isTicketAssignedToAgent(ticket, user);
  };

  const isUnassigned = (ticket) => {
    if (!ticket) return false;
    const tAgent = String(ticket.assignedAgentName || ticket.assignedAgent || "").toLowerCase();
    const tAgentId = ticket.assignedAgentId ?? ticket.assigned_to ?? ticket.assignedTo;
    return !tAgentId && (!tAgent || tAgent === "unassigned" || tAgent === "support desk");
  };

  const isAssignedToOther = (ticket) => {
    return !isUnassigned(ticket) && !isAssignedToMe(ticket);
  };

  // Metrics
  const myAssignedTickets = useMemo(() => tickets.filter(isAssignedToMe), [tickets, user]);
  const activeAssignedCount = useMemo(
    () => myAssignedTickets.filter((t) => !["RESOLVED", "Resolved", "CLOSED", "Closed"].includes(t.status)).length,
    [myAssignedTickets]
  );
  const myCompletedCount = useMemo(
    () => myAssignedTickets.filter((t) => ["RESOLVED", "Resolved", "CLOSED", "Closed"].includes(t.status)).length,
    [myAssignedTickets]
  );
  const unassignedCount = useMemo(() => tickets.filter(isUnassigned).length, [tickets]);
  const inProgressCount = useMemo(
    () => tickets.filter((t) => ["IN_PROGRESS", "In Progress"].includes(t.status)).length,
    [tickets]
  );
  const highPriorityCount = useMemo(
    () => tickets.filter((t) => {
      const p = String(t.priority || "").toUpperCase();
      return p.includes("P1") || p.includes("P2") || p.includes("CRITICAL") || p.includes("HIGH");
    }).length,
    [tickets]
  );

  const maxCapacity = 5;
  const workloadPercentage = Math.min(100, Math.round((activeAssignedCount / maxCapacity) * 100));

  // Filtered tickets
  const filteredTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      // Tab filter
      if (queueTab === "assigned_to_me") {
        if (!isAssignedToMe(ticket)) return false;
      } else if (queueTab === "in_progress") {
        if (!["IN_PROGRESS", "In Progress"].includes(ticket.status)) return false;
      } else if (queueTab === "unassigned") {
        if (!isUnassigned(ticket)) return false;
      } else if (queueTab === "high_priority") {
        const p = String(ticket.priority || "").toUpperCase();
        if (!p.includes("P1") && !p.includes("P2") && !p.includes("CRITICAL") && !p.includes("HIGH")) return false;
      } else if (queueTab === "resolved") {
        if (!["RESOLVED", "Resolved", "CLOSED", "Closed"].includes(ticket.status)) return false;
      }

      // Priority filter
      if (priorityFilter !== "ALL") {
        const p = (ticket.priority || "").toUpperCase();
        if (priorityFilter === "P1" && !p.includes("P1") && !p.includes("CRITICAL")) return false;
        if (priorityFilter === "P2" && !p.includes("P2") && !p.includes("HIGH")) return false;
        if (priorityFilter === "P3" && !p.includes("P3") && !p.includes("MEDIUM")) return false;
        if (priorityFilter === "P4" && !p.includes("P4") && !p.includes("LOW")) return false;
      }

      // Category filter
      if (categoryFilter !== "ALL" && ticket.category !== categoryFilter) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const code = String(ticket.ticketNumber || ticket.ticket_number || ticket.id || "").toLowerCase();
        const subj = String(ticket.subject || ticket.title || "").toLowerCase();
        const cust = String(ticket.customerName || ticket.customer || "").toLowerCase();
        const email = String(ticket.customerEmail || "").toLowerCase();
        const cat = String(ticket.category || "").toLowerCase();
        const subcat = String(ticket.subCategory || ticket.sub_category || "").toLowerCase();

        if (
          !code.includes(q) &&
          !subj.includes(q) &&
          !cust.includes(q) &&
          !email.includes(q) &&
          !cat.includes(q) &&
          !subcat.includes(q)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [tickets, queueTab, priorityFilter, categoryFilter, searchQuery, user]);

  // Sorted tickets
  const sortedTickets = useMemo(() => {
    return [...filteredTickets].sort((a, b) => {
      if (sortBy === "sla") {
        return getSlaInfo(a).minutes - getSlaInfo(b).minutes;
      }
      if (sortBy === "priority") {
        const score = (p) => {
          if (["P1", "Critical"].includes(p)) return 1;
          if (["P2", "High"].includes(p)) return 2;
          if (["P3", "Medium"].includes(p)) return 3;
          return 4;
        };
        return score(a.priority) - score(b.priority);
      }
      // Newest first
      const dateA = new Date(a.createdAt || a.created_at || 0).getTime();
      const dateB = new Date(b.createdAt || b.created_at || 0).getTime();
      return dateB - dateA;
    });
  }, [filteredTickets, sortBy]);

  // Paginated tickets
  const totalPages = Math.max(1, Math.ceil(sortedTickets.length / pageSize));
  const paginatedTickets = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedTickets.slice(start, start + pageSize);
  }, [sortedTickets, currentPage, pageSize]);

  // Available categories
  const categoriesList = useMemo(() => {
    const set = new Set(tickets.map((t) => t.category).filter(Boolean));
    return Array.from(set);
  }, [tickets]);

  // Actions
  const handleAssignToMe = async (ticket) => {
    const agentName = user?.name || user?.username || "Agent";
    const agentId = user?.id || null;

    try {
      await assignTicketApi(ticket.id, agentId, agentName);
    } catch (e) {}

    updateTicket(ticket.id, {
      assignedAgent: agentName,
      assignedAgentName: agentName,
      assignedAgentId: agentId,
      assignedTo: agentId,
      assigned_to: agentId,
      status: "IN_PROGRESS",
      timelineEvent: {
        type: "assigned",
        title: "Ticket Assigned",
        description: `Assigned to ${agentName}.`,
      },
    });

    setToast({ type: "success", message: `Ticket ${ticket.ticketNumber || ticket.id} claimed and moved to In Progress.` });
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

    setToast({ type: "success", message: `Ticket status updated to ${newStatus}.` });
    loadTickets();
  };

  const handleQuickResolve = async (ticket) => {
    handleStatusChange(ticket, "RESOLVED");
  };

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!activeReplyTicket || !replyMessage.trim()) return;

    const replyText = replyMessage.trim();
    setActiveReplyTicket(null);
    setReplyMessage("");

    try {
      await addTicketReplyApi(activeReplyTicket.id, replyText);
    } catch (e) {}

    const agentName = user?.name || user?.username || "Support Agent";
    addComment(activeReplyTicket.id, {
      author: agentName,
      authorRole: "SUPPORT_AGENT",
      visibility: "Public",
      message: replyText,
    });

    setToast({ type: "success", message: `Reply posted to ${activeReplyTicket.ticketNumber || activeReplyTicket.id}.` });
    loadTickets();
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-3">
          <div className="rounded-lg bg-slate-900 px-4 py-3 text-xs font-semibold text-white shadow-xl border border-slate-700 flex items-center gap-2">
            <FiCheckCircle className="text-emerald-400" />
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Header Bar */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 uppercase tracking-wider mb-1">
              <FiInbox />
              <span>Agent Workspace</span>
              <span className="text-slate-300">•</span>
              <span className="text-slate-600 normal-case font-medium">{user?.department || "General Support"}</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Support Agent Dashboard</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Logged in as <span className="font-semibold text-slate-700">{user?.name || user?.username || "Support Agent"}</span> ({user?.email || "agent@example.com"})
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Live Availability Status */}
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5">
              <span className="text-xs font-medium text-slate-600">Availability:</span>
              <div className="flex items-center gap-1.5">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    AVAILABILITY_OPTIONS.find((o) => o.value === availability)?.dot || "bg-emerald-500"
                  }`}
                />
                <select
                  value={availability}
                  disabled={isUpdatingAvailability}
                  onChange={(e) => handleAvailabilityChange(e.target.value)}
                  className="bg-transparent text-xs font-semibold text-slate-800 outline-none cursor-pointer"
                >
                  {AVAILABILITY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Refresh Button */}
            <button
              onClick={loadTickets}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer disabled:opacity-50"
            >
              <FiRefreshCw className={isRefreshing ? "animate-spin text-blue-600" : ""} />
              <span>{isRefreshing ? "Refreshing..." : "Refresh"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Primary KPI Metrics (Clickable Queue Selectors) */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        <div
          onClick={() => { setQueueTab("assigned_to_me"); setCurrentPage(1); }}
          className={`rounded-xl border p-4 shadow-xs cursor-pointer transition ${
            queueTab === "assigned_to_me"
              ? "border-blue-500 ring-2 ring-blue-100 bg-blue-50/30"
              : "border-slate-200 bg-white hover:border-blue-200 hover:bg-slate-50/50"
          }`}
          title="Click to view My Queue"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">My Active Tickets</span>
            <span className="rounded-md bg-blue-50 p-1.5 text-blue-600">
              <FiInbox />
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">{activeAssignedCount}</div>
          <div className="mt-1 text-[11px] text-blue-600 font-medium">Assigned to you</div>
        </div>

        <div
          onClick={() => { setQueueTab("in_progress"); setCurrentPage(1); }}
          className={`rounded-xl border p-4 shadow-xs cursor-pointer transition ${
            queueTab === "in_progress"
              ? "border-amber-500 ring-2 ring-amber-100 bg-amber-50/30"
              : "border-slate-200 bg-white hover:border-amber-200 hover:bg-slate-50/50"
          }`}
          title="Click to view In Progress queue"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">In Progress</span>
            <span className="rounded-md bg-amber-50 p-1.5 text-amber-600">
              <FiActivity />
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">{inProgressCount}</div>
          <div className="mt-1 text-[11px] text-amber-600 font-medium">Under active work</div>
        </div>

        <div
          onClick={() => { setQueueTab("unassigned"); setCurrentPage(1); }}
          className={`rounded-xl border p-4 shadow-xs cursor-pointer transition ${
            queueTab === "unassigned"
              ? "border-indigo-500 ring-2 ring-indigo-100 bg-indigo-50/30"
              : "border-slate-200 bg-white hover:border-indigo-200 hover:bg-slate-50/50"
          }`}
          title="Click to view Unassigned Queue"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Unassigned Queue</span>
            <span className="rounded-md bg-indigo-50 p-1.5 text-indigo-600">
              <FiClock />
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">{unassignedCount}</div>
          <div className="mt-1 text-[11px] text-indigo-600 font-medium">Awaiting assignment</div>
        </div>

        <div
          onClick={() => { setQueueTab("high_priority"); setCurrentPage(1); }}
          className={`rounded-xl border p-4 shadow-xs cursor-pointer transition ${
            queueTab === "high_priority"
              ? "border-red-500 ring-2 ring-red-100 bg-red-50/30"
              : "border-slate-200 bg-white hover:border-red-200 hover:bg-slate-50/50"
          }`}
          title="Click to view High Priority queue"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">High Priority</span>
            <span className="rounded-md bg-red-50 p-1.5 text-red-600">
              <FiAlertCircle />
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">{highPriorityCount}</div>
          <div className="mt-1 text-[11px] text-red-600 font-medium">P1 / P2 tickets</div>
        </div>

        <div
          onClick={() => { setQueueTab("resolved"); setCurrentPage(1); }}
          className={`rounded-xl border p-4 shadow-xs cursor-pointer transition ${
            queueTab === "resolved"
              ? "border-emerald-500 ring-2 ring-emerald-100 bg-emerald-50/30"
              : "border-slate-200 bg-white hover:border-emerald-200 hover:bg-slate-50/50"
          }`}
          title="Click to view Resolved tickets"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Completed Tasks</span>
            <span className="rounded-md bg-emerald-50 p-1.5 text-emerald-600">
              <FiCheckCircle />
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">{myCompletedCount}</div>
          <div className="mt-1 text-[11px] text-emerald-600 font-medium">Resolved by you</div>
        </div>

        {/* Current Workload */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Current Workload</span>
            <span className="text-xs font-bold text-slate-700">
              {activeAssignedCount} / {maxCapacity}
            </span>
          </div>
          <div className="mt-3 h-2 w-full rounded-full bg-slate-100 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                workloadPercentage >= 100
                  ? "bg-red-500"
                  : workloadPercentage >= 60
                  ? "bg-amber-500"
                  : "bg-blue-600"
              }`}
              style={{ width: `${workloadPercentage}%` }}
            />
          </div>
          <div className="mt-2 text-[11px] text-slate-500 font-medium">
            {workloadPercentage >= 100
              ? "At full capacity"
              : workloadPercentage >= 60
              ? "Moderate load"
              : "Available for tasks"}
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        {/* Navigation Tabs */}
        <div className="border-b border-slate-200 bg-slate-50/50 px-4 pt-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1 overflow-x-auto">
            {[
              { id: "assigned_to_me", label: "My Queue", count: myAssignedTickets.length, title: "Active tickets assigned to you that need your work" },
              { id: "in_progress", label: "In Progress", count: inProgressCount, title: "Tickets currently being actively worked on or investigated" },
              { id: "unassigned", label: "Unassigned Queue", count: unassignedCount, title: "New incoming customer tickets awaiting assignment or claiming" },
              { id: "high_priority", label: "High Priority", count: highPriorityCount, title: "Critical P1 and P2 escalation tickets" },
              { id: "resolved", label: "Resolved / Closed", count: myCompletedCount, title: "Tickets resolved and finalized" },
              { id: "all", label: "All Tickets", count: tickets.length, title: "All tickets across all departments" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setQueueTab(tab.id);
                  setCurrentPage(1);
                }}
                title={tab.title}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition cursor-pointer ${
                  queueTab === tab.id
                    ? "border-blue-600 text-blue-600 bg-white rounded-t-lg"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                    queueTab === tab.id ? "bg-blue-100 text-blue-700 font-bold" : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Queue Contextual Description Strip */}
        <div className="bg-slate-50/70 px-4 py-2 border-b border-slate-200 text-[11px] text-slate-600 flex items-center justify-between">
          <div>
            {queueTab === "assigned_to_me" && (
              <span><strong>My Queue:</strong> Tickets assigned directly to you awaiting your active handling and response.</span>
            )}
            {queueTab === "in_progress" && (
              <span><strong>In Progress:</strong> Tickets where active troubleshooting, customer correspondence, or system fixes are currently underway.</span>
            )}
            {queueTab === "unassigned" && (
              <span><strong>Unassigned Queue:</strong> Incoming customer tickets awaiting assignment to an agent or auto-routing engine distribution.</span>
            )}
            {queueTab === "high_priority" && (
              <span><strong>High Priority:</strong> Critical P1/P2 issues requiring expedited SLA turnaround and continuous monitoring.</span>
            )}
            {queueTab === "resolved" && (
              <span><strong>Resolved / Closed:</strong> Solved requests confirmed by customer or closed by support.</span>
            )}
            {queueTab === "all" && (
              <span><strong>All Tickets:</strong> Complete view of all requests across all departments and specialists.</span>
            )}
          </div>
          <span className="text-[10px] text-slate-400 font-medium shrink-0 ml-2">Real-time sync</span>
        </div>

        {/* Search and Filters Toolbar */}
        <div className="p-4 border-b border-slate-200 bg-white">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search ticket ID, customer, subject, category..."
                className="w-full rounded-lg border border-slate-200 pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              {/* Priority Filter */}
              <div className="flex items-center gap-1">
                <span className="text-slate-500 font-medium">Priority:</span>
                <select
                  value={priorityFilter}
                  onChange={(e) => {
                    setPriorityFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 outline-none cursor-pointer"
                >
                  <option value="ALL">All Priorities</option>
                  <option value="P1">P1 – Critical</option>
                  <option value="P2">P2 – High</option>
                  <option value="P3">P3 – Medium</option>
                  <option value="P4">P4 – Low</option>
                </select>
              </div>

              {/* Category Filter */}
              <div className="flex items-center gap-1">
                <span className="text-slate-500 font-medium">Category:</span>
                <select
                  value={categoryFilter}
                  onChange={(e) => {
                    setCategoryFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 outline-none cursor-pointer"
                >
                  <option value="ALL">All Categories</option>
                  {categoriesList.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sort By */}
              <div className="flex items-center gap-1">
                <span className="text-slate-500 font-medium">Sort:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 outline-none cursor-pointer"
                >
                  <option value="sla">SLA Urgency</option>
                  <option value="priority">Priority (P1 → P4)</option>
                  <option value="newest">Newest Created</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Tickets Table */}
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
                <th className="py-3 px-4 w-[140px]">Assigned Agent</th>
                <th className="py-3 px-4 text-right min-w-[150px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedTickets.map((ticket) => {
                const ticketCode = ticket.ticketNumber || ticket.ticket_number || ticket.id;
                const assignedToMe = isAssignedToMe(ticket);
                const assignedToOther = isAssignedToOther(ticket);
                const sla = getSlaInfo(ticket);
                const isResolved = ["RESOLVED", "Resolved", "CLOSED", "Closed"].includes(ticket.status);

                return (
                  <tr
                    key={ticket.id}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      assignedToMe ? "bg-blue-50/20" : ""
                    }`}
                  >
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
                        <FiClock
                          className={
                            sla.status === "breached"
                              ? "text-red-500"
                              : sla.status === "warning"
                              ? "text-amber-500"
                              : "text-slate-400"
                          }
                        />
                        <span
                          className={`rounded border px-2 py-0.5 text-[10px] ${sla.badge}`}
                        >
                          {sla.label}
                        </span>
                      </div>
                    </td>

                    {/* Assigned Agent */}
                    <td className="py-3 px-4 whitespace-nowrap text-slate-700">
                      {assignedToMe ? (
                        <span className="rounded bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 text-[10px] font-semibold">
                          You
                        </span>
                      ) : assignedToOther ? (
                        <span className="text-slate-600 text-[11px]">
                          {ticket.assignedAgentName || ticket.assignedAgent}
                        </span>
                      ) : (
                        <span className="rounded bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 text-[10px] font-medium">
                          Unassigned
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center justify-end gap-1.5">
                        <Link
                          to={`/tickets/${ticketCode}`}
                          className="rounded border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition"
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

                            {/* Status Quick Dropdown */}
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
        {!paginatedTickets.length && (
          <div className="py-12 text-center text-slate-500">
            <FiInbox className="mx-auto text-3xl text-slate-300 mb-2" />
            <p className="text-xs font-medium">No tickets match your filter criteria.</p>
            <button
              onClick={() => {
                setSearchQuery("");
                setPriorityFilter("ALL");
                setCategoryFilter("ALL");
                setQueueTab("all");
              }}
              className="mt-2 text-xs font-semibold text-blue-600 hover:underline cursor-pointer"
            >
              Clear filters
            </button>
          </div>
        )}

        {/* Pagination Controls */}
        <div className="border-t border-slate-200 bg-slate-50/50 px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <span>
              Showing {sortedTickets.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} to{" "}
              {Math.min(currentPage * pageSize, sortedTickets.length)} of {sortedTickets.length} tickets
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
