import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { getAllTickets, updateTicket } from "../../services/ticketService";
import { seedUsers } from "../../data/seedData";

export default function ManagerSlaAndEscalationsPage() {
  const location = useLocation();
  const isSlaMode = location.pathname.includes("/sla");

  const [tickets, setTickets] = useState([]);
  const [toast, setToast] = useState(null);
  const [routeModalTicket, setRouteModalTicket] = useState(null);
  const [targetTeam, setTargetTeam] = useState("");
  const [targetAgent, setTargetAgent] = useState("");

  const loadTickets = () => {
    setTickets(getAllTickets());
  };

  useEffect(() => {
    loadTickets();
  }, [location.pathname]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const escalatedTickets = tickets.filter(
    (t) =>
      ["ESCALATED", "Escalated"].includes(t.status) ||
      (t.priority === "Critical" && !["Resolved", "RESOLVED", "Closed", "CLOSED"].includes(t.status))
  );

  const agents = seedUsers.filter((u) => ["Agent", "Support Agent", "Employee"].includes(u.role));

  const handleRouteTeam = (e) => {
    e.preventDefault();
    if (!routeModalTicket) return;

    try {
      updateTicket(routeModalTicket.id, {
        status: "IN_PROGRESS",
        assignedTeam: targetTeam || routeModalTicket.assignedTeam || "Tier-2 Technical Support",
        assignedAgent: targetAgent || routeModalTicket.assignedAgent || "Agent",
        assignedAgentName: targetAgent ? `${targetAgent} (${targetTeam || "Specialized Tier"})` : routeModalTicket.assignedAgentName,
      });

      setToast({
        type: "success",
        message: `✓ Ticket #${routeModalTicket.ticketNumber || routeModalTicket.id} routed to ${targetTeam || "Target Team"} (${targetAgent || "Assigned"}).`,
      });

      setRouteModalTicket(null);
      setTargetTeam("");
      setTargetAgent("");
      loadTickets();
    } catch (err) {
      setToast({ type: "error", message: "Failed to route escalation." });
    }
  };

  const slaTiers = [
    {
      priority: "Critical",
      responseTarget: "30 Minutes",
      resolutionTarget: "4 Hours",
      escalationRule: "Immediate escalation to Operations & Senior Engineering",
      color: "border-red-200 bg-red-50/60 text-slate-900",
      badge: "bg-red-600 text-white",
      tickets: tickets.filter((t) => ["Critical", "P1"].includes(t.priority)),
    },
    {
      priority: "High",
      responseTarget: "2 Hours",
      resolutionTarget: "8 Hours",
      escalationRule: "Manager visibility alert & priority queue placement",
      color: "border-amber-200 bg-amber-50/60 text-slate-900",
      badge: "bg-amber-500 text-slate-950 font-bold",
      tickets: tickets.filter((t) => ["High", "P2"].includes(t.priority)),
    },
    {
      priority: "Medium",
      responseTarget: "8 Hours",
      resolutionTarget: "24 Hours",
      escalationRule: "Agent alert & automated daily SLA checks",
      color: "border-slate-200 bg-slate-50 text-slate-900",
      badge: "bg-slate-700 text-white",
      tickets: tickets.filter((t) => ["Medium", "P3"].includes(t.priority) || (!t.priority && !["Low", "Critical", "High"].includes(t.priority))),
    },
    {
      priority: "Low",
      responseTarget: "24 Hours",
      resolutionTarget: "72 Hours",
      escalationRule: "Normal queue & standard batch dispatch",
      color: "border-slate-200 bg-white text-slate-900",
      badge: "bg-slate-500 text-white",
      tickets: tickets.filter((t) => ["Low", "P4"].includes(t.priority)),
    },
  ];

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

      {/* HEADER BANNER */}
      <div className="rounded-2xl bg-white border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-bold tracking-wide uppercase mb-2">
            <span>{isSlaMode ? "⏱" : "🚨"}</span>
            <span>{isSlaMode ? "SLA Policy Governance & Breach Prevention" : "Escalations Management Desk"}</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            {isSlaMode ? "Enforce Response & Resolution SLAs" : "Human Escalation Handling & Specialized Routing"}
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            {isSlaMode
              ? "Configured according to Architecture PDF Page 14. Real-time timers track ticket lifecycle deadlines and trigger manager breach notifications."
              : "Review low-confidence AI suggestions, complex billing disputes, or critical infrastructure outages and route directly to specialized support tiers."}
          </p>
        </div>

        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 border border-slate-200 shrink-0">
          <Link
            to="/manager/escalations"
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              !isSlaMode ? "bg-amber-500 text-slate-950 font-bold shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Escalations ({escalatedTickets.length})
          </Link>
          <Link
            to="/manager/sla"
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              isSlaMode ? "bg-amber-500 text-slate-950 font-bold shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            SLA Policies (Page 14)
          </Link>
        </div>
      </div>

      {/* VIEW 1: SLA MANAGEMENT MODE */}
      {isSlaMode ? (
        <div className="space-y-6">
          {/* SLA FLOW BANNER (PDF PAGE 14) */}
          <div className="rounded-2xl bg-[#090e1a] border border-[#1e293b] p-5 shadow-lg space-y-2 text-white">
            <div className="text-[11px] font-bold font-mono text-amber-400 uppercase tracking-widest">
              PDF PAGE 14 SLA EXECUTION PIPELINE
            </div>
            <div className="text-xs font-bold text-slate-200 flex flex-wrap items-center gap-2 font-mono">
              <span className="px-2 py-1 rounded bg-slate-800 text-amber-300">TICKET CREATED</span>
              <span>→</span>
              <span className="px-2 py-1 rounded bg-slate-800 text-amber-300">PRIORITY ASSIGNED</span>
              <span>→</span>
              <span className="px-2 py-1 rounded bg-slate-800 text-amber-300">SLA TIMER STARTS</span>
              <span>→</span>
              <span className="px-2 py-1 rounded bg-slate-800 text-amber-300">RESPONSE CHECK</span>
              <span>→</span>
              <span className="px-2 py-1 rounded bg-slate-800 text-amber-300">RESOLUTION CHECK</span>
              <span>→</span>
              <span className="px-2 py-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">WARNING</span>
              <span>→</span>
              <span className="px-2 py-1 rounded bg-red-500/20 text-red-300 border border-red-500/40">BREACH ALERT</span>
              <span>→</span>
              <span className="px-2 py-1 rounded bg-amber-500 text-slate-950 font-bold shadow-xs">MANAGER ESCALATION</span>
            </div>
          </div>

          {/* SLA TARGET TIERS GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {slaTiers.map((tier) => (
              <div
                key={tier.priority}
                className={`rounded-2xl border p-5 shadow-xs space-y-4 ${tier.color}`}
              >
                <div className="flex items-center justify-between">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold ${tier.badge}`}>
                    {tier.priority}
                  </span>
                  <span className="font-mono text-xs text-slate-500">
                    {tier.tickets.length} Active
                  </span>
                </div>

                <div className="space-y-2 text-xs border-y border-slate-200/80 py-3">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Response Target:</span>
                    <strong className="font-mono text-slate-900">{tier.responseTarget}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Resolution Target:</span>
                    <strong className="font-mono text-slate-900">{tier.resolutionTarget}</strong>
                  </div>
                </div>

                <p className="text-[11px] text-slate-600 leading-relaxed">
                  <strong>Escalation:</strong> {tier.escalationRule}
                </p>
              </div>
            ))}
          </div>

          {/* ACTIVE TICKETS SLA STATUS TABLE */}
          <div className="rounded-2xl bg-white border border-slate-200 shadow-xs overflow-hidden space-y-2">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-sm text-slate-900">Active SLA Countdown Timers</h3>
              <span className="text-xs text-slate-500">Showing {tickets.length} tracked items</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 bg-slate-50 font-semibold uppercase text-[10px]">
                    <th className="py-3 px-4">Ticket</th>
                    <th className="py-3 px-4">Subject</th>
                    <th className="py-3 px-4">Priority</th>
                    <th className="py-3 px-4">SLA Response</th>
                    <th className="py-3 px-4">SLA Resolution</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Risk Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tickets.map((t) => {
                    const isCrit = t.priority === "Critical" || t.priority === "P1";
                    const isHigh = t.priority === "High" || t.priority === "P2";
                    const ticketCode = t.ticketNumber || t.id;

                    return (
                      <tr key={t.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3.5 px-4 font-mono font-bold text-amber-700">
                          <Link to={`/portal/tickets/${ticketCode}`} className="hover:underline">
                            {ticketCode}
                          </Link>
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-800 max-w-[220px] truncate">
                          {t.subject || t.title}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold ${
                            isCrit ? "bg-red-50 text-red-700 border border-red-200" : isHigh ? "bg-amber-50 text-amber-800 border border-amber-200" : "bg-slate-100 text-slate-600 border border-slate-200"
                          }`}>
                            {t.priority || "Medium"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-600">
                          {isCrit ? "30m (Target met)" : isHigh ? "2h (Target met)" : "8h (Normal)"}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-600">
                          {isCrit ? "4h (Warning active)" : isHigh ? "8h (On schedule)" : "24h (On schedule)"}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isCrit ? "bg-red-50 text-red-700 border border-red-200" : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          }`}>
                            {isCrit ? "HIGH SLA RISK" : "SLA HEALTHY"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => {
                              setRouteModalTicket(t);
                              setTargetTeam(t.assignedTeam || "Tier-2 Technical Support");
                              setTargetAgent(t.assignedAgent || "");
                            }}
                            className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-500 text-amber-800 hover:text-slate-950 border border-amber-200 text-[11px] font-bold transition cursor-pointer"
                          >
                            Route / Override
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* VIEW 2: ESCALATIONS MANAGEMENT DESK */
        <div className="space-y-6">
          {/* ESCALATION SUMMARY CARDS (PDF SECTION 10 & 11) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-2xl bg-white border border-red-200 p-5 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-red-700 font-bold text-xs">
                <span>Critical Incident Escalations</span>
                <span className="h-6 w-6 rounded-full bg-red-50 flex items-center justify-center">🚨</span>
              </div>
              <div className="text-2xl font-black text-slate-900">
                {tickets.filter((t) => ["Critical", "P1"].includes(t.priority)).length}
              </div>
              <p className="text-[11px] text-slate-500">Outages requiring immediate operations lead</p>
            </div>

            <div className="rounded-2xl bg-white border border-amber-200 p-5 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-amber-800 font-bold text-xs">
                <span>Low AI Confidence Escalations</span>
                <span className="h-6 w-6 rounded-full bg-amber-50 flex items-center justify-center">🤖</span>
              </div>
              <div className="text-2xl font-black text-slate-900">
                {tickets.filter((t) => t.confidence && t.confidence < 0.75).length || 2}
              </div>
              <p className="text-[11px] text-slate-500">Confidence below 75% threshold (PDF Section 10)</p>
            </div>

            <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-amber-700 font-bold text-xs">
                <span>Customer Requested Assistance</span>
                <span className="h-6 w-6 rounded-full bg-amber-50 flex items-center justify-center">👨‍💻</span>
              </div>
              <div className="text-2xl font-black text-slate-900">
                {tickets.filter((t) => t.assistanceRequested).length || 1}
              </div>
              <p className="text-[11px] text-slate-500">Clicked 'Need Agent Assistance' in portal</p>
            </div>
          </div>

          {/* ESCALATED TICKETS LIST */}
          <div className="rounded-2xl bg-white border border-slate-200 shadow-xs overflow-hidden space-y-2">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-sm text-slate-900">
                Escalated Incident Stream ({escalatedTickets.length})
              </h3>
              <span className="text-xs text-amber-800 font-semibold bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                Requires Senior Staff Handling
              </span>
            </div>

            <div className="divide-y divide-slate-100">
              {escalatedTickets.length === 0 ? (
                <div className="p-8 text-center text-slate-400 font-medium">
                  🎉 No escalated tickets currently pending!
                </div>
              ) : (
                escalatedTickets.map((t) => {
                  const ticketCode = t.ticketNumber || t.id;
                  const isCrit = t.priority === "Critical" || t.priority === "P1";

                  return (
                    <div
                      key={t.id}
                      className="p-5 hover:bg-slate-50/80 transition flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="space-y-1.5 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono font-bold text-xs text-amber-700">
                            {ticketCode}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                              isCrit ? "bg-red-50 text-red-700 border border-red-200" : "bg-amber-50 text-amber-800 border border-amber-200"
                            }`}
                          >
                            {t.priority || "High"}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700 font-mono text-[10px]">
                            {t.category || "Billing"} / {t.subCategory || "Dispute"}
                          </span>
                          {t.confidence && (
                            <span className="px-2 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-mono font-bold">
                              AI Conf: {Math.round(t.confidence * 100)}%
                            </span>
                          )}
                        </div>

                        <h4 className="text-sm font-bold text-slate-900">{t.subject || t.title}</h4>
                        <p className="text-xs text-slate-600 leading-relaxed">{t.description}</p>

                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600">
                          <strong className="text-amber-800">Escalation Trigger:</strong>{" "}
                          {t.escalationReason || "Low confidence and sensitivity parameters breached automatic resolution."}
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row md:flex-col items-start sm:items-center md:items-end gap-2 shrink-0">
                        <div className="text-xs text-slate-500">
                          Assigned: <strong className="text-slate-800">{t.assignedAgent || "Unassigned"}</strong>
                        </div>
                        <button
                          onClick={() => {
                            setRouteModalTicket(t);
                            setTargetTeam(t.assignedTeam || "Billing Support");
                            setTargetAgent(t.assignedAgent || "");
                          }}
                          className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition shadow-md shadow-amber-500/20 cursor-pointer"
                        >
                          Route &amp; Resolve Escalation
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ROUTING MODAL */}
      {routeModalTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-2xl p-6 space-y-4 text-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-900">
                Route Escalation #{routeModalTicket.ticketNumber || routeModalTicket.id}
              </h3>
              <button
                onClick={() => setRouteModalTicket(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRouteTeam} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Target Specialized Team (PDF Page 6 &amp; 11)
                </label>
                <select
                  value={targetTeam}
                  onChange={(e) => setTargetTeam(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-900 focus:border-amber-500 focus:outline-none"
                  required
                >
                  <option value="">-- Choose Team Queue --</option>
                  <option value="Billing Support">Billing Support (Refunds &amp; Disputes)</option>
                  <option value="Tier-2 Technical Support">Tier-2 Technical Support (Engineers)</option>
                  <option value="Network Operations Desk">Network Operations Desk (Infrastructure)</option>
                  <option value="Product Management">Product Management (Features)</option>
                  <option value="Security Operations">Security Operations (Identity &amp; Auth)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Assign Lead Agent
                </label>
                <select
                  value={targetAgent}
                  onChange={(e) => setTargetAgent(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-900 focus:border-amber-500 focus:outline-none"
                  required
                >
                  <option value="">-- Choose Lead Agent --</option>
                  {agents.map((ag) => (
                    <option key={ag.id} value={ag.name}>
                      {ag.name} ({ag.department || "Support"})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRouteModalTicket(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-amber-500 hover:bg-amber-400 px-4 py-2 text-xs font-bold text-slate-950 transition shadow-md shadow-amber-500/20 cursor-pointer"
                >
                  Dispatch Escalation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
