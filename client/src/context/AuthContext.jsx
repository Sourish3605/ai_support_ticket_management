import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useLocalStorage('support-ai-user', null);
  const [isAuthenticated, setIsAuthenticated] = useState(Boolean(user));

  useEffect(() => {
    setIsAuthenticated(Boolean(user));
  }, [user]);

  const login = (credential, password) => {
    const storedUser = {
      name: 'Mina Patel',
      email: credential.includes('@') ? credential : 'mina@support.ai',
      employeeId: 'EMP-1024',
      department: 'Engineering',
      role: 'Support Lead',
    };

    if (!password || password.length < 4) {
      throw new Error('Password is required');
    }

    setUser(storedUser);
    setIsAuthenticated(true);
    return storedUser;
  };

  const register = (profile) => {
    const nextUser = {
      ...profile,
      role: 'Employee',
    };

    setUser(nextUser);
    setIsAuthenticated(true);
    return nextUser;
  };

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
  };

  const value = useMemo(() => ({ user, isAuthenticated, login, register, logout }), [user, isAuthenticated]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
