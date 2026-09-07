import { useEffect, useState } from "react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  Link,
  NavLink,
  useLocation,
  useNavigate,
} from "react-router-dom";

import { AuthProvider } from "./context/AuthContext";
import { useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import { getAllTickets, getDepartmentAgentsList } from "./services/ticketService";

import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/RegisterPage";

import NewTicketPage from "./pages/customer/NewTicketPage";
import MyTicketsPage from "./pages/customer/MyTicketsPage";
import CustomerTicketDetails from "./pages/customer/CustomerTicketDetails";
import SelfHelpPage from "./pages/customer/SelfHelpPage";

import AgentDashboard from "./pages/agent/AgentDashboard";
import WorkQueuePage from "./pages/agent/WorkQueuePage";
import AgentTicketDetails from "./pages/agent/AgentTicketDetails";
import AgentAllTicketsPage from "./pages/agent/AgentAllTicketsPage";

import AdminDashboard from "./pages/admin/AdminDashboard";
import UsersPage from "./pages/admin/UsersPage";
import AdminConfigPage from "./pages/admin/AdminConfigPage";
import KnowledgeBasePage from "./pages/admin/KnowledgeBasePage";
import MasterDataPage from "./pages/admin/MasterDataPage";
import IntegrationsPage from "./pages/admin/IntegrationsPage";
import AiAgentWorkbench from "./pages/agent/AiAgentWorkbench";
import JiraCloudPortal from "./pages/jira/JiraCloudPortal";

import ManagerLayout from "./pages/manager/ManagerLayout";
import ManagerDashboard from "./pages/manager/ManagerDashboard";
import ManagerQueueAndAssignmentPage from "./pages/manager/ManagerQueueAndAssignmentPage";
import ManagerSlaAndEscalationsPage from "./pages/manager/ManagerSlaAndEscalationsPage";
import ManagerAnalyticsPages from "./pages/manager/ManagerAnalyticsPages";


function initials(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : parts[0].slice(0, 2).toUpperCase();
}

/* =====================================================
   CUSTOMER LAYOUT
===================================================== */

function CustomerLayout({ children }) {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="sp-shell">
      <header className="sp-portal-nav">
        <div className="sp-portal-links">
          <Link to="/portal/tickets" className="sp-logo"><span className="sp-logo-mark">SP</span><span className="sp-logo-name">SupportPilot</span></Link>
          <Link to="/portal/tickets">My tickets</Link>
          <Link to="/portal/tickets/new">Raise a ticket</Link>
          <Link to="/portal/self-help">Self-help</Link>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-white/70 hidden sm:block">{user?.name || user?.username}</span>
          <button onClick={handleLogout} className="rounded-lg border border-white/25 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/10 cursor-pointer">Logout</button>
          <div className="sp-avatar" title={user?.name}>{initials(user?.name)}</div>
        </div>
      </header>
      <main className="sp-portal-main">
        {children}
      </main>
    </div>
  );
}

/* =====================================================
   AGENT LAYOUT & DEPARTMENT SWITCHER (SYNCED WITH ADMIN USERS)
===================================================== */

function AgentLayout({ children }) {
  const { logout, login, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [ticketCounts, setTicketCounts] = useState({ all: 0, open: 0 });
  const [selectedDeptFilter, setSelectedDeptFilter] = useState("ALL");
  const [switchingEmail, setSwitchingEmail] = useState(null);
  const [switchNotice, setSwitchNotice] = useState(null);
  const [agentsList, setAgentsList] = useState(() => getDepartmentAgentsList());

  useEffect(() => {
    const handleSync = () => {
      setAgentsList(getDepartmentAgentsList());
    };
    window.addEventListener("supportpilot_users_changed", handleSync);
    window.addEventListener("storage", handleSync);
    return () => {
      window.removeEventListener("supportpilot_users_changed", handleSync);
      window.removeEventListener("storage", handleSync);
    };
  }, []);

  useEffect(() => {
    const tickets = getAllTickets();
    const open = tickets.filter((t) => !["Resolved", "Closed"].includes(t.status));
    setTicketCounts({ all: tickets.length, open: open.length });
  }, [location.pathname, user?.email, user?.id]);

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const isCurrentAgent = (ag) => {
    if (!user) return false;
    const userEmail = (user.email || "").toLowerCase().trim();
    const username = (user.username || "").toLowerCase().trim();
    const userName = (user.name || "").toLowerCase().trim();
    const agEmail = ag.email.toLowerCase().trim();
    const agName = ag.name.toLowerCase().trim();

    return (
      userEmail === agEmail ||
      username === agEmail ||
      username === agName ||
      userName === agName
    );
  };

  const handleSwitchAgent = async (ag) => {
    if (isCurrentAgent(ag) || switchingEmail) return;
    setSwitchingEmail(ag.email);
    try {
      await login(ag.email, "password123", "agent");
      setSwitchNotice(`Switched to ${ag.name} (${ag.department})`);
      setTimeout(() => setSwitchNotice(null), 3500);
      if (location.pathname !== "/dashboard" && location.pathname !== "/tickets" && location.pathname !== "/tickets/queue") {
        navigate("/dashboard");
      }
    } catch (err) {
      console.error("Agent switch error:", err);
      setSwitchNotice(`Failed to switch to ${ag.name}`);
      setTimeout(() => setSwitchNotice(null), 3500);
    } finally {
      setSwitchingEmail(null);
    }
  };

  const currentDeptAgent = agentsList.find((ag) => isCurrentAgent(ag));
  const currentDepartment = user?.department || currentDeptAgent?.department || "IT";

  const filteredAgents = selectedDeptFilter === "ALL"
    ? agentsList
    : agentsList.filter((ag) => ag.department === selectedDeptFilter);

  const deptCounts = {
    ALL: agentsList.length,
    IT: agentsList.filter((a) => a.department === "IT").length,
    HR: agentsList.filter((a) => a.department === "HR").length,
    Finance: agentsList.filter((a) => a.department === "Finance").length,
  };

  const pageMeta = location.pathname === "/dashboard"
    ? ["Overview", "Dashboard"]
    : location.pathname === "/tickets/queue"
      ? ["Tickets / Queue", "My queue"]
      : location.pathname.startsWith("/ai-agent")
        ? ["AI Operations", "AI Agent Workbench"]
        : location.pathname.startsWith("/tickets/")
          ? [`Tickets / ${location.pathname.split("/").pop()}`, "Ticket detail"]
          : ["Tickets", "All tickets"];

  const navigation = [
    ["/dashboard", "▦", "Dashboard", null],
    ["/tickets", "▤", "All tickets", ticketCounts.all],
    ["/tickets/queue", "◉", "My queue / Assigned", ticketCounts.open],
    ["/ai-agent/workbench", "🤖", "AI Suggestions", null],
    ["/jira", "🔗", "Jira Sync", null],
  ];

  const userInitials = initials(user?.name);
  const displayName = user?.name || user?.username || "Agent";

  return (
    <div className="sp-agent-shell">
      <aside className="sp-agent-sidebar">
        {/* LOGO */}
        <Link to="/dashboard" className="sp-sidebar-logo">
          <span className="sp-logo-mark">SP</span>
          <div>
            <span className="sp-logo-name">SupportPilot</span>
            <span className="sp-sidebar-sub">AGENT WORKSPACE</span>
          </div>
        </Link>

        {/* SCROLLABLE SIDEBAR BODY */}
        <div className="sp-sidebar-scrollable">
          {/* WORK QUEUE NAVIGATION */}
          <nav className="sp-sidebar-nav">
            <div className="sp-nav-heading">Work Queue</div>
            {navigation.map(([to, icon, label, count]) => (
              <NavLink end key={to} to={to} className={({ isActive }) => isActive ? "active" : ""}>
                <span>{icon}</span>
                <span>{label}</span>
                {count !== null && <span className="sp-sidebar-count">{count}</span>}
              </NavLink>
            ))}
          </nav>

          {/* NOTIFICATION BANNER */}
          {switchNotice && (
            <div className="mx-3 mt-3 mb-1 rounded-lg bg-emerald-950/80 border border-emerald-500/40 p-2 text-center text-[11px] font-semibold text-emerald-200 shadow-sm animate-fade-in">
              {switchNotice}
            </div>
          )}

          {/* DEPARTMENT AGENTS SWITCHER */}
          <div className="mt-4 px-3">
            <div className="flex items-center justify-between px-1 mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Department Agents
              </span>
              <span className="text-[10px] font-semibold text-cyan-400 bg-cyan-950/60 border border-cyan-800/60 px-1.5 py-0.5 rounded">
                Switch Profile
              </span>
            </div>

            {/* DEPARTMENT FILTER TABS */}
            <div className="grid grid-cols-4 gap-1 p-1 bg-slate-900/90 rounded-lg border border-slate-800/80 mb-2.5">
              {[
                { id: "ALL", label: "All", count: deptCounts.ALL },
                { id: "IT", label: "IT", count: deptCounts.IT },
                { id: "HR", label: "HR", count: deptCounts.HR },
                { id: "Finance", label: "Fin", count: deptCounts.Finance },
              ].map((tab) => {
                const isActive = selectedDeptFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setSelectedDeptFilter(tab.id)}
                    className={`py-1 px-1 rounded text-[10px] font-bold transition text-center cursor-pointer ${
                      isActive
                        ? "bg-blue-600 text-white shadow-xs"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                    }`}
                  >
                    {tab.label} <span className="text-[9px] opacity-75">({tab.count})</span>
                  </button>
                );
              })}
            </div>

            {/* AGENT CARDS LIST */}
            <div className="space-y-1.5">
              {filteredAgents.map((ag) => {
                const isCurrent = isCurrentAgent(ag);
                const isBusy = switchingEmail === ag.email;
                return (
                  <button
                    key={ag.email}
                    type="button"
                    disabled={isCurrent || isBusy}
                    onClick={() => handleSwitchAgent(ag)}
                    className={`w-full text-left rounded-lg p-2 transition flex items-center gap-2.5 border cursor-pointer ${
                      isCurrent
                        ? "bg-blue-950/70 border-blue-500/60 shadow-xs ring-1 ring-blue-500/30 text-white"
                        : "bg-slate-900/40 border-slate-800 hover:border-slate-700 hover:bg-slate-800/60 text-slate-300"
                    }`}
                  >
                    {/* AVATAR WITH STATUS DOT */}
                    <div className="relative shrink-0">
                      <div
                        className={`h-7 w-7 rounded-md ${ag.avatarBg} text-white font-bold text-[11px] flex items-center justify-center shadow-xs`}
                      >
                        {initials(ag.name)}
                      </div>
                      <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-400 ring-1 ring-slate-900" />
                    </div>

                    {/* AGENT INFO */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-semibold truncate text-white">
                          {ag.name}
                        </span>
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${ag.badgeColor}`}
                        >
                          {ag.deptBadge}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">
                        {ag.specialty}
                      </div>
                    </div>

                    {/* ACTIVE INDICATOR OR SWITCH STATUS */}
                    {isCurrent ? (
                      <span className="shrink-0 text-[10px] font-bold text-emerald-400 flex items-center gap-0.5 bg-emerald-950/60 border border-emerald-500/40 px-1.5 py-0.5 rounded">
                        ✓
                      </span>
                    ) : isBusy ? (
                      <span className="shrink-0 text-[10px] font-bold text-cyan-400 animate-pulse">
                        ...
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* SIDEBAR FOOTER (CURRENT LOGGED-IN AGENT) */}
        <div className="sp-sidebar-footer">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="sp-avatar sp-agent-avatar shrink-0" title={displayName}>
                {userInitials}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-white truncate">{displayName}</div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <span className="text-[10px] font-semibold text-cyan-300 truncate">
                    {currentDepartment} Department
                  </span>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              title="Sign Out"
              className="rounded p-1.5 text-xs text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              ⎋
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN VIEWPORT */}
      <main className="sp-agent-main">
        <header className="sp-agent-topbar">
          <div>
            <div className="sp-breadcrumb">{pageMeta[0]}</div>
            <h1>{pageMeta[1]}</h1>
          </div>
          <div className="flex items-center gap-3">
            {/* CURRENT ACTIVE AGENT BADGE */}
            <div className="hidden sm:flex items-center gap-2 rounded-lg bg-slate-100 border border-slate-200 px-2.5 py-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-xs font-semibold text-slate-700">
                {displayName}
              </span>
              <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded border border-blue-200">
                {currentDepartment} Dept
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            >
              Logout
            </button>
            <div className="sp-avatar sp-agent-avatar" title={displayName}>
              {userInitials}
            </div>
          </div>
        </header>
        <div className="sp-content">
          {children}
        </div>
      </main>
    </div>
  );
}

/* =====================================================
   ADMIN LAYOUT
===================================================== */

function AdminLayout({ children }) {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const adminNav = [
    { to: "/admin", icon: "▦", label: "Dashboard" },
    { to: "/tickets", icon: "▤", label: "All Tickets" },
    { to: "/ai-agent/workbench", icon: "🤖", label: "AI Agent Ops" },
    { to: "/admin/master-data", icon: "🗂️", label: "Master Data" },
    { to: "/admin/users", icon: "👥", label: "Users" },
    { to: "/admin/routing", icon: "⇆", label: "Routing Rules" },
    { to: "/admin/sla", icon: "⏱", label: "SLA Policies" },
    { to: "/admin/ai-settings", icon: "✦", label: "AI Settings" },
    { to: "/knowledge", icon: "📚", label: "Knowledge Base" },
    { to: "/integrations", icon: "🔗", label: "Integrations" },
    { to: "/analytics", icon: "📊", label: "Analytics" },
    { to: "/admin/audit", icon: "☷", label: "Audit Logs" },
  ];

  const userInitials = initials(user?.name);
  const displayName = user?.name || user?.username || "Admin";

  return (
    <div className="sp-admin-shell">
      <aside className="sp-admin-sidebar">
        <Link to="/admin" className="sp-sidebar-logo">
          <span className="sp-logo-mark">SP</span>
          <span>
            <span className="sp-logo-name">SupportPilot</span>
            <span className="sp-sidebar-sub">ADMIN MISSION CONTROL</span>
          </span>
        </Link>
        <nav className="sp-sidebar-nav">
          <div className="sp-nav-heading">Mission Control</div>
          {adminNav.map(({ to, icon, label }) => (
            <NavLink
              end
              key={to}
              to={to}
              className={({ isActive }) => isActive ? "active" : ""}
            >
              <span>{icon}</span>
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sp-sidebar-footer">
          <div className="flex items-center gap-2">
            <div className="sp-avatar sp-admin-avatar" title={displayName}>{userInitials}</div>
            <div>
              <div className="text-xs font-semibold text-white">{displayName}</div>
              <div className="text-[10px] text-cyan-300">Administrator</div>
            </div>
          </div>
        </div>
      </aside>
      <main className="sp-agent-main">
        <header className="sp-admin-topbar">
          <div>
            <div className="sp-breadcrumb">Admin Console</div>
            <h1>{adminNav.find((n) => n.to === location.pathname)?.label || "Admin"}</h1>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleLogout} className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-cyan-200 hover:bg-slate-700 transition">Logout</button>
            <div className="sp-avatar sp-admin-avatar" title={displayName}>{userInitials}</div>
          </div>
        </header>
        <div className="sp-content">
          {children}
        </div>
      </main>
    </div>
  );
}

function AdaptiveKnowledgePage() {
  const { user } = useAuth();
  if (user?.role === "manager") {
    return (
      <ManagerLayout>
        <KnowledgeBasePage />
      </ManagerLayout>
    );
  }
  return (
    <AdminLayout>
      <KnowledgeBasePage />
    </AdminLayout>
  );
}

/* =====================================================
   UNAUTHORIZED PAGE
===================================================== */

function HomePage() {
  const { startFreshSession } = useAuth();
  const navigate = useNavigate();

  const handleStartFresh = (e) => {
    e.preventDefault();
    startFreshSession();
    navigate("/login?fresh=true", { replace: true });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#14532d] via-[#166534] to-[#0f2b1d] text-white">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 text-lg font-bold shadow-inner">SP</div>
          <span className="text-2xl font-bold tracking-tight">SupportPilot</span>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/login?fresh=true"
            onClick={handleStartFresh}
            className="rounded-full border border-white/30 px-4 py-2 text-sm font-medium hover:bg-white/10 transition"
          >
            Login
          </Link>
          <Link
            to="/register"
            className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#14532d] hover:bg-emerald-50 transition shadow-sm"
          >
            Create account
          </Link>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-12 px-6 py-16 lg:grid-cols-2 lg:items-center">
        <div>
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.25em] text-emerald-100">Intelligent support operations</p>
          <h1 className="text-5xl font-bold leading-tight tracking-tight">Support tickets made simple.</h1>
          <p className="mt-6 max-w-xl text-lg text-emerald-50/90 leading-relaxed">
            Manage customer requests, route work to agents, keep SLA promises, and power intelligent support operations from one workspace.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              onClick={handleStartFresh}
              className="rounded-xl bg-white px-6 py-3.5 font-semibold text-[#14532d] hover:bg-emerald-50 transition shadow-xl cursor-pointer text-center"
            >
              Get started
            </button>

            <Link
              to="/register"
              className="rounded-xl border border-white/30 px-6 py-3.5 font-semibold text-white hover:bg-white/10 transition text-center"
            >
              Create account
            </Link>
          </div>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-white/10 p-6 shadow-2xl backdrop-blur-sm">
          <div className="rounded-2xl bg-white/5 p-5">
            <div className="mb-4 flex items-center justify-between text-sm text-emerald-100">
              <span className="font-semibold">Live operations</span>
              <span className="rounded-full bg-emerald-500/20 px-2.5 py-1 text-xs font-semibold text-emerald-100 border border-emerald-400/30">Healthy</span>
            </div>
            <div className="space-y-4">
              <div className="rounded-xl bg-white/10 p-4 border border-white/5">
                <p className="text-xs uppercase tracking-[0.2em] text-emerald-100">Open tickets</p>
                <p className="mt-2 text-3xl font-bold">428</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl bg-white/10 p-4 border border-white/5">
                  <p className="text-xs uppercase tracking-[0.2em] text-emerald-100">Agents</p>
                  <p className="mt-2 text-2xl font-bold">24</p>
                </div>
                <div className="rounded-xl bg-white/10 p-4 border border-white/5">
                  <p className="text-xs uppercase tracking-[0.2em] text-emerald-100">Avg. resolve</p>
                  <p className="mt-2 text-2xl font-bold">2.4h</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function PlaceholderPage({ title, description }) {
  return (
    <div className="mx-auto max-w-3xl rounded-2xl border border-[#dfe5e1] bg-white p-8 shadow-sm">
      <h1 className="text-3xl font-bold text-[#1c2430]">{title}</h1>
      <p className="mt-4 text-[#4b5563]">{description}</p>
      <Link to="/admin" className="mt-6 inline-block rounded-lg bg-[#14532d] px-6 py-3 font-semibold text-white hover:bg-[#0f2b1d]">Back to dashboard</Link>
    </div>
  );
}

function UnauthorizedPage() {
  const { user, logout } = useAuth();
  const targetHome = user?.role === "admin" ? "/admin" : user?.role === "manager" ? "/manager" : user?.role === "agent" ? "/dashboard" : "/portal/tickets";
  const portalName = user?.role === "admin" ? "Admin Control Center" : user?.role === "manager" ? "Manager Portal" : user?.role === "agent" ? "Agent Workspace" : "Customer Portal";

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 px-6">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-white backdrop-blur-xl shadow-2xl">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/20 text-3xl text-amber-400 border border-amber-500/30">
          🛡️
        </div>

        <h1 className="mt-5 text-2xl font-bold text-white tracking-tight">
          Restricted Resource
        </h1>

        <p className="mt-2 text-xs text-slate-400 leading-relaxed">
          {user ? (
            <>
              You are currently logged in as <strong className="text-emerald-400">{user.name || user.username}</strong> ({user.role?.toUpperCase()}). This specific section requires different authorization credentials.
            </>
          ) : (
            "Authentication is required to access this system area."
          )}
        </p>

        <div className="mt-6 flex flex-col gap-2.5">
          {user ? (
            <Link
              to={targetHome}
              className="w-full rounded-xl bg-emerald-600 px-5 py-3 text-xs font-bold text-white shadow-lg hover:bg-emerald-500 transition"
            >
              Return to Your {portalName}
            </Link>
          ) : (
            <Link
              to="/login"
              className="w-full rounded-xl bg-emerald-600 px-5 py-3 text-xs font-bold text-white shadow-lg hover:bg-emerald-500 transition"
            >
              Sign In to Your Account
            </Link>
          )}

          {user && (
            <button
              onClick={() => {
                logout();
                window.location.href = "/login";
              }}
              className="w-full rounded-xl bg-white/10 px-5 py-2.5 text-xs font-semibold text-slate-300 hover:bg-white/15 transition border border-white/10 cursor-pointer"
            >
              Switch Account / Sign Out
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function TicketDetailDispatcher() {
  const { user } = useAuth();
  if (user?.role === "customer") {
    return (
      <CustomerLayout>
        <CustomerTicketDetails />
      </CustomerLayout>
    );
  }
  return (
    <AgentLayout>
      <AgentTicketDetails />
    </AgentLayout>
  );
}

function AllTicketsRedirect() {
  const { user } = useAuth();
  if (user?.role === "customer") return <Navigate to="/portal/tickets" replace />;
  if (user?.role === "manager") return <Navigate to="/manager/tickets" replace />;
  return <Navigate to="/tickets" replace />;
}

function MyTicketsRedirect() {
  const { user } = useAuth();
  if (user?.role === "customer") return <Navigate to="/portal/tickets" replace />;
  if (user?.role === "manager") return <Navigate to="/manager/tickets" replace />;
  return <Navigate to="/tickets/queue" replace />;
}

/* =====================================================
   APP
===================================================== */

export default function App() {
  return (
    <BrowserRouter>

      <AuthProvider>

        <Routes>

          {/* =================================================
              AUTH
          ================================================= */}

          <Route
            path="/login"
            element={<LoginPage />}
          />

          <Route
            path="/register"
            element={<RegisterPage />}
          />

          {/* =================================================
              CUSTOMER
          ================================================= */}

          <Route
            path="/portal/tickets/new"
            element={
              <ProtectedRoute
                allowedRoles={["customer"]}
              >
                <CustomerLayout>
                  <NewTicketPage />
                </CustomerLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/portal/tickets"
            element={
              <ProtectedRoute
                allowedRoles={["customer"]}
              >
                <CustomerLayout>
                  <MyTicketsPage />
                </CustomerLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/portal/self-help"
            element={
              <ProtectedRoute
                allowedRoles={["customer"]}
              >
                <CustomerLayout>
                  <SelfHelpPage />
                </CustomerLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/portal/tickets/:id"
            element={
              <ProtectedRoute
                allowedRoles={["customer", "admin", "agent", "manager"]}
              >
                <CustomerLayout>
                  <CustomerTicketDetails />
                </CustomerLayout>
              </ProtectedRoute>
            }
          />

          {/* =================================================
              AGENT & TICKETS
          ================================================= */}

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute
                allowedRoles={["agent"]}
              >
                <AgentLayout>
                  <AgentDashboard />
                </AgentLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/tickets"
            element={
              <ProtectedRoute allowedRoles={["agent", "admin", "manager"]}>
                <AgentLayout><AgentAllTicketsPage /></AgentLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/tickets/queue"
            element={
              <ProtectedRoute
                allowedRoles={["agent", "admin", "manager"]}
              >
                <AgentLayout>
                  <WorkQueuePage />
                </AgentLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/tickets/:id"
            element={
              <ProtectedRoute
                allowedRoles={["agent", "admin", "manager", "customer"]}
              >
                <TicketDetailDispatcher />
              </ProtectedRoute>
            }
          />

          {/* Milestone 3 AI Agent Operations Workbench */}
          <Route
            path="/ai-agent/workbench"
            element={
              <ProtectedRoute
                allowedRoles={["agent", "admin"]}
              >
                <AgentLayout>
                  <AiAgentWorkbench />
                </AgentLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/ai-agent/runs/:id"
            element={
              <ProtectedRoute
                allowedRoles={["agent", "admin"]}
              >
                <AgentLayout>
                  <AiAgentWorkbench />
                </AgentLayout>
              </ProtectedRoute>
            }
          />

          {/* =================================================
              SUPPORT MANAGER PORTAL (PDF SECTION 7.C)
          ================================================= */}

          <Route
            path="/manager"
            element={
              <ProtectedRoute allowedRoles={["manager", "admin"]}>
                <ManagerLayout>
                  <ManagerDashboard />
                </ManagerLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/manager/tickets"
            element={
              <ProtectedRoute allowedRoles={["manager", "admin"]}>
                <ManagerLayout>
                  <ManagerQueueAndAssignmentPage />
                </ManagerLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/manager/queue"
            element={
              <ProtectedRoute allowedRoles={["manager", "admin"]}>
                <ManagerLayout>
                  <ManagerQueueAndAssignmentPage />
                </ManagerLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/manager/assignment"
            element={
              <ProtectedRoute allowedRoles={["manager", "admin"]}>
                <ManagerLayout>
                  <ManagerQueueAndAssignmentPage />
                </ManagerLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/manager/escalations"
            element={
              <ProtectedRoute allowedRoles={["manager", "admin"]}>
                <ManagerLayout>
                  <ManagerSlaAndEscalationsPage />
                </ManagerLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/manager/sla"
            element={
              <ProtectedRoute allowedRoles={["manager", "admin"]}>
                <ManagerLayout>
                  <ManagerSlaAndEscalationsPage />
                </ManagerLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/manager/agent-performance"
            element={
              <ProtectedRoute allowedRoles={["manager", "admin"]}>
                <ManagerLayout>
                  <ManagerAnalyticsPages />
                </ManagerLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/manager/ai-performance"
            element={
              <ProtectedRoute allowedRoles={["manager", "admin"]}>
                <ManagerLayout>
                  <ManagerAnalyticsPages />
                </ManagerLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/manager/reports"
            element={
              <ProtectedRoute allowedRoles={["manager", "admin"]}>
                <ManagerLayout>
                  <ManagerAnalyticsPages />
                </ManagerLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/manager/notifications"
            element={
              <ProtectedRoute allowedRoles={["manager", "admin"]}>
                <ManagerLayout>
                  <ManagerAnalyticsPages />
                </ManagerLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/manager/profile"
            element={
              <ProtectedRoute allowedRoles={["manager", "admin"]}>
                <ManagerLayout>
                  <ManagerAnalyticsPages />
                </ManagerLayout>
              </ProtectedRoute>
            }
          />

          {/* =================================================
              ADMIN
          ================================================= */}

          <Route
            path="/admin"
            element={
              <ProtectedRoute
                allowedRoles={["admin"]}
              >
                <AdminLayout>
                  <AdminDashboard />
                </AdminLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/master-data"
            element={
              <ProtectedRoute
                allowedRoles={["admin"]}
              >
                <AdminLayout>
                  <MasterDataPage />
                </AdminLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/users"
            element={
              <ProtectedRoute
                allowedRoles={["admin"]}
              >
                <AdminLayout>
                  <UsersPage />
                </AdminLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/routing"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminLayout>
                  <AdminConfigPage
                    title="Routing Rules"
                    description="Configure automatic ticket routing and assignments."
                    storageKey="supportpilot_routing_rules"
                    defaultValues={{
                      defaultQueue: "L1 Support",
                      highPriorityRouting: "Escalate to Level 2",
                      roundRobin: "Enabled",
                      assignmentRule: "Route by priority and department",
                    }}
                    fields={[
                      { name: "defaultQueue", label: "Default queue", type: "text" },
                      { name: "highPriorityRouting", label: "High priority routing", type: "text" },
                      { name: "roundRobin", label: "Round robin", type: "select", options: [{ value: "Enabled", label: "Enabled" }, { value: "Disabled", label: "Disabled" }] },
                      { name: "assignmentRule", label: "Assignment rule", type: "textarea", fullWidth: true },
                    ]}
                  />
                </AdminLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/sla"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminLayout>
                  <AdminConfigPage
                    title="SLA Policies"
                    description="Configure priority-based SLA targets and escalation settings."
                    storageKey="supportpilot_sla_policies"
                    defaultValues={{
                      lowPriority: "24 hours",
                      mediumPriority: "8 hours",
                      highPriority: "4 hours",
                      criticalPriority: "1 hour",
                    }}
                    fields={[
                      { name: "lowPriority", label: "Low priority SLA", type: "text" },
                      { name: "mediumPriority", label: "Medium priority SLA", type: "text" },
                      { name: "highPriority", label: "High priority SLA", type: "text" },
                      { name: "criticalPriority", label: "Critical priority SLA", type: "text" },
                    ]}
                  />
                </AdminLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/ai-settings"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminLayout>
                  <AdminConfigPage
                    title="AI Settings"
                    description="Configure AI confidence thresholds and retrieval settings."
                    storageKey="supportpilot_ai_settings"
                    defaultValues={{
                      model: "gpt-4o-mini",
                      confidenceThreshold: "0.82",
                      retrievalMode: "Hybrid",
                      responseStyle: "Concise and action-oriented",
                    }}
                    fields={[
                      { name: "model", label: "AI model", type: "text" },
                      { name: "confidenceThreshold", label: "Confidence threshold", type: "text" },
                      { name: "retrievalMode", label: "Retrieval mode", type: "select", options: [{ value: "Hybrid", label: "Hybrid" }, { value: "Semantic", label: "Semantic" }, { value: "Keyword", label: "Keyword" }] },
                      { name: "responseStyle", label: "Response style", type: "textarea", fullWidth: true },
                    ]}
                  />
                </AdminLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/audit"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminLayout>
                  <AdminConfigPage
                    title="Audit Logs"
                    description="Review system changes and administrative actions."
                    storageKey="supportpilot_audit_actions"
                    defaultValues={{
                      retentionPolicy: "90 days",
                      notifyOnCriticalChange: "Enabled",
                      exportFormat: "CSV",
                      reviewOwner: "Platform Admin",
                    }}
                    fields={[
                      { name: "retentionPolicy", label: "Retention policy", type: "text" },
                      { name: "notifyOnCriticalChange", label: "Critical change notifications", type: "select", options: [{ value: "Enabled", label: "Enabled" }, { value: "Disabled", label: "Disabled" }] },
                      { name: "exportFormat", label: "Export format", type: "text" },
                      { name: "reviewOwner", label: "Review owner", type: "text" },
                    ]}
                  />
                </AdminLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/knowledge"
            element={
              <ProtectedRoute allowedRoles={["admin", "manager"]}>
                <AdaptiveKnowledgePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/knowledge"
            element={
              <Navigate to="/knowledge" replace />
            }
          />
          <Route
            path="/portal/knowledge"
            element={
              <Navigate to="/portal/self-help" replace />
            }
          />


          <Route
            path="/integrations"
            element={
              <ProtectedRoute allowedRoles={["admin", "agent"]}>
                <AdminLayout>
                  <IntegrationsPage />
                </AdminLayout>
              </ProtectedRoute>
            }
          />

          {/* Hosted Atlassian Jira Cloud Portal */}
          <Route
            path="/jira"
            element={<JiraCloudPortal />}
          />
          <Route
            path="/jira/:key"
            element={<JiraCloudPortal />}
          />
          <Route
            path="/jira/browse/:key"
            element={<JiraCloudPortal />}
          />

          <Route
            path="/analytics"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminLayout>
                  <AdminConfigPage
                    title="Analytics"
                    description="Review AI and support performance metrics."
                    storageKey="supportpilot_analytics"
                    defaultValues={{
                      reportSchedule: "Daily",
                      dashboardView: "Operations",
                      alertThreshold: "15%",
                      targetResolution: "90% within SLA",
                    }}
                    fields={[
                      { name: "reportSchedule", label: "Report schedule", type: "text" },
                      { name: "dashboardView", label: "Dashboard view", type: "text" },
                      { name: "alertThreshold", label: "Alert threshold", type: "text" },
                      { name: "targetResolution", label: "Target resolution", type: "textarea", fullWidth: true },
                    ]}
                  />
                </AdminLayout>
              </ProtectedRoute>
            }
          />

          {/* =================================================
              ADMIN TICKETS & ROUTE ALIASES
          ================================================= */}

          <Route
            path="/admin/tickets"
            element={
              <ProtectedRoute allowedRoles={["admin", "agent", "manager"]}>
                <AdminLayout>
                  <AgentAllTicketsPage />
                </AdminLayout>
              </ProtectedRoute>
            }
          />

          <Route path="/admin/all-tickets" element={<Navigate to="/tickets" replace />} />
          <Route path="/agent" element={<Navigate to="/dashboard" replace />} />
          <Route path="/agent/dashboard" element={<Navigate to="/dashboard" replace />} />
          <Route path="/agent/tickets" element={<Navigate to="/tickets" replace />} />
          <Route path="/agent/all-tickets" element={<Navigate to="/tickets" replace />} />
          <Route path="/agent/my-tickets" element={<Navigate to="/tickets/queue" replace />} />
          <Route path="/customer/tickets" element={<Navigate to="/portal/tickets" replace />} />
          <Route path="/customer/my-tickets" element={<Navigate to="/portal/tickets" replace />} />
          <Route path="/customer/all-tickets" element={<Navigate to="/portal/tickets" replace />} />
          <Route path="/customer/create-ticket" element={<Navigate to="/portal/tickets/new" replace />} />
          <Route path="/customer/settings" element={<Navigate to="/portal/tickets" replace />} />
          <Route path="/portal/my-tickets" element={<Navigate to="/portal/tickets" replace />} />
          <Route path="/all-tickets" element={<AllTicketsRedirect />} />
          <Route path="/my-tickets" element={<MyTicketsRedirect />} />

          {/* =================================================
              UNAUTHORIZED
          ================================================= */}

          <Route
            path="/unauthorized"
            element={<UnauthorizedPage />}
          />

          {/* =================================================
              DEFAULT
          ================================================= */}

          <Route
            path="/"
            element={<HomePage />}
          />

          <Route
            path="*"
            element={
              <Navigate
                to="/"
                replace
              />
            }
          />

        </Routes>

      </AuthProvider>

    </BrowserRouter>
  );
}