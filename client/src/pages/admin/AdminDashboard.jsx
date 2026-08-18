import { Link } from "react-router-dom";

const modules = [
  {
    title: "User & Role Management",
    description:
      "Manage users, departments, teams and RBAC roles.",
    path: "/admin/users",
  },
  {
    title: "Routing Rules",
    description:
      "Configure automatic ticket routing and assignments.",
    path: "/admin/routing",
  },
  {
    title: "SLA Policies",
    description:
      "Configure priority-based SLA targets.",
    path: "/admin/sla",
  },
  {
    title: "AI Settings",
    description:
      "Configure AI confidence and retrieval settings.",
    path: "/admin/ai-settings",
  },
  {
    title: "Knowledge Base",
    description:
      "Manage support articles and indexing.",
    path: "/knowledge",
  },
  {
    title: "Integrations",
    description:
      "Configure Jira and email integrations.",
    path: "/integrations",
  },
  {
    title: "Analytics",
    description:
      "View AI and support performance analytics.",
    path: "/analytics",
  },
  {
    title: "Audit Logs",
    description:
      "Review system changes and administrative actions.",
    path: "/admin/audit",
  },
];

export default function AdminDashboard() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-[#0f172a] tracking-tight">
          Admin & Operations
        </h1>
        <p className="text-slate-500 mt-2 text-sm">
          Configure SupportPilot policies, users and AI operations.
        </p>
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-5">
        {modules.map((module) => (
          <Link
            key={module.path}
            to={module.path}
            className="group bg-white border border-slate-200 rounded-2xl p-6 hover:border-cyan-500 hover:shadow-lg transition-all duration-200"
          >
            <div className="w-10 h-10 rounded-xl bg-cyan-50 border border-cyan-100 flex items-center justify-center text-cyan-700 font-bold text-sm group-hover:bg-cyan-600 group-hover:text-white transition">
              SP
            </div>

            <h2 className="font-bold text-base mt-5 text-slate-900 group-hover:text-cyan-700 transition">
              {module.title}
            </h2>

            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              {module.description}
            </p>

            <div className="flex items-center gap-1 text-xs text-cyan-700 font-bold mt-5 group-hover:translate-x-0.5 transition">
              <span>Configure</span>
              <span>→</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}