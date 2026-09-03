import { useEffect, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getAllTickets } from "../../services/ticketService";

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
    const slaRisk = tickets.filter((t) => t.priority === "Critical" || t.priority === "P1" || t.priority === "High");
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
    { to: "/manager", icon: "▦", label: "Dashboard", badge: null },
    { to: "/manager/tickets", icon: "▤", label: "All Tickets", badge: stats.all },
    { to: "/manager/queue", icon: "⏳", label: "Ticket Queue", badge: stats.open },
    { to: "/manager/assignment", icon: "👥", label: "Agent Assignment", badge: null },
    { to: "/manager/escalations", icon: "🚨", label: "Escalations", badge: stats.escalated || null },
    { to: "/manager/sla", icon: "⏱", label: "SLA Management", badge: stats.slaRisk || null },
    { to: "/manager/agent-performance", icon: "📈", label: "Agent Performance", badge: null },
    { to: "/manager/ai-performance", icon: "🤖", label: "AI Performance", badge: null },
    { to: "/manager/reports", icon: "📊", label: "Reports", badge: null },
    { to: "/manager/notifications", icon: "🔔", label: "Notifications", badge: stats.escalated > 0 ? "!" : null },
    { to: "/manager/profile", icon: "👤", label: "Profile", badge: null },
  ];

  const currentItem = navItems.find((item) => item.to === location.pathname) || navItems[0];
  const displayName = user?.name || user?.username || "Support Manager";
  const userInitials = initials(displayName);

  return (
    <div className="sp-manager-shell">
      {/* SIDEBAR NAVIGATION (Warm Amber & Deep Navy) */}
      <aside className="sp-manager-sidebar">
        <Link to="/manager" className="sp-sidebar-logo">
          <span className="sp-logo-mark">SP</span>
          <span>
            <span className="sp-logo-name">SupportPilot</span>
            <span className="sp-sidebar-sub">OPERATIONS &amp; SLA DESK</span>
          </span>
        </Link>

        <nav className="sp-sidebar-nav">
          <div className="sp-nav-heading">Supervision &amp; SLA</div>
          {navItems.map((item) => (
            <NavLink
              end={item.to === "/manager"}
              key={item.to}
              to={item.to}
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
              {item.badge !== null && item.badge !== undefined && (
                <span className="sp-sidebar-count">{item.badge}</span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="sp-sidebar-footer">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="sp-avatar sp-manager-avatar" title={displayName}>
                {userInitials}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-white truncate">{displayName}</div>
                <div className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">Operations Lead</div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Logout"
              className="text-slate-400 hover:text-red-400 text-xs font-bold transition cursor-pointer p-1"
            >
              ⎋
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="sp-agent-main">
        {/* Top Header */}
        <header className="sp-manager-topbar">
          <div>
            <div className="sp-breadcrumb">Operations Command / Support Manager</div>
            <h1>{currentItem.label}</h1>
          </div>

          <div className="flex items-center gap-3">
            {stats.escalated > 0 && (
              <Link
                to="/manager/escalations"
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 border border-red-200 text-red-700 text-xs font-bold shadow-2xs animate-pulse"
              >
                <span>🚨</span>
                <span>{stats.escalated} Escalation{stats.escalated > 1 ? "s" : ""}</span>
              </Link>
            )}

            <Link
              to="/manager/sla"
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold shadow-2xs"
            >
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
              <span>SLA Shield Active</span>
            </Link>

            <button
              onClick={handleLogout}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition cursor-pointer shadow-2xs"
            >
              Logout
            </button>

            <div className="sp-avatar sp-manager-avatar" title={displayName}>
              {userInitials}
            </div>
          </div>
        </header>

        {/* Inner Content */}
        <div className="sp-content space-y-6">
          {children}
        </div>
      </main>
    </div>
  );
}
