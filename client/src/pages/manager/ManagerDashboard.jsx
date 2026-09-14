import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  getAllTickets,
  updateTicket,
  deleteTicket,
  fetchAgentTicketsApi,
  assignTicketApi,
  fetchAgentsApi,
  autoAssignTicketsApi,
} from "../../services/ticketService";
import { api } from "../../services/api";
import { seedUsers } from "../../data/seedData";
import GmailComposeButton from "../../components/GmailComposeButton";
import AgentDetailsDrawer from "../../components/AgentDetailsDrawer";
import {
  FiInbox,
  FiAlertCircle,
  FiCheckCircle,
  FiClock,
  FiShield,
  FiUsers,
  FiSearch,
  FiFilter,
  FiChevronLeft,
  FiChevronRight,
  FiRefreshCw,
  FiSend,
  FiUserCheck,
  FiUserX,
  FiEye,
  FiTrash2,
  FiPlusCircle,
  FiBarChart2,
} from "react-icons/fi";

export default function ManagerDashboard() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [deptFilter, setDeptFilter] = useState("all");
  const [assignedFilter, setAssignedFilter] = useState("all");
  const [selectedAgentFilter, setSelectedAgentFilter] = useState(null);
  const [inspectingAgent, setInspectingAgent] = useState(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Actions state
  const [isAutoAssigning, setIsAutoAssigning] = useState(false);
  const [reassignModalTicket, setReassignModalTicket] = useState(null);
  const [selectedAgent, setSelectedAgent] = useState("");
  const [toast, setToast] = useState(null);
  const [agents, setAgents] = useState(() =>
    seedUsers.filter((u) => ["Agent", "Support Agent", "Employee"].includes(u.role))
  );

  const isTicketAssignedToAgent = (t, ag) => {
    if (!t || !ag) return false;
    const tAgentName = (t.assignedAgentName || t.assignedAgent || "").toLowerCase();
    const tAgentId = String(t.assignedAgentId ?? t.assigned_to ?? t.assignedTo ?? "").toLowerCase();
    const agId = String(ag.id || "").toLowerCase();
    const agName = (ag.name || "").toLowerCase();
    const agUsername = (ag.username || "").toLowerCase();
    const agEmail = (ag.email || "").toLowerCase();

    if (agId && tAgentId && agId === tAgentId) return true;
    if (agName && (tAgentName.includes(agName) || agName.includes(tAgentName))) return true;
    if (agUsername && (tAgentName.includes(agUsername) || tAgentId === agUsername)) return true;
    if (agEmail && (tAgentName.includes(agEmail) || tAgentId === agEmail)) return true;
    return false;
  };

  const loadTickets = async () => {
    setLoading(true);
    let apiAll = [];
    try {
      const apiTickets = await fetchAgentTicketsApi();
      if (apiTickets && Array.isArray(apiTickets)) {
        apiAll = apiTickets;
      }
    } catch (e) {}

    const localTickets = getAllTickets();
    const apiIds = new Set(apiAll.map((t) => String(t.id ?? t.ticketNumber ?? "")));
    const onlyLocal = localTickets.filter(
      (t) => !apiIds.has(String(t.id ?? t.ticketNumber ?? ""))
    );
    const combined = [...apiAll, ...onlyLocal].map((t) => {
      const agName = t.assignedAgent || t.assignedAgentName;
      const cleanAgName = agName && agName !== "Unassigned" ? agName : null;
      return {
        ...t,
        assignedAgent: cleanAgName || t.assignedAgent,
        assignedAgentName: cleanAgName || t.assignedAgentName,
      };
    });
    setTickets(combined);
    setLoading(false);
  };

  const loadAgents = async () => {
    try {
      const list = await fetchAgentsApi();
      if (list && Array.isArray(list) && list.length > 0) {
        setAgents(list);
      }
    } catch (e) {}
  };

  useEffect(() => {
    loadTickets();
    loadAgents();
    const handleSync = () => {
      setTickets(getAllTickets());
      const localAgents = getDepartmentAgentsList();
      if (localAgents && localAgents.length > 0) setAgents(localAgents);
    };
    window.addEventListener("supportpilot_tickets_changed", handleSync);
    window.addEventListener("storage", handleSync);
    return () => {
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

  // Metrics
  const metrics = useMemo(() => {
    const total = tickets.length;
    const open = tickets.filter(
      (t) => !["Resolved", "RESOLVED", "Closed", "CLOSED"].includes(t.status)
    ).length;
    const escalated = tickets.filter((t) =>
      ["ESCALATED", "Escalated", "REOPENED", "Reopened"].includes(t.status)
    ).length;
    const highPriority = tickets.filter(
      (t) =>
        ["Critical", "P1", "High", "P2"].includes(t.priority) &&
        !["Resolved", "RESOLVED", "Closed", "CLOSED"].includes(t.status)
    ).length;
    const closed = tickets.filter((t) =>
      ["Resolved", "RESOLVED", "Closed", "CLOSED"].includes(t.status)
    ).length;

    return { total, open, escalated, highPriority, closed };
  }, [tickets]);

  // Agent Workload Calculation
  const agentWorkloads = useMemo(() => {
    return agents.map((ag) => {
      const activeCount = tickets.filter(
        (t) =>
          isTicketAssignedToAgent(t, ag) &&
          !["Resolved", "RESOLVED", "Closed", "CLOSED"].includes(t.status)
      ).length;
      return {
        ...ag,
        activeCount,
        availability: ag.availabilityStatus || ag.availability_status || "AVAILABLE",
      };
    });
  }, [agents, tickets]);

  // Filtered tickets
  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      // 1. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const ticketCode = String(t.ticketNumber || t.id || "").toLowerCase();
        const subject = String(t.subject || t.title || "").toLowerCase();
        const category = String(t.category || "").toLowerCase();
        const subCategory = String(t.subCategory || t.sub_category || "").toLowerCase();
        const customer = String(t.customerName || t.customerEmail || "").toLowerCase();
        const agent = String(t.assignedAgentName || t.assignedAgent || "").toLowerCase();
        const matches =
          ticketCode.includes(q) ||
          subject.includes(q) ||
          category.includes(q) ||
          subCategory.includes(q) ||
          customer.includes(q) ||
          agent.includes(q);
        if (!matches) return false;
      }

      // 2. Status filter
      if (statusFilter !== "all") {
        const s = String(t.status || "").toUpperCase();
        if (statusFilter === "OPEN" && ["RESOLVED", "CLOSED"].includes(s)) return false;
        if (statusFilter === "ACTIVE" && !["OPEN", "ASSIGNED", "IN_PROGRESS", "REOPENED"].includes(s)) return false;
        if (statusFilter === "ESCALATED" && !["ESCALATED", "REOPENED"].includes(s)) return false;
        if (statusFilter === "RESOLVED" && !["RESOLVED", "CLOSED"].includes(s)) return false;
        if (statusFilter !== "OPEN" && statusFilter !== "ACTIVE" && statusFilter !== "ESCALATED" && statusFilter !== "RESOLVED") {
          if (s !== statusFilter.toUpperCase()) return false;
        }
      }

      // 3. Priority filter
      if (priorityFilter !== "all") {
        const p = String(t.priority || "").toUpperCase();
        if (priorityFilter === "P1" && !["P1", "CRITICAL"].includes(p)) return false;
        if (priorityFilter === "P2" && !["P2", "HIGH"].includes(p)) return false;
        if (priorityFilter === "P3" && !["P3", "MEDIUM"].includes(p)) return false;
        if (priorityFilter === "P4" && !["P4", "LOW"].includes(p)) return false;
      }

      // 4. Department filter
      if (deptFilter !== "all") {
        const d = String(t.department || "").toLowerCase();
        if (!d.includes(deptFilter.toLowerCase())) return false;
      }

      // 5. Assignment filter
      const isAssigned = Boolean(
        (t.assignedAgentName || t.assignedAgent) &&
        (t.assignedAgentName || t.assignedAgent) !== "Unassigned" &&
        (t.assignedAgentName || t.assignedAgent) !== "null"
      );
      if (assignedFilter === "assigned" && !isAssigned) return false;
      if (assignedFilter === "unassigned" && isAssigned) return false;

      // 6. Selected agent filter
      if (selectedAgentFilter && !isTicketAssignedToAgent(t, selectedAgentFilter)) return false;

      return true;
    });
  }, [tickets, searchQuery, statusFilter, priorityFilter, deptFilter, assignedFilter, selectedAgentFilter]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredTickets.length / pageSize));
  const paginatedTickets = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTickets.slice(start, start + pageSize);
  }, [filteredTickets, currentPage, pageSize]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, priorityFilter, deptFilter, assignedFilter, selectedAgentFilter, pageSize]);

  // Handlers
  const handleAutoAssignAll = async () => {
    setIsAutoAssigning(true);
    try {
      const res = await autoAssignTicketsApi();
      setToast({
        type: "success",
        message: res?.message || "Successfully auto-assigned tickets based on category, priority, and balanced workload.",
      });
      await loadTickets();
      await loadAgents();
    } catch (err) {
      setToast({ type: "error", message: "Auto-assignment encountered an issue." });
    } finally {
      setIsAutoAssigning(false);
    }
  };

  const handleToggleAgentAvailability = async (agent, newStatus) => {
    try {
      const agId = agent.id != null && !String(agent.id).startsWith("USR") ? agent.id : (agent.username || agent.email);
      await api.patch(`/agent/${agId}/availability/`, { availability_status: newStatus });
      setToast({
        type: "success",
        message: `Updated availability for ${agent.name || agent.username} to ${newStatus}.`,
      });
      await loadAgents();
      await loadTickets();
    } catch (err) {
      // update local
      setAgents((prev) =>
        prev.map((a) => (a.id === agent.id ? { ...a, availabilityStatus: newStatus, availability_status: newStatus } : a))
      );
      setToast({
        type: "success",
        message: `Updated availability for ${agent.name || agent.username} to ${newStatus}.`,
      });
    }
  };

  const handleReassign = async (e) => {
    e.preventDefault();
    if (!reassignModalTicket || !selectedAgent) return;

    try {
      const foundAgent = agents.find(
        (u) =>
          String(u.id) === String(selectedAgent) ||
          u.username === selectedAgent ||
          u.name === selectedAgent ||
          u.email === selectedAgent
      );
      const agentId = foundAgent?.id != null && !String(foundAgent.id).startsWith("USR") ? foundAgent.id : null;
      const agentName = foundAgent?.name || foundAgent?.username || selectedAgent;
      const agentDisplayName = foundAgent ? `${agentName} (${foundAgent.department || "Support"})` : selectedAgent;

      await assignTicketApi(reassignModalTicket.id, agentId, agentName);

      updateTicket(reassignModalTicket.id, {
        assigned_to: agentId,
        assignedAgent: agentName,
        assignedAgentName: agentDisplayName,
        assignedAgentId: agentId,
        status: "ASSIGNED",
      });

      setToast({
        type: "success",
        message: `Ticket #${reassignModalTicket.ticketNumber || reassignModalTicket.id} assigned to ${agentName}.`,
      });

      setReassignModalTicket(null);
      setSelectedAgent("");
      await loadTickets();
      await loadAgents();
    } catch (err) {
      setToast({ type: "error", message: "Failed to reassign ticket." });
    }
  };

  const handleDelete = (ticket) => {
    const code = ticket.ticketNumber || ticket.id;
    if (window.confirm(`Are you sure you want to remove ticket #${code}?`)) {
      deleteTicket(ticket.id);
      setToast({ type: "success", message: `Ticket #${code} removed successfully.` });
      loadTickets();
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className="fixed top-20 right-8 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="rounded-lg bg-slate-900 px-4 py-3 text-xs font-semibold text-white shadow-xl border border-slate-700 flex items-center gap-2">
            {toast.type === "success" ? (
              <FiCheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <FiAlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* TOP COMMAND BAR */}
      <div className="rounded-xl bg-white border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold uppercase tracking-wider mb-2">
            <FiShield className="w-3.5 h-3.5" />
            <span>Operations &amp; Workload Command</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Support Operations &amp; SLA Management
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Monitor incoming queues, manage real-time agent availability, balance department workloads, and enforce SLA resolution deadlines.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            disabled={isAutoAssigning}
            onClick={handleAutoAssignAll}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-4 py-2.5 transition shadow-xs cursor-pointer disabled:opacity-50"
            title="Automatically assign unassigned tickets based on Category, Priority, and Agent Workload"
          >
            {isAutoAssigning ? (
              <>
                <FiRefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Auto-Assigning...</span>
              </>
            ) : (
              <>
                <FiUsers className="w-3.5 h-3.5" />
                <span>Run AI Auto-Assignment</span>
              </>
            )}
          </button>

          <Link
            to="/manager/assignment"
            className="inline-flex items-center gap-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs px-4 py-2.5 transition shadow-xs"
          >
            <FiUsers className="w-3.5 h-3.5 text-blue-600" />
            <span>Agent Workloads</span>
          </Link>

          <button
            onClick={loadTickets}
            className="inline-flex items-center justify-center h-9 w-9 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition shadow-xs cursor-pointer"
            title="Refresh Tickets"
          >
            <FiRefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Tickets */}
        <div className="rounded-xl bg-white border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Total Tickets</span>
            <div className="h-8 w-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
              <FiInbox className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{metrics.total}</span>
            <span className="text-[11px] text-slate-500">all time</span>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
            <div className="bg-slate-400 h-full rounded-full w-full" />
          </div>
        </div>

        {/* Active / Open */}
        <div className="rounded-xl bg-white border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Active / Open</span>
            <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <FiClock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-blue-600">{metrics.open}</span>
            <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
              In Progress
            </span>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-blue-600 h-full rounded-full"
              style={{ width: `${Math.min(100, (metrics.open / Math.max(1, metrics.total)) * 100)}%` }}
            />
          </div>
        </div>

        {/* High / P1 / P2 Priority */}
        <div className="rounded-xl bg-white border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>High Priority</span>
            <div className="h-8 w-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
              <FiAlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-orange-600">{metrics.highPriority}</span>
            <span className="text-[11px] font-semibold text-orange-700 bg-orange-50 px-1.5 py-0.5 rounded font-mono">
              P1 / P2
            </span>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-orange-500 h-full rounded-full"
              style={{ width: `${Math.min(100, (metrics.highPriority / Math.max(1, metrics.open)) * 100)}%` }}
            />
          </div>
        </div>

        {/* Escalations / Queued */}
        <div className="rounded-xl bg-white border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Escalated / Help</span>
            <div className="h-8 w-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
              <FiAlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-red-600">{metrics.escalated}</span>
            <span className="text-[11px] font-semibold text-red-700 bg-red-50 px-1.5 py-0.5 rounded">
              Needs Review
            </span>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-red-500 h-full rounded-full"
              style={{ width: `${Math.min(100, (metrics.escalated / Math.max(1, metrics.open)) * 100)}%` }}
            />
          </div>
        </div>

        {/* Completed / Closed */}
        <div className="rounded-xl bg-white border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Resolved / Closed</span>
            <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <FiCheckCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-600">{metrics.closed}</span>
            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
              {Math.round((metrics.closed / Math.max(1, metrics.total)) * 100)}%
            </span>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full"
              style={{ width: `${Math.min(100, (metrics.closed / Math.max(1, metrics.total)) * 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* MAIN TWO-COLUMN SECTION: TICKETS & WORKLOADS */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* TICKET TABLE (LEFT 3 COLUMNS) */}
        <div className="lg:col-span-3 rounded-xl bg-white border border-slate-200 shadow-xs overflow-hidden flex flex-col">
          {/* SEARCH & FILTERS HEADER */}
          <div className="p-4 border-b border-slate-200 bg-slate-50/60 space-y-3">
            <div className="flex flex-col sm:flex-row items-center gap-3">
              {/* Search Box */}
              <div className="relative flex-1 w-full">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by ticket #, subject, customer, agent, or category..."
                  className="w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 py-2 text-xs text-slate-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 text-xs"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-700 focus:border-blue-600 focus:outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="OPEN">Open</option>
                <option value="ASSIGNED">Assigned</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="ESCALATED">Escalated</option>
                <option value="RESOLVED">Resolved / Closed</option>
              </select>

              {/* Priority Filter */}
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-700 focus:border-blue-600 focus:outline-none"
              >
                <option value="all">All Priorities</option>
                <option value="P1">P1 – Critical</option>
                <option value="P2">P2 – High</option>
                <option value="P3">P3 – Medium</option>
                <option value="P4">P4 – Low</option>
              </select>

              {/* Department Filter */}
              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-700 focus:border-blue-600 focus:outline-none"
              >
                <option value="all">All Departments</option>
                <option value="IT">IT Department</option>
                <option value="HR">HR Department</option>
                <option value="Finance">Finance Department</option>
              </select>

              {/* Assignment Filter */}
              <select
                value={assignedFilter}
                onChange={(e) => setAssignedFilter(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-700 focus:border-blue-600 focus:outline-none"
              >
                <option value="all">All Assignments</option>
                <option value="assigned">Assigned Only</option>
                <option value="unassigned">Unassigned Only</option>
              </select>
            </div>

            {/* Active Agent Filter Notice */}
            {selectedAgentFilter && (
              <div className="flex items-center justify-between rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-900 border border-blue-200">
                <span className="font-semibold">
                  Filtered by Agent: {selectedAgentFilter.name || selectedAgentFilter.username} ({filteredTickets.length} matching tickets)
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedAgentFilter(null)}
                  className="text-xs font-bold text-blue-700 hover:underline cursor-pointer"
                >
                  Clear Agent Filter
                </button>
              </div>
            )}
          </div>

          {/* TABLE CONTAINER */}
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 bg-slate-50 font-semibold uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4">Ticket</th>
                  <th className="py-3 px-4">Subject &amp; Customer</th>
                  <th className="py-3 px-4">Department &amp; Category</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Assigned Agent</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedTickets.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-12 text-slate-400 font-medium">
                      No tickets match the selected filters.
                    </td>
                  </tr>
                ) : (
                  paginatedTickets.map((t) => {
                    const ticketCode = t.ticketNumber || t.id;
                    const isP1 = t.priority === "Critical" || t.priority === "P1";
                    const isP2 = t.priority === "High" || t.priority === "P2";
                    const isP3 = t.priority === "Medium" || t.priority === "P3";
                    const assignedName = t.assignedAgentName || t.assignedAgent;
                    const isAssigned = Boolean(assignedName && assignedName !== "Unassigned" && assignedName !== "null");
                    const isEscalated = ["ESCALATED", "Escalated", "REOPENED", "Reopened"].includes(t.status);
                    const isClosed = ["RESOLVED", "Resolved", "CLOSED", "Closed"].includes(t.status);

                    return (
                      <tr key={t.id} className="hover:bg-slate-50/70 transition">
                        {/* Ticket Code */}
                        <td className="py-3.5 px-4 font-mono font-bold text-blue-600 whitespace-nowrap">
                          <Link to={`/portal/tickets/${ticketCode}`} className="hover:underline">
                            {ticketCode}
                          </Link>
                        </td>

                        {/* Title & Customer */}
                        <td className="py-3.5 px-4 max-w-[220px]">
                          <div className="font-semibold text-slate-800 truncate" title={t.subject || t.title}>
                            {t.subject || t.title}
                          </div>
                          <div className="text-[11px] text-slate-400 truncate">
                            {t.customerName || t.customerEmail || "Customer"}
                          </div>
                        </td>

                        {/* Department & Category */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="text-xs font-medium text-slate-700">
                            {t.department || "IT Department"}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {t.category || "General"} {t.subCategory ? `• ${t.subCategory}` : ""}
                          </div>
                        </td>

                        {/* Priority Badge */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold font-mono ${
                              isP1
                                ? "bg-red-50 text-red-700 border border-red-200"
                                : isP2
                                ? "bg-orange-50 text-orange-700 border border-orange-200"
                                : isP3
                                ? "bg-blue-50 text-blue-700 border border-blue-200"
                                : "bg-slate-100 text-slate-700 border border-slate-200"
                            }`}
                          >
                            {isP1 ? "P1 – Critical" : isP2 ? "P2 – High" : isP3 ? "P3 – Medium" : "P4 – Low"}
                          </span>
                        </td>

                        {/* Status Badge */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isClosed
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : isEscalated
                                ? "bg-red-50 text-red-700 border border-red-200"
                                : t.status === "ASSIGNED" || t.status === "IN_PROGRESS"
                                ? "bg-blue-50 text-blue-700 border border-blue-200"
                                : "bg-slate-100 text-slate-700 border border-slate-200"
                            }`}
                          >
                            {t.status || "OPEN"}
                          </span>
                        </td>

                        {/* Assigned Agent */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {isAssigned ? (
                            <div className="flex items-center gap-1.5 text-xs text-slate-800 font-medium">
                              <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                              <span className="truncate max-w-[130px]">{assignedName}</span>
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-200">
                              <FiAlertCircle className="w-3 h-3" />
                              <span>Unassigned</span>
                            </span>
                          )}
                        </td>

                        {/* Action Buttons */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setReassignModalTicket(t);
                                setSelectedAgent(t.assigned_to || t.assignedAgentId || assignedName || "");
                              }}
                              className="px-2.5 py-1 rounded-md bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold transition cursor-pointer"
                            >
                              {isAssigned ? "Reassign" : "Assign"}
                            </button>

                            <GmailComposeButton
                              ticketId={ticketCode}
                              ticket={t}
                              to={t.customerEmail}
                              variant="icon"
                              title="Send Transactional Email"
                            />

                            <Link
                              to={`/portal/tickets/${ticketCode}`}
                              className="p-1.5 rounded-md bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-900 border border-slate-200 text-xs transition inline-flex items-center justify-center"
                              title="View Details"
                            >
                              <FiEye className="w-3.5 h-3.5" />
                            </Link>

                            <button
                              type="button"
                              onClick={() => handleDelete(t)}
                              className="p-1.5 rounded-md bg-white hover:bg-red-50 text-slate-400 hover:text-red-600 border border-slate-200 text-xs transition cursor-pointer inline-flex items-center justify-center"
                              title="Delete Ticket"
                            >
                              <FiTrash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* PAGINATION FOOTER */}
          <div className="p-4 border-t border-slate-200 bg-white flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <span>Rows per page:</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 focus:outline-none"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
              <span className="text-slate-400 pl-2">
                Showing {filteredTickets.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} -{" "}
                {Math.min(currentPage * pageSize, filteredTickets.length)} of {filteredTickets.length} tickets
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <FiChevronLeft className="w-3.5 h-3.5" />
                <span>Prev</span>
              </button>
              <span className="px-2 font-medium text-slate-700">
                Page {currentPage} of {totalPages}
              </span>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span>Next</span>
                <FiChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT SIDEBAR: AGENT AVAILABILITY & WORKLOADS */}
        <div className="space-y-6">
          {/* Agent Capacity Card */}
          <div className="rounded-xl bg-white border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                  <FiUsers className="w-4 h-4 text-blue-600" />
                  <span>Agent Workload &amp; Status</span>
                </h3>
                <p className="text-[11px] text-slate-400">Manage real-time availability and queues</p>
              </div>
            </div>

            <div className="space-y-3">
              {agentWorkloads.map((ag) => {
                const isSelected = selectedAgentFilter?.id === ag.id || selectedAgentFilter?.username === ag.username;
                const isAvailable = ag.availability === "AVAILABLE";

                return (
                  <div
                    key={ag.id || ag.username}
                    className={`p-3 rounded-lg border transition ${
                      isSelected
                        ? "bg-blue-50 border-blue-300 ring-1 ring-blue-300"
                        : "border-slate-200 hover:border-slate-300 bg-slate-50/50"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div
                        onClick={() => setSelectedAgentFilter(isSelected ? null : ag)}
                        className="cursor-pointer font-semibold text-xs text-slate-900 hover:text-blue-600 truncate max-w-[130px]"
                        title="Click to filter ticket table by this agent"
                      >
                        {ag.name || ag.username}
                      </div>

                      {/* Status Toggle Dropdown */}
                      <select
                        value={ag.availability}
                        onChange={(e) => handleToggleAgentAvailability(ag, e.target.value)}
                        className={`text-[10px] font-bold rounded px-1.5 py-0.5 border cursor-pointer outline-none ${
                          isAvailable
                            ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                            : ag.availability === "BUSY"
                            ? "bg-amber-50 text-amber-800 border-amber-300"
                            : "bg-slate-200 text-slate-700 border-slate-300"
                        }`}
                      >
                        <option value="AVAILABLE">Working / Available</option>
                        <option value="BUSY">Busy</option>
                        <option value="UNAVAILABLE">Not Working</option>
                      </select>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                      <span>{ag.department || "IT Department"}</span>
                      <span className="font-mono font-semibold text-slate-700">
                        {ag.activeCount} active tickets
                      </span>
                    </div>

                    {/* Capacity bar */}
                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          ag.activeCount >= 5
                            ? "bg-red-500"
                            : ag.activeCount >= 3
                            ? "bg-amber-500"
                            : "bg-blue-600"
                        }`}
                        style={{ width: `${Math.min(100, (ag.activeCount / 5) * 100)}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2 pt-1 border-t border-slate-100">
                      <span>Cap: {Math.round((ag.activeCount / 5) * 100)}%</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setInspectingAgent(ag);
                        }}
                        className="text-blue-600 hover:text-blue-800 font-semibold hover:underline cursor-pointer"
                      >
                        Profile &rarr;
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SLA Rule Reference Card */}
          <div className="rounded-xl bg-white border border-slate-200 p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                <FiClock className="w-4 h-4 text-blue-600" />
                <span>SLA Policy Reference</span>
              </h3>
              <span className="text-[10px] font-mono text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                Automated
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-2.5 rounded-lg bg-red-50/70 border border-red-200 flex items-center justify-between">
                <div>
                  <span className="font-bold text-red-700">P1 – Critical</span>
                  <div className="text-red-600 text-[10px]">Resp: 15m • Resol: 4h</div>
                </div>
                <span className="px-2 py-0.5 rounded bg-red-100 text-red-800 font-mono font-bold text-[10px]">
                  24/7 Cover
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-orange-50/70 border border-orange-200 flex items-center justify-between">
                <div>
                  <span className="font-bold text-orange-700">P2 – High</span>
                  <div className="text-orange-600 text-[10px]">Resp: 30m • Resol: 8h</div>
                </div>
                <span className="px-2 py-0.5 rounded bg-orange-100 text-orange-800 font-mono font-bold text-[10px]">
                  24/7 Cover
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-blue-50/70 border border-blue-200 flex items-center justify-between">
                <div>
                  <span className="font-bold text-blue-700">P3 – Medium</span>
                  <div className="text-blue-600 text-[10px]">Resp: 60m • Resol: 24h</div>
                </div>
                <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-mono font-bold text-[10px]">
                  Biz Hours
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-700">P4 – Low</span>
                  <div className="text-slate-500 text-[10px]">Resp: 120m • Resol: 48h</div>
                </div>
                <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-mono text-[10px]">
                  Biz Hours
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* REASSIGNMENT MODAL */}
      {reassignModalTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-xl bg-white border border-slate-200 shadow-2xl p-6 space-y-4 text-slate-800 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-900">
                Reassign Ticket #{reassignModalTicket.ticketNumber || reassignModalTicket.id}
              </h3>
              <button
                onClick={() => setReassignModalTicket(null)}
                className="text-slate-400 hover:text-slate-700 text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
            </div>

            <div className="text-xs space-y-2 text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-200">
              <p className="font-bold text-slate-900">{reassignModalTicket.subject || reassignModalTicket.title}</p>
              <div className="flex gap-2">
                <span className="px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-600 font-mono">
                  {reassignModalTicket.category || "General"}
                </span>
                <span className="px-2 py-0.5 rounded bg-blue-50 border border-blue-200 text-blue-700 font-mono font-bold">
                  {reassignModalTicket.priority || "P3"}
                </span>
              </div>
            </div>

            <form onSubmit={handleReassign} className="space-y-4 pt-1">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Select Target Agent
                </label>
                <select
                  value={selectedAgent}
                  onChange={(e) => setSelectedAgent(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-none"
                  required
                >
                  <option value="">-- Choose Agent --</option>
                  {agents.map((ag) => (
                    <option key={ag.id || ag.username} value={ag.id != null && !String(ag.id).startsWith("USR") ? ag.id : (ag.name || ag.username)}>
                      {ag.name || ag.username} ({ag.department || "Support"} - {ag.availabilityStatus || ag.availability_status || "AVAILABLE"})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setReassignModalTicket(null)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-blue-600 hover:bg-blue-700 px-4 py-2 text-xs font-semibold text-white transition shadow-xs cursor-pointer"
                >
                  Save Assignment
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
        onStatusChanged={() => loadAgents()}
      />
    </div>
  );
}
