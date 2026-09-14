import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiSearch,
  FiX,
  FiUser,
  FiChevronLeft,
  FiChevronRight,
  FiArrowUp,
  FiArrowDown,
} from "react-icons/fi";
import { getAgentTicketSummary, isTicketAssignedToAgent } from "../services/ticketService";

/**
 * Enterprise Agent Directory Table & Modal
 * Clicking any agent row directly opens that Agent's dedicated task view.
 */
export default function AgentDirectoryModal({
  isOpen,
  onClose,
  agents = [],
  allTickets = [],
  onSelectAgent = null,
}) {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [workloadFilter, setWorkloadFilter] = useState("ALL");
  const [sortField, setSortField] = useState("name");
  const [sortAsc, setSortAsc] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  const enrichedAgents = useMemo(() => {
    return agents.map((ag) => {
      const summary = getAgentTicketSummary(ag, allTickets);
      const matchedTickets = summary.assignedTickets;

      const openCount = summary.pending;
      const completedCount = summary.solved;

      const slaAtRiskCount = matchedTickets.filter(
        (t) =>
          !["RESOLVED", "Resolved", "CLOSED", "Closed"].includes(t.status) &&
          (String(t.priority || "").includes("P1") || String(t.priority || "").includes("P2") ||
           t.priority === "Critical" || t.priority === "High")
      ).length;

      const avail = (ag.availability_status || ag.availability || ag.status || "AVAILABLE").toUpperCase();

      return {
        ...ag,
        computedOpen: openCount,
        computedCompleted: completedCount,
        computedSlaRisk: slaAtRiskCount,
        computedStatus: avail,
      };
    });
  }, [agents, allTickets]);

  const filteredAgents = useMemo(() => {
    return enrichedAgents.filter((ag) => {
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchName = (ag.name || "").toLowerCase().includes(q);
        const matchEmail = (ag.email || "").toLowerCase().includes(q);
        const matchDept = (ag.department || "").toLowerCase().includes(q);
        const matchTitle = (ag.title || ag.specialty || "").toLowerCase().includes(q);
        if (!matchName && !matchEmail && !matchDept && !matchTitle) return false;
      }
      if (departmentFilter !== "ALL") {
        const d = (ag.department || "").toLowerCase();
        if (!d.includes(departmentFilter.toLowerCase())) return false;
      }
      if (statusFilter !== "ALL") {
        if (ag.computedStatus !== statusFilter) return false;
      }
      if (workloadFilter === "LOW" && ag.computedOpen > 2) return false;
      if (workloadFilter === "MEDIUM" && (ag.computedOpen < 3 || ag.computedOpen > 5)) return false;
      if (workloadFilter === "HIGH" && ag.computedOpen < 6) return false;
      return true;
    });
  }, [enrichedAgents, searchTerm, departmentFilter, statusFilter, workloadFilter]);

  const sortedAgents = useMemo(() => {
    const list = [...filteredAgents];
    list.sort((a, b) => {
      let valA, valB;
      if (sortField === "name") {
        valA = (a.name || a.username || "").toLowerCase();
        valB = (b.name || b.username || "").toLowerCase();
      } else if (sortField === "open") {
        valA = a.computedOpen; valB = b.computedOpen;
      } else if (sortField === "completed") {
        valA = a.computedCompleted; valB = b.computedCompleted;
      } else if (sortField === "sla") {
        valA = a.computedSlaRisk; valB = b.computedSlaRisk;
      } else if (sortField === "status") {
        valA = a.computedStatus; valB = b.computedStatus;
      } else {
        valA = a[sortField]; valB = b[sortField];
      }
      if (valA < valB) return sortAsc ? -1 : 1;
      if (valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });
    return list;
  }, [filteredAgents, sortField, sortAsc]);

  const totalPages = Math.max(1, Math.ceil(sortedAgents.length / pageSize));
  const paginatedAgents = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedAgents.slice(start, start + pageSize);
  }, [sortedAgents, currentPage, pageSize]);

  const handleSort = (field) => {
    if (sortField === field) setSortAsc(!sortAsc);
    else { setSortField(field); setSortAsc(true); }
  };

  const handleRowClick = (ag) => {
    if (onSelectAgent) {
      onSelectAgent(ag);
    } else {
      navigate(`/agent/tasks/${encodeURIComponent(ag.name || ag.username || ag.id || "")}`);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="w-full max-w-5xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
              <FiUser className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 leading-none">IT &amp; Staff Directory</h2>
              <p className="text-xs text-slate-500 mt-1">Click any agent to view their ticket breakdown.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        {/* TOOLBAR */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="relative w-full sm:w-72">
            <FiSearch className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              placeholder="Search agent, email, role..."
              className="w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 py-1.5 text-xs text-slate-900 outline-none focus:border-blue-600 shadow-2xs"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select value={departmentFilter} onChange={(e) => { setDepartmentFilter(e.target.value); setCurrentPage(1); }}
              className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-blue-600 shadow-2xs cursor-pointer">
              <option value="ALL">All Departments</option>
              <option value="IT">IT Support</option>
              <option value="Network">Network</option>
              <option value="Security">Security</option>
              <option value="Hardware">Hardware</option>
              <option value="Software">Software</option>
              <option value="Billing">Billing</option>
            </select>
            <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-blue-600 shadow-2xs cursor-pointer">
              <option value="ALL">All Statuses</option>
              <option value="AVAILABLE">Available</option>
              <option value="BUSY">Busy</option>
              <option value="UNAVAILABLE">Offline</option>
            </select>
            <select value={workloadFilter} onChange={(e) => { setWorkloadFilter(e.target.value); setCurrentPage(1); }}
              className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-blue-600 shadow-2xs cursor-pointer">
              <option value="ALL">All Workloads</option>
              <option value="LOW">Low (≤ 2 tickets)</option>
              <option value="MEDIUM">Medium (3-5 tickets)</option>
              <option value="HIGH">High (&gt; 5 tickets)</option>
            </select>
          </div>
        </div>

        {/* TABLE */}
        <div className="flex-1 overflow-x-auto overflow-y-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px] sticky top-0 z-10">
              <tr>
                <th onClick={() => handleSort("name")} className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition select-none">
                  <div className="flex items-center gap-1.5"><span>Agent</span>{sortField === "name" && (sortAsc ? <FiArrowUp /> : <FiArrowDown />)}</div>
                </th>
                <th className="py-3 px-4">Department</th>
                <th onClick={() => handleSort("status")} className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition select-none">
                  <div className="flex items-center gap-1.5"><span>Status</span>{sortField === "status" && (sortAsc ? <FiArrowUp /> : <FiArrowDown />)}</div>
                </th>
                <th onClick={() => handleSort("open")} className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition select-none">
                  <div className="flex items-center gap-1.5"><span>Open Tickets</span>{sortField === "open" && (sortAsc ? <FiArrowUp /> : <FiArrowDown />)}</div>
                </th>
                <th onClick={() => handleSort("sla")} className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition select-none">
                  <div className="flex items-center gap-1.5"><span>SLA At Risk</span>{sortField === "sla" && (sortAsc ? <FiArrowUp /> : <FiArrowDown />)}</div>
                </th>
                <th onClick={() => handleSort("completed")} className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition select-none">
                  <div className="flex items-center gap-1.5"><span>Completed</span>{sortField === "completed" && (sortAsc ? <FiArrowUp /> : <FiArrowDown />)}</div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedAgents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No specialists found matching your search and filter criteria.
                  </td>
                </tr>
              ) : (
                paginatedAgents.map((ag) => {
                  const isAvail = ag.computedStatus === "AVAILABLE";
                  const isBusy = ag.computedStatus === "BUSY";
                  return (
                    <tr
                      key={ag.id || ag.email}
                      onClick={() => handleRowClick(ag)}
                      className="hover:bg-blue-50/40 transition-colors cursor-pointer group"
                      title={`Click to view ${ag.name || ag.username}'s ticket breakdown`}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-lg bg-slate-100 text-blue-600 font-bold flex items-center justify-center border border-slate-200">
                            {(ag.name || ag.username || "A").charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 group-hover:text-blue-600 transition">{ag.name || ag.username}</p>
                            <p className="text-[11px] text-slate-500 font-mono">{ag.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-700">{ag.department || "IT Support"}</td>
                      <td className="py-3 px-4">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[11px] font-bold bg-white">
                          <span className={`h-2 w-2 rounded-full ${isAvail ? "bg-emerald-500" : isBusy ? "bg-amber-500" : "bg-slate-400"}`} />
                          <span className={isAvail ? "text-emerald-700" : isBusy ? "text-amber-700" : "text-slate-600"}>
                            {isAvail ? "Available" : isBusy ? "Busy" : "Offline"}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4"><span className="font-bold text-slate-800 text-sm">{ag.computedOpen}</span></td>
                      <td className="py-3 px-4">
                        <span className={`font-bold ${ag.computedSlaRisk > 0 ? "text-red-600" : "text-slate-500"}`}>{ag.computedSlaRisk}</span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 font-medium">{ag.computedCompleted}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
          <div>
            Showing {sortedAgents.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} to{" "}
            {Math.min(currentPage * pageSize, sortedAgents.length)} of {sortedAgents.length} specialists
          </div>
          <div className="flex items-center gap-2">
            <button type="button" disabled={currentPage <= 1} onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition cursor-pointer">
              <FiChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 font-medium">Page {currentPage} of {totalPages}</span>
            <button type="button" disabled={currentPage >= totalPages} onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition cursor-pointer">
              <FiChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
