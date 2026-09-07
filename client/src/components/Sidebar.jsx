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
import { getDepartmentAgentsList } from "../services/ticketService";

const Sidebar = ({
  isOpen,
  onClose,
  theme,
  toggleTheme,
}) => {
  const { user, logout, login } = useAuth();
  const navigate = useNavigate();
  const role = user?.role;
  const [selectedDept, setSelectedDept] = useState("ALL");
  const [switchingEmail, setSwitchingEmail] = useState(null);
  const [agentsList, setAgentsList] = useState(() => getDepartmentAgentsList());

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
      await login(ag.email, "password123", "agent");
      navigate("/dashboard");
      if (onClose) onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSwitchingEmail(null);
    }
  };

  const menuItems = {
    customer: [
      {
        to: "/customer/dashboard",
        label: "Dashboard",
        icon: FiHome,
      },
      {
        to: "/customer/my-tickets",
        label: "My Tickets",
        icon: FiClipboard,
      },
      {
        to: "/customer/create-ticket",
        label: "Raise a Ticket",
        icon: FiPlusCircle,
      },
      {
        to: "/customer/all-tickets",
        label: "All Tickets",
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
        to: "/agent/dashboard",
        label: "Dashboard",
        icon: FiHome,
      },
      {
        to: "/agent/my-tickets",
        label: "My Tickets",
        icon: FiClipboard,
      },
      {
        to: "/agent/all-tickets",
        label: "All Tickets",
        icon: FiList,
      },
      {
        to: "/agent/ai-assistant",
        label: "AI Assistant",
        icon: FiMessageSquare,
      },
      {
        to: "/agent/reports",
        label: "Reports",
        icon: FiBarChart2,
      },
      {
        to: "/agent/settings",
        label: "Settings",
        icon: FiSettings,
      },
    ],

    admin: [
      {
        to: "/admin/dashboard",
        label: "Dashboard",
        icon: FiHome,
      },
      {
        to: "/admin/all-tickets",
        label: "All Tickets",
        icon: FiList,
      },
      {
        to: "/admin/reports",
        label: "Reports",
        icon: FiBarChart2,
      },
      {
        to: "/admin/settings",
        label: "Settings",
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
              <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100 rounded-lg mb-2 text-center text-[10px] font-bold">
                {["ALL", "IT", "HR", "Finance"].map((d) => (
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
                    {d === "Finance" ? "Fin" : d}
                  </button>
                ))}
              </div>

              {/* LIST */}
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {agentsList.filter((ag) => selectedDept === "ALL" || ag.department === selectedDept).map((ag) => {
                  const isCurrent = isCurrentAgent(ag);
                  const isBusy = switchingEmail === ag.email;
                  return (
                    <button
                      key={ag.email}
                      type="button"
                      disabled={isCurrent || isBusy}
                      onClick={() => handleSwitchAgent(ag)}
                      className={`w-full text-left p-2 rounded-xl text-xs flex items-center justify-between gap-1 border transition cursor-pointer ${
                        isCurrent
                          ? "bg-emerald-50 border-emerald-300 font-bold text-emerald-900"
                          : "border-slate-100 hover:bg-slate-50 text-slate-700"
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="truncate font-semibold flex items-center gap-1">
                          <span>{ag.name}</span>
                          {ag.isTeamLead && (
                            <span className="text-[9px] px-1 rounded bg-amber-100 text-amber-800 font-bold">
                              👑 Lead
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">{ag.specialty}</div>
                      </div>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 font-bold">
                        {isCurrent ? "Active" : ag.department}
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
    </>
  );
};

export default Sidebar;