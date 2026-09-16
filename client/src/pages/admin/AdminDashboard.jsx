import { Link } from "react-router-dom";
import AIEmailAutomationSection from "../../components/AIEmailAutomationSection";

const modules = [
  {
    title: "AI Email Automation",
    description:
      "Configure automatic AI email dispatch per status (Open, In Progress, Pending, Solved, Closed).",
    path: "/admin/email-automation",
    badge: "AI Notifier",
    highlight: true,
  },
  {
    title: "All Support Tickets",
    description:
      "Monitor, triage, assign, and resolve all incoming support tickets.",
    path: "/tickets",
  },
  {
    title: "Classification Master Data",
    description:
      "Manage categories, sub-categories and priorities for the AI engine.",
    path: "/admin/master-data",
  },
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
    title: "Integrations & Email",
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
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-[#0f172a] tracking-tight">
          Admin & Operations
        </h1>
        <p className="text-slate-500 mt-2 text-sm">
          Configure SupportPilot policies, users, AI automation, and transactional operations.
        </p>
      </div>

      {/* QUICK MODULES GRID */}
      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-5">
        {modules.map((module) => (
          <Link
            key={module.path}
            to={module.path}
            className={`group bg-white border rounded-2xl p-6 transition-all duration-200 ${
              module.highlight
                ? "border-blue-300 ring-2 ring-blue-500/10 hover:border-blue-500 hover:shadow-xl bg-gradient-to-b from-blue-50/20 to-white"
                : "border-slate-200 hover:border-cyan-500 hover:shadow-lg"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm group-hover:bg-blue-600 group-hover:text-white transition">
                SP
              </div>
              {module.badge && (
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                  {module.badge}
                </span>
              )}
            </div>

            <h2 className="font-bold text-base mt-4 text-slate-900 group-hover:text-blue-700 transition">
              {module.title}
            </h2>

            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              {module.description}
            </p>

            <div className="flex items-center gap-1 text-xs text-blue-700 font-bold mt-5 group-hover:translate-x-0.5 transition">
              <span>Configure</span>
              <span>→</span>
            </div>
          </Link>
        ))}
      </div>

      {/* EMBEDDED AI EMAIL AUTOMATION SECTION */}
      <div className="pt-4">
        <AIEmailAutomationSection />
      </div>
    </div>
  );
}