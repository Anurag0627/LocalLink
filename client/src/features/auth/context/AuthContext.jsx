import { useCallback, useEffect, useMemo, useState } from 'react';
import * as authService from '../services/auth.service.js';
import { clearAccessToken } from '../../../lib/api.js';

import { AuthContext } from './AuthContextState.js';

let sessionRestorationPromise;

function restoreSession() {
  if (!sessionRestorationPromise) {
    sessionRestorationPromise = (async () => {
      await authService.refreshSession();
      return authService.getCurrentUser();
    })().finally(() => {
      sessionRestorationPromise = null;
    });
  }
  return sessionRestorationPromise;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);
      return currentUser;
    } catch (error) {
      if (error.status === 401) {
        setUser(null);
        clearAccessToken();
      }
      throw error;
    }
  }, []);

  useEffect(() => {
    let active = true;
    restoreSession()
      .then((currentUser) => {
        if (active) setUser(currentUser);
      })
      .catch(() => {
        if (active) {
          setUser(null);
          clearAccessToken();
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (credentials) => {
    const loggedInUser = await authService.login(credentials);
    setUser(loggedInUser);
    return loggedInUser;
  }, []);

  const registerCustomer = useCallback(async (data) => {
    const registeredUser = await authService.registerCustomer(data);
    setUser(registeredUser);
    return registeredUser;
  }, []);

  const registerProvider = useCallback(async (data) => {
    const registeredUser = await authService.registerProvider(data);
    setUser(registeredUser);
    return registeredUser;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } finally {
      setUser(null);
      clearAccessToken();
    }
  }, []);

  const updateUser = useCallback((updates) => {
    setUser((current) => current ? { ...current, ...updates } : current);
  }, []);

  const value = useMemo(() => ({
    user,
    isAuthenticated: Boolean(user),
    isLoading,
    login,
    registerCustomer,
    registerProvider,
    logout,
    refreshUser,
    updateUser,
  }), [user, isLoading, login, registerCustomer, registerProvider, logout, refreshUser, updateUser]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

