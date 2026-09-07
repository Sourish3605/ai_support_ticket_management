import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
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
} from "../../services/ticketService";
import { seedUsers } from "../../data/seedData";

export default function ManagerQueueAndAssignmentPage() {
  const location = useLocation();
  const isAssignmentMode = location.pathname.includes("/assignment");
  const isAllTicketsMode = location.pathname.includes("/tickets");

  const [tickets, setTickets] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("ALL");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [selectedPriority, setSelectedPriority] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [selectedAgentFilter, setSelectedAgentFilter] = useState(null);
  const [isAutoAssigning, setIsAutoAssigning] = useState(false);
  const [reassignModalTicket, setReassignModalTicket] = useState(null);
  const [selectedAgent, setSelectedAgent] = useState("");
  const [toast, setToast] = useState(null);
  const [agents, setAgents] = useState(() => getDepartmentAgentsList());

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
    try {
      const apiTickets = await fetchAgentTicketsApi();
      if (apiTickets && Array.isArray(apiTickets) && apiTickets.length > 0) {
        setTickets(apiTickets);
        return;
      }
    } catch (e) {}
    const local = getAllTickets().map((t) => {
      const agName = t.assignedAgent || t.assignedAgentName;
      const cleanAgName = agName && agName !== "Unassigned" ? agName : null;
      return {
        ...t,
        assignedAgent: cleanAgName,
        assignedAgentName: cleanAgName,
      };
    });
    setTickets(local);
  };

  const handleDelete = (ticket) => {
    const code = ticket.ticketNumber || ticket.id;
    if (window.confirm(`Are you sure you want to remove ticket #${code}?`)) {
      deleteTicket(ticket.id);
      setToast({ type: "success", message: `✓ Ticket #${code} removed successfully.` });
      loadTickets();
    }
  };

  useEffect(() => {
    loadTickets();
    fetchAgentsApi().then((list) => {
      if (list && Array.isArray(list) && list.length > 0) {
        setAgents(list);
      }
    });
  }, [location.pathname]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const filteredTickets = tickets.filter((t) => {
    const assignedName = t.assignedAgentName || t.assignedAgent || "";
    const text = `${t.ticketNumber || t.id} ${t.subject || t.title} ${t.category} ${assignedName}`.toLowerCase();
    if (searchTerm && !text.includes(searchTerm.toLowerCase())) return false;
    const ticketDept = t.department || getDepartmentForCategory(t.category);
    if (selectedDepartment !== "ALL" && ticketDept.toLowerCase() !== selectedDepartment.toLowerCase()) return false;
    if (selectedCategory !== "ALL" && t.category !== selectedCategory) return false;
    if (selectedPriority !== "ALL" && t.priority !== selectedPriority) return false;
    if (selectedStatus !== "ALL" && t.status !== selectedStatus) return false;
    if (selectedAgentFilter && !isTicketAssignedToAgent(t, selectedAgentFilter)) return false;
    return true;
  });

  const handleAutoAssignAll = async () => {
    setIsAutoAssigning(true);
    try {
      const res = await autoAssignTicketsApi();
      if (res) {
        setToast({
          type: "success",
          message: res.message || "✓ Successfully auto-assigned tickets based on category and priority!",
        });
        await loadTickets();
      } else {
        // Local fallback auto-assignment
        const unassigned = tickets.filter(
          (t) => !(t.assignedAgent || t.assignedAgentName) && !["Resolved", "RESOLVED", "Closed", "CLOSED"].includes(t.status)
        );
        for (const t of unassigned) {
          const cat = (t.category || "").toLowerCase();
          const targetDept = t.department || getDepartmentForCategory(t.category);
          const eligibleAgents = agents.filter(
            (a) =>
              (a.department || "").toLowerCase().includes(targetDept.toLowerCase().replace(" department", "")) &&
              ["AVAILABLE", "Working / Available"].includes(a.availability_status || a.availabilityStatus || "AVAILABLE")
          );
          const targetAgent = eligibleAgents[0] || agents[0];

          if (targetAgent) {
            await assignTicketApi(t.id, targetAgent.id, targetAgent.name);
          }
        }
        setToast({
          type: "success",
          message: `✓ Auto-assigned ${unassigned.length} tickets to available department agents.`,
        });
        await loadTickets();
      }
    } catch (err) {
      setToast({ type: "error", message: "Auto-assignment encountered an issue." });
    } finally {
      setIsAutoAssigning(false);
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
      const agentDept = foundAgent?.department || "IT Department";
      const agentDisplayName = foundAgent ? `${agentName} (${agentDept})` : selectedAgent;

      // Validate department match
      const ticketDept = reassignModalTicket.department || getDepartmentForCategory(reassignModalTicket.category);
      const cleanTicketDept = ticketDept.toLowerCase().replace(" department", "").trim();
      const cleanAgentDept = agentDept.toLowerCase().replace(" department", "").trim();
      if (cleanAgentDept && cleanTicketDept && !cleanAgentDept.includes(cleanTicketDept) && !cleanTicketDept.includes(cleanAgentDept)) {
        setToast({
          type: "error",
          message: `Cannot assign ticket to ${agentName}. Ticket belongs to ${ticketDept}, but agent belongs to ${agentDept}.`,
        });
        return;
      }

      await assignTicketApi(reassignModalTicket.id, agentId, agentName);

      // Immediately update local state so table updates instantly
      setTickets((prev) =>
        prev.map((t) =>
          t.id === reassignModalTicket.id
            ? {
                ...t,
                assigned_to: agentId,
                assignedAgent: agentName,
                assignedAgentName: agentDisplayName,
                assignedAgentId: agentId,
                assignedAgentDepartment: agentDept,
                status: "ASSIGNED",
              }
            : t
        )
      );

      updateTicket(reassignModalTicket.id, {
        assigned_to: agentId,
        assignedAgent: agentName,
        assignedAgentName: agentDisplayName,
        assignedAgentId: agentId,
        assignedAgentDepartment: agentDept,
        status: "ASSIGNED",
      });

      setToast({
        type: "success",
        message: `✓ Ticket #${reassignModalTicket.ticketNumber || reassignModalTicket.id} reassigned to ${agentName} (${agentDept}).`,
      });

      setReassignModalTicket(null);
      setSelectedAgent("");
      loadTickets();
    } catch (err) {
      setToast({ type: "error", message: err.message || "Failed to assign ticket." });
    }
  };

  const departments = ["ALL", "IT Department", "HR Department", "Finance Department"];
  const categories = ["ALL", "Account", "Billing", "Technical", "Product", "Network", "HR/Payroll", "Finance/Payments", "Hardware", "Software"];
  const priorities = ["ALL", "Critical", "High", "Medium", "Low"];
  const statuses = ["ALL", "OPEN", "AI_RESOLUTION_READY", "ASSIGNED", "IN_PROGRESS", "ESCALATED", "RESOLVED", "CLOSED"];

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className="fixed top-20 right-6 z-50 animate-bounce">
          <div className="rounded-xl bg-slate-900 px-4 py-3 text-xs font-bold text-white shadow-2xl border border-amber-500/50 backdrop-blur-md flex items-center gap-2">
            <span className="text-amber-400">{toast.type === "success" ? "✓" : "⚠"}</span>
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* HEADER CARD */}
      <div className="rounded-2xl bg-white border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-bold tracking-wide uppercase mb-2">
            <span>{isAssignmentMode ? "👥" : isAllTicketsMode ? "▤" : "⏳"}</span>
            <span>
              {isAssignmentMode
                ? "Agent Assignment & Workload Balancing"
                : isAllTicketsMode
                ? "Enterprise Ticket Repository"
                : "Active Ticket Queue"}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            {isAssignmentMode
              ? "Distribute and Balance Agent Workloads"
              : isAllTicketsMode
              ? "All System Support Tickets"
              : "Live Incoming and Assigned Ticket Queue"}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {isAssignmentMode
              ? "Reassign tickets to optimize resolution times and prevent agent burnout across shifts."
              : "Filter, inspect, and monitor tickets throughout their M1-M3 multi-agent lifecycle."}
          </p>
        </div>

        {/* Quick Mode Switcher and Auto-Assign */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={isAutoAssigning}
            onClick={handleAutoAssignAll}
            className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:bg-slate-200 text-slate-950 font-extrabold text-xs transition shadow-sm flex items-center gap-1.5 cursor-pointer"
            title="Automatically assign tickets to agents based on Category, Priority, and Workload"
          >
            {isAutoAssigning ? (
              <>
                <div className="animate-spin inline-block w-3 h-3 border-2 border-slate-900 border-t-transparent rounded-full" />
                <span>Auto-Assigning...</span>
              </>
            ) : (
              <>
                <span>⚡</span>
                <span>AI Auto-Assign (Category & Priority)</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 border border-slate-200 shrink-0">
            <Link
              to="/manager/queue"
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                !isAssignmentMode && !isAllTicketsMode
                  ? "bg-amber-500 text-slate-950 font-bold shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Queue
            </Link>
            <Link
              to="/manager/tickets"
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                isAllTicketsMode
                  ? "bg-amber-500 text-slate-950 font-bold shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              All Tickets
            </Link>
            <Link
              to="/manager/assignment"
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                isAssignmentMode
                  ? "bg-amber-500 text-slate-950 font-bold shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Assignment
            </Link>
          </div>
        </div>
      </div>

      {/* IF ASSIGNMENT MODE: AGENT WORKLOAD MATRIX (CLICKABLE FOR FILTERING) */}
      {isAssignmentMode && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 px-1">
            <span className="font-semibold text-slate-700">Agents & Workloads (Click an agent card to view their assigned tickets):</span>
            {selectedAgentFilter && (
              <button
                type="button"
                onClick={() => setSelectedAgentFilter(null)}
                className="text-amber-700 font-bold hover:underline"
              >
                Clear Agent Filter
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {agents.map((ag) => {
              const agentTickets = tickets.filter(
                (t) =>
                  isTicketAssignedToAgent(t, ag) &&
                  !["Resolved", "RESOLVED", "Closed", "CLOSED"].includes(t.status)
              );
              const critCount = agentTickets.filter((t) => ["Critical", "P1"].includes(t.priority)).length;
              const isSelected = selectedAgentFilter?.id === ag.id || selectedAgentFilter?.username === ag.username;
              const avail = ag.availability_status || ag.availabilityStatus || "AVAILABLE";
              const isAvail = avail === "AVAILABLE" || avail === "Working / Available";
              const isBusy = avail === "BUSY" || avail === "Busy";

              return (
                <div
                  key={ag.id || ag.username}
                  onClick={() => setSelectedAgentFilter(isSelected ? null : ag)}
                  className={`rounded-2xl border p-5 shadow-xs space-y-3 relative overflow-hidden transition-all cursor-pointer select-none ${
                    isSelected
                      ? "bg-amber-50/80 border-amber-500 ring-2 ring-amber-500 shadow-md scale-[1.01]"
                      : "bg-white border-slate-200 hover:border-amber-400 hover:shadow-sm"
                  }`}
                  title={`Click to filter tickets assigned to ${ag.name || ag.username}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                        <span>{ag.name || ag.username}</span>
                        {isSelected && <span className="text-amber-600 text-xs">✓ Active</span>}
                      </h3>
                      <div className="flex flex-wrap items-center gap-1 mt-1">
                        <span className="rounded bg-blue-50 border border-blue-200 px-1.5 py-0.2 text-[9px] font-bold text-blue-700">
                          {ag.department || "IT Department"}
                        </span>
                        {ag.title && (
                          <span className="text-[10px] text-slate-500 truncate max-w-[130px]" title={ag.title}>
                            {ag.title}
                          </span>
                        )}
                      </div>
                    </div>
                    {/* Availability Dot & Badge */}
                    <div className="flex flex-col items-end gap-1">
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${
                          isAvail ? "bg-emerald-500" : isBusy ? "bg-amber-500" : "bg-slate-400"
                        }`}
                        title={avail}
                      />
                      <span
                        className={`rounded px-1.5 py-0.2 text-[9px] font-bold ${
                          isAvail
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : isBusy
                            ? "bg-amber-50 text-amber-800 border border-amber-200"
                            : "bg-slate-100 text-slate-600 border border-slate-200"
                        }`}
                      >
                        {isAvail ? "Available" : isBusy ? "Busy" : "Unavailable"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-baseline justify-between pt-2 border-t border-slate-100">
                    <span className="text-xs text-slate-500 font-medium">Assigned Tickets</span>
                    <span className="font-mono text-xl font-black text-amber-700">{agentTickets.length}</span>
                  </div>

                  {critCount > 0 ? (
                    <div className="px-2.5 py-1 rounded-lg bg-red-50 border border-red-200 text-red-700 text-[10px] font-bold">
                      🚨 {critCount} Critical Incident Assigned
                    </div>
                  ) : (
                    <div className="text-[10px] text-slate-400">
                      {isSelected ? "Showing assigned tickets below ↓" : "Click to view assignments →"}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ACTIVE AGENT FILTER BANNER */}
      {selectedAgentFilter && (
        <div className="rounded-xl bg-amber-50 border border-amber-300 p-3.5 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2.5">
            <span className="text-lg">👤</span>
            <div className="text-xs">
              <span className="font-bold text-slate-900">
                Filtered by Agent: {selectedAgentFilter.name || selectedAgentFilter.username} ({selectedAgentFilter.department || "IT Department"})
              </span>
              <span className="text-slate-500 ml-2">
                ({filteredTickets.length} tickets matching)
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSelectedAgentFilter(null)}
            className="rounded-lg bg-white border border-amber-300 px-3 py-1 text-xs font-bold text-amber-900 hover:bg-amber-100 transition cursor-pointer"
          >
            ✕ Show All Tickets
          </button>
        </div>
      )}

      {/* FILTER CONTROLS */}
      <div className="rounded-2xl bg-white border border-slate-200 p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex-1 min-w-[240px]">
          <input
            type="text"
            placeholder="Search by ticket ID, subject, category, department, or agent..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-amber-500 focus:bg-white focus:outline-none transition"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Department Filter */}
          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 focus:border-amber-500 focus:outline-none"
          >
            {departments.map((d) => (
              <option key={d} value={d}>
                {d === "ALL" ? "All Departments" : `🏢 ${d}`}
              </option>
            ))}
          </select>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 focus:border-amber-500 focus:outline-none"
          >
            {categories.map((c) => (
              <option key={c} value={c}>Category: {c}</option>
            ))}
          </select>

          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 focus:border-amber-500 focus:outline-none"
          >
            {priorities.map((p) => (
              <option key={p} value={p}>Priority: {p}</option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 focus:border-amber-500 focus:outline-none"
          >
            {statuses.map((s) => (
              <option key={s} value={s}>Status: {s}</option>
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
              }}
              className="px-3 py-2 rounded-xl text-xs font-bold text-amber-700 hover:bg-amber-50 transition cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* TICKETS TABLE */}
      <div className="rounded-2xl bg-white border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/60 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Ticket ID</th>
                <th className="py-3 px-4">Subject & Description</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Sentiment</th>
                <th className="py-3 px-4">Assigned Agent</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTickets.length === 0 ? (
                <tr>
                  <td colSpan="9" className="text-center py-12 text-slate-400 font-medium">
                    No tickets found matching your query.
                  </td>
                </tr>
              ) : (
                filteredTickets.map((t) => {
                  const ticketCode = t.ticketNumber || t.id;
                  const isCrit = t.priority === "Critical" || t.priority === "P1";
                  const isHigh = t.priority === "High" || t.priority === "P2";
                  const isEscalated = ["ESCALATED", "Escalated"].includes(t.status);
                  const assignedName = t.assignedAgentName || t.assignedAgent;
                  const isAssigned = Boolean(assignedName && assignedName !== "Unassigned" && assignedName !== "null");
                  const dept = t.department || getDepartmentForCategory(t.category);

                  return (
                    <tr key={t.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-amber-700 whitespace-nowrap">
                        <Link to={`/portal/tickets/${ticketCode}`} className="hover:underline">
                          {ticketCode}
                        </Link>
                      </td>
                      <td className="py-3.5 px-4 max-w-[240px]">
                        <div className="font-semibold text-slate-800 truncate" title={t.subject || t.title}>
                          {t.subject || t.title}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate mt-0.5">
                          {t.description}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-md bg-blue-50 border border-blue-200 text-blue-800 font-bold text-[10px] inline-flex items-center gap-1">
                          <span>🏢</span> {dept}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-700 font-mono text-[10px]">
                          {t.category || "General"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold font-mono ${
                            isCrit
                              ? "bg-red-50 text-red-700 border border-red-200"
                              : isHigh
                              ? "bg-amber-50 text-amber-800 border border-amber-200"
                              : "bg-slate-100 text-slate-600 border border-slate-200"
                          }`}
                        >
                          {t.priority || "Medium"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            isEscalated
                              ? "bg-red-50 text-red-700 border border-red-200"
                              : t.status === "AI_RESOLUTION_READY"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-slate-100 text-slate-700 border border-slate-200"
                          }`}
                        >
                          {t.status || "OPEN"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-700">
                        {t.sentiment ? (
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                              t.sentiment.toLowerCase().includes("neg")
                                ? "text-red-700 bg-red-50 border border-red-200"
                                : t.sentiment.toLowerCase().includes("pos")
                                ? "text-emerald-700 bg-emerald-50 border border-emerald-200"
                                : "text-slate-600 bg-slate-100 border border-slate-200"
                            }`}
                          >
                            {t.sentiment}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[10px]">Neutral</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {isAssigned ? (
                          <span className="text-slate-900 font-semibold flex items-center gap-1.5 text-xs">
                            <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-xs shrink-0" />
                            <span>{assignedName}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-200">
                            ⚠ Unassigned
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => {
                              setReassignModalTicket(t);
                              setSelectedAgent(t.assigned_to || t.assignedAgentId || assignedName || "");
                            }}
                            className="px-3 py-1 rounded-lg bg-amber-50 hover:bg-amber-500 text-amber-800 hover:text-slate-950 border border-amber-200 font-bold text-[11px] transition shadow-2xs cursor-pointer"
                          >
                            {isAssigned ? "Reassign" : "Assign"}
                          </button>
                          <button
                            onClick={() => handleDelete(t)}
                            className="px-2 py-1 rounded-lg bg-red-50 hover:bg-red-500 text-red-700 hover:text-white border border-red-200 font-bold text-[11px] transition shadow-2xs cursor-pointer"
                            title="Remove Ticket"
                          >
                            ✕
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
      </div>

      {/* REASSIGNMENT MODAL */}
      {reassignModalTicket && (() => {
        const targetDept = reassignModalTicket.department || getDepartmentForCategory(reassignModalTicket.category);
        const cleanTargetDept = targetDept.toLowerCase().replace(" department", "").trim();

        // Agents belonging to the ticket's department
        const eligibleDeptAgents = agents.filter((ag) => {
          const cleanAgDept = (ag.department || "").toLowerCase().replace(" department", "").trim();
          return cleanAgDept && (cleanAgDept.includes(cleanTargetDept) || cleanTargetDept.includes(cleanAgDept));
        });

        // Other unrelated department agents (shown as disabled for transparency)
        const otherDeptAgents = agents.filter((ag) => {
          const cleanAgDept = (ag.department || "").toLowerCase().replace(" department", "").trim();
          return !cleanAgDept || (!cleanAgDept.includes(cleanTargetDept) && !cleanTargetDept.includes(cleanAgDept));
        });

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
            <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-2xl p-6 space-y-4 text-slate-800 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                  <span>🔄</span> Reassign Ticket #{reassignModalTicket.ticketNumber || reassignModalTicket.id}
                </h3>
                <button
                  onClick={() => setReassignModalTicket(null)}
                  className="text-slate-400 hover:text-slate-600 text-lg font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Ticket Context & Department Badge */}
              <div className="text-xs space-y-2 text-slate-600 bg-amber-50/50 p-3.5 rounded-xl border border-amber-200">
                <p className="font-bold text-slate-900 text-sm">{reassignModalTicket.subject || reassignModalTicket.title}</p>
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="px-2 py-0.5 rounded bg-blue-100 border border-blue-300 text-blue-900 font-bold text-[11px]">
                    🏢 {targetDept}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700 font-mono text-[10px]">
                    Category: {reassignModalTicket.category || "General"}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-amber-100 border border-amber-300 text-amber-900 font-bold text-[10px]">
                    {reassignModalTicket.priority || "Medium"}
                  </span>
                </div>
                {reassignModalTicket.assignedAgent && reassignModalTicket.assignedAgent !== "Unassigned" && (
                  <p className="text-[11px] text-slate-500 pt-1">
                    Currently Assigned To: <strong className="text-slate-800">{reassignModalTicket.assignedAgentName || reassignModalTicket.assignedAgent}</strong>
                  </p>
                )}
              </div>

              {/* Department Enforcement Rule Notice */}
              <div className="rounded-xl bg-blue-50 border border-blue-200 p-2.5 text-[11px] text-blue-800 flex items-start gap-2">
                <span className="text-sm">🛡️</span>
                <span>
                  <strong>Department Isolation:</strong> Tickets in <strong>{targetDept}</strong> can only be assigned to agents within <strong>{targetDept}</strong>. Cross-department assignment is blocked.
                </span>
              </div>

              <form onSubmit={handleReassign} className="space-y-4 pt-1">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Select Available {targetDept} Agent
                  </label>
                  <select
                    value={selectedAgent}
                    onChange={(e) => setSelectedAgent(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-900 focus:border-amber-500 focus:outline-none cursor-pointer"
                    required
                  >
                    <option value="">-- Choose an Available {targetDept} Agent --</option>
                    <optgroup label={`Eligible ${targetDept} Agents (${eligibleDeptAgents.length})`}>
                      {eligibleDeptAgents.map((ag) => {
                        const avail = ag.availability_status || ag.availabilityStatus || "AVAILABLE";
                        const isAvail = avail === "AVAILABLE" || avail === "Working / Available";
                        const val = ag.id != null && !String(ag.id).startsWith("USR") ? ag.id : (ag.name || ag.username);

                        return (
                          <option
                            key={ag.id || ag.username}
                            value={val}
                            disabled={!isAvail}
                          >
                            {ag.name || ag.username} {ag.title ? `• ${ag.title}` : ""} [{isAvail ? "✓ Available" : `⚠ ${avail}`}]
                          </option>
                        );
                      })}
                    </optgroup>
                    {otherDeptAgents.length > 0 && (
                      <optgroup label="Other Departments (Restricted / Ineligible)">
                        {otherDeptAgents.map((ag) => (
                          <option
                            key={ag.id || ag.username}
                            value={ag.id}
                            disabled
                          >
                            {ag.name || ag.username} ({ag.department || "Other"}) — Ineligible
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                </div>

                <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setReassignModalTicket(null)}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-amber-500 hover:bg-amber-400 px-4 py-2 text-xs font-bold text-slate-950 transition shadow-md shadow-amber-500/20 cursor-pointer"
                  >
                    Confirm Reassignment
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
