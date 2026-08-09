import {
  createContext,
  useContext,
  useMemo,
} from "react";

import { useLocalStorage } from "../hooks/useLocalStorage";

const AuthContext = createContext(null);

const DEMO_USERS = {
  admin: {
    name: "Admin User",
    employeeId: "ADM-1001",
    department: "Administration",
    role: "admin",
    email: "admin@support.ai",
    status: "Active",
  },

  agent: {
    name: "Mina Patel",
    employeeId: "AGT-1024",
    department: "IT Support",
    role: "agent",
    email: "agent@support.ai",
    status: "Active",
    team: "L1 Support",
  },

  customer: {
    name: "Customer User",
    employeeId: "CUS-1001",
    department: "Finance",
    role: "customer",
    email: "customer@support.ai",
    status: "Active",
  },
};

const identifyRole = (email) => {
  const value = email.toLowerCase().trim();

  if (value.includes("admin")) {
    return "admin";
  }

  if (value.includes("agent")) {
    return "agent";
  }

  return "customer";
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useLocalStorage(
    "supportpilot-user",
    null
  );

  const isAuthenticated = Boolean(user);

  const createUserFromEmail = (
    email,
    roleOverride = null
  ) => {
    const role =
      roleOverride || identifyRole(email);

    const demoUser =
      DEMO_USERS[role] || DEMO_USERS.customer;

    return {
      ...demoUser,
      email: email.trim(),
      role,
    };
  };

  const login = (email, password) => {
    if (!email || !email.trim()) {
      throw new Error("Email is required.");
    }

    if (!password || password.length < 4) {
      throw new Error(
        "Password must contain at least 4 characters."
      );
    }

    const loggedInUser =
      createUserFromEmail(email);

    setUser(loggedInUser);

    return loggedInUser;
  };

  const loginWithGoogle = (email) => {
    if (!email || !email.trim()) {
      throw new Error(
        "Google account email is required."
      );
    }

    const loggedInUser =
      createUserFromEmail(email);

    setUser(loggedInUser);

    return loggedInUser;
  };

  const register = (profile) => {
    if (!profile.email) {
      throw new Error("Email is required.");
    }

    const newUser = {
      name:
        profile.name || "Customer User",

      email: profile.email,

      employeeId:
        profile.employeeId ||
        `CUS-${Math.floor(
          1000 + Math.random() * 9000
        )}`,

      department:
        profile.department || "General",

      role: "customer",

      status: "Active",
    };

    setUser(newUser);

    return newUser;
  };

  const logout = () => {
    setUser(null);

    try {
      localStorage.removeItem(
        "supportpilot-user"
      );

      sessionStorage.removeItem(
        "supportpilot-user"
      );
    } catch (error) {
      console.error(error);
    }
  };

  const value = useMemo(
    () => ({
      user,
      isAuthenticated,
      login,
      loginWithGoogle,
      register,
      logout,
    }),
    [user, isAuthenticated]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used inside AuthProvider."
    );
  }

  return context;
};