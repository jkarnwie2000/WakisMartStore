import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../services/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .me()
      .then((r) => setUser(r.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (credentials) => {
    const r = await api.login(credentials);
    setUser(r.user);
    return r.user;
  }, []);

  const register = useCallback(async (data) => {
    const r = await api.register(data);
    setUser(r.user);
    return r.user;
  }, []);

  const logout = useCallback(async () => {
    await api.logout().catch(() => {});
    setUser(null);
  }, []);

  const updateProfile = useCallback(async (data) => {
    const r = await api.updateProfile(data);
    setUser(r.user);
    return r.user;
  }, []);

  const value = useMemo(
    () => ({ user, loading, isAdmin: user?.role === 'ADMIN', login, register, logout, updateProfile }),
    [user, loading, login, register, logout, updateProfile],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
