import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  FiActivity,
  FiCpu,
  FiBarChart2,
  FiBell,
  FiUser,
  FiDownload,
  FiAlertCircle,
  FiCheckCircle,
  FiInfo,
  FiZap,
} from "react-icons/fi";
import { useAuth } from "../../context/AuthContext";
import { getAllTickets, getDepartmentAgentsList } from "../../services/ticketService";

export default function ManagerAnalyticsPages() {
  const location = useLocation();
  const { user } = useAuth();
  const [toast, setToast] = useState(null);

  const isAgentPerf = location.pathname.includes("/agent-performance");
  const isAiPerf = location.pathname.includes("/ai-performance");
  const isReports = location.pathname.includes("/reports");
  const isNotifications = location.pathname.includes("/notifications");
  const isProfile = location.pathname.includes("/profile");

  const tickets = getAllTickets();
  const agents = getDepartmentAgentsList();

  const totalTickets = tickets.length;
  const resolved = tickets.filter((t) => ["RESOLVED", "Resolved", "CLOSED", "Closed"].includes(t.status)).length;
  const escalated = tickets.filter((t) => t.status === "ESCALATED" || t.assistanceRequested).length;

  const notificationsList = [
    {
      id: 1,
      title: "SLA Threshold Warning",
      time: "10 mins ago",
      desc: "Ticket #1002 (VPN Gateway Error) is within 1 hour of SLA breach.",
      type: "critical",
      link: "/manager/queue",
    },
    {
      id: 2,
      title: "Agent Reassignment Recorded",
      time: "25 mins ago",
      desc: "Manager assigned 2 incoming technical tickets to specialized agents.",
      type: "info",
      link: "/manager/assignment",
    },
    {
      id: 3,
      title: "AI Knowledge Base Sync",
      time: "1 hour ago",
      desc: "Knowledge embeddings synchronized across 7 categories.",
      type: "success",
      link: "/manager/ai-performance",
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

      {/* Title Bar */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 uppercase tracking-wider mb-1">
            {isAgentPerf ? (
              <FiActivity />
            ) : isAiPerf ? (
              <FiCpu />
            ) : isReports ? (
              <FiBarChart2 />
            ) : isNotifications ? (
              <FiBell />
            ) : (
              <FiUser />
            )}
            <span>
              {isAgentPerf
                ? "Agent Productivity & KPI Metrics"
                : isAiPerf
                ? "AI Engine & RAG Performance"
                : isReports
                ? "Executive Operations Reports"
                : isNotifications
                ? "Manager Notification Stream"
                : "Manager Profile"}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {isAgentPerf
              ? "Support Agent Performance"
              : isAiPerf
              ? "AI Accuracy & Grounded RAG Metrics"
              : isReports
              ? "Operations Analytics & Exports"
              : isNotifications
              ? "Operational Alerts & Activity Feed"
              : "Account Details"}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Operational analytics and governance tools for support management.
          </p>
        </div>

        {/* Quick Nav Tabs */}
        <div className="flex flex-wrap gap-1 p-1 rounded-lg bg-slate-100 border border-slate-200">
          <Link
            to="/manager/agent-performance"
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
              isAgentPerf ? "bg-white text-blue-600 shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Agents
          </Link>
          <Link
            to="/manager/ai-performance"
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
              isAiPerf ? "bg-white text-blue-600 shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            AI Engine
          </Link>
          <Link
            to="/manager/reports"
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
              isReports ? "bg-white text-blue-600 shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Reports
          </Link>
          <Link
            to="/manager/notifications"
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
              isNotifications ? "bg-white text-blue-600 shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Alerts
          </Link>
          <Link
            to="/manager/profile"
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
              isProfile ? "bg-white text-blue-600 shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Profile
          </Link>
        </div>
      </div>

      {/* 1. AGENT PERFORMANCE VIEW */}
      {isAgentPerf && (
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50 text-xs font-bold text-slate-800">
              Department Specialist Performance Matrix
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/50 text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                    <th className="py-3 px-4">Agent Name</th>
                    <th className="py-3 px-4">Department</th>
                    <th className="py-3 px-4">Working Status</th>
                    <th className="py-3 px-4">Active Tickets</th>
                    <th className="py-3 px-4">Completed</th>
                    <th className="py-3 px-4">SLA Adherence</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {agents.map((ag) => {
                    const agTickets = tickets.filter(
                      (t) =>
                        (t.assignedAgent && t.assignedAgent.toLowerCase().includes((ag.name || "").toLowerCase())) ||
                        t.assignedTo === ag.id ||
                        t.assigned_to === ag.id
                    );
                    const active = agTickets.filter((t) => !["RESOLVED", "Resolved", "CLOSED", "Closed"].includes(t.status)).length;
                    const comp = agTickets.filter((t) => ["RESOLVED", "Resolved", "CLOSED", "Closed"].includes(t.status)).length;
                    const avail = ag.availability_status || ag.availabilityStatus || "AVAILABLE";

                    return (
                      <tr key={ag.id || ag.email} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-semibold text-slate-900">{ag.name || ag.username}</td>
                        <td className="py-3 px-4 text-slate-600">{ag.department || "General Support"}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              avail === "AVAILABLE"
                                ? "bg-emerald-50 text-emerald-700"
                                : avail === "BUSY"
                                ? "bg-amber-50 text-amber-700"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                avail === "AVAILABLE" ? "bg-emerald-500" : avail === "BUSY" ? "bg-amber-500" : "bg-slate-400"
                              }`}
                            />
                            <span>{avail}</span>
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-800">{active}</td>
                        <td className="py-3 px-4 font-mono text-emerald-700 font-bold">{comp}</td>
                        <td className="py-3 px-4 font-mono text-slate-700 font-semibold">98.5%</td>
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
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-2">
              <span className="text-xs font-medium text-slate-500">Auto-Classification Accuracy</span>
              <div className="text-2xl font-bold text-blue-600">96.4%</div>
              <p className="text-[11px] text-slate-500">Evaluated against Master Data taxonomy</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-2">
              <span className="text-xs font-medium text-slate-500">RAG Knowledge Retrieval Rate</span>
              <div className="text-2xl font-bold text-emerald-600">94.1%</div>
              <p className="text-[11px] text-slate-500">Top-3 grounded knowledge citations</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-2">
              <span className="text-xs font-medium text-slate-500">Auto-Resolution Rate</span>
              <div className="text-2xl font-bold text-indigo-600">38.2%</div>
              <p className="text-[11px] text-slate-500">Solved without agent escalation</p>
            </div>
          </div>
        </div>
      )}

      {/* 3. REPORTS VIEW */}
      {isReports && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Operational SLA & Performance Reports</h2>
              <p className="text-xs text-slate-500">Export audited metric snapshots</p>
            </div>
            <button
              onClick={() => setToast({ type: "success", message: "SLA compliance report downloaded." })}
              className="rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition cursor-pointer inline-flex items-center gap-1.5 shadow-xs"
            >
              <FiDownload className="text-xs" />
              <span>Export Report</span>
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-3 pt-3 border-t border-slate-100">
            <div className="rounded-lg bg-slate-50 border border-slate-200 p-4 space-y-1">
              <span className="text-slate-500 text-xs font-medium">Total Ingested Tickets</span>
              <div className="text-2xl font-bold text-slate-900">{totalTickets}</div>
            </div>
            <div className="rounded-lg bg-slate-50 border border-slate-200 p-4 space-y-1">
              <span className="text-slate-500 text-xs font-medium">SLA Compliance Rate</span>
              <div className="text-2xl font-bold text-emerald-600">98.2%</div>
            </div>
            <div className="rounded-lg bg-slate-50 border border-slate-200 p-4 space-y-1">
              <span className="text-slate-500 text-xs font-medium">Handled Escalations</span>
              <div className="text-2xl font-bold text-blue-600">{escalated}</div>
            </div>
          </div>
        </div>
      )}

      {/* 4. NOTIFICATIONS VIEW */}
      {isNotifications && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden divide-y divide-slate-100">
          {notificationsList.map((n) => (
            <div key={n.id} className="p-4 hover:bg-slate-50/80 transition flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 text-slate-500">
                  {n.type === "critical" ? (
                    <FiAlertCircle className="text-red-500" />
                  ) : n.type === "success" ? (
                    <FiCheckCircle className="text-emerald-500" />
                  ) : (
                    <FiInfo className="text-blue-500" />
                  )}
                </span>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">{n.title}</h3>
                  <p className="text-xs text-slate-600 mt-0.5">{n.desc}</p>
                  <span className="text-[10px] text-slate-400 font-mono mt-1 block">{n.time}</span>
                </div>
              </div>

              <Link
                to={n.link}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                View
              </Link>
            </div>
          ))}
        </div>
      )}

      {/* 5. PROFILE VIEW */}
      {isProfile && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs max-w-xl space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
            <div className="h-10 w-10 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-sm">
              {user?.name ? user.name.charAt(0).toUpperCase() : "M"}
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">{user?.name || "Support Manager"}</h2>
              <p className="text-xs text-slate-500">{user?.email || "manager@example.com"}</p>
            </div>
          </div>
          <div className="space-y-2 text-xs text-slate-600">
            <div className="flex justify-between">
              <span className="text-slate-500">Role:</span>
              <strong className="text-slate-800">Support Operations Manager</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Assigned Department:</span>
              <strong className="text-slate-800">{user?.department || "Operations"}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Portal Privileges:</span>
              <strong className="text-emerald-700 font-semibold">Full Triage, Queue Balancing & Reassignment</strong>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
