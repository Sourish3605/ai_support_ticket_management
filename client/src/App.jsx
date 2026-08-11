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
            element={
              <Navigate
                to="/login"
                replace
              />
            }
          />

          <Route
            path="*"
            element={
              <Navigate
                to="/login"
                replace
              />
            }
          />

        </Routes>

      </AuthProvider>

    </BrowserRouter>
  );
}