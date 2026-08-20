import {
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import { useAuth } from "../context/AuthContext";

import DashboardLayout from "../layouts/DashboardLayout";

import LoginPage from "../pages/LoginPage";
import RegisterPage from "../pages/RegisterPage";

import DashboardPage from "../pages/DashboardPage";
import MyTicketsPage from "../pages/MyTicketsPage";
import AgentTicketDetails from "../pages/agent/AgentTicketDetails";
import CreateTicketPage from "../pages/CreateTicketPage";
import AllTicketsPage from "../pages/AllTicketsPage";
import AiAssistantPage from "../pages/AiAssistantPage";
import ReportsPage from "../pages/ReportsPage";
import SettingsPage from "../pages/SettingsPage";
import TicketDetailsPage from "../pages/TicketDetailsPage";

/*
 * Redirect based on role.
 */
const RoleRedirect = () => {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  switch (user.role) {
    case "admin":
      return (
        <Navigate
          to="/admin/dashboard"
          replace
        />
      );

    case "agent":
      return (
        <Navigate
          to="/agent/dashboard"
          replace
        />
      );

    case "customer":
      return (
        <Navigate
          to="/customer/dashboard"
          replace
        />
      );

    default:
      return <Navigate to="/login" replace />;
  }
};

/*
 * Protect private pages.
 */
const ProtectedRoute = ({
  children,
  allowedRoles,
}) => {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated || !user) {
    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  if (
    allowedRoles &&
    !allowedRoles.includes(user.role)
  ) {
    return <RoleRedirect />;
  }

  return children;
};

const AppRoutes = () => {
  return (
    <Routes>
      {/* =========================
          PUBLIC ROUTES
      ========================== */}

      <Route
        path="/login"
        element={<LoginPage />}
      />

      <Route
        path="/register"
        element={<RegisterPage />}
      />

      {/* =========================
          ROOT
      ========================== */}

      <Route
        path="/"
        element={<RoleRedirect />}
      />

      {/* =========================
          CUSTOMER
      ========================== */}

      <Route
        element={
          <ProtectedRoute
            allowedRoles={["customer"]}
          >
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route
          path="/customer/dashboard"
          element={<DashboardPage />}
        />

        <Route
          path="/customer/my-tickets"
          element={<MyTicketsPage />}
        />

        <Route
          path="/customer/create-ticket"
          element={<CreateTicketPage />}
        />

        <Route
          path="/customer/all-tickets"
          element={<AllTicketsPage />}
        />

        <Route
          path="/customer/tickets/:ticketId"
          element={<TicketDetailsPage />}
        />

        <Route
          path="/customer/settings"
          element={<SettingsPage />}
        />
      </Route>

      {/* =========================
          AGENT
      ========================== */}

      <Route
        element={
          <ProtectedRoute
            allowedRoles={["agent"]}
          >
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route
          path="/agent/dashboard"
          element={<DashboardPage />}
        />

        <Route
          path="/agent/my-tickets"
          element={<MyTicketsPage />}
        />

        <Route
          path="/agent/all-tickets"
          element={<AllTicketsPage />}
        />

        <Route
          path="/agent/ai-assistant"
          element={<AiAssistantPage />}
        />

        <Route
          path="/agent/reports"
          element={<ReportsPage />}
        />

        <Route
          path="/agent/settings"
          element={<SettingsPage />}
        />

        <Route
          path="/agent/tickets/:ticketId"
          element={<AgentTicketDetails />}
        />
      </Route>

      {/* =========================
          ADMIN
      ========================== */}

      <Route
        element={
          <ProtectedRoute
            allowedRoles={["admin"]}
          >
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route
          path="/admin/dashboard"
          element={<DashboardPage />}
        />

        <Route
          path="/admin/all-tickets"
          element={<AllTicketsPage />}
        />

        <Route
          path="/admin/reports"
          element={<ReportsPage />}
        />

        <Route
          path="/admin/settings"
          element={<SettingsPage />}
        />

        <Route
          path="/admin/tickets/:ticketId"
          element={<TicketDetailsPage />}
        />
      </Route>

      {/* =========================
          OLD URL SUPPORT
      ========================== */}

      <Route
        path="/dashboard"
        element={<RoleRedirect />}
      />

      {/* =========================
          UNKNOWN
      ========================== */}

      <Route
        path="*"
        element={<RoleRedirect />}
      />
    </Routes>
  );
};

export default AppRoutes;