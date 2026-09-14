import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  FiArrowLeft,
  FiClock,
  FiAlertTriangle,
  FiCheckCircle,
  FiLayers,
  FiSearch,
  FiRefreshCw,
  FiUser,
  FiMail,
  FiTag,
  FiExternalLink,
  FiInbox,
  FiCheck,
} from "react-icons/fi";
import { useAuth } from "../../context/AuthContext";
import {
  getAllTickets,
  getTickets,
  saveTickets,
  fetchAgentTicketsApi,
  fetchAndSyncAllTickets,
  getAgentTicketSummary,
  getDepartmentAgentsList,
  updateAgentAvailabilityApi,
  updateIndividualAgentStatus,
  isTicketAssignedToAgent,
} from "../../services/ticketService";
import { storage, STORAGE_KEYS } from "../../services/storageService";

const PRIORITY_CONFIG = {
  P1: { label: "P1 – Critical", badge: "bg-red-50 text-red-700 border-red-200 ring-1 ring-red-100" },
  Critical: { label: "P1 – Critical", badge: "bg-red-50 text-red-700 border-red-200 ring-1 ring-red-100" },
  "P1 - Critical": { label: "P1 – Critical", badge: "bg-red-50 text-red-700 border-red-200 ring-1 ring-red-100" },
  "P1 – Critical": { label: "P1 – Critical", badge: "bg-red-50 text-red-700 border-red-200 ring-1 ring-red-100" },
  High: { label: "P2 – High", badge: "bg-amber-50 text-amber-700 border-amber-200 ring-1 ring-amber-100" },
  P2: { label: "P2 – High", badge: "bg-amber-50 text-amber-700 border-amber-200 ring-1 ring-amber-100" },
  "P2 - High": { label: "P2 – High", badge: "bg-amber-50 text-amber-700 border-amber-200 ring-1 ring-amber-100" },
  "P2 – High": { label: "P2 – High", badge: "bg-amber-50 text-amber-700 border-amber-200 ring-1 ring-amber-100" },
  Medium: { label: "P3 – Medium", badge: "bg-blue-50 text-blue-700 border-blue-200 ring-1 ring-blue-100" },
  P3: { label: "P3 – Medium", badge: "bg-blue-50 text-blue-700 border-blue-200 ring-1 ring-blue-100" },
  "P3 - Medium": { label: "P3 – Medium", badge: "bg-blue-50 text-blue-700 border-blue-200 ring-1 ring-blue-100" },
  "P3 – Medium": { label: "P3 – Medium", badge: "bg-blue-50 text-blue-700 border-blue-200 ring-1 ring-blue-100" },
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
  AI_RESOLUTION_READY: { label: "AI Ready", badge: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  ASSIGNED: { label: "Assigned", badge: "bg-sky-50 text-sky-700 border-sky-200" },
  IN_PROGRESS: { label: "In Progress", badge: "bg-amber-50 text-amber-700 border-amber-200" },
  "In Progress": { label: "In Progress", badge: "bg-amber-50 text-amber-700 border-amber-200" },
  ON_HOLD: { label: "On Hold", badge: "bg-slate-100 text-slate-700 border-slate-200" },
  "On Hold": { label: "On Hold", badge: "bg-slate-100 text-slate-700 border-slate-200" },
  RESOLVED: { label: "Resolved", badge: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  Resolved: { label: "Resolved", badge: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  CLOSED: { label: "Closed", badge: "bg-slate-100 text-slate-600 border-slate-200" },
  Closed: { label: "Closed", badge: "bg-slate-100 text-slate-600 border-slate-200" },
  ESCALATED: { label: "Escalated", badge: "bg-red-50 text-red-700 border-red-200" },
};

function getStatusBadge(status) {
  if (STATUS_CONFIG[status]) return STATUS_CONFIG[status];
  const s = String(status || "").toUpperCase();
  if (s.includes("HOLD") || s.includes("WAIT")) return STATUS_CONFIG.ON_HOLD;
  if (s.includes("RESOLV") || s.includes("CLOSE")) return STATUS_CONFIG.RESOLVED;
  if (s.includes("PROG")) return STATUS_CONFIG.IN_PROGRESS;
  if (s.includes("ESCALAT")) return STATUS_CONFIG.ESCALATED;
  return { label: status || "Open", badge: "bg-slate-100 text-slate-700 border-slate-200" };
}

function getSlaInfo(ticket) {
  if (["RESOLVED", "Resolved", "CLOSED", "Closed"].includes(ticket.status)) {
    return { status: "met", label: "SLA Met", badge: "bg-emerald-50 text-emerald-700 border-emerald-200", isOverdue: false };
  }
  const created = ticket.createdAt || ticket.created_at ? new Date(ticket.createdAt || ticket.created_at).getTime() : Date.now();
  const p = String(ticket.priority || "").toUpperCase();
  const slaHours = ticket.slaHours || (p.includes("P1") || p.includes("CRITICAL") ? 4 : p.includes("P2") || p.includes("HIGH") ? 8 : p.includes("P4") || p.includes("LOW") ? 48 : 24);
  const due = ticket.slaDueAt ? new Date(ticket.slaDueAt).getTime() : created + slaHours * 3600000;
  const diffMinutes = Math.round((due - Date.now()) / 60000);

  if (diffMinutes < 0) {
    const overdueHours = Math.abs(Math.floor(diffMinutes / 60));
    const overdueMins = Math.abs(diffMinutes % 60);
    const label = overdueHours > 0 ? `Breached (${overdueHours}h ${overdueMins}m late)` : `Breached (${overdueMins}m late)`;
    return { status: "breached", label, badge: "bg-red-50 text-red-700 border-red-200 font-bold", isOverdue: true, minutes: diffMinutes };
  }
  if (diffMinutes <= 120) {
    const hours = Math.floor(diffMinutes / 60);
    const mins = diffMinutes % 60;
    return {
      status: "warning",
      label: `${hours > 0 ? `${hours}h ` : ""}${mins}m left`,
      badge: "bg-amber-50 text-amber-700 border-amber-200 font-semibold",
      isOverdue: false,
      minutes: diffMinutes,
    };
  }
  const hours = Math.floor(diffMinutes / 60);
  const days = Math.floor(hours / 24);
  const label = days > 0 ? `${days}d ${hours % 24}h left` : `${hours}h left`;
  return { status: "ok", label, badge: "bg-slate-50 text-slate-600 border-slate-200", isOverdue: false, minutes: diffMinutes };
}

function initials(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : parts[0].slice(0, 2).toUpperCase();
}

export default function AgentTaskView() {
  const { agentName } = useParams();
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();

  const [allTickets, setAllTickets] = useState(() => getAllTickets());
  const [agentsList, setAgentsList] = useState(() => getDepartmentAgentsList());
  const [activeTab, setActiveTab] = useState("pending"); // pending | overdue | solved | all
  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("sla"); // sla | newest | oldest | priority
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toast, setToast] = useState(null);

  // Load Agents & Tickets
  const refreshData = async () => {
    setIsRefreshing(true);
    const agents = getDepartmentAgentsList();
    setAgentsList(agents);

    try {
      const synced = await fetchAndSyncAllTickets();
      if (synced && Array.isArray(synced)) {
        setAllTickets(synced);
      } else {
        setAllTickets(getAllTickets());
      }
    } catch (e) {
      setAllTickets(getAllTickets());
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    refreshData();
    const handleSync = () => {
      setAgentsList(getDepartmentAgentsList());
      setAllTickets(getAllTickets());
    };
    window.addEventListener("supportpilot_tickets_changed", handleSync);
    window.addEventListener("supportpilot_users_changed", handleSync);
    window.addEventListener("storage", handleSync);
    return () => {
      window.removeEventListener("supportpilot_tickets_changed", handleSync);
      window.removeEventListener("supportpilot_users_changed", handleSync);
      window.removeEventListener("storage", handleSync);
    };
  }, [agentName]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Resolve target agent from param
  const targetAgent = useMemo(() => {
    if (!agentName) return null;
    const decoded = decodeURIComponent(agentName).toLowerCase().trim();
    const cleanDecoded = decoded.replace(/[^a-z0-9]/gi, "");

    // 1. Direct match in agentsList by name, username, email, id
    const match = agentsList.find((ag) => {
      const n = String(ag.name || "").toLowerCase().trim();
      const un = String(ag.username || "").toLowerCase().trim();
      const em = String(ag.email || "").toLowerCase().trim();
      const id = String(ag.id || "").toLowerCase().trim();
      const cleanN = n.replace(/[^a-z0-9]/gi, "");

      if (id && (id === decoded || id === `agent-${decoded}` || decoded === `agent-${id}`)) return true;
      if (em && (em === decoded || em.startsWith(decoded))) return true;
      if (un && un === decoded) return true;
      if (n && (n === decoded || cleanN === cleanDecoded || n.includes(decoded) || decoded.includes(n))) return true;
      return false;
    });

    if (match) return match;

    // Fallback: create placeholder agent object
    const displayName = decodeURIComponent(agentName).replace(/^agent-/i, "").replace(/-/g, " ");
    const formattedName = displayName.charAt(0).toUpperCase() + displayName.slice(1);
    return {
      id: `agent-${cleanDecoded}`,
      name: formattedName,
      username: decoded,
      email: `${decoded.replace(/\s+/g, ".")}@supportpilot.com`,
      department: "IT Department",
      title: "Support Specialist",
      role: "Agent",
      availabilityStatus: "AVAILABLE",
      deptBadge: "IT",
    };
  }, [agentName, agentsList]);

  // Is this the logged-in agent?
  const isCurrentLoggedInAgent = useMemo(() => {
    if (!user || !targetAgent) return false;
    const uEmail = (user.email || "").toLowerCase().trim();
    const uName = (user.name || "").toLowerCase().trim();
    const agEmail = (targetAgent.email || "").toLowerCase().trim();
    const agName = (targetAgent.name || "").toLowerCase().trim();
    return uEmail === agEmail || uName === agName || (user.id && user.id === targetAgent.id);
  }, [user, targetAgent]);

  // Filter ONLY this agent's tickets
  const agentAssignedTickets = useMemo(() => {
    if (!targetAgent) return [];
    return allTickets.filter((ticket) => isTicketAssignedToAgent(ticket, targetAgent));
  }, [allTickets, targetAgent]);

  // Group tickets into Pending, Overdue, Solved, All
  const { pendingTickets, overdueTickets, solvedTickets } = useMemo(() => {
    const pending = [];
    const overdue = [];
    const solved = [];

    const now = Date.now();

    agentAssignedTickets.forEach((ticket) => {
      const s = String(ticket.status || "").toUpperCase();
      const isResolvedOrClosed = ["RESOLVED", "CLOSED"].includes(s);

      if (isResolvedOrClosed) {
        solved.push(ticket);
      } else {
        pending.push(ticket);

        // Check if overdue / old
        const sla = getSlaInfo(ticket);
        const createdTime = ticket.createdAt || ticket.created_at ? new Date(ticket.createdAt || ticket.created_at).getTime() : now;
        const ageHours = (now - createdTime) / 3600000;

        if (sla.isOverdue || s === "ESCALATED" || ageHours >= 24) {
          overdue.push(ticket);
        }
      }
    });

    return {
      pendingTickets: pending,
      overdueTickets: overdue,
      solvedTickets: solved,
    };
  }, [agentAssignedTickets]);

  // Filter by active tab, search, priority, category, sort
  const displayTickets = useMemo(() => {
    let list = [];
    if (activeTab === "pending") list = [...pendingTickets];
    else if (activeTab === "overdue") list = [...overdueTickets];
    else if (activeTab === "solved") list = [...solvedTickets];
    else list = [...agentAssignedTickets];

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((t) => {
        const idStr = String(t.ticketNumber || t.id || "").toLowerCase();
        const subjStr = String(t.subject || t.title || "").toLowerCase();
        const custStr = String(t.customerName || t.customerEmail || "").toLowerCase();
        const catStr = String(t.category || "").toLowerCase();
        const descStr = String(t.description || "").toLowerCase();
        return (
          idStr.includes(q) ||
          subjStr.includes(q) ||
          custStr.includes(q) ||
          catStr.includes(q) ||
          descStr.includes(q)
        );
      });
    }

    // Priority filter
    if (priorityFilter !== "ALL") {
      list = list.filter((t) => {
        const p = String(t.priority || "").toUpperCase();
        if (priorityFilter === "P1") return p.includes("P1") || p.includes("CRITICAL");
        if (priorityFilter === "P2") return p.includes("P2") || p.includes("HIGH");
        if (priorityFilter === "P3") return p.includes("P3") || p.includes("MEDIUM");
        if (priorityFilter === "P4") return p.includes("P4") || p.includes("LOW");
        return true;
      });
    }

    // Category filter
    if (categoryFilter !== "ALL") {
      list = list.filter((t) => String(t.category || "").toLowerCase() === categoryFilter.toLowerCase());
    }

    // Sorting
    list.sort((a, b) => {
      if (sortBy === "sla") {
        const slaA = getSlaInfo(a).minutes ?? 999999;
        const slaB = getSlaInfo(b).minutes ?? 999999;
        return slaA - slaB;
      }
      if (sortBy === "newest") {
        const dateA = new Date(a.createdAt || a.created_at || 0).getTime();
        const dateB = new Date(b.createdAt || b.created_at || 0).getTime();
        return dateB - dateA;
      }
      if (sortBy === "oldest") {
        const dateA = new Date(a.createdAt || a.created_at || 0).getTime();
        const dateB = new Date(b.createdAt || b.created_at || 0).getTime();
        return dateA - dateB;
      }
      if (sortBy === "priority") {
        const order = { Critical: 1, P1: 1, High: 2, P2: 2, Medium: 3, P3: 3, Low: 4, P4: 4 };
        const pA = order[a.priority] || 5;
        const pB = order[b.priority] || 5;
        return pA - pB;
      }
      return 0;
    });

    return list;
  }, [
    activeTab,
    pendingTickets,
    overdueTickets,
    solvedTickets,
    agentAssignedTickets,
    searchQuery,
    priorityFilter,
    categoryFilter,
    sortBy,
  ]);

  // Categories list for filter dropdown
  const categoriesList = useMemo(() => {
    const set = new Set();
    agentAssignedTickets.forEach((t) => {
      if (t.category) set.add(t.category);
    });
    return Array.from(set);
  }, [agentAssignedTickets]);

  const handleAgentStatusChange = async (newStatus) => {
    const agentIdentifier = targetAgent?.email || targetAgent?.id || targetAgent?.name;
    updateIndividualAgentStatus(agentIdentifier, newStatus);
    setAgentsList(getDepartmentAgentsList());

    if (isCurrentLoggedInAgent && updateUser) {
      updateUser({ availability_status: newStatus, availabilityStatus: newStatus });
      try {
        await updateAgentAvailabilityApi(newStatus, user?.id, user?.email);
      } catch (e) {}
    }

    const labelMap = {
      AVAILABLE: "Working / Available",
      BUSY: "Busy",
      UNAVAILABLE: "Not Working / Unavailable",
      INACTIVE: "Inactive",
    };
    const label = labelMap[newStatus] || newStatus;
    setToast({
      type: "success",
      message: `${targetAgent?.name || "Agent"}'s status updated to ${label}.`,
    });
  };

  const handleOpenTicket = (t) => {
    if (!t) return;
    try {
      const stored = getTickets();
      const targetIdStr = String(t.id ?? "").trim();
      const targetNumStr = String(t.ticketNumber || t.ticket_number || "").trim().toUpperCase();
      const existsIndex = stored.findIndex((item) => {
        if (!item) return false;
        const iId = String(item.id ?? "").trim();
        const iNum = String(item.ticketNumber || item.ticket_number || "").trim().toUpperCase();
        return (targetIdStr && iId === targetIdStr) || (targetNumStr && iNum === targetNumStr);
      });
      if (existsIndex >= 0) {
        stored[existsIndex] = { ...stored[existsIndex], ...t };
        storage.set(STORAGE_KEYS.tickets, [...stored]);
      } else {
        storage.set(STORAGE_KEYS.tickets, [t, ...stored]);
      }
    } catch (e) {
      console.warn("Error caching ticket before open:", e);
    }

    const routeTarget = t.ticketNumber || t.ticket_number || t.id;
    navigate(`/tickets/${encodeURIComponent(routeTarget)}`);
  };

  const agentStatus = isCurrentLoggedInAgent
    ? user?.availability_status || user?.availabilityStatus || targetAgent?.availabilityStatus || "AVAILABLE"
    : targetAgent?.availabilityStatus || "AVAILABLE";

  const isAvail = agentStatus === "AVAILABLE" || agentStatus === "Working / Available";
  const isBusy = agentStatus === "BUSY";

  if (!targetAgent) {
    return (
      <div className="py-16 text-center max-w-lg mx-auto">
        <div className="h-16 w-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-200 shadow-sm">
          <FiUser className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Agent Not Found</h2>
        <p className="text-sm text-slate-500 mt-2 mb-6">
          Could not find an active agent record for "{agentName}".
        </p>
        <button
          onClick={() => navigate("/dashboard")}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 shadow-sm transition cursor-pointer"
        >
          <FiArrowLeft className="w-4 h-4" /> Return to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* TOAST ALERT */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl text-xs font-semibold flex items-center gap-2 border border-slate-700 animate-slide-up">
          <FiCheck className="w-4 h-4 text-emerald-400" />
          <span>{toast.message}</span>
        </div>
      )}

      {/* TOP BREADCRUMB & BACK NAVIGATION */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-300 hover:text-blue-600 shadow-2xs transition cursor-pointer group"
            title="Return to Staff Directory and Main Dashboard"
          >
            <FiArrowLeft className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-transform group-hover:-translate-x-0.5" />
            <span>Back to Dashboard</span>
          </button>
          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400 font-medium">
            <span>Staff Directory</span>
            <span>/</span>
            <span className="text-slate-800 font-bold">{targetAgent.name}</span>
            <span>/</span>
            <span className="text-blue-600 font-semibold">Task View</span>
          </div>
        </div>

        <button
          type="button"
          onClick={refreshData}
          disabled={isRefreshing}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition shadow-2xs cursor-pointer"
        >
          <FiRefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-blue-600" : ""}`} />
          <span>Refresh Tasks</span>
        </button>
      </div>

      {/* AGENT PROFILE HERO CARD */}
      <div className="relative overflow-hidden rounded-2xl bg-white border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          {/* LEFT: AVATAR & METADATA */}
          <div className="flex items-center gap-5 sm:gap-6 min-w-0">
            {/* Avatar with Status Indicator */}
            <div className="relative shrink-0 mr-1">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-extrabold text-2xl flex items-center justify-center shadow-md ring-4 ring-blue-50">
                {initials(targetAgent.name)}
              </div>
              <span
                className={`absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-white ${
                  isAvail ? "bg-emerald-500" : isBusy ? "bg-amber-500" : "bg-slate-400"
                }`}
                title={`Status: ${agentStatus}`}
              />
            </div>

            {/* Name, Role, Dept */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  {targetAgent.name}
                </h1>
                {targetAgent.isTeamLead && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-300 text-[10px] font-bold">
                    Team Lead
                  </span>
                )}
                <span className="px-2.5 py-0.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-bold">
                  {targetAgent.department || targetAgent.deptBadge || "IT Support"}
                </span>
              </div>

              <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                <span className="font-medium text-slate-700">
                  {targetAgent.title || targetAgent.specialty || "Support Specialist"}
                </span>
                <span className="text-slate-300">·</span>
                <span className="flex items-center gap-1 font-mono text-slate-500">
                  <FiMail className="w-3.5 h-3.5 text-slate-400" />
                  {targetAgent.email}
                </span>
                <span className="text-slate-300">·</span>
                <div className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200/80 border border-slate-200 rounded-lg px-2 py-0.5 transition shadow-2xs">
                  <span
                    className={`h-2 w-2 rounded-full shrink-0 ${
                      isAvail ? "bg-emerald-500" : isBusy ? "bg-amber-500" : "bg-slate-400"
                    }`}
                  />
                  <select
                    value={agentStatus}
                    onChange={(e) => handleAgentStatusChange(e.target.value)}
                    className="bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer"
                    title={`Change ${targetAgent.name}'s working availability status`}
                  >
                    <option value="AVAILABLE">Working / Available</option>
                    <option value="BUSY">Busy</option>
                    <option value="UNAVAILABLE">Not Working / Unavailable</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: LIVE WORKLOAD SUMMARY */}
          <div className="flex items-center gap-3 self-start md:self-auto pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
            <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-right min-w-[140px]">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Current Workload</div>
              <div className="text-base font-extrabold text-slate-800 mt-0.5">
                {pendingTickets.length === 0
                  ? "Zero Load"
                  : pendingTickets.length <= 2
                  ? "Light Workload"
                  : pendingTickets.length <= 5
                  ? "Moderate Load"
                  : "Heavy Load"}
              </div>
              <div className="text-[10px] font-medium text-slate-500">
                {pendingTickets.length} active / {agentAssignedTickets.length} total tasks
              </div>
            </div>

            {isCurrentLoggedInAgent && (
              <div className="bg-blue-50/60 border border-blue-200 rounded-xl p-2.5">
                <div className="text-[10px] font-bold uppercase tracking-wider text-blue-700 mb-1">Your Status</div>
                <select
                  value={agentStatus}
                  onChange={(e) => handleAvailabilityToggle(e.target.value)}
                  className="bg-white border border-blue-300 rounded-lg px-2 py-1 text-xs font-bold text-slate-800 outline-none cursor-pointer"
                >
                  <option value="AVAILABLE">Working / Available</option>
                  <option value="BUSY">Busy</option>
                  <option value="UNAVAILABLE">Unavailable</option>
                </select>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4 DEDICATED KPI METRIC CARDS (FOCUSED ONLY ON THIS AGENT) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Pending Tickets */}
        <button
          type="button"
          onClick={() => setActiveTab("pending")}
          className={`p-5 rounded-2xl border text-left transition-all cursor-pointer ${
            activeTab === "pending"
              ? "bg-blue-50/80 border-blue-500 shadow-md ring-2 ring-blue-500/20"
              : "bg-white border-slate-200 hover:border-blue-300 hover:bg-slate-50/60 shadow-xs"
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Pending Tickets
            </span>
            <div className="h-9 w-9 rounded-xl bg-blue-100/80 text-blue-700 flex items-center justify-center font-bold">
              <FiClock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-blue-600">{pendingTickets.length}</div>
          <p className="text-xs text-slate-500 mt-1 font-medium">Assigned &amp; in active queue</p>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-blue-500 h-full rounded-full transition-all"
              style={{
                width: `${Math.min(100, (pendingTickets.length / Math.max(1, agentAssignedTickets.length)) * 100)}%`,
              }}
            />
          </div>
        </button>

        {/* 2. Old / Overdue Tickets */}
        <button
          type="button"
          onClick={() => setActiveTab("overdue")}
          className={`p-5 rounded-2xl border text-left transition-all cursor-pointer ${
            activeTab === "overdue"
              ? "bg-red-50/80 border-red-500 shadow-md ring-2 ring-red-500/20"
              : "bg-white border-slate-200 hover:border-red-300 hover:bg-slate-50/60 shadow-xs"
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Old / Overdue Tickets
            </span>
            <div className="h-9 w-9 rounded-xl bg-red-100/80 text-red-700 flex items-center justify-center font-bold">
              <FiAlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-red-600">{overdueTickets.length}</div>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            {overdueTickets.length > 0 ? "Requires urgent attention" : "No overdue tickets"}
          </p>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-red-500 h-full rounded-full transition-all"
              style={{
                width: `${Math.min(100, (overdueTickets.length / Math.max(1, agentAssignedTickets.length)) * 100)}%`,
              }}
            />
          </div>
        </button>

        {/* 3. Solved Tickets */}
        <button
          type="button"
          onClick={() => setActiveTab("solved")}
          className={`p-5 rounded-2xl border text-left transition-all cursor-pointer ${
            activeTab === "solved"
              ? "bg-emerald-50/80 border-emerald-500 shadow-md ring-2 ring-emerald-500/20"
              : "bg-white border-slate-200 hover:border-emerald-300 hover:bg-slate-50/60 shadow-xs"
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Solved Tickets
            </span>
            <div className="h-9 w-9 rounded-xl bg-emerald-100/80 text-emerald-700 flex items-center justify-center font-bold">
              <FiCheckCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-emerald-600">{solvedTickets.length}</div>
          <p className="text-xs text-slate-500 mt-1 font-medium">Successfully completed</p>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all"
              style={{
                width: `${Math.min(100, (solvedTickets.length / Math.max(1, agentAssignedTickets.length)) * 100)}%`,
              }}
            />
          </div>
        </button>

        {/* 4. Total Assigned Tasks */}
        <button
          type="button"
          onClick={() => setActiveTab("all")}
          className={`p-5 rounded-2xl border text-left transition-all cursor-pointer ${
            activeTab === "all"
              ? "bg-indigo-50/80 border-indigo-500 shadow-md ring-2 ring-indigo-500/20"
              : "bg-white border-slate-200 hover:border-indigo-300 hover:bg-slate-50/60 shadow-xs"
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              All Assigned Tasks
            </span>
            <div className="h-9 w-9 rounded-xl bg-indigo-100/80 text-indigo-700 flex items-center justify-center font-bold">
              <FiLayers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-800">{agentAssignedTickets.length}</div>
          <p className="text-xs text-slate-500 mt-1 font-medium">Total lifetime assignments</p>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
            <div className="bg-indigo-500 h-full rounded-full w-full" />
          </div>
        </button>
      </div>

      {/* DEDICATED TASK WORKSPACE */}
      <div className="rounded-2xl bg-white border border-slate-200 shadow-xs overflow-hidden">
        {/* TABS HEADER */}
        <div className="border-b border-slate-200 bg-slate-50/80 px-6 pt-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-2 overflow-x-auto pb-px">
              {[
                { id: "pending", label: "Pending Tickets", count: pendingTickets.length, icon: FiClock },
                { id: "overdue", label: "Old / Overdue", count: overdueTickets.length, icon: FiAlertTriangle, alert: overdueTickets.length > 0 },
                { id: "solved", label: "Solved Tickets", count: solvedTickets.length, icon: FiCheckCircle },
                { id: "all", label: "All Assigned Tasks", count: agentAssignedTickets.length, icon: FiLayers },
              ].map((tab) => {
                const isActive = activeTab === tab.id;
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition cursor-pointer whitespace-nowrap ${
                      isActive
                        ? "border-blue-600 text-blue-700 bg-white rounded-t-xl shadow-2xs"
                        : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/60 rounded-t-xl"
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${tab.alert ? "text-red-500" : ""}`} />
                    <span>{tab.label}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                        isActive
                          ? "bg-blue-100 text-blue-800"
                          : tab.alert
                          ? "bg-red-100 text-red-800"
                          : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* SEARCH & FILTER TOOLBAR */}
        <div className="p-4 bg-white border-b border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search ${targetAgent.name}'s tickets by ID, subject, customer...`}
              className="w-full rounded-xl border border-slate-300 bg-slate-50/50 pl-10 pr-4 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition"
            />
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Priority Filter */}
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 cursor-pointer shadow-2xs"
            >
              <option value="ALL">All Priorities</option>
              <option value="P1">P1 – Critical</option>
              <option value="P2">P2 – High</option>
              <option value="P3">P3 – Medium</option>
              <option value="P4">P4 – Low</option>
            </select>

            {/* Category Filter */}
            {categoriesList.length > 0 && (
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 cursor-pointer shadow-2xs"
              >
                <option value="ALL">All Categories</option>
                {categoriesList.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            )}

            {/* Sort Filter */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 cursor-pointer shadow-2xs"
            >
              <option value="sla">Sort: SLA Urgency</option>
              <option value="newest">Sort: Newest</option>
              <option value="oldest">Sort: Oldest</option>
              <option value="priority">Sort: Priority</option>
            </select>
          </div>
        </div>

        {/* TICKETS TABLE */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3.5 px-4 font-bold">Ticket ID</th>
                <th className="py-3.5 px-4 font-bold">Customer &amp; Subject</th>
                <th className="py-3.5 px-4 font-bold">Category</th>
                <th className="py-3.5 px-4 font-bold">Priority</th>
                <th className="py-3.5 px-4 font-bold">Status</th>
                <th className="py-3.5 px-4 font-bold">SLA / Deadline</th>
                <th className="py-3.5 px-4 font-bold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayTickets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <div className="max-w-xs mx-auto">
                      <div className="h-12 w-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                        <FiInbox className="w-6 h-6" />
                      </div>
                      <p className="font-bold text-slate-700 text-sm">No tickets found</p>
                      <p className="text-xs text-slate-400 mt-1">
                        {searchQuery || priorityFilter !== "ALL" || categoryFilter !== "ALL"
                          ? "No tickets match your filter criteria."
                          : activeTab === "pending"
                          ? `All caught up! ${targetAgent.name} has no pending tasks.`
                          : activeTab === "overdue"
                          ? `Great! ${targetAgent.name} has no overdue or breached tickets.`
                          : activeTab === "solved"
                          ? `No tickets marked solved yet by ${targetAgent.name}.`
                          : `No tasks assigned specifically to ${targetAgent.name}.`}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                displayTickets.map((t) => {
                  const ticketCode = t.ticketNumber || t.ticket_number || (t.id ? (String(t.id).startsWith("TKT-") ? t.id : `TKT-${t.id}`) : "TKT");
                  const priority = getPriorityInfo(t.priority);
                  const status = getStatusBadge(t.status);
                  const sla = getSlaInfo(t);
                  const createdDate = t.createdAt || t.created_at ? new Date(t.createdAt || t.created_at).toLocaleDateString() : "";

                  return (
                    <tr
                      key={t.id || t.ticketNumber || t.ticket_number}
                      className="hover:bg-blue-50/40 transition-colors group cursor-pointer"
                      onClick={() => handleOpenTicket(t)}
                    >
                      {/* TICKET ID */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenTicket(t);
                          }}
                          className="font-mono font-bold text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center gap-1 cursor-pointer"
                        >
                          #{ticketCode}
                        </button>
                        {createdDate && (
                          <div className="text-[10px] text-slate-400 mt-0.5">{createdDate}</div>
                        )}
                      </td>

                      {/* SUBJECT & CUSTOMER */}
                      <td className="py-3.5 px-4 max-w-[320px]">
                        <div className="font-semibold text-slate-900 group-hover:text-blue-700 transition truncate" title={t.subject || t.title}>
                          {t.subject || t.title}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate flex items-center gap-1.5 mt-0.5">
                          <span className="font-medium text-slate-700">
                            {t.customerName || t.customer_name || "Customer"}
                          </span>
                          {t.customerEmail && (
                            <>
                              <span className="text-slate-300">·</span>
                              <span className="text-slate-400 font-mono truncate">{t.customerEmail}</span>
                            </>
                          )}
                        </div>
                      </td>

                      {/* CATEGORY */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 font-semibold text-[11px] border border-slate-200">
                          <FiTag className="w-3 h-3 text-slate-400" />
                          {t.category || "General"}
                        </span>
                      </td>

                      {/* PRIORITY */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold border ${priority.badge}`}>
                          {priority.label}
                        </span>
                      </td>

                      {/* STATUS */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border ${status.badge}`}>
                          {status.label}
                        </span>
                      </td>

                      {/* SLA DEADLINE */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] border ${sla.badge}`}>
                          <FiClock className="w-3 h-3" />
                          {sla.label}
                        </span>
                      </td>

                      {/* ACTION */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenTicket(t);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 hover:border-blue-300 font-bold text-xs shadow-2xs transition cursor-pointer group"
                          title="Open Ticket Details"
                        >
                          <span>Open</span>
                          <FiExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 transition-colors" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* TABLE FOOTER */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div>
            Showing <strong className="text-slate-800">{displayTickets.length}</strong> of{" "}
            <strong className="text-slate-800">{agentAssignedTickets.length}</strong> tasks assigned to {targetAgent.name}
          </div>
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
          >
            ← Back to Main Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
