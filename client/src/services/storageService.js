const STORAGE_KEYS = {
  tickets: "supportpilot_tickets",
  users: "supportpilot_users",
  currentUser: "supportpilot_current_user",
  auditLogs: "supportpilot_audit_logs",
};

export const storage = {
  get(key, fallback = []) {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : fallback;
    } catch (error) {
      console.error("Storage read error:", error);
      return fallback;
    }
  },

  set(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  },

  remove(key) {
    localStorage.removeItem(key);
  },

  clear() {
    Object.values(STORAGE_KEYS).forEach((key) => {
      localStorage.removeItem(key);
    });
  },
};

export { STORAGE_KEYS };