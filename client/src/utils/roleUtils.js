/**
 * Canonical Role Definitions and Normalization Utilities
 */

export const ROLES = {
  ADMIN: "admin",
  AGENT: "agent",
  MANAGER: "manager",
  CUSTOMER: "customer",
};

/**
 * Normalizes any role variation into a canonical lowercase role ('admin' | 'agent' | 'manager' | 'customer').
 */
export function normalizeRole(role) {
  if (!role || typeof role !== "string") return ROLES.CUSTOMER;

  const clean = role.trim().toLowerCase();

  if (["admin", "administrator", "superuser", "super_admin"].includes(clean)) {
    return ROLES.ADMIN;
  }

  if (["manager", "support_manager", "support manager", "lead", "supervisor", "team_lead"].includes(clean)) {
    return ROLES.MANAGER;
  }

  if (["agent", "support_agent", "support agent", "staff", "engineer", "l1 support", "l2 support"].includes(clean)) {
    return ROLES.AGENT;
  }

  return ROLES.CUSTOMER;
}

/**
 * Checks whether userRole is permitted for the given list of allowedRoles.
 * Performs safe case-insensitive matching.
 */
export function isRoleAllowed(userRole, allowedRoles = []) {
  if (!allowedRoles || allowedRoles.length === 0) return true;
  const canonicalUserRole = normalizeRole(userRole);
  const canonicalAllowed = allowedRoles.map((r) => normalizeRole(r));
  return canonicalAllowed.includes(canonicalUserRole);
}

/**
 * Returns the primary home dashboard URL for a given role.
 */
export function getDefaultRouteForRole(role) {
  const canonical = normalizeRole(role);
  switch (canonical) {
    case ROLES.ADMIN:
      return "/admin";
    case ROLES.MANAGER:
      return "/manager";
    case ROLES.AGENT:
      return "/dashboard";
    case ROLES.CUSTOMER:
    default:
      return "/portal/tickets";
  }
}

