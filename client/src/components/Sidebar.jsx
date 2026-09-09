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
} from "react-icons/fi";

import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { getDepartmentAgentsList, getAllTickets } from "../services/ticketService";
import AgentHoldTicketsModal from "./AgentHoldTicketsModal";

const Sidebar = ({
  isOpen,
  onClose,
  theme,
  toggleTheme,
}) => {
  const { user, logout, login, fastSwitchUser } = useAuth();
  const navigate = useNavigate();
  const role = user?.role;
  const [selectedDept, setSelectedDept] = useState("ALL");
  const [switchingEmail, setSwitchingEmail] = useState(null);
  const [agentsList, setAgentsList] = useState(() => getDepartmentAgentsList());
  const [inspectingAgent, setInspectingAgent] = useState(null);
  const [allTickets, setAllTickets] = useState(() => getAllTickets());

  useEffect(() => {
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

  const isTicketAssignedToAgent = (ticket, agent) => {
    if (!ticket || !agent) return false;
    const tAgentName = String(ticket.assignedAgentName || ticket.assignedAgent || "").toLowerCase();
    const tAgentId = String(ticket.assignedAgentId ?? ticket.assigned_to ?? ticket.assignedTo ?? "").toLowerCase();
    const agId = String(agent.id || "").toLowerCase();
    const agName = String(agent.name || "").toLowerCase();
    const agUsername = String(agent.username || "").toLowerCase();
    const agEmail = String(agent.email || "").toLowerCase();

    if (agId && tAgentId && agId === tAgentId) return true;
    if (agName && (tAgentName.includes(agName) || agName.includes(tAgentName))) return true;
    if (agUsername && (tAgentName.includes(agUsername) || tAgentId === agUsername)) return true;
    if (agEmail && (tAgentName.includes(agEmail) || tAgentId === agEmail)) return true;
    return false;
  };

  const getAgentTicketCounts = (agent) => {
    if (!agent) return { hold: 0, incomplete: 0, total: 0 };
    const agentTickets = allTickets.filter((t) => isTicketAssignedToAgent(t, agent));
    const hold = agentTickets.filter((t) => {
      const s = String(t.status || "").toUpperCase();
      return (
        s === "ON_HOLD" ||
        s === "ON HOLD" ||
        s === "HOLD" ||
        s === "PENDING" ||
        s === "WAITING" ||
        s.includes("HOLD") ||
        s.includes("WAIT")
      );
    }).length;
    const incomplete = agentTickets.filter((t) => {
      const s = String(t.status || "").toUpperCase();
      return s !== "RESOLVED" && s !== "CLOSED";
    }).length;
    return { hold, incomplete, total: agentTickets.length };
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
      {
        to: "/portal/tickets",
        label: "Dashboard",
        icon: FiHome,
      },
      {
        to: "/portal/tickets/new",
        label: "Create Ticket",
        icon: FiPlusCircle,
      },
      {
        to: "/portal/tickets",
        label: "My Tickets",
        icon: FiClipboard,
      },
      {
        to: "/portal/self-help",
        label: "Knowledge Base",
        icon: FiList,
      },
      {
        to: "/customer/settings",
        label: "Settings",
        icon: FiSettings,
      },
    ],

    agent: [
      {
        to: "/dashboard",
        label: "Dashboard",
        icon: FiHome,
      },
      {
        to: "/tickets/queue",
        label: "My Queue",
        icon: FiClipboard,
      },
      {
        to: "/tickets/ai-review",
        label: "AI Review Queue",
        icon: FiClipboard,
      },
      {
        to: "/tickets",
        label: "All Tickets",
        icon: FiList,
      },
      {
        to: "/ai-agent/workbench",
        label: "AI Suggestions",
        icon: FiMessageSquare,
      },
      {
        to: "/jira",
        label: "Jira Sync",
        icon: FiSettings,
      },
    ],

    admin: [
      {
        to: "/admin",
        label: "Dashboard",
        icon: FiHome,
      },
      {
        to: "/admin/users",
        label: "Users & Roles",
        icon: FiUsers,
      },
      {
        to: "/tickets",
        label: "All Tickets",
        icon: FiList,
      },
      {
        to: "/tickets/ai-review",
        label: "AI Review Queue",
        icon: FiClipboard,
      },
      {
        to: "/admin/knowledge",
        label: "Knowledge Base",
        icon: FiClipboard,
      },
      {
        to: "/admin/config",
        label: "AI Configuration",
        icon: FiSettings,
      },
    ],
  };

  const links = menuItems[role] || [];

  const handleLogout = () => {
    logout();
    navigate("/login", {
      replace: true,
    });
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-950/40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed left-0 top-0 z-40
          flex h-screen w-72 flex-col
          border-r border-slate-200
          bg-white
          p-6
          shadow-xl
          transition-transform duration-300
          ${isOpen
            ? "translate-x-0"
            : "-translate-x-full"}
          lg:translate-x-0
        `}
      >

        {/* LOGO */}

        <div className="flex items-center justify-between">

          <div className="flex items-center gap-3">

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 font-bold text-white shadow-lg">
              SP
            </div>

            <div>

              <p className="text-lg font-bold text-slate-900">
                SupportPilot
              </p>

              <p className="text-xs text-slate-400">
                Ticket Management
              </p>

            </div>

          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 lg:hidden"
          >
            <FiX />
          </button>

        </div>

        {/* USER */}

        <div className="mt-7 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 p-4">

          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Logged in as
          </p>

          <p className="mt-1 font-bold text-slate-900">
            {user?.name}
          </p>

          <p className="mt-1 text-xs font-semibold capitalize text-emerald-600">
            {role}
          </p>

        </div>

        {/* NAV */}

        <nav className="mt-7 flex-1 space-y-2 overflow-y-auto">

          {links.map(
            ({
              to,
              label,
              icon: Icon,
            }) => (
              <NavLink
                key={to}
                to={to}
                onClick={onClose}
                className={({
                  isActive,
                }) =>
                  `
                  flex items-center gap-3
                  rounded-xl
                  px-4 py-3
                  text-sm
                  font-semibold
                  transition
                  ${
                    isActive
                      ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-600/20"
                      : "text-slate-600 hover:bg-emerald-50 hover:text-emerald-700"
                  }
                  `
                }
              >
                <Icon size={18} />

                <span>{label}</span>
              </NavLink>
            )
          )}

          {role === "agent" && (
            <div className="pt-4 mt-2 border-t border-slate-100">
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Switch Agent / Dept
                </span>
                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                  {agentsList.length} Agents
                </span>
              </div>

              {/* TABS */}
              <div className="grid grid-cols-5 gap-1 p-1 bg-slate-100 rounded-lg mb-2 text-center text-[10px] font-bold">
                {["ALL", "IT", "HR", "Finance", "Admin"].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setSelectedDept(d)}
                    className={`py-1 rounded transition cursor-pointer ${
                      selectedDept === d
                        ? "bg-white text-emerald-700 shadow-xs"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    {d === "Finance" ? "Fin" : d === "Admin" ? "Adm" : d}
                  </button>
                ))}
              </div>

              {/* LIST */}
              <div className="space-y-1.5 max-h-52 overflow-y-auto pr-0.5">
                {agentsList.filter((ag) => selectedDept === "ALL" || ag.department === selectedDept).map((ag) => {
                  const isCurrent = isCurrentAgent(ag);
                  const counts = getAgentTicketCounts(ag);

                  return (
                    <button
                      key={ag.email}
                      type="button"
                      onClick={() => setInspectingAgent(ag)}
                      className={`w-full text-left p-2.5 rounded-xl text-xs flex items-center justify-between gap-2 border transition cursor-pointer ${
                        isCurrent
                          ? "bg-emerald-50/90 border-emerald-300 font-bold text-emerald-950 shadow-xs"
                          : "border-slate-100 hover:bg-slate-50 hover:border-slate-200 text-slate-700"
                      }`}
                      title={`Click to inspect tickets (${counts.hold} Hold, ${counts.incomplete} Incomplete)`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={`h-7 w-7 rounded-lg shrink-0 flex items-center justify-center text-[10px] font-black text-white bg-gradient-to-br ${ag.avatarGradient || "from-blue-600 to-indigo-700"} shadow-xs`}>
                          {(ag.name || "A").split(" ").map(w => w[0]).slice(0, 2).join("")}
                        </div>
                        <div className="min-w-0">
                          <div className="truncate font-semibold flex items-center gap-1">
                            <span className="truncate">{ag.name}</span>
                            {ag.isTeamLead && (
                              <span className="text-[8px] px-1 rounded bg-amber-100 text-amber-800 font-black">
                                Lead
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">{ag.specialty || ag.title}</div>
                          <div className="flex items-center gap-1 mt-1">
                            {counts.hold > 0 ? (
                              <span className="text-[9px] font-extrabold px-1 rounded bg-amber-100 text-amber-800 border border-amber-300">
                                ⏸️ {counts.hold} Hold
                              </span>
                            ) : null}
                            <span className="text-[9px] font-semibold px-1 rounded bg-slate-100 text-slate-600">
                              {counts.incomplete} Pending
                            </span>
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-400 shrink-0 font-bold">
                        ↗
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </nav>

        {/* THEME */}

        <button
          onClick={toggleTheme}
          className="mb-3 flex items-center justify-center rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          {theme === "dark"
            ? "☀️ Light mode"
            : "🌙 Dark mode"}
        </button>

        {/* LOGOUT */}

        <button
          onClick={handleLogout}
          className="flex items-center gap-3 rounded-xl border border-red-200 px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-50"
        >
          <FiLogOut size={18} />

          <span>Logout</span>
        </button>

      </aside>

      {/* AGENT WORKLOAD & HOLD TICKETS INSPECTOR MODAL */}
      <AgentHoldTicketsModal
        agent={inspectingAgent}
        isOpen={Boolean(inspectingAgent)}
        onClose={() => setInspectingAgent(null)}
        allTickets={allTickets}
        onTicketStatusChange={() => setAllTickets(getAllTickets())}
        onSwitchUser={handleSwitchAgent}
      />
    </>
  );
};

export default Sidebar;