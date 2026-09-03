import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getAllTickets } from "../../services/ticketService";
import { seedUsers } from "../../data/seedData";

export default function ManagerAnalyticsPages() {
  const { user } = useAuth();
  const location = useLocation();
  const [tickets, setTickets] = useState([]);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    setTickets(getAllTickets());
  }, [location.pathname]);

  const path = location.pathname;
  const isAgentPerf = path.includes("/agent-performance");
  const isAiPerf = path.includes("/ai-performance");
  const isReports = path.includes("/reports");
  const isNotifications = path.includes("/notifications");
  const isProfile = path.includes("/profile");

  const agents = seedUsers.filter((u) => ["Agent", "Support Agent", "Employee"].includes(u.role));

  const totalTickets = tickets.length || 7;
  const autoResolved = tickets.filter((t) => t.status === "AI_RESOLUTION_READY" || t.status === "RESOLVED").length;
  const escalated = tickets.filter((t) => ["ESCALATED", "Escalated"].includes(t.status)).length;
  const autoResolutionRate = Math.round((autoResolved / totalTickets) * 100) || 71;

  const notificationsList = [
    {
      id: "NOTIF-1",
      title: "SLA Warning: Critical Outage",
      time: "10 mins ago",
      desc: "Ticket TKT-1006 (Data missing from dashboard) is approaching 30m first response deadline.",
      type: "critical",
      link: "/portal/tickets/TKT-1006",
    },
    {
      id: "NOTIF-2",
      title: "Human Escalation: Duplicate Payment",
      time: "25 mins ago",
      desc: "Ticket TKT-1002 escalated to Billing Support due to low AI confidence (62%).",
      type: "escalation",
      link: "/portal/tickets/TKT-1002",
    },
    {
      id: "NOTIF-3",
      title: "AI Auto-Resolution Completed",
      time: "1 hour ago",
      desc: "Ticket TKT-1001 resolved with 94% confidence using Password Reset Guide (KB-ACC-001).",
      type: "success",
      link: "/portal/tickets/TKT-1001",
    },
    {
      id: "NOTIF-4",
      title: "Agent Workload Rebalanced",
      time: "2 hours ago",
      desc: "Manager assigned 2 incoming technical tickets to premalatha.",
      type: "info",
      link: "/manager/assignment",
    },
  ];

  return (
    <div className="space-y-6">
      {/* SECTION TITLE CARD */}
      <div className="rounded-2xl bg-white border border-slate-200 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-bold tracking-wide uppercase mb-2">
            <span>
              {isAgentPerf ? "📈" : isAiPerf ? "🤖" : isReports ? "📊" : isNotifications ? "🔔" : "👤"}
            </span>
            <span>
              {isAgentPerf
                ? "Agent Productivity & KPI Metrics"
                : isAiPerf
                ? "Milestone 1–3 AI Intelligence Metrics"
                : isReports
                ? "Operations & SLA Reports"
                : isNotifications
                ? "Manager Notification Stream"
                : "Manager Profile & Settings"}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            {isAgentPerf
              ? "Support Agent Performance & SLA Adherence"
              : isAiPerf
              ? "AI Accuracy, RAG Hits & Auto-Resolution"
              : isReports
              ? "Executive Operations Analytics & Logs"
              : isNotifications
              ? "Operational Alerts & Activity Feed"
              : "Supervisor Account Details"}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Governance and analytics tools designed for the Support Manager portal.
          </p>
        </div>

        {/* Quick Nav Bar */}
        <div className="flex flex-wrap gap-1.5 p-1 rounded-xl bg-slate-100 border border-slate-200">
          <Link
            to="/manager/agent-performance"
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              isAgentPerf ? "bg-amber-500 text-slate-950 font-bold shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Agents
          </Link>
          <Link
            to="/manager/ai-performance"
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              isAiPerf ? "bg-amber-500 text-slate-950 font-bold shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            AI Engine
          </Link>
          <Link
            to="/manager/reports"
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              isReports ? "bg-amber-500 text-slate-950 font-bold shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Reports
          </Link>
          <Link
            to="/manager/notifications"
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              isNotifications ? "bg-amber-500 text-slate-950 font-bold shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Alerts
          </Link>
          <Link
            to="/manager/profile"
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              isProfile ? "bg-amber-500 text-slate-950 font-bold shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Profile
          </Link>
        </div>
      </div>

      {/* 1. AGENT PERFORMANCE VIEW */}
      {isAgentPerf && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
              <span className="text-xs text-slate-500 font-semibold">Average Agent CSAT</span>
              <div className="text-3xl font-black text-emerald-600">96.4%</div>
              <p className="text-[11px] text-slate-400">Based on resolved tickets</p>
            </div>
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
              <span className="text-xs text-slate-500 font-semibold">SLA Adherence Rate</span>
              <div className="text-3xl font-black text-amber-600">98.1%</div>
              <p className="text-[11px] text-slate-400">Under Page 14 targets</p>
            </div>
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
              <span className="text-xs text-slate-500 font-semibold">Avg Agent Handling Time</span>
              <div className="text-3xl font-black text-slate-900">14.2 min</div>
              <p className="text-[11px] text-slate-400">Accelerated by AI suggestions</p>
            </div>
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
              <span className="text-xs text-slate-500 font-semibold">Active Support Engineers</span>
              <div className="text-3xl font-black text-slate-900">{agents.length}</div>
              <p className="text-[11px] text-slate-400">All shifts covered</p>
            </div>
          </div>

          <div className="rounded-2xl bg-white border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50">
              <h3 className="font-bold text-sm text-slate-900">Agent Productivity Breakdown</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 bg-slate-50 font-semibold uppercase text-[10px]">
                    <th className="py-3 px-4">Agent Name</th>
                    <th className="py-3 px-4">Department / Tier</th>
                    <th className="py-3 px-4">Assigned Active</th>
                    <th className="py-3 px-4">Resolved (30d)</th>
                    <th className="py-3 px-4">SLA Compliance</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {agents.map((ag) => {
                    const assignedCount = tickets.filter(
                      (t) =>
                        (t.assignedAgent === ag.name || t.assignedAgent === ag.email) &&
                        !["Resolved", "RESOLVED", "Closed", "CLOSED"].includes(t.status)
                    ).length;

                    return (
                      <tr key={ag.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3.5 px-4 font-bold text-slate-900 flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-emerald-500" />
                          <span>{ag.name}</span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600">{ag.department || "Technical Support"}</td>
                        <td className="py-3.5 px-4 font-mono font-bold text-amber-700">{assignedCount}</td>
                        <td className="py-3.5 px-4 font-mono text-slate-700">28</td>
                        <td className="py-3.5 px-4 font-mono text-emerald-600 font-bold">98.5%</td>
                        <td className="py-3.5 px-4">
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold">
                            Active Shift
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 2. AI PERFORMANCE VIEW */}
      {isAiPerf && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
              <span className="text-xs text-slate-500 font-semibold">Auto-Resolution Rate</span>
              <div className="text-3xl font-black text-amber-600">{autoResolutionRate}%</div>
              <p className="text-[11px] text-slate-400">Automated where safe (PDF Page 1)</p>
            </div>
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
              <span className="text-xs text-slate-500 font-semibold">Classification Accuracy</span>
              <div className="text-3xl font-black text-slate-900">96.8%</div>
              <p className="text-[11px] text-slate-400">M1 Category &amp; Subcategory</p>
            </div>
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
              <span className="text-xs text-slate-500 font-semibold">RAG Retrieval Precision</span>
              <div className="text-3xl font-black text-emerald-600">94.2%</div>
              <p className="text-[11px] text-slate-400">Relevant KB citations matched</p>
            </div>
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
              <span className="text-xs text-slate-500 font-semibold">Escalation Trigger Rate</span>
              <div className="text-3xl font-black text-orange-600">
                {Math.round((escalated / Math.max(1, totalTickets)) * 100)}%
              </div>
              <p className="text-[11px] text-slate-400">Safely routed to human tier</p>
            </div>
          </div>

          <div className="rounded-2xl bg-white border border-slate-200 p-6 shadow-xs space-y-4">
            <h3 className="font-bold text-sm text-slate-900">AI Agent Pipeline Health (Page 6 Architecture)</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <strong className="text-amber-800">Diagnosis Agent</strong>
                <p className="text-slate-600">Root cause extraction confidence: 95% avg.</p>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <strong className="text-amber-800">Knowledge Retrieval Agent</strong>
                <p className="text-slate-600">Dense vector similarity search with zero hallucinations.</p>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <strong className="text-emerald-700">Resolution Generation Agent</strong>
                <p className="text-slate-600">Step-by-step grounded troubleshooting output.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. REPORTS VIEW */}
      {isReports && (
        <div className="space-y-6">
          <div className="rounded-2xl bg-white border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-900">Operational SLA &amp; Performance Reports</h3>
                <p className="text-xs text-slate-500">Export audited metric snapshots for weekly business reviews</p>
              </div>
              <button
                onClick={() => setToast({ type: "success", message: "✓ SLA Compliance Report exported (PDF)." })}
                className="rounded-xl bg-amber-500 hover:bg-amber-400 px-4 py-2 text-xs font-bold text-slate-950 transition shadow-xs cursor-pointer"
              >
                📥 Export Weekly Report
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-slate-100">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-slate-500 text-xs font-semibold">Total Ingested Tickets</span>
                <div className="text-2xl font-bold text-slate-900">{totalTickets}</div>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-slate-500 text-xs font-semibold">SLA Compliance Rate</span>
                <div className="text-2xl font-bold text-emerald-600">97.8%</div>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-slate-500 text-xs font-semibold">Total Handled Escalations</span>
                <div className="text-2xl font-bold text-amber-700">{escalated}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. NOTIFICATIONS VIEW */}
      {isNotifications && (
        <div className="space-y-4">
          <div className="rounded-2xl bg-white border border-slate-200 shadow-xs overflow-hidden divide-y divide-slate-100">
            {notificationsList.map((n) => (
              <div key={n.id} className="p-5 hover:bg-slate-50/80 transition flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <span className="text-xl shrink-0">
                    {n.type === "critical" ? "🚨" : n.type === "escalation" ? "⚡" : n.type === "success" ? "✓" : "ℹ"}
                  </span>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">{n.title}</h4>
                    <p className="text-xs text-slate-600 mt-0.5">{n.desc}</p>
                    <span className="text-[10px] text-slate-400 font-mono mt-1 block">{n.time}</span>
                  </div>
                </div>

                <Link
                  to={n.link}
                  className="px-3 py-1 rounded-lg bg-amber-50 border border-amber-200 hover:bg-amber-500 text-amber-800 hover:text-slate-950 text-xs font-bold shrink-0 transition"
                >
                  View
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. PROFILE VIEW */}
      {isProfile && (
        <div className="rounded-2xl bg-white border border-slate-200 p-6 shadow-xs max-w-2xl space-y-6">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-2xl bg-amber-500 text-slate-950 font-black flex items-center justify-center text-xl shadow-md">
              SM
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">{user?.name || "Support Manager"}</h3>
              <p className="text-xs text-amber-700 font-semibold">Operations Supervisor &amp; SLA Governance</p>
              <p className="text-xs text-slate-500 mt-0.5">{user?.email || "manager@gmail.com"}</p>
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t border-slate-100 text-xs">
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500">Assigned Department:</span>
              <strong className="text-slate-900">Customer Support &amp; Escalations</strong>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500">Access Role:</span>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 font-bold">
                Support Manager
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500">Permissions:</span>
              <strong className="text-slate-900">SLA Management, Agent Reassignment, Escalations</strong>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500">Session Security:</span>
              <strong className="text-emerald-600">Active (JWT 2FA Authorized)</strong>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
