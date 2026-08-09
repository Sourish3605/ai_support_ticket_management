import { useEffect, useState } from "react";

export const useLocalStorage = (key, initialValue) => {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.sessionStorage.getItem(key);

      if (item === null) {
        return initialValue;
      }

      return JSON.parse(item);
    } catch (error) {
      console.error("Session storage read error:", error);
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      if (storedValue === null || storedValue === undefined) {
        window.sessionStorage.removeItem(key);
      } else {
        window.sessionStorage.setItem(
          key,
          JSON.stringify(storedValue)
        );
      }
    } catch (error) {
      console.error("Session storage write error:", error);
    }
  }, [key, storedValue]);

  return [storedValue, setStoredValue];
};