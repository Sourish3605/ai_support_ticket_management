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
        <h1 className="text-3xl font-bold">
          Admin & Operations
        </h1>

        <p className="text-gray-500 mt-2">
          Configure SupportPilot policies,
          users and AI operations.
        </p>
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-5">

        {modules.map((module) => (
          <Link
            key={module.path}
            to={module.path}
            className="bg-white border border-[#dfe5e1] rounded-2xl p-6 hover:shadow-md transition"
          >

            <div className="w-10 h-10 rounded-lg bg-[#eef4ef] flex items-center justify-center text-[#14532d] font-bold">
              SP
            </div>

            <h2 className="font-bold text-lg mt-5">
              {module.title}
            </h2>

            <p className="text-sm text-gray-500 mt-2">
              {module.description}
            </p>

            <p className="text-sm text-[#14532d] font-semibold mt-5">
              Configure →
            </p>

          </Link>
        ))}

      </div>

    </div>
  );
}