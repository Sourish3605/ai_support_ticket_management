import { useEffect, useState } from "react";

export const useLocalStorage = (key, initialValue) => {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const localItem = window.localStorage.getItem(key);

      if (localItem !== null) {
        return JSON.parse(localItem);
      }

      // Backward compatibility: recover existing tab-scoped auth/session values once.
      const sessionItem = window.sessionStorage.getItem(key);

      if (sessionItem !== null) {
        const parsed = JSON.parse(sessionItem);
        window.localStorage.setItem(key, JSON.stringify(parsed));
        window.sessionStorage.removeItem(key);
        return parsed;
      }

      return initialValue;
    } catch (error) {
      console.error("Local storage read error:", error);
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      if (storedValue === null || storedValue === undefined) {
        window.localStorage.removeItem(key);
        window.sessionStorage.removeItem(key);
      } else {
        window.localStorage.setItem(
          key,
          JSON.stringify(storedValue)
        );
      }
    } catch (error) {
      console.error("Local storage write error:", error);
    }
  }, [key, storedValue]);

  return [storedValue, setStoredValue];
};