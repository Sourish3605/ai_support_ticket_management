import { useEffect, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getAllTickets } from "../../services/ticketService";
import {
  FiHome,
  FiList,
  FiClock,
  FiUsers,
  FiAlertCircle,
  FiTrendingUp,
  FiCpu,
  FiBarChart2,
  FiBell,
  FiUser,
  FiLogOut,
  FiShield,
} from "react-icons/fi";

function initials(name) {
  if (!name) return "SM";
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : parts[0].slice(0, 2).toUpperCase();
}

export default function ManagerLayout({ children }) {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [stats, setStats] = useState({
    all: 0,
    open: 0,
    escalated: 0,
    slaRisk: 0,
  });

  useEffect(() => {
    const tickets = getAllTickets();
    const open = tickets.filter((t) => !["Resolved", "RESOLVED", "Closed", "CLOSED"].includes(t.status));
    const escalated = tickets.filter((t) => ["ESCALATED", "Escalated"].includes(t.status));
    const slaRisk = tickets.filter((t) => t.priority === "Critical" || t.priority === "P1" || t.priority === "High" || t.priority === "P2");
    setStats({
      all: tickets.length,
      open: open.length,
      escalated: escalated.length,
      slaRisk: slaRisk.length,
    });
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const navItems = [
    { to: "/manager", icon: FiHome, label: "Dashboard", badge: null },
    { to: "/manager/tickets", icon: FiList, label: "All Tickets", badge: stats.all },
    { to: "/manager/queue", icon: FiClock, label: "Ticket Queue", badge: stats.open },
    { to: "/manager/assignment", icon: FiUsers, label: "Agent Assignment", badge: null },
    { to: "/manager/escalations", icon: FiAlertCircle, label: "Escalations", badge: stats.escalated || null },
    { to: "/manager/sla", icon: FiShield, label: "SLA Management", badge: stats.slaRisk || null },
    { to: "/manager/agent-performance", icon: FiTrendingUp, label: "Agent Performance", badge: null },
    { to: "/manager/ai-performance", icon: FiCpu, label: "AI Performance", badge: null },
    { to: "/manager/reports", icon: FiBarChart2, label: "Reports", badge: null },
    { to: "/manager/notifications", icon: FiBell, label: "Notifications", badge: stats.escalated > 0 ? stats.escalated : null },
    { to: "/manager/profile", icon: FiUser, label: "Profile", badge: null },
  ];

  const currentItem = navItems.find((item) => item.to === location.pathname) || navItems[0];
  const displayName = user?.name || user?.username || "Support Manager";
  const userInitials = initials(displayName);

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      {/* SIDEBAR NAVIGATION */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0 fixed inset-y-0 left-0 z-30 shadow-xs">
        {/* LOGO */}
        <div className="p-5 border-b border-slate-100 flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-blue-600 text-white font-bold flex items-center justify-center text-xs tracking-wider shadow-xs">
            SP
          </div>
          <div>
            <div className="text-sm font-bold text-slate-900 leading-tight">SupportPilot</div>
            <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Manager Desk</div>
          </div>
        </div>

        {/* NAVIGATION */}
        <nav className="p-3 flex-1 space-y-1 overflow-y-auto">
          <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Supervision &amp; SLA
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                end={item.to === "/manager"}
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    isActive
                      ? "bg-blue-600 text-white shadow-xs"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`
                }
              >
                <div className="flex items-center gap-2.5 truncate">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </div>
                {item.badge !== null && item.badge !== undefined && (
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                    item.to.includes("escalations") ? "bg-red-50 text-red-700 border border-red-200" : "bg-slate-100 text-slate-700"
                  }`}>
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* FOOTER */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-8 w-8 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
              {userInitials}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-900 truncate">{displayName}</div>
              <div className="text-[10px] font-semibold text-blue-600">Support Manager</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="Sign Out"
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
          >
            <FiLogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 ml-64 flex flex-col min-h-screen">
        {/* TOP BAR */}
        <header className="h-16 border-b border-slate-200 bg-white px-8 flex items-center justify-between sticky top-0 z-20 shadow-xs">
          <div>
            <div className="text-[11px] font-medium text-slate-400">Operations Command / Support Manager</div>
            <h1 className="text-base font-bold text-slate-900">{currentItem.label}</h1>
          </div>

          <div className="flex items-center gap-3">
            {stats.escalated > 0 && (
              <Link
                to="/manager/escalations"
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 border border-red-200 text-red-700 text-xs font-semibold"
              >
                <FiAlertCircle className="w-3.5 h-3.5" />
                <span>{stats.escalated} Escalation{stats.escalated > 1 ? "s" : ""}</span>
              </Link>
            )}

            <Link
              to="/manager/sla"
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold"
            >
              <FiShield className="w-3.5 h-3.5" />
              <span>SLA Tracking Active</span>
            </Link>

            <button
              onClick={handleLogout}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        </header>

        {/* BODY */}
        <main className="flex-1 p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
