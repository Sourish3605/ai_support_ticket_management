import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  Link,
} from "react-router-dom";

import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";

import LoginPage from "./pages/auth/LoginPage";

import NewTicketPage from "./pages/customer/NewTicketPage";
import MyTicketsPage from "./pages/customer/MyTicketsPage";
import CustomerTicketDetails from "./pages/customer/CustomerTicketDetails";

import AgentDashboard from "./pages/agent/AgentDashboard";
import WorkQueuePage from "./pages/agent/WorkQueuePage";
import AgentTicketDetails from "./pages/agent/AgentTicketDetails";

import AdminDashboard from "./pages/admin/AdminDashboard";
import UsersPage from "./pages/admin/UsersPage";

/* =====================================================
   CUSTOMER LAYOUT
===================================================== */

function CustomerLayout({ children }) {
  return (
    <div className="min-h-screen bg-[#eef4ef]">

      <header className="flex items-center justify-between bg-[#0f2b1d] px-8 py-5 text-white">

        <Link
          to="/portal/tickets"
          className="text-xl font-bold"
        >
          SupportPilot
        </Link>

        <nav className="flex gap-6 text-sm">

          <Link
            to="/portal/tickets"
            className="hover:text-emerald-300"
          >
            My Tickets
          </Link>

          <Link
            to="/portal/tickets/new"
            className="hover:text-emerald-300"
          >
            New Ticket
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
   AGENT LAYOUT
===================================================== */

function AgentLayout({ children }) {
  return (
    <div className="min-h-screen bg-[#eef4ef]">

      <header className="flex items-center justify-between bg-[#0f2b1d] px-8 py-5 text-white">

        <Link
          to="/dashboard"
          className="text-xl font-bold"
        >
          SupportPilot Agent
        </Link>

        <nav className="flex gap-6 text-sm">

          <Link
            to="/dashboard"
            className="hover:text-emerald-300"
          >
            Dashboard
          </Link>

          <Link
            to="/tickets/queue"
            className="hover:text-emerald-300"
          >
            Work Queue
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