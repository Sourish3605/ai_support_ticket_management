import { createContext, useContext, useMemo } from "react";
import { api } from "../services/api";
import { useLocalStorage } from "../hooks/useLocalStorage";

const AuthContext = createContext(null);

const getApiError = (error, fallback) => {
  if (error?.response?.status >= 500) {
    return "The support server database is not ready. Run migrations on Render and try again.";
  }
  const detail = error?.response?.data?.detail;
  if (detail) return detail;
  const values = error?.response?.data;
  if (values && typeof values === "object") {
    const message = Object.values(values).flat().find(Boolean);
    if (message) return String(message);
  }
  return fallback;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useLocalStorage("supportpilot-user", null);
  const [tokens, setTokens] = useLocalStorage("supportpilot-tokens", null);
  const isAuthenticated = Boolean(user && tokens?.access);

  const DEMO_USERS = {
    "admin@demo.com": { password: "admin123", role: "admin", name: "Admin Demo" },
    "agent@demo.com": { password: "agent123", role: "agent", name: "Agent Demo" },
    "customer@demo.com": { password: "customer123", role: "customer", name: "Customer Demo" },
  };

  const login = async (email, password, expectedRole = null) => {
    const normalizedEmail = (email || "").trim().toLowerCase();
    const demoUser = DEMO_USERS[normalizedEmail];

    if (demoUser && demoUser.password === password) {
      if (expectedRole && demoUser.role !== expectedRole) {
        throw new Error(`This account is not authorized for ${expectedRole} login.`);
      }

      const account = {
        id: 1,
        username: normalizedEmail,
        email: normalizedEmail,
        name: demoUser.name,
        role: demoUser.role,
      };

      setTokens({ access: "demo-access-token", refresh: "demo-refresh-token" });
      setUser(account);
      return account;
    }

    try {
      const response = await api.post("/auth/login/", { username: email.trim(), password });
      const account = response.data.user;
      if (!account?.role || !["admin", "agent", "customer"].includes(account.role)) throw new Error("Your account has no valid SupportPilot role.");
      if (expectedRole && account.role !== expectedRole) throw new Error(`This account is not authorized for ${expectedRole} login.`);
      setTokens({ access: response.data.access, refresh: response.data.refresh });
      setUser(account);
      return account;
    } catch (error) {
      throw new Error(getApiError(error, "Invalid login details or the support server is unavailable."));
    }
  };

  const register = async (profile) => {
    try {
      const response = await api.post("/auth/register/", { username: profile.email.trim(), email: profile.email.trim(), password: profile.password });
      const account = { ...response.data.user, name: profile.name || response.data.user.username, role: "customer" };
      setTokens({ access: response.data.access, refresh: response.data.refresh });
      setUser(account);
      return account;
    } catch (error) {
      throw new Error(getApiError(error, "Unable to create the customer account."));
    }
  };

  const loginWithGoogle = async (credential) => {
    try {
      const response = await api.post('/auth/google/', { credential });
      const account = response.data.user;
      setTokens({ access: response.data.access, refresh: response.data.refresh });
      setUser(account);
      return account;
    } catch (error) {
      throw new Error(getApiError(error, 'Google sign-in failed.'));
    }
  };

  const logout = () => {
    setUser(null);
    setTokens(null);
    localStorage.removeItem("supportpilot-user");
    localStorage.removeItem("supportpilot-tokens");
  };

  const value = useMemo(() => ({ user, tokens, isAuthenticated, login, loginWithGoogle, register, logout }), [user, tokens, isAuthenticated]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider.");
  return context;
};
