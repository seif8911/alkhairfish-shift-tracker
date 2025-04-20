import { useState, useEffect, useCallback } from 'react';
import { Employee, AdminUser } from '../types';
import { loginEmployee, loginAdmin } from '../utils/api';

interface UseAuthReturn {
  isAuthenticated: boolean;
  isAdmin: boolean;
  user: Employee | AdminUser | null;
  loading: boolean;
  error: string | null;
  login: (code: string) => Promise<void>;
  adminLogin: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

export const useAuth = (): UseAuthReturn => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [user, setUser] = useState<Employee | AdminUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Load auth state from localStorage on mount
  useEffect(() => {
    const storedAuth = localStorage.getItem('auth');
    if (storedAuth) {
      try {
        const parsedAuth = JSON.parse(storedAuth);
        setIsAuthenticated(true);
        setIsAdmin(parsedAuth.isAdmin);
        setUser(parsedAuth.user);
      } catch (e) {
        console.error('Failed to parse auth data:', e);
        localStorage.removeItem('auth');
      }
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (code: string): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const { isAdmin, user } = await loginEmployee(code);
      setIsAuthenticated(true);
      setIsAdmin(isAdmin);
      setUser(user);
      localStorage.setItem('auth', JSON.stringify({ isAdmin, user }));
    } catch (e: any) {
      setError(e.message || 'Failed to authenticate');
    } finally {
      setLoading(false);
    }
  }, []);

  const adminLogin = useCallback(async (username: string, password: string): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const { isAdmin, user } = await loginAdmin(username, password);
      setIsAuthenticated(true);
      setIsAdmin(isAdmin);
      setUser(user);
      localStorage.setItem('auth', JSON.stringify({ isAdmin, user }));
    } catch (e: any) {
      setError(e.message || 'Failed to authenticate');
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback((): void => {
    setIsAuthenticated(false);
    setIsAdmin(false);
    setUser(null);
    localStorage.removeItem('auth');
  }, []);

  return {
    isAuthenticated,
    isAdmin,
    user,
    loading,
    error,
    login,
    adminLogin,
    logout
  };
};