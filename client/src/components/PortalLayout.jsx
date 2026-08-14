import {
  NavLink,
  useNavigate,
} from "react-router-dom";

import {
  FiBookOpen,
  FiCheckSquare,
  FiCpu,
  FiDatabase,
  FiFileText,
  FiGrid,
  FiLayers,
  FiSettings,
  FiShield,
  FiUsers,
  FiActivity,
} from "react-icons/fi";

import ProfileMenu from "./ProfileMenu";

const linkClass = ({ isActive }) =>
  `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
    isActive
      ? "bg-emerald-100 text-emerald-800"
      : "text-slate-600 hover:bg-slate-100"
  }`;

function Sidebar({
  title,
  links,
}) {
  return (
    <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white lg:block">
      <div className="border-b border-slate-100 p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-700 font-bold text-white">
            SP
          </div>

          <div>
            <h1 className="font-bold text-slate-900">
              SupportPilot
            </h1>

            <p className="text-xs text-slate-500">
              {title}
            </p>
          </div>
        </div>
      </div>

      <nav className="space-y-1 p-4">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={linkClass}
          >
            {link.icon}
            {link.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

export default function PortalLayout({
  children,
  title,
  links,
}) {
  return (
    <div className="flex min-h-screen bg-[#f7faf8]">
      <Sidebar
        title={title}
        links={links}
      />

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-slate-200 bg-[#0f2b1d] px-5 text-white shadow-sm lg:px-8">
          <div>
            <p className="text-sm font-semibold">
              {title}
            </p>
          </div>

          <ProfileMenu />
        </header>

        <main className="p-5 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}

export const customerLinks = [
  {
    to: "/portal/self-help",
    label: "Self Help",
    icon: <FiBookOpen />,
  },
  {
    to: "/portal/tickets",
    label: "My Tickets",
    icon: <FiFileText />,
  },
  {
    to: "/portal/tickets/new",
    label: "New Ticket",
    icon: <FiCheckSquare />,
  },
];

export const agentLinks = [
  {
    to: "/dashboard",
    label: "Dashboard",
    icon: <FiGrid />,
  },
  {
    to: "/tickets",
    label: "All Tickets",
    icon: <FiFileText />,
  },
  {
    to: "/tickets/queue",
    label: "Work Queue",
    icon: <FiLayers />,
  },
  {
    to: "/escalations",
    label: "Escalations",
    icon: <FiActivity />,
  },
  {
    to: "/escalations/sla",
    label: "SLA Monitor",
    icon: <FiShield />,
  },
  {
    to: "/ai-agent",
    label: "AI Agent",
    icon: <FiCpu />,
  },
];

export const adminLinks = [
  {
    to: "/admin",
    label: "Dashboard",
    icon: <FiGrid />,
  },
  {
    to: "/admin/users",
    label: "Users",
    icon: <FiUsers />,
  },
  {
    to: "/admin/roles",
    label: "Roles",
    icon: <FiShield />,
  },
  {
    to: "/admin/routing",
    label: "Routing",
    icon: <FiLayers />,
  },
  {
    to: "/admin/sla",
    label: "SLA",
    icon: <FiActivity />,
  },
  {
    to: "/admin/ai-settings",
    label: "AI Settings",
    icon: <FiCpu />,
  },
  {
    to: "/knowledge",
    label: "Knowledge Base",
    icon: <FiBookOpen />,
  },
  {
    to: "/integrations",
    label: "Integrations",
    icon: <FiDatabase />,
  },
  {
    to: "/analytics",
    label: "Analytics",
    icon: <FiGrid />,
  },
  {
    to: "/admin/audit",
    label: "Audit Logs",
    icon: <FiShield />,
  },
];