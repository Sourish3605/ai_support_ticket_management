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

import { useAuth } from "../context/AuthContext";

const Sidebar = ({
  isOpen,
  onClose,
  theme,
  toggleTheme,
}) => {
  const { user, logout } = useAuth();

  const navigate = useNavigate();

  const role = user?.role;

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
    navigate("/", {
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