import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { isRoleAllowed, getDefaultRouteForRole } from "../utils/roleUtils";

export default function ProtectedRoute({
  children,
  allowedRoles = [],
}) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f4f6f5]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#14532d] border-t-transparent" />
          <p className="text-xs font-semibold text-gray-500">Verifying session...</p>
        </div>
      </div>
    );
  }

  /* User is not logged in */
  if (!isAuthenticated || !user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  /* Check role authorization */
  if (allowedRoles.length > 0 && !isRoleAllowed(user.role, allowedRoles)) {
    // If the user is logged in with a valid role, don't trap them on /unauthorized;
    // send them to their own authorized portal with a clean state.
    const defaultRoute = getDefaultRouteForRole(user.role);
    if (location.pathname !== defaultRoute) {
      return <Navigate to={defaultRoute} replace />;
    }
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
}
