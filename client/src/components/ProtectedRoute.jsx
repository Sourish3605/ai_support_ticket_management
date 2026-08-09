import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({
  children,
  allowedRoles = [],
}) {
  const {
    user,
    isAuthenticated,
  } = useAuth();

  const location = useLocation();

  /*
   * User is not logged in
   */
  if (!isAuthenticated || !user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: location.pathname,
        }}
      />
    );
  }

  /*
   * Role is not allowed
   */
  if (
    allowedRoles.length > 0 &&
    !allowedRoles.includes(user.role)
  ) {
    return (
      <Navigate
        to="/unauthorized"
        replace
      />
    );
  }

  return children;
}