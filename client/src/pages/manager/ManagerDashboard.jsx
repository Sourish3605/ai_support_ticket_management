import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getAllTickets, updateTicket } from "../../services/ticketService";
import { seedUsers } from "../../data/seedData";

export default function ManagerDashboard() {
  const [tickets, setTickets] = useState([]);
  const [filter, setFilter] = useState("all");
  const [reassignModalTicket, setReassignModalTicket] = useState(null);
  const [selectedAgent, setSelectedAgent] = useState("");
  const [toast, setToast] = useState(null);

  const loadTickets = () => {
    const list = getAllTickets();
    setTickets(list);
  };

  useEffect(() => {
    loadTickets();
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Compute 5 PDF Section 7.C Metric Cards
  const openTickets = tickets.filter(
    (t) => !["Resolved", "RESOLVED", "Closed", "CLOSED"].includes(t.status)
  );

  const highPriorityTickets = tickets.filter(
    (t) =>
      ["Critical", "P1", "High", "P2"].includes(t.priority) &&
      !["Resolved", "RESOLVED", "Closed", "CLOSED"].includes(t.status)
  );

  const escalatedTickets = tickets.filter(
    (t) => ["ESCALATED", "Escalated"].includes(t.status)
  );

  const slaBreachedTickets = tickets.filter((t) => {
    if (["Resolved", "RESOLVED", "Closed", "CLOSED"].includes(t.status)) return false;
    if (t.priority === "Critical" || t.priority === "P1") return true;
    if (t.slaStatus === "BREACHED") return true;
    return false;
  });

  const avgResolutionTimeHours = "3.4h";

  // Filtered tickets
  const displayedTickets = tickets.filter((t) => {
    if (filter === "open") return !["Resolved", "RESOLVED", "Closed", "CLOSED"].includes(t.status);
    if (filter === "high") return ["Critical", "P1", "High", "P2"].includes(t.priority);
    if (filter === "escalated") return ["ESCALATED", "Escalated"].includes(t.status);
    if (filter === "unassigned") return !t.assignedAgent || t.assignedAgent === "Unassigned";
    return true;
  });

  const handleReassign = (e) => {
    e.preventDefault();
    if (!reassignModalTicket || !selectedAgent) return;

    try {
      const agentUser = seedUsers.find((u) => u.name === selectedAgent || u.email === selectedAgent);
      const agentDisplayName = agentUser ? `${agentUser.name} (${agentUser.department || "Support"})` : selectedAgent;

      updateTicket(reassignModalTicket.id, {
        assignedAgent: selectedAgent,
        assignedAgentName: agentDisplayName,
        status: reassignModalTicket.status === "NEW" ? "ASSIGNED" : reassignModalTicket.status,
      });

      setToast({
        type: "success",
        message: `✓ Ticket #${reassignModalTicket.ticketNumber || reassignModalTicket.id} reassigned to ${selectedAgent}.`,
      });

      setReassignModalTicket(null);
      setSelectedAgent("");
      loadTickets();
    } catch (err) {
      setToast({ type: "error", message: "Failed to reassign ticket." });
    }
  };

  const agents = seedUsers.filter((u) => ["Agent", "Support Agent", "Employee"].includes(u.role));

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

      {/* TOP COMMAND BANNER (Warm Amber & Deep Navy) */}
      <div className="rounded-2xl bg-[#090e1a] border border-[#1e293b] p-6 text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[11px] font-bold tracking-wide uppercase mb-2">
            <span>🛡️</span> Support Manager Operations Desk
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Queue Health, SLA Integrity &amp; Escalation Control
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Real-time multi-agent supervisor console. Balance team capacity, enforce SLA response &amp; resolution deadlines, and guide complex ticket escalations.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Link
            to="/manager/assignment"
            className="rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs px-4 py-2.5 transition shadow-lg shadow-amber-500/20 flex items-center gap-2"
          >
            <span>👥</span> Reassign Workload
          </Link>
          <Link
            to="/manager/sla"
            className="rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-amber-200 font-bold text-xs px-4 py-2.5 transition"
          >
            <span>⏱</span> SLA Matrix
          </Link>
        </div>
      </div>

      {/* 5 MAIN CONTENT METRIC CARDS (PDF SECTION 7.C) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Card 1: Open Tickets */}
        <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-xs hover:border-amber-300 hover:shadow-md transition relative overflow-hidden group">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Open Tickets</span>
            <span className="h-8 w-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-sm font-bold border border-amber-100">
              📂
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900">{openTickets.length}</span>
            <span className="text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded font-bold border border-amber-200">
              Active
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {tickets.length - openTickets.length} resolved / closed
          </p>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-amber-500 h-full rounded-full"
              style={{ width: `${Math.min(100, (openTickets.length / Math.max(1, tickets.length)) * 100)}%` }}
            />
          </div>
        </div>

        {/* Card 2: High Priority */}
        <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-xs hover:border-orange-300 hover:shadow-md transition relative overflow-hidden group">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>High Priority</span>
            <span className="h-8 w-8 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center text-sm font-bold border border-orange-100">
              🔥
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-orange-600">{highPriorityTickets.length}</span>
            <span className="text-[11px] text-orange-700 bg-orange-50 px-2 py-0.5 rounded font-mono font-bold border border-orange-200">
              P1 / P2
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Urgent attention needed</p>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-orange-500 h-full rounded-full"
              style={{ width: `${Math.min(100, (highPriorityTickets.length / Math.max(1, openTickets.length)) * 100)}%` }}
            />
          </div>
        </div>

        {/* Card 3: SLA Breaches */}
        <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-xs hover:border-red-300 hover:shadow-md transition relative overflow-hidden group">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>SLA Breaches</span>
            <span className="h-8 w-8 rounded-xl bg-red-50 text-red-600 flex items-center justify-center text-sm font-bold border border-red-100">
              ⏱
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-red-600">{slaBreachedTickets.length}</span>
            <span className="text-[11px] text-red-700 bg-red-50 px-2 py-0.5 rounded font-bold border border-red-200">
              At Risk
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Page 14 threshold alerts</p>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-red-500 h-full rounded-full"
              style={{ width: `${Math.min(100, (slaBreachedTickets.length / Math.max(1, openTickets.length)) * 100)}%` }}
            />
          </div>
        </div>

        {/* Card 4: Escalations */}
        <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-xs hover:border-amber-400 hover:shadow-md transition relative overflow-hidden group">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Escalations</span>
            <span className="h-8 w-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center text-sm font-bold border border-amber-100">
              🚨
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-amber-700">{escalatedTickets.length}</span>
            <span className="text-[11px] text-amber-800 bg-amber-50 px-2 py-0.5 rounded font-bold border border-amber-200">
              Human Tier
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Low confidence / complex</p>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-amber-600 h-full rounded-full"
              style={{ width: `${Math.min(100, (escalatedTickets.length / Math.max(1, openTickets.length)) * 100)}%` }}
            />
          </div>
        </div>

        {/* Card 5: Average Resolution Time */}
        <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-xs hover:border-emerald-300 hover:shadow-md transition relative overflow-hidden group">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Avg Resolution Time</span>
            <span className="h-8 w-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-sm font-bold border border-emerald-100">
              ⚡
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-emerald-600">{avgResolutionTimeHours}</span>
            <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-mono font-bold border border-emerald-200">
              &lt; 8h SLA
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">57% faster via AI RAG</p>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
            <div className="bg-emerald-500 h-full rounded-full" style={{ width: "82%" }} />
          </div>
        </div>
      </div>

      {/* TWO COLUMN OPERATIONS MONITOR */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT 2 COLS: ACTIVE OPERATIONS QUEUE */}
        <div className="lg:col-span-2 rounded-2xl bg-white border border-slate-200 shadow-xs overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/70">
            <div>
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <span>📋</span> Operations Ticket Queue
              </h3>
              <p className="text-[11px] text-slate-500">
                Supervise tickets across ingestion, classification, and assignment states
              </p>
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap gap-1.5">
              {[
                { id: "all", label: `All (${tickets.length})` },
                { id: "open", label: `Open (${openTickets.length})` },
                { id: "high", label: `High/Crit (${highPriorityTickets.length})` },
                { id: "escalated", label: `Escalated (${escalatedTickets.length})` },
                { id: "unassigned", label: "Unassigned" },
              ].map((pill) => (
                <button
                  key={pill.id}
                  onClick={() => setFilter(pill.id)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    filter === pill.id
                      ? "bg-amber-500 text-slate-950 font-bold shadow-xs"
                      : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 bg-slate-50 font-semibold uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4">Ticket</th>
                  <th className="py-3 px-4">Subject</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Assigned Agent</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayedTickets.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-12 text-slate-400 font-medium">
                      No tickets matching filter.
                    </td>
                  </tr>
                ) : (
                  displayedTickets.map((t) => {
                    const ticketCode = t.ticketNumber || t.id;
                    const isCrit = t.priority === "Critical" || t.priority === "P1";
                    const isHigh = t.priority === "High" || t.priority === "P2";
                    const isEscalated = ["ESCALATED", "Escalated"].includes(t.status);

                    return (
                      <tr key={t.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3.5 px-4 font-mono font-bold text-amber-700">
                          <Link to={`/portal/tickets/${ticketCode}`} className="hover:underline">
                            {ticketCode}
                          </Link>
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-800 max-w-[200px] truncate" title={t.subject || t.title}>
                          {t.subject || t.title}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 font-mono text-[10px] text-slate-700">
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
                          {t.assignedAgent ? (
                            <span className="flex items-center gap-1.5 font-medium">
                              <span className="h-2 w-2 rounded-full bg-emerald-500" />
                              <span>{t.assignedAgent}</span>
                            </span>
                          ) : (
                            <span className="text-amber-700 font-bold italic text-[11px]">
                              ⚠ Unassigned
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => {
                              setReassignModalTicket(t);
                              setSelectedAgent(t.assignedAgent || "");
                            }}
                            className="px-3 py-1 rounded-lg bg-amber-50 hover:bg-amber-500 text-amber-800 hover:text-slate-950 border border-amber-200 text-[11px] font-bold transition cursor-pointer shadow-2xs"
                          >
                            Assign / Route
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT COL: WORKLOAD BALANCE & SLA WATCH */}
        <div className="space-y-6">
          {/* Agent Workload Gauge Card */}
          <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <span>👥</span> Team Workload Capacity
              </h3>
              <Link to="/manager/assignment" className="text-[11px] text-amber-700 font-bold hover:underline">
                Manage
              </Link>
            </div>

            <div className="space-y-3.5">
              {agents.map((ag) => {
                const assignedCount = tickets.filter(
                  (t) =>
                    (t.assignedAgent === ag.name || t.assignedAgent === ag.email) &&
                    !["Resolved", "RESOLVED", "Closed", "CLOSED"].includes(t.status)
                ).length;

                const maxCapacity = 5;
                const loadPct = Math.min(100, Math.round((assignedCount / maxCapacity) * 100));

                return (
                  <div key={ag.id} className="space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800">{ag.name}</span>
                        <span className="text-[10px] text-slate-400">({ag.department || "Support"})</span>
                      </div>
                      <span className="font-mono font-bold text-amber-700">
                        {assignedCount} / {maxCapacity} ({loadPct}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          loadPct >= 80 ? "bg-red-500" : loadPct >= 50 ? "bg-amber-500" : "bg-amber-500"
                        }`}
                        style={{ width: `${loadPct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SLA Rule Summary Card (PDF Page 14) */}
          <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <span>⏱</span> PDF Page 14 SLA Policy
              </h3>
              <span className="text-[10px] font-mono text-amber-800 font-bold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                Automated
              </span>
            </div>

            <div className="space-y-2 text-[11px]">
              <div className="p-2.5 rounded-xl bg-red-50/60 border border-red-200 flex items-center justify-between">
                <div>
                  <span className="font-bold text-red-700">Critical Priority</span>
                  <div className="text-red-600/80 text-[10px]">Resp: 30m • Resol: 4h</div>
                </div>
                <span className="px-2 py-0.5 rounded bg-red-100 text-red-800 font-mono font-bold text-[10px]">
                  Immediate
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-amber-50/60 border border-amber-200 flex items-center justify-between">
                <div>
                  <span className="font-bold text-amber-800">High Priority</span>
                  <div className="text-amber-700/80 text-[10px]">Resp: 2h • Resol: 8h</div>
                </div>
                <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-mono font-bold text-[10px]">
                  Manager Alert
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-blue-50/60 border border-blue-200 flex items-center justify-between">
                <div>
                  <span className="font-bold text-blue-700">Medium Priority</span>
                  <div className="text-blue-600/80 text-[10px]">Resp: 8h • Resol: 24h</div>
                </div>
                <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-mono font-bold text-[10px]">
                  Agent Alert
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-700">Low Priority</span>
                  <div className="text-slate-500 text-[10px]">Resp: 24h • Resol: 72h</div>
                </div>
                <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-mono text-[10px]">
                  Normal Queue
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* REASSIGNMENT MODAL */}
      {reassignModalTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-2xl p-6 space-y-4 text-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-900">
                Reassign Ticket #{reassignModalTicket.ticketNumber || reassignModalTicket.id}
              </h3>
              <button
                onClick={() => setReassignModalTicket(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="text-xs space-y-2 text-slate-600 bg-amber-50/40 p-3 rounded-xl border border-amber-100">
              <p className="font-bold text-slate-900">{reassignModalTicket.subject || reassignModalTicket.title}</p>
              <div className="flex gap-2">
                <span className="px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-600 font-mono">
                  Category: {reassignModalTicket.category || "General"}
                </span>
                <span className="px-2 py-0.5 rounded bg-amber-100 border border-amber-200 text-amber-900 font-mono font-bold">
                  Priority: {reassignModalTicket.priority || "Medium"}
                </span>
              </div>
            </div>

            <form onSubmit={handleReassign} className="space-y-4 pt-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Select Target Agent
                </label>
                <select
                  value={selectedAgent}
                  onChange={(e) => setSelectedAgent(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-900 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none"
                  required
                >
                  <option value="">-- Choose Agent --</option>
                  {agents.map((ag) => (
                    <option key={ag.id} value={ag.name}>
                      {ag.name} ({ag.department || "Support Team"})
                    </option>
                  ))}
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
                  Save Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
