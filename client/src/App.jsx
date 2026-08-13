import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  Link,
  NavLink,
  useLocation,
} from "react-router-dom";

import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";

import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/RegisterPage";

import NewTicketPage from "./pages/customer/NewTicketPage";
import MyTicketsPage from "./pages/customer/MyTicketsPage";
import CustomerTicketDetails from "./pages/customer/CustomerTicketDetails";

import AgentDashboard from "./pages/agent/AgentDashboard";
import WorkQueuePage from "./pages/agent/WorkQueuePage";
import AgentTicketDetails from "./pages/agent/AgentTicketDetails";
import AgentAllTicketsPage from "./pages/agent/AgentAllTicketsPage";

import AdminDashboard from "./pages/admin/AdminDashboard";
import UsersPage from "./pages/admin/UsersPage";

/* =====================================================
   CUSTOMER LAYOUT
===================================================== */

function CustomerLayout({ children }) {
  return (
    <div className="sp-shell">
      <header className="sp-portal-nav">
        <div className="sp-portal-links">
          <Link to="/portal/tickets" className="sp-logo"><span className="sp-logo-mark">SP</span><span className="sp-logo-name">SupportPilot</span></Link>
          <Link to="/portal/tickets">My tickets</Link>
          <Link to="/portal/tickets/new">Raise a ticket</Link>
          <Link to="/portal/self-help">Self-help</Link>
        </div>
        <div className="sp-avatar">PS</div>
      </header>
      <main className="sp-portal-main">
        {children}
      </main>
    </div>
  );
}

/* =====================================================
   AGENT LAYOUT
===================================================== */

function AgentLayout({ children }) {
  const location = useLocation();
  const pageMeta = location.pathname === "/dashboard"
    ? ["Overview", "Dashboard"]
    : location.pathname === "/tickets/queue"
      ? ["Tickets / Queue", "My queue"]
      : location.pathname.startsWith("/tickets/")
        ? [`Tickets / ${location.pathname.split("/").pop()}`, "Ticket detail"]
        : ["Tickets", "All tickets"];

  const navigation = [
    ["/dashboard", "▦", "Dashboard"],
    ["/tickets", "▤", "All tickets"],
    ["/tickets/queue", "◉", "My queue"],
  ];

  return (
    <div className="sp-agent-shell">
      <aside className="sp-sidebar">
        <Link to="/dashboard" className="sp-sidebar-logo"><span className="sp-logo-mark">SP</span><span><span className="sp-logo-name">SupportPilot</span><span className="sp-sidebar-sub">TICKET RESOLUTION</span></span></Link>
        <nav className="sp-sidebar-nav">
          <div className="sp-nav-heading">Work</div>
          {navigation.map(([to, icon, label]) => <NavLink end key={to} to={to} className={({ isActive }) => isActive ? "active" : ""}><span>{icon}</span><span>{label}</span>{label !== "Dashboard" && <span className="sp-sidebar-count">{label === "All tickets" ? "127" : "14"}</span>}</NavLink>)}
          <div className="sp-nav-heading">Configuration</div>
          <Link to="/tickets"><span>☰</span><span>Taxonomy</span></Link>
          <Link to="/tickets/queue"><span>⏱</span><span>SLA policies</span></Link>
          <Link to="/dashboard"><span>☷</span><span>Audit log</span></Link>
        </nav>
        <div className="sp-sidebar-footer"><div className="flex items-center gap-2"><div className="sp-avatar">AK</div><div><div className="text-xs font-semibold text-white">Arun K.</div><div className="text-[10px] text-white/50">Support Agent</div></div></div></div>
      </aside>
      <main className="sp-agent-main">
        <header className="sp-topbar"><div><div className="sp-breadcrumb">{pageMeta[0]}</div><h1>{pageMeta[1]}</h1></div><div className="sp-avatar">AK</div></header>
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
  return (
    <div className="min-h-screen bg-[#eef4ef]">

      <header className="flex items-center justify-between bg-[#0f2b1d] px-8 py-5 text-white">

        <Link
          to="/admin"
          className="text-xl font-bold"
        >
          SupportPilot Admin
        </Link>

        <nav className="flex gap-6 text-sm">

          <Link
            to="/admin"
            className="hover:text-emerald-300"
          >
            Dashboard
          </Link>

          <Link
            to="/admin/users"
            className="hover:text-emerald-300"
          >
            Users
          </Link>

        </nav>

      </header>

      <main className="p-8">
        {children}
      </main>

    </div>
  );
}

/* =====================================================
   UNAUTHORIZED PAGE
===================================================== */

function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#14532d] via-[#166534] to-[#0f2b1d] text-white">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 text-lg font-bold">SP</div>
          <span className="text-2xl font-bold">SupportPilot</span>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/login" className="rounded-full border border-white/30 px-4 py-2 text-sm font-medium hover:bg-white/10">Login</Link>
          <Link to="/register" className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#14532d] hover:bg-emerald-50">Create account</Link>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-12 px-6 py-16 lg:grid-cols-2 lg:items-center">
        <div>
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.25em] text-emerald-100">Intelligent support</p>
          <h1 className="text-5xl font-bold leading-tight">Support tickets made simple.</h1>
          <p className="mt-6 max-w-xl text-lg text-emerald-50/90">
            Manage customer requests, route work to agents, keep SLA promises, and power support operations from one workspace.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <Link to="/login" className="rounded-xl bg-white px-6 py-3 font-semibold text-[#14532d] hover:bg-emerald-50">Get started</Link>
            <Link to="/register" className="rounded-xl border border-white/30 px-6 py-3 font-semibold text-white hover:bg-white/10">Create account</Link>
          </div>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-white/10 p-6 shadow-2xl backdrop-blur-sm">
          <div className="rounded-2xl bg-white/5 p-5">
            <div className="mb-4 flex items-center justify-between text-sm text-emerald-100">
              <span>Live operations</span>
              <span className="rounded-full bg-emerald-500/20 px-2 py-1 text-xs font-semibold text-emerald-100">Healthy</span>
            </div>
            <div className="space-y-4">
              <div className="rounded-xl bg-white/10 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-emerald-100">Open tickets</p>
                <p className="mt-2 text-3xl font-bold">428</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl bg-white/10 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-emerald-100">Agents</p>
                  <p className="mt-2 text-2xl font-bold">24</p>
                </div>
                <div className="rounded-xl bg-white/10 p-4">
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
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#eef4ef] px-6">

      <div className="w-full max-w-md rounded-2xl border border-[#dfe5e1] bg-white p-8 text-center shadow-sm">

        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-2xl">
          🔒
        </div>

        <h1 className="mt-5 text-2xl font-bold text-[#1c2430]">
          Access Denied
        </h1>

        <p className="mt-3 text-[#4b5563]">
          You do not have permission to
          access this page.
        </p>

        <Link
          to="/"
          className="mt-6 inline-block rounded-lg bg-[#14532d] px-6 py-3 font-semibold text-white hover:bg-[#0f2b1d]"
        >
          Go to Home
        </Link>

      </div>

    </div>
  );
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
            path="/portal/tickets/:id"
            element={
              <ProtectedRoute
                allowedRoles={["customer"]}
              >
                <CustomerLayout>
                  <CustomerTicketDetails />
                </CustomerLayout>
              </ProtectedRoute>
            }
          />

          {/* =================================================
              AGENT
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
              <ProtectedRoute allowedRoles={["agent"]}>
                <AgentLayout><AgentAllTicketsPage /></AgentLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/tickets/queue"
            element={
              <ProtectedRoute
                allowedRoles={["agent"]}
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
                allowedRoles={["agent"]}
              >
                <AgentLayout>
                  <AgentTicketDetails />
                </AgentLayout>
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
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminLayout>
                  <AdminConfigPage
                    title="Knowledge Base"
                    description="Manage support articles and indexing configuration."
                    storageKey="supportpilot_knowledge_base"
                    defaultValues={{
                      indexingMode: "Daily refresh",
                      articleLimit: "500",
                      language: "English",
                      staleArticlePolicy: "Archive after 30 days",
                    }}
                    fields={[
                      { name: "indexingMode", label: "Indexing mode", type: "text" },
                      { name: "articleLimit", label: "Article limit", type: "text" },
                      { name: "language", label: "Knowledge language", type: "text" },
                      { name: "staleArticlePolicy", label: "Stale article policy", type: "textarea", fullWidth: true },
                    ]}
                  />
                </AdminLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/integrations"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminLayout>
                  <AdminConfigPage
                    title="Integrations"
                    description="Configure Jira, email, and other support integrations."
                    storageKey="supportpilot_integrations"
                    defaultValues={{
                      jiraEnabled: "Enabled",
                      emailSync: "Enabled",
                      webhookUrl: "https://hooks.example.com/support",
                      integrationOwner: "IT Ops",
                    }}
                    fields={[
                      { name: "jiraEnabled", label: "Jira integration", type: "select", options: [{ value: "Enabled", label: "Enabled" }, { value: "Disabled", label: "Disabled" }] },
                      { name: "emailSync", label: "Email sync", type: "select", options: [{ value: "Enabled", label: "Enabled" }, { value: "Disabled", label: "Disabled" }] },
                      { name: "webhookUrl", label: "Webhook URL", type: "text" },
                      { name: "integrationOwner", label: "Integration owner", type: "text" },
                    ]}
                  />
                </AdminLayout>
              </ProtectedRoute>
            }
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