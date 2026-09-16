import {
  NavLink,
  useNavigate,
} from "react-router-dom";

import {
  FiBarChart2,
  FiClipboard,
  FiHome,
  FiMessageSquare,
  FiSettings,
  FiLogOut,
  FiPlusCircle,
  FiList,
  FiUsers,
  FiX,
  FiPauseCircle,
  FiAlertCircle,
  FiClock,
  FiSun,
  FiMoon,
  FiMail,
} from "react-icons/fi";

import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { getDepartmentAgentsList, getAllTickets, getAgentTicketSummary, fetchAndSyncAllTickets, isTicketAssignedToAgent } from "../services/ticketService";
import AgentDetailsDrawer from "./AgentDetailsDrawer";

const Sidebar = ({
  isOpen,
  onClose,
  theme,
  toggleTheme,
}) => {
  const { user, logout, login, fastSwitchUser } = useAuth();
  const navigate = useNavigate();
  const role = user?.role ? String(user.role).toLowerCase() : "customer";
  const [selectedDept, setSelectedDept] = useState("ALL");
  const [switchingEmail, setSwitchingEmail] = useState(null);
  const [agentsList, setAgentsList] = useState(() => getDepartmentAgentsList());
  const [inspectingAgent, setInspectingAgent] = useState(null);
  const [allTickets, setAllTickets] = useState(() => getAllTickets());

  useEffect(() => {
    fetchAndSyncAllTickets().then((res) => {
      if (res) setAllTickets(res);
    });
    const handleSyncTickets = () => {
      setAllTickets(getAllTickets());
    };
    window.addEventListener("storage", handleSyncTickets);
    window.addEventListener("supportpilot_tickets_changed", handleSyncTickets);
    return () => {
      window.removeEventListener("storage", handleSyncTickets);
      window.removeEventListener("supportpilot_tickets_changed", handleSyncTickets);
    };
  }, []);

  const getAgentTicketCounts = (agent) => {
    if (!agent) return { hold: 0, incomplete: 0, total: 0 };
    const summary = getAgentTicketSummary(agent, allTickets);
    return { hold: summary.hold, incomplete: summary.pending, total: summary.total };
  };

  useEffect(() => {
    const handleSync = () => {
      setAgentsList(getDepartmentAgentsList());
    };
    window.addEventListener("supportpilot_users_changed", handleSync);
    window.addEventListener("supportpilot_user_deleted", handleSync);
    window.addEventListener("storage", handleSync);
    return () => {
      window.removeEventListener("supportpilot_users_changed", handleSync);
      window.removeEventListener("supportpilot_user_deleted", handleSync);
      window.removeEventListener("storage", handleSync);
    };
  }, []);

  const isCurrentAgent = (ag) => {
    if (!user) return false;
    const uEmail = (user.email || "").toLowerCase().trim();
    const uName = (user.name || user.username || "").toLowerCase().trim();
    return uEmail === ag.email.toLowerCase() || uName === ag.name.toLowerCase();
  };

  const handleSwitchAgent = async (ag) => {
    if (isCurrentAgent(ag) || switchingEmail) return;
    setSwitchingEmail(ag.email);
    try {
      if (fastSwitchUser) {
        await fastSwitchUser(ag, ag.role || (ag.department === "Admin" ? "admin" : "agent"));
      } else {
        await login(ag.email, "password123", ag.role || (ag.department === "Admin" ? "admin" : "agent"));
      }
      if (ag.department === "Admin" || ag.role?.toLowerCase() === "admin") {
        navigate("/admin");
      } else {
        navigate("/dashboard");
      }
      if (onClose) onClose();
    } catch (err) {
      console.error("Agent switch error:", err);
    } finally {
      setSwitchingEmail(null);
    }
  };

  const menuItems = {
    customer: [
      { to: "/portal/tickets", label: "Dashboard", icon: FiHome },
      { to: "/portal/tickets/new", label: "Create Ticket", icon: FiPlusCircle },
      { to: "/portal/tickets", label: "My Tickets", icon: FiClipboard },
      { to: "/portal/self-help", label: "Knowledge Base", icon: FiList },
      { to: "/customer/settings", label: "Settings", icon: FiSettings },
    ],
    agent: [
      { to: "/dashboard", label: "Dashboard", icon: FiHome },
      { to: "/tickets/queue", label: "My Queue", icon: FiClipboard },
      { to: "/tickets/ai-review", label: "AI Review Queue", icon: FiClipboard },
      { to: "/tickets", label: "All Tickets", icon: FiList },
      { to: "/ai-agent/workbench", label: "AI Workbench", icon: FiMessageSquare },
      { to: "/jira", label: "Jira Sync", icon: FiSettings },
    ],
    manager: [
      { to: "/manager", label: "Dashboard", icon: FiHome },
      { to: "/manager/tickets", label: "All Tickets", icon: FiList },
      { to: "/manager/queue", label: "Ticket Queue", icon: FiClipboard },
      { to: "/manager/assignment", label: "Agent Assignment", icon: FiUsers },
      { to: "/manager/escalations", label: "Escalations", icon: FiAlertCircle },
      { to: "/manager/sla", label: "SLA Management", icon: FiClock },
      { to: "/manager/agent-performance", label: "Performance", icon: FiBarChart2 },
      { to: "/manager/reports", label: "Reports", icon: FiBarChart2 },
    ],
    admin: [
      { to: "/admin", label: "Dashboard", icon: FiHome },
      { to: "/admin/users", label: "Users & Roles", icon: FiUsers },
      { to: "/tickets", label: "All Tickets", icon: FiList },
      { to: "/tickets/ai-review", label: "AI Review Queue", icon: FiClipboard },
      { to: "/admin/knowledge", label: "Knowledge Base", icon: FiClipboard },
      { to: "/admin/ai-settings", label: "AI Configuration", icon: FiSettings },
      { to: "/admin/email-automation", label: "Email Automation", icon: FiMail },
    ],
  };

  const links = menuItems[role] || menuItems.customer;

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed left-0 top-0 z-40
          flex h-screen w-64 flex-col
          border-r border-slate-200
          bg-white
          p-5
          shadow-sm
          transition-transform duration-200
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0
        `}
      >
        {/* LOGO */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 font-bold text-white shadow-xs text-xs tracking-wider">
              SP
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 leading-tight">
                SupportPilot
              </p>
              <p className="text-[11px] text-slate-500 font-medium">
                Enterprise Desk
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 lg:hidden cursor-pointer"
          >
            <FiX className="w-4 h-4" />
          </button>
        </div>

        {/* LOGGED IN USER */}
        <div className="mt-4 rounded-lg bg-slate-50 p-3 border border-slate-200/80">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Current Account
          </p>
          <p className="mt-0.5 text-xs font-bold text-slate-900 truncate">
            {user?.name || user?.username || "Support User"}
          </p>
          <div className="mt-1 flex items-center justify-between">
            <span className="text-[11px] font-semibold text-blue-600 capitalize">
              {role} Portal
            </span>
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
          </div>
        </div>

        {/* NAVIGATION LINKS */}
        <nav className="mt-4 flex-1 space-y-1 overflow-y-auto pr-1">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/manager" || to === "/admin" || to === "/dashboard" || to === "/portal/tickets"}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-semibold transition cursor-pointer ${
                  isActive
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="truncate">{label}</span>
            </NavLink>
          ))}

          {/* AGENT ROSTER SWITCHER */}
          {role === "agent" && (
            <div className="pt-3 mt-3 border-t border-slate-100">
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Agents &amp; Workload
                </span>
                <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                  {agentsList.length} Active
                </span>
              </div>

              {/* DEPARTMENT TABS */}
              <div className="grid grid-cols-4 gap-1 p-0.5 bg-slate-100 rounded-md mb-2 text-center text-[10px] font-bold">
                {["ALL", "IT", "HR", "Finance"].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setSelectedDept(d)}
                    className={`py-1 rounded transition cursor-pointer ${
                      selectedDept === d
                        ? "bg-white text-blue-600 shadow-xs"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    {d === "Finance" ? "Fin" : d}
                  </button>
                ))}
              </div>

              {/* AGENT LIST */}
              <div className="space-y-1 max-h-48 overflow-y-auto pr-0.5">
                {agentsList
                  .filter((ag) => selectedDept === "ALL" || ag.department === selectedDept)
                  .map((ag) => {
                    const isCurrent = isCurrentAgent(ag);
                    const counts = getAgentTicketCounts(ag);

                    return (
                      <div
                        key={ag.email}
                        className="w-full text-left p-2 rounded-lg text-xs flex items-center justify-between gap-1.5 border border-slate-100 hover:bg-slate-50 text-slate-700 transition"
                      >
                        <button
                          type="button"
                          onClick={() => {
                            navigate(`/agent/tasks/${encodeURIComponent(ag.name || ag.username || ag.id || "")}`);
                            if (onClose) onClose();
                          }}
                          className="min-w-0 flex-1 text-left cursor-pointer"
                          title={`Click to open ${ag.name}'s dedicated task view`}
                        >
                          <div className="truncate font-semibold flex items-center gap-1 text-[11px]">
                            <span className="truncate hover:text-blue-600 transition-colors">{ag.name}</span>
                            {ag.isTeamLead && (
                              <span className="text-[8px] px-1 rounded bg-slate-200 text-slate-700 font-bold">
                                Lead
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {counts.hold > 0 && (
                              <span className="text-[9px] font-semibold px-1 rounded bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-0.5">
                                <FiPauseCircle className="w-2.5 h-2.5" />
                                {counts.hold} Hold
                              </span>
                            )}
                            <span className="text-[9px] font-medium text-slate-500">
                              {counts.incomplete} active
                            </span>
                          </div>
                        </button>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </nav>

        {/* FOOTER ACTIONS */}
        <div className="pt-3 border-t border-slate-100 space-y-1.5">
          <button
            onClick={toggleTheme}
            className="w-full flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 transition cursor-pointer"
          >
            {theme === "dark" ? (
              <>
                <FiSun className="w-3.5 h-3.5" />
                <span>Light Theme</span>
              </>
            ) : (
              <>
                <FiMoon className="w-3.5 h-3.5" />
                <span>Dark Theme</span>
              </>
            )}
          </button>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 transition cursor-pointer"
          >
            <FiLogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* PROFESSIONAL AGENT DETAILS DRAWER */}
      <AgentDetailsDrawer
        agent={inspectingAgent}
        isOpen={Boolean(inspectingAgent)}
        onClose={() => setInspectingAgent(null)}
        allTickets={allTickets}
        onTicketAssigned={() => setAllTickets(getAllTickets())}
        onStatusChanged={() => setAgentsList(getDepartmentAgentsList())}
      />
    </>
  );
};

export default Sidebar;