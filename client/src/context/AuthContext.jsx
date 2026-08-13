import { createContext, useContext, useMemo } from "react";
import { api } from "../services/api";
import { useLocalStorage } from "../hooks/useLocalStorage";

const AuthContext = createContext(null);

const getApiError = (error, fallback) => {
  if (error?.code === "ECONNABORTED") {
    return "The support server is waking up. Please wait 20-30 seconds and try again.";
  }
  if (!error?.response) {
    return "Cannot reach the support server. Check your internet or backend URL and try again.";
  }
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

  const login = async (email, password, expectedRole = null) => {
    try {
      const username = email.trim();
      const response = await api.post("/auth/login/", { username, password });
      const fallbackRole = ["admin", "agent", "customer"].includes(expectedRole) ? expectedRole : "customer";
      const apiUser = response?.data?.user;
      const account = {
        id: apiUser?.id ?? null,
        username: apiUser?.username || username,
        email: apiUser?.email || "",
        name: apiUser?.name || apiUser?.username || username,
        role: apiUser?.role || fallbackRole,
      };
      if (!["admin", "agent", "customer"].includes(account.role)) throw new Error("Your account has no valid SupportPilot role.");
      setTokens({ access: response.data.access, refresh: response.data.refresh });
      setUser(account);
      return account;
    } catch (error) {
      if (error instanceof Error && !error?.response && !error?.code) {
        throw error;
      }
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
      let response;
      try {
        response = await api.post('/auth/google/', { credential });
      } catch (error) {
        const statusCode = error?.response?.status;
        if (statusCode !== 404) {
          throw error;
        }
        response = await api.post('/auth/google-login/', { credential });
      }
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
