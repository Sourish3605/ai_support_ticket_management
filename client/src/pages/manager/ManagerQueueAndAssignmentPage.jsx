import { useEffect, useState, useMemo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  FiUsers,
  FiList,
  FiClock,
  FiCpu,
  FiSearch,
  FiFilter,
  FiUser,
  FiCheck,
  FiCheckCircle,
  FiAlertCircle,
  FiChevronLeft,
  FiChevronRight,
  FiX,
  FiRefreshCw,
  FiActivity,
  FiShield,
  FiTag,
  FiInbox,
  FiSliders,
  FiLayers,
  FiUserCheck,
  FiBarChart2,
} from "react-icons/fi";
import {
  getAllTickets,
  updateTicket,
  deleteTicket,
  fetchAgentTicketsApi,
  assignTicketApi,
  fetchAgentsApi,
  autoAssignTicketsApi,
  getDepartmentForCategory,
  getDepartmentAgentsList,
  autoAssignDepartmentAgent,
} from "../../services/ticketService";
import AgentDetailsDrawer from "../../components/AgentDetailsDrawer";

const PRIORITY_CONFIG = {
  P1: { label: "P1 – Critical", badge: "bg-red-50 text-red-700 border-red-200 font-semibold" },
  Critical: { label: "P1 – Critical", badge: "bg-red-50 text-red-700 border-red-200 font-semibold" },
  High: { label: "P2 – High", badge: "bg-amber-50 text-amber-700 border-amber-200 font-medium" },
  P2: { label: "P2 – High", badge: "bg-amber-50 text-amber-700 border-amber-200 font-medium" },
  Medium: { label: "P3 – Medium", badge: "bg-blue-50 text-blue-700 border-blue-200" },
  P3: { label: "P3 – Medium", badge: "bg-blue-50 text-blue-700 border-blue-200" },
  Low: { label: "P4 – Low", badge: "bg-slate-50 text-slate-600 border-slate-200" },
  P4: { label: "P4 – Low", badge: "bg-slate-50 text-slate-600 border-slate-200" },
};

const STATUS_CONFIG = {
  NEW: { label: "New", badge: "bg-blue-50 text-blue-700 border-blue-200" },
  Open: { label: "Open", badge: "bg-blue-50 text-blue-700 border-blue-200" },
  CLASSIFIED: { label: "Classified", badge: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  AI_RESOLUTION_READY: { label: "AI Resolution", badge: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  ASSIGNED: { label: "Assigned", badge: "bg-sky-50 text-sky-700 border-sky-200" },
  IN_PROGRESS: { label: "In Progress", badge: "bg-amber-50 text-amber-700 border-amber-200" },
  "In Progress": { label: "In Progress", badge: "bg-amber-50 text-amber-700 border-amber-200" },
  PENDING_ASSIGNMENT: { label: "Pending Assignment", badge: "bg-purple-50 text-purple-700 border-purple-200" },
  ESCALATED: { label: "Escalated", badge: "bg-rose-50 text-rose-700 border-rose-200" },
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
  const slaHours = ticket.slaHours || (ticket.priority === "P1" || ticket.priority === "Critical" ? 4 : ticket.priority === "P2" || ticket.priority === "High" ? 8 : ticket.priority === "P3" || ticket.priority === "Medium" ? 24 : 48);
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

export default function ManagerQueueAndAssignmentPage() {
  const location = useLocation();
  const navigate = useNavigate();

  // Active view mode: "tickets" | "queue" | "assignment"
  const activeMode = useMemo(() => {
    if (location.pathname.includes("/assignment")) return "assignment";
    if (location.pathname.includes("/tickets")) return "tickets";
    return "queue";
  }, [location.pathname]);

  const [tickets, setTickets] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("ALL");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [selectedPriority, setSelectedPriority] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [selectedAgentFilter, setSelectedAgentFilter] = useState(null);
  const [inspectingAgent, setInspectingAgent] = useState(null);
  const [isAutoAssigning, setIsAutoAssigning] = useState(false);
  const [reassignModalTicket, setReassignModalTicket] = useState(null);
  const [selectedAgent, setSelectedAgent] = useState("");
  const [toast, setToast] = useState(null);
  const [agents, setAgents] = useState(() => getDepartmentAgentsList());

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const isTicketAssignedToAgent = (t, ag) => {
    if (!t || !ag) return false;
    const tAgentName = (t.assignedAgentName || t.assignedAgent || "").toLowerCase();
    const tAgentId = String(t.assignedAgentId ?? t.assigned_to ?? t.assignedTo ?? "").toLowerCase();
    const agId = String(ag.id || "").toLowerCase();
    const agName = (ag.name || "").toLowerCase();
    const agUsername = (ag.username || "").toLowerCase();
    const agEmail = (ag.email || "").toLowerCase();

    if (agId && tAgentId && agId === tAgentId) return true;
    if (agName && tAgentName.includes(agName)) return true;
    if (agUsername && (tAgentName.includes(agUsername) || tAgentId === agUsername)) return true;
    if (agEmail && (tAgentName.includes(agEmail) || tAgentId === agEmail)) return true;
    return false;
  };

  const loadTickets = async () => {
    let apiAll = [];
    try {
      const apiTickets = await fetchAgentTicketsApi();
      if (apiTickets && Array.isArray(apiTickets) && apiTickets.length > 0) {
        apiAll = apiTickets;
      }
    } catch (e) {}

    const localAll = getAllTickets().map((t) => {
      const agName = t.assignedAgent || t.assignedAgentName;
      const cleanAgName = agName && agName !== "Unassigned" ? agName : null;
      return {
        ...t,
        assignedAgent: cleanAgName,
        assignedAgentName: cleanAgName,
      };
    });

    const apiIds = new Set(apiAll.map((t) => String(t.id ?? t.ticketNumber ?? "")));
    const onlyLocal = localAll.filter(
      (t) => !apiIds.has(String(t.id ?? t.ticketNumber ?? ""))
    );
    setTickets([...apiAll, ...onlyLocal]);
  };

  const refreshAgents = () => {
    const list = getDepartmentAgentsList();
    if (list && list.length > 0) {
      setAgents(list);
    }
  };

  useEffect(() => {
    loadTickets();
    refreshAgents();
    fetchAgentsApi().then((list) => {
      if (list && Array.isArray(list) && list.length > 0) {
        setAgents(list);
      }
    });

    const handleSync = () => {
      loadTickets();
      refreshAgents();
    };

    window.addEventListener("supportpilot_users_changed", handleSync);
    window.addEventListener("supportpilot_tickets_changed", handleSync);
    window.addEventListener("storage", handleSync);
    return () => {
      window.removeEventListener("supportpilot_users_changed", handleSync);
      window.removeEventListener("supportpilot_tickets_changed", handleSync);
      window.removeEventListener("storage", handleSync);
    };
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Working status helper
  const isAgentAvailable = (ag) => {
    const status = String(ag?.availabilityStatus || ag?.availability_status || "").toUpperCase();
    const isBusyOrAway = status.includes("BUSY") || status.includes("UNAVAILABLE") || status.includes("OFFLINE") || status.includes("INACTIVE") || status.includes("AWAY");
    return !isBusyOrAway && (status === "" || status === "AVAILABLE" || status.includes("AVAIL") || status.includes("WORK") || status === "ONLINE");
  };

  /**
   * AUTOMATIC AGENT ASSIGNMENT BASED ON WORKING STATUS:
   * Only assigns to genuine support agents whose working status is AVAILABLE.
   */
  const handleAutoAssignAll = async () => {
    setIsAutoAssigning(true);
    const freshAgents = getDepartmentAgentsList();
    setAgents(freshAgents);

    const availableAgentsCount = freshAgents.filter(isAgentAvailable).length;
    const busyAgentsCount = freshAgents.length - availableAgentsCount;

    if (availableAgentsCount === 0) {
      setToast({
        type: "warning",
        message: `Auto-assignment paused: All ${freshAgents.length} specialists are currently BUSY or UNAVAILABLE. Tickets remain safely in queue.`,
      });
      setIsAutoAssigning(false);
      return;
    }

    let assignedCount = 0;
    let skippedUnavailDept = 0;

    try {
      const res = await autoAssignTicketsApi();
      if (res && (res.assigned_count > 0 || res.count > 0)) {
        setToast({
          type: "success",
          message: `Auto-assigned ${res.assigned_count || res.count} ticket(s) to available agents (${availableAgentsCount} available, ${busyAgentsCount} busy skipped).`,
        });
        loadTickets();
        setIsAutoAssigning(false);
        return;
      }
    } catch (e) {}

    const unassignedTickets = tickets.filter((t) => {
      const hasAgent = t.assignedAgent && t.assignedAgent !== "Unassigned";
      const isClosed = ["RESOLVED", "Resolved", "CLOSED", "Closed"].includes(t.status);
      return !hasAgent && !isClosed;
    });

    unassignedTickets.forEach((t) => {
      const dept = t.department || getDepartmentForCategory(t.category);
      const bestAgent = autoAssignDepartmentAgent(dept, t.category || t.priority);
      if (bestAgent && isAgentAvailable(bestAgent)) {
        assignedCount++;
        updateTicket(t.id, {
          assignedAgent: bestAgent.name || bestAgent.username,
          assignedAgentName: bestAgent.name || bestAgent.username,
          assignedTo: bestAgent.id,
          assignedAgentId: bestAgent.id,
          assigned_to: bestAgent.id,
          department: dept,
          status: "IN_PROGRESS",
          timelineEvent: {
            type: "assigned",
            title: "Auto-Assigned by Availability Engine",
            description: `Auto-assigned to available specialist ${bestAgent.name || bestAgent.username} (${dept}) based on working status.`,
          },
        });
      } else {
        skippedUnavailDept++;
      }
    });

    if (assignedCount > 0) {
      setToast({
        type: "success",
        message: `Auto-assigned ${assignedCount} ticket(s) to available agents (${availableAgentsCount} available, ${busyAgentsCount} busy skipped).`,
      });
    } else if (skippedUnavailDept > 0) {
      setToast({
        type: "warning",
        message: `No available agents online in the requested department(s). ${skippedUnavailDept} ticket(s) remained queued.`,
      });
    } else {
      setToast({
        type: "info",
        message: "All active tickets are already assigned to support agents.",
      });
    }

    loadTickets();
    setIsAutoAssigning(false);
  };

  const handleManualReassign = async (e) => {
    e.preventDefault();
    if (!reassignModalTicket || !selectedAgent) return;

    const chosenAgentObj = agents.find(
      (a) => String(a.id) === String(selectedAgent) || a.email === selectedAgent || a.name === selectedAgent
    );
    const agentName = chosenAgentObj?.name || chosenAgentObj?.username || selectedAgent;
    const agentId = chosenAgentObj?.id || null;
    const agentDept = chosenAgentObj?.department || reassignModalTicket.department || "IT Support";

    try {
      await assignTicketApi(reassignModalTicket.id, agentId, agentName);
    } catch (err) {}

    updateTicket(reassignModalTicket.id, {
      assignedAgent: agentName,
      assignedAgentName: agentName,
      assignedTo: agentId,
      assignedAgentId: agentId,
      assigned_to: agentId,
      department: agentDept,
      status: "IN_PROGRESS",
      timelineEvent: {
        type: "assigned",
        title: "Ticket Manually Reassigned",
        description: `Manager manually reassigned ticket to ${agentName} (${agentDept}).`,
      },
    });

    setToast({
      type: "success",
      message: `Ticket #${reassignModalTicket.ticketNumber || reassignModalTicket.id} reassigned to ${agentName}.`,
    });
    setReassignModalTicket(null);
    setSelectedAgent("");
    loadTickets();
  };

  // High level statistics
  const stats = useMemo(() => {
    const total = tickets.length;
    const unassigned = tickets.filter((t) => (!t.assignedAgent || t.assignedAgent === "Unassigned") && !["RESOLVED", "Resolved", "CLOSED", "Closed"].includes(t.status)).length;
    const inProgress = tickets.filter((t) => ["IN_PROGRESS", "In Progress", "ASSIGNED"].includes(t.status)).length;
    const critical = tickets.filter((t) => (t.priority === "P1" || t.priority === "Critical") && !["RESOLVED", "Resolved", "CLOSED", "Closed"].includes(t.status)).length;
    const resolved = tickets.filter((t) => ["RESOLVED", "Resolved", "CLOSED", "Closed"].includes(t.status)).length;
    const slaRisk = tickets.filter((t) => {
      if (["RESOLVED", "Resolved", "CLOSED", "Closed"].includes(t.status)) return false;
      const sla = getSlaInfo(t);
      return sla.status === "breached" || sla.status === "warning";
    }).length;
    const availableStaff = agents.filter(isAgentAvailable).length;
    const busyStaff = agents.length - availableStaff;

    return { total, unassigned, inProgress, critical, resolved, slaRisk, availableStaff, busyStaff };
  }, [tickets, agents]);

  // Filtered tickets based on active view mode and filter dropdowns
  const filteredTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      // In Queue mode: show active queue tickets (unassigned, in-progress, escalated, pending)
      if (activeMode === "queue" && selectedStatus === "ALL") {
        const isClosed = ["RESOLVED", "Resolved", "CLOSED", "Closed"].includes(ticket.status);
        if (isClosed) return false;
      }

      if (selectedAgentFilter) {
        if (!isTicketAssignedToAgent(ticket, selectedAgentFilter)) return false;
      }
      if (selectedDepartment !== "ALL") {
        const dept = ticket.department || getDepartmentForCategory(ticket.category);
        if (dept !== selectedDepartment) return false;
      }
      if (selectedCategory !== "ALL" && ticket.category !== selectedCategory) {
        return false;
      }
      if (selectedPriority !== "ALL") {
        const p = (ticket.priority || "").toUpperCase();
        if (selectedPriority === "P1" && !["P1", "CRITICAL"].includes(p)) return false;
        if (selectedPriority === "P2" && !["P2", "HIGH"].includes(p)) return false;
        if (selectedPriority === "P3" && !["P3", "MEDIUM"].includes(p)) return false;
        if (selectedPriority === "P4" && !["P4", "LOW"].includes(p)) return false;
      }
      if (selectedStatus !== "ALL" && ticket.status !== selectedStatus) {
        return false;
      }
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const code = String(ticket.ticketNumber || ticket.ticket_number || ticket.id || "").toLowerCase();
        const subj = String(ticket.subject || ticket.title || "").toLowerCase();
        const cust = String(ticket.customerName || ticket.customer || "").toLowerCase();
        const agent = String(ticket.assignedAgentName || ticket.assignedAgent || "").toLowerCase();
        if (!code.includes(q) && !subj.includes(q) && !cust.includes(q) && !agent.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [
    tickets,
    activeMode,
    selectedAgentFilter,
    selectedDepartment,
    selectedCategory,
    selectedPriority,
    selectedStatus,
    searchTerm,
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredTickets.length / pageSize));
  const paginatedTickets = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTickets.slice(start, start + pageSize);
  }, [filteredTickets, currentPage, pageSize]);

  const departments = ["ALL", "Network Support", "Identity & Access", "Endpoint Hardware", "Software Applications", "Email Operations", "Billing & Finance", "IT Security"];
  const categoriesList = useMemo(() => ["ALL", ...new Set(tickets.map((t) => t.category).filter(Boolean))], [tickets]);
  const statuses = ["ALL", "NEW", "ASSIGNED", "IN_PROGRESS", "PENDING_ASSIGNMENT", "ESCALATED", "ON_HOLD", "RESOLVED", "CLOSED"];

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-3">
          <div className="rounded-lg bg-slate-900 px-4 py-3 text-xs font-semibold text-white shadow-xl border border-slate-700 flex items-center gap-2">
            {toast.type === "warning" ? (
              <FiAlertCircle className="text-amber-400 text-sm" />
            ) : (
              <FiCheckCircle className="text-emerald-400 text-sm" />
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* UNIFIED PAGE HEADER WITH TAB CONTROLLER */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 lg:p-6 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold text-blue-600 uppercase tracking-wider">
            <FiSliders className="text-xs" />
            <span>Unified Manager Desk</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {activeMode === "assignment"
              ? "Agent Capacity & Workload Assignment"
              : activeMode === "tickets"
              ? "All System Support Tickets"
              : "Live Ticket Queue & Dispatch"}
          </h1>
          <p className="text-xs text-slate-500">
            {activeMode === "assignment"
              ? "Monitor live specialist availability status (Available / Busy), inspect capacity limits, and balance ticket assignments."
              : activeMode === "tickets"
              ? "Complete directory of all active and historical support tickets across all departments, categories, and SLA states."
              : "Real-time dispatch queue prioritizing unassigned, in-progress, and high-urgency SLA tickets for available staff."}
          </p>
        </div>

        {/* TOP CONTROLS & UNIFIED TAB SWITCHER */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {(activeMode === "queue" || activeMode === "assignment") && (
            <button
              type="button"
              disabled={isAutoAssigning}
              onClick={handleAutoAssignAll}
              className="h-9 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3.5 text-xs font-semibold text-white hover:bg-blue-700 transition cursor-pointer disabled:opacity-50 shadow-xs active:scale-[0.98]"
              title="Automatically assign tickets to Available working agents"
            >
              <FiCpu className={isAutoAssigning ? "animate-spin text-xs" : "text-xs"} />
              <span>{isAutoAssigning ? "Allocating..." : "Auto-Assign to Available Staff"}</span>
            </button>
          )}

          {/* Unified In-Page View Switcher */}
          <div className="h-9 flex items-center p-0.5 rounded-lg bg-slate-100 border border-slate-200 shadow-2xs">
            <button
              type="button"
              onClick={() => {
                navigate("/manager/tickets");
                setCurrentPage(1);
              }}
              className={`h-full inline-flex items-center gap-1.5 px-3 rounded-md text-xs font-bold transition cursor-pointer ${
                activeMode === "tickets"
                  ? "bg-white text-blue-600 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <FiList className="text-xs" />
              <span>All Tickets</span>
              <span className="rounded-full bg-slate-200/80 px-1.5 py-0.2 text-[10px] text-slate-700 font-mono">
                {stats.total}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                navigate("/manager/queue");
                setCurrentPage(1);
              }}
              className={`h-full inline-flex items-center gap-1.5 px-3 rounded-md text-xs font-bold transition cursor-pointer ${
                activeMode === "queue"
                  ? "bg-white text-blue-600 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <FiClock className="text-xs" />
              <span>Queue</span>
              {stats.unassigned > 0 ? (
                <span className="rounded-full bg-amber-100 text-amber-800 px-1.5 py-0.2 text-[10px] font-mono font-bold">
                  {stats.unassigned}
                </span>
              ) : (
                <span className="rounded-full bg-slate-200/80 px-1.5 py-0.2 text-[10px] text-slate-700 font-mono">
                  {stats.inProgress}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                navigate("/manager/assignment");
                setCurrentPage(1);
              }}
              className={`h-full inline-flex items-center gap-1.5 px-3 rounded-md text-xs font-bold transition cursor-pointer ${
                activeMode === "assignment"
                  ? "bg-white text-blue-600 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <FiUsers className="text-xs" />
              <span>Assignments</span>
              <span className="rounded-full bg-emerald-100 text-emerald-800 px-1.5 py-0.2 text-[10px] font-mono font-bold">
                {stats.availableStaff}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* MODE-SPECIFIC DEDICATED KPI METRICS */}
      {activeMode === "tickets" && (
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Tickets</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{stats.total}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Across all departments</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Resolved Tickets</div>
            <div className="text-2xl font-bold text-emerald-600 mt-1">{stats.resolved}</div>
            <div className="text-[11px] text-emerald-600 font-medium mt-0.5">
              {stats.total > 0 ? `${Math.round((stats.resolved / stats.total) * 100)}% resolved` : "0%"}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">P1 / Critical</div>
            <div className="text-2xl font-bold text-red-600 mt-1">{stats.critical}</div>
            <div className="text-[11px] text-red-500 font-medium mt-0.5">High severity tickets</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Active In-Progress</div>
            <div className="text-2xl font-bold text-blue-600 mt-1">{stats.inProgress}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Assigned to specialists</div>
          </div>
        </div>
      )}

      {activeMode === "queue" && (
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Unassigned Queue</div>
            <div className="text-2xl font-bold text-amber-600 mt-1">{stats.unassigned}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Awaiting agent assignment</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">SLA at Risk / Breached</div>
            <div className="text-2xl font-bold text-rose-600 mt-1">{stats.slaRisk}</div>
            <div className="text-[11px] text-rose-500 font-medium mt-0.5">Requires immediate dispatch</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">P1 / Critical Urgency</div>
            <div className="text-2xl font-bold text-red-600 mt-1">{stats.critical}</div>
            <div className="text-[11px] text-red-500 font-medium mt-0.5">Top dispatch priority</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Available Agents Online</div>
            <div className="text-2xl font-bold text-emerald-600 mt-1">
              {stats.availableStaff}{" "}
              <span className="text-xs font-normal text-slate-500">/ {agents.length} Ready</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              {stats.busyStaff > 0 ? `${stats.busyStaff} busy/away` : "All agents available"}
            </div>
          </div>
        </div>
      )}

      {activeMode === "assignment" && (
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Support Agents</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{agents.length}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Dedicated department specialists</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Available Specialists</div>
            <div className="text-2xl font-bold text-emerald-600 mt-1">{stats.availableStaff}</div>
            <div className="text-[11px] text-emerald-600 font-medium mt-0.5">Eligible for auto-assignment</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Busy / Away Agents</div>
            <div className="text-2xl font-bold text-amber-600 mt-1">{stats.busyStaff}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Bypassed by auto-assign engine</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Active Workloads</div>
            <div className="text-2xl font-bold text-blue-600 mt-1">{stats.inProgress}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Tickets distributed to agents</div>
          </div>
        </div>
      )}

      {/* AGENT CAPACITY & WORKING STATUS MATRIX (PROMINENT IN ASSIGNMENT MODE & COMPACT TOGGLE IN OTHERS) */}
      {activeMode === "assignment" && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                  Support Specialists &amp; Live Working Status
                </h2>
                <span className="rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 text-[10px] font-semibold">
                  Auto-Assigns to Available Staff Only
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Click any specialist to filter their active ticket workload below. Busy/Unavailable agents will not receive automated tickets.
              </p>
            </div>
            {selectedAgentFilter && (
              <button
                onClick={() => setSelectedAgentFilter(null)}
                className="text-xs font-semibold text-blue-600 hover:underline cursor-pointer inline-flex items-center gap-1 self-start sm:self-auto"
              >
                <FiX className="text-xs" />
                <span>Clear Filter ({selectedAgentFilter.name || selectedAgentFilter.username})</span>
              </button>
            )}
          </div>

          <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
            {agents.map((ag) => {
              const agTickets = tickets.filter((t) => isTicketAssignedToAgent(t, ag));
              const activeCount = agTickets.filter((t) => !["RESOLVED", "Resolved", "CLOSED", "Closed"].includes(t.status)).length;
              const completedCount = agTickets.filter((t) => ["RESOLVED", "Resolved", "CLOSED", "Closed"].includes(t.status)).length;
              const maxCap = 5;
              const pct = Math.min(100, Math.round((activeCount / maxCap) * 100));
              const isAvail = isAgentAvailable(ag);
              const statusLabel = isAvail ? "Available" : (ag.availabilityStatus || ag.availability_status || "Unavailable");
              const isSelected = selectedAgentFilter && (selectedAgentFilter.id === ag.id || selectedAgentFilter.email === ag.email);

              return (
                <div
                  key={ag.id || ag.email}
                  onClick={() => setSelectedAgentFilter(isSelected ? null : ag)}
                  className={`rounded-xl border p-4 transition cursor-pointer text-xs ${
                    isSelected
                      ? "border-blue-600 bg-blue-50/50 shadow-xs ring-2 ring-blue-600"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 truncate">
                      <span
                        className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                          isAvail
                            ? "bg-emerald-500 shadow-xs shadow-emerald-500/50 ring-2 ring-emerald-100"
                            : statusLabel.toLowerCase().includes("busy")
                            ? "bg-amber-500 ring-2 ring-amber-100"
                            : "bg-slate-400 ring-2 ring-slate-100"
                        }`}
                        title={statusLabel}
                      />
                      <span className="font-bold text-slate-900 truncate text-sm">{ag.name || ag.username}</span>
                    </div>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                      isAvail
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : statusLabel.toLowerCase().includes("busy")
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : "bg-slate-100 text-slate-600 border-slate-200"
                    }`}>
                      {isAvail ? "Available" : statusLabel}
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-500 mb-2 truncate">
                    {ag.department || "IT Department"} • {ag.title || "Support Specialist"}
                  </div>

                  {/* Workload Capacity Bar */}
                  <div className="space-y-1 mb-2.5">
                    <div className="flex items-center justify-between text-[10px] text-slate-500">
                      <span>Workload ({activeCount}/{maxCap})</span>
                      <span className="font-mono">{pct}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          pct >= 100 ? "bg-red-500" : pct >= 60 ? "bg-amber-500" : "bg-blue-600"
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1.5 border-t border-slate-100">
                    <span className="text-slate-500">{completedCount} resolved</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setInspectingAgent(ag);
                      }}
                      className="text-blue-600 hover:text-blue-800 font-semibold hover:underline cursor-pointer"
                    >
                      View Tasks &rarr;
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* FILTER & TICKET TABLE CARD */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        {/* Table Header / Mode Context */}
        <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              {activeMode === "assignment"
                ? "Ticket Assignment & Workload List"
                : activeMode === "tickets"
                ? "All System Support Tickets"
                : "Active Dispatch & Queue Tickets"}
            </span>
            {selectedAgentFilter && (
              <span className="rounded-md bg-blue-100 text-blue-800 px-2 py-0.5 text-[10px] font-semibold">
                Filtered by {selectedAgentFilter.name || selectedAgentFilter.username}
              </span>
            )}
          </div>
          <span className="text-xs text-slate-500">
            {filteredTickets.length} ticket(s) matching current view
          </span>
        </div>

        {/* Filters Toolbar */}
        <div className="p-4 border-b border-slate-200 bg-white flex flex-wrap items-center gap-2.5">
          <div className="relative flex-1 min-w-[220px]">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search ticket code, customer, subject, agent..."
              className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50/40 pl-9 pr-3 text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-blue-600 focus:bg-white focus:ring-1 focus:ring-blue-600 transition"
            />
          </div>

          <select
            value={selectedDepartment}
            onChange={(e) => {
              setSelectedDepartment(e.target.value);
              setCurrentPage(1);
            }}
            className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-700 outline-none focus:border-blue-600 cursor-pointer shadow-2xs"
          >
            {departments.map((d) => (
              <option key={d} value={d}>
                {d === "ALL" ? "All Departments" : d}
              </option>
            ))}
          </select>

          <select
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              setCurrentPage(1);
            }}
            className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-700 outline-none focus:border-blue-600 cursor-pointer shadow-2xs"
          >
            {categoriesList.map((c) => (
              <option key={c} value={c}>
                {c === "ALL" ? "All Categories" : c}
              </option>
            ))}
          </select>

          <select
            value={selectedPriority}
            onChange={(e) => {
              setSelectedPriority(e.target.value);
              setCurrentPage(1);
            }}
            className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-700 outline-none focus:border-blue-600 cursor-pointer shadow-2xs"
          >
            <option value="ALL">All Priorities</option>
            <option value="P1">P1 – Critical</option>
            <option value="P2">P2 – High</option>
            <option value="P3">P3 – Medium</option>
            <option value="P4">P4 – Low</option>
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setCurrentPage(1);
            }}
            className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-700 outline-none focus:border-blue-600 cursor-pointer shadow-2xs"
          >
            {statuses.map((s) => (
              <option key={s} value={s}>
                {s === "ALL" ? "All Statuses" : STATUS_CONFIG[s]?.label || s}
              </option>
            ))}
          </select>

          {(searchTerm || selectedDepartment !== "ALL" || selectedCategory !== "ALL" || selectedPriority !== "ALL" || selectedStatus !== "ALL" || selectedAgentFilter) && (
            <button
              onClick={() => {
                setSearchTerm("");
                setSelectedDepartment("ALL");
                setSelectedCategory("ALL");
                setSelectedPriority("ALL");
                setSelectedStatus("ALL");
                setSelectedAgentFilter(null);
                setCurrentPage(1);
              }}
              className="h-9 text-xs font-semibold text-slate-600 hover:text-slate-900 transition cursor-pointer px-3 rounded-lg bg-slate-100 hover:bg-slate-200 inline-flex items-center gap-1 shadow-2xs"
            >
              <FiX className="text-xs" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                <th className="py-3 px-4 w-[110px]">Ticket ID</th>
                <th className="py-3 px-4 min-w-[240px]">Customer &amp; Subject</th>
                <th className="py-3 px-4 w-[150px]">Department</th>
                <th className="py-3 px-4 w-[140px]">Category &amp; Sub</th>
                <th className="py-3 px-4 w-[110px]">Priority</th>
                <th className="py-3 px-4 w-[110px]">Status</th>
                <th className="py-3 px-4 w-[130px]">SLA Deadline</th>
                <th className="py-3 px-4 w-[160px]">Assigned Specialist</th>
                <th className="py-3 px-4 text-right min-w-[130px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedTickets.map((ticket) => {
                const ticketCode = ticket.ticketNumber || ticket.ticket_number || ticket.id;
                const dept = ticket.department || getDepartmentForCategory(ticket.category);
                const sla = getSlaInfo(ticket);
                const hasAgent = ticket.assignedAgent && ticket.assignedAgent !== "Unassigned";

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
                      </div>
                    </td>

                    {/* Department */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                        {dept}
                      </span>
                    </td>

                    {/* Category & Sub */}
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
                      <span
                        className={`inline-block rounded-md border px-2 py-0.5 text-[11px] ${
                          PRIORITY_CONFIG[ticket.priority]?.badge || "bg-slate-50 text-slate-600 border-slate-200"
                        }`}
                      >
                        {PRIORITY_CONFIG[ticket.priority]?.label || ticket.priority || "P3 – Medium"}
                      </span>
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

                    {/* Assigned Agent */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      {hasAgent ? (
                        <div className="flex items-center gap-1.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          <span className="font-medium text-slate-800 text-[11px]">
                            {ticket.assignedAgentName || ticket.assignedAgent}
                          </span>
                        </div>
                      ) : (
                        <span className="rounded bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 text-[10px] font-medium inline-flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                          Unassigned
                        </span>
                      )}
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

                        <button
                          type="button"
                          onClick={() => {
                            setReassignModalTicket(ticket);
                            setSelectedAgent(ticket.assignedAgentId || "");
                          }}
                          className="rounded border border-blue-200 bg-blue-50 px-2 py-1 text-[11px] font-semibold text-blue-700 hover:bg-blue-100 transition cursor-pointer"
                        >
                          {hasAgent ? "Reassign" : "Assign"}
                        </button>
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
            <p className="text-xs font-medium">No tickets match your filters.</p>
          </div>
        )}

        {/* Pagination */}
        <div className="border-t border-slate-200 bg-slate-50/50 px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <span>
              Showing {filteredTickets.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} to{" "}
              {Math.min(currentPage * pageSize, filteredTickets.length)} of {filteredTickets.length} tickets
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

      {/* REASSIGN / ASSIGN MODAL (ONLY CLEAN SPECIALISTS WITH WORKING STATUS) */}
      {reassignModalTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="font-mono text-xs font-semibold text-blue-600">
                  #{reassignModalTicket.ticketNumber || reassignModalTicket.id}
                </span>
                <h3 className="text-sm font-bold text-slate-900 mt-0.5">
                  Assign Specialist to Ticket
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setReassignModalTicket(null)}
                className="text-slate-400 hover:text-slate-700 transition cursor-pointer"
              >
                <FiX />
              </button>
            </div>

            <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-xs space-y-1">
              <div className="font-semibold text-slate-800">
                {reassignModalTicket.subject || reassignModalTicket.title}
              </div>
              <div className="text-slate-500 text-[11px]">
                Department: {reassignModalTicket.department || getDepartmentForCategory(reassignModalTicket.category)} • Priority: {reassignModalTicket.priority || "P3"}
              </div>
            </div>

            <form onSubmit={handleManualReassign} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Select Specialist (Working Status Displayed):
                </label>
                <select
                  value={selectedAgent}
                  onChange={(e) => setSelectedAgent(e.target.value)}
                  required
                  className="w-full rounded-lg border border-slate-200 p-2.5 text-xs text-slate-900 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 cursor-pointer"
                >
                  <option value="">-- Choose Support Specialist --</option>
                  {agents.map((ag) => {
                    const isAvail = isAgentAvailable(ag);
                    const statusText = isAvail ? "Available" : (ag.availabilityStatus || ag.availability_status || "Unavailable");
                    return (
                      <option key={ag.id || ag.email} value={ag.id || ag.email}>
                        {ag.name || ag.username} ({ag.department || "IT"}) — {statusText}
                      </option>
                    );
                  })}
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  Tip: Assigning to Available specialists ensures immediate SLA compliance and fast resolution.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setReassignModalTicket(null)}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!selectedAgent}
                  className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition cursor-pointer shadow-xs disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  <FiCheck className="text-xs" />
                  <span>Confirm Assignment</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PROFESSIONAL AGENT DETAILS DRAWER */}
      <AgentDetailsDrawer
        agent={inspectingAgent}
        isOpen={Boolean(inspectingAgent)}
        onClose={() => setInspectingAgent(null)}
        allTickets={tickets}
        onTicketAssigned={() => loadTickets()}
        onStatusChanged={() => {
          refreshAgents();
          fetchAgentsApi().then((list) => {
            if (list && list.length > 0) setAgents(list);
          });
        }}
      />
    </div>
  );
}
