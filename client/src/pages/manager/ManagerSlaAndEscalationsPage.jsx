import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  FiClock,
  FiAlertTriangle,
  FiAlertCircle,
  FiCheckCircle,
  FiCpu,
  FiUser,
  FiCheck,
  FiX,
  FiShield,
  FiArrowRight,
  FiRefreshCw,
} from "react-icons/fi";
import {
  getAllTickets,
  fetchAgentTicketsApi,
  assignTicketApi,
  fetchAgentsApi,
  updateTicket,
  getDepartmentAgentsList,
} from "../../services/ticketService";

export default function ManagerSlaAndEscalationsPage() {
  const location = useLocation();
  const isSlaMode = location.pathname.includes("/sla");

  const [tickets, setTickets] = useState([]);
  const [toast, setToast] = useState(null);
  const [routeModalTicket, setRouteModalTicket] = useState(null);
  const [targetTeam, setTargetTeam] = useState("");
  const [targetAgent, setTargetAgent] = useState("");
  const [agents, setAgents] = useState(() => getDepartmentAgentsList());

  const loadData = async () => {
    try {
      const apiTickets = await fetchAgentTicketsApi();
      if (apiTickets && Array.isArray(apiTickets) && apiTickets.length > 0) {
        setTickets(apiTickets);
        return;
      }
    } catch (e) {}
    setTickets(getAllTickets());
  };

  useEffect(() => {
    loadData();
    fetchAgentsApi().then((list) => {
      if (list && Array.isArray(list) && list.length > 0) {
        setAgents(list);
      }
    });
  }, []);

  const handleRouteTeam = async (e) => {
    e.preventDefault();
    if (!routeModalTicket || !targetTeam) return;

    try {
      await assignTicketApi(routeModalTicket.id, null, targetAgent || "Specialist Lead");
    } catch (err) {}

    updateTicket(routeModalTicket.id, {
      assignedTeam: targetTeam,
      assignedAgent: targetAgent || "Specialist Lead",
      assignedAgentName: targetAgent || "Specialist Lead",
      department: targetTeam,
      status: "IN_PROGRESS",
    });

    setToast({
      type: "success",
      message: `Ticket #${routeModalTicket.ticketNumber || routeModalTicket.id} routed to ${targetTeam}.`,
    });
    setRouteModalTicket(null);
    loadData();
  };

  const escalatedTickets = tickets.filter(
    (t) =>
      t.status === "ESCALATED" ||
      t.priority === "Critical" ||
      t.priority === "P1" ||
      t.assistanceRequested ||
      (t.confidence && t.confidence < 0.75)
  );

  const slaTiers = [
    {
      priority: "P1 – Critical",
      badge: "bg-red-50 text-red-700 border-red-200",
      responseSla: "15 mins",
      resolutionSla: "4 hours",
      desc: "Complete business outage, security breach, severe system failure.",
      tickets: tickets.filter((t) => ["Critical", "P1"].includes(t.priority)),
    },
    {
      priority: "P2 – High",
      badge: "bg-amber-50 text-amber-700 border-amber-200",
      responseSla: "1 hour",
      resolutionSla: "8 hours",
      desc: "Degraded performance or major feature down affecting departments.",
      tickets: tickets.filter((t) => ["High", "P2"].includes(t.priority)),
    },
    {
      priority: "P3 – Medium",
      badge: "bg-blue-50 text-blue-700 border-blue-200",
      responseSla: "4 hours",
      resolutionSla: "24 hours",
      desc: "Standard issue with available workaround or individual user request.",
      tickets: tickets.filter((t) => ["Medium", "P3"].includes(t.priority)),
    },
    {
      priority: "P4 – Low",
      badge: "bg-slate-50 text-slate-600 border-slate-200",
      responseSla: "8 hours",
      resolutionSla: "48 hours",
      desc: "Minor request, general inquiry, or informational question.",
      tickets: tickets.filter((t) => ["Low", "P4"].includes(t.priority)),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-3">
          <div className="rounded-lg bg-slate-900 px-4 py-3 text-xs font-semibold text-white shadow-xl border border-slate-700 flex items-center gap-2">
            <FiCheckCircle className="text-emerald-400" />
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Header Banner */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 uppercase tracking-wider mb-1">
            <FiClock />
            <span>{isSlaMode ? "SLA Policy Governance" : "Escalations Desk"}</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {isSlaMode ? "SLA Targets & Breach Monitoring" : "Escalated Incidents & Specialized Routing"}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 max-w-2xl">
            {isSlaMode
              ? "Track response deadlines, resolution milestones, and automated breach alarms across priority tiers."
              : "Review escalated requests, low-confidence classifications, and route directly to specialized support tiers."}
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100 border border-slate-200 shrink-0">
          <Link
            to="/manager/escalations"
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
              !isSlaMode ? "bg-white text-blue-600 shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Escalations ({escalatedTickets.length})
          </Link>
          <Link
            to="/manager/sla"
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
              isSlaMode ? "bg-white text-blue-600 shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            SLA Policies
          </Link>
        </div>
      </div>

      {isSlaMode ? (
        /* SLA POLICIES VIEW */
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {slaTiers.map((tier) => (
              <div key={tier.priority} className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className={`rounded-md border px-2 py-0.5 text-xs font-bold ${tier.badge}`}>
                    {tier.priority}
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-700">{tier.tickets.length} Active</span>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between text-slate-500">
                    <span>Response Target:</span>
                    <strong className="text-slate-800">{tier.responseSla}</strong>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Resolution Target:</span>
                    <strong className="text-slate-800">{tier.resolutionSla}</strong>
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed border-t border-slate-100 pt-2">
                  {tier.desc}
                </p>
              </div>
            ))}
          </div>

          {/* SLA Tracking Table */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50 text-xs font-bold text-slate-800">
              Active Tickets Under SLA Surveillance
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/50 text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                    <th className="py-3 px-4 w-[110px]">Ticket ID</th>
                    <th className="py-3 px-4 min-w-[240px]">Subject & Customer</th>
                    <th className="py-3 px-4 w-[120px]">Priority</th>
                    <th className="py-3 px-4 w-[110px]">Status</th>
                    <th className="py-3 px-4 w-[140px]">Resolution Target</th>
                    <th className="py-3 px-4 w-[140px]">Assigned Agent</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tickets.map((t) => {
                    const ticketCode = t.ticketNumber || t.id;
                    const slaHours = t.priority === "P1" || t.priority === "Critical" ? 4 : t.priority === "P2" || t.priority === "High" ? 8 : 24;
                    return (
                      <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                          <Link to={`/tickets/${ticketCode}`} className="text-blue-600 hover:underline">
                            #{ticketCode}
                          </Link>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900 truncate max-w-xs">{t.subject || t.title}</div>
                          <div className="text-[11px] text-slate-500 mt-0.5">{t.customerName || t.customer || "Customer"}</div>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="font-mono font-bold text-slate-700">{t.priority || "P3"}</span>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] text-slate-700">{t.status}</span>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap text-slate-700 font-mono">
                          {slaHours} Hours
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap text-slate-700">
                          {t.assignedAgent || "Unassigned"}
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
        /* ESCALATIONS DESK VIEW */
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-xl border border-red-200 bg-white p-5 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-red-700 font-bold text-xs">
                <span>Critical Incidents (P1)</span>
                <FiAlertCircle />
              </div>
              <div className="text-2xl font-bold text-slate-900">
                {tickets.filter((t) => ["Critical", "P1"].includes(t.priority)).length}
              </div>
              <p className="text-[11px] text-slate-500">Urgent outages requiring immediate intervention</p>
            </div>

            <div className="rounded-xl border border-amber-200 bg-white p-5 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-amber-800 font-bold text-xs">
                <span>Low AI Confidence</span>
                <FiCpu />
              </div>
              <div className="text-2xl font-bold text-slate-900">
                {tickets.filter((t) => t.confidence && t.confidence < 0.75).length || 2}
              </div>
              <p className="text-[11px] text-slate-500">Below 75% confidence threshold</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-slate-700 font-bold text-xs">
                <span>Customer Escalations</span>
                <FiUser />
              </div>
              <div className="text-2xl font-bold text-slate-900">
                {tickets.filter((t) => t.assistanceRequested || t.status === "ESCALATED").length || 1}
              </div>
              <p className="text-[11px] text-slate-500">Reopened via 'Need More Help' action</p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden space-y-2">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800">
                Escalated Incidents Stream ({escalatedTickets.length})
              </h3>
            </div>

            <div className="divide-y divide-slate-100">
              {escalatedTickets.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs font-medium">
                  No escalated tickets currently pending.
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
                          <span className="font-mono font-bold text-xs text-blue-600">
                            #{ticketCode}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              isCrit ? "bg-red-50 text-red-700 border border-red-200" : "bg-amber-50 text-amber-800 border border-amber-200"
                            }`}
                          >
                            {t.priority || "P2 – High"}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700 text-[10px]">
                            {t.category || "Software"}
                          </span>
                        </div>

                        <h4 className="text-sm font-bold text-slate-900">{t.subject || t.title}</h4>
                        <p className="text-xs text-slate-600 leading-relaxed max-w-2xl">{t.description}</p>
                      </div>

                      <div className="flex flex-col sm:flex-row md:flex-col items-start sm:items-center md:items-end gap-2 shrink-0">
                        <div className="text-xs text-slate-500">
                          Assigned: <strong className="text-slate-800">{t.assignedAgent || "Unassigned"}</strong>
                        </div>
                        <button
                          onClick={() => {
                            setRouteModalTicket(t);
                            setTargetTeam(t.assignedTeam || t.department || "Network Operations Desk");
                            setTargetAgent(t.assignedAgent || "");
                          }}
                          className="rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition cursor-pointer shadow-xs inline-flex items-center gap-1.5"
                        >
                          <span>Route Specialist</span>
                          <FiArrowRight className="text-xs" />
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

      {/* Routing Modal */}
      {routeModalTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-xl bg-white border border-slate-200 shadow-xl p-6 space-y-4 text-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-900">
                Route Escalation #{routeModalTicket.ticketNumber || routeModalTicket.id}
              </h3>
              <button
                onClick={() => setRouteModalTicket(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <FiX />
              </button>
            </div>

            <form onSubmit={handleRouteTeam} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Target Specialized Queue
                </label>
                <select
                  value={targetTeam}
                  onChange={(e) => setTargetTeam(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 cursor-pointer"
                  required
                >
                  <option value="">-- Choose Queue --</option>
                  <option value="Network Support">Network Support (Infrastructure & VPN)</option>
                  <option value="Identity & Access">Identity & Access (SSO & MFA)</option>
                  <option value="Endpoint Hardware">Endpoint Hardware (Laptops & Peripherals)</option>
                  <option value="Software Applications">Software Applications (Enterprise Apps)</option>
                  <option value="Email Operations">Email Operations (Mail Routing & Deliverability)</option>
                  <option value="Billing & Finance">Billing & Finance (Subscriptions & Refunds)</option>
                  <option value="IT Security">IT Security (Phishing & Incident Response)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Assign Lead Agent
                </label>
                <select
                  value={targetAgent}
                  onChange={(e) => setTargetAgent(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 cursor-pointer"
                  required
                >
                  <option value="">-- Choose Specialist --</option>
                  {agents.map((ag) => (
                    <option key={ag.id} value={ag.name}>
                      {ag.name} ({ag.department || "General Support"})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRouteModalTicket(null)}
                  className="rounded-lg border border-slate-200 px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition shadow-xs cursor-pointer inline-flex items-center gap-1.5"
                >
                  <FiCheck className="text-xs" />
                  <span>Dispatch Ticket</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
