import { createContext, useContext, useEffect, useMemo, useState } from 'react';

import * as authApi from '../api/auth';
import { clearAccessToken, getAccessToken, setAccessToken } from './token';

export type AuthState = {
  admin: authApi.AdminDto | null;
  accessToken: string | null;
  loading: boolean;
};

type AuthContextValue = AuthState & {
  login: (identifier: string, password: string, remember: boolean) => Promise<void>;
  logout: () => void;
  refreshMe: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [admin, setAdmin] = useState<authApi.AdminDto | null>(null);
  const [accessToken, setToken] = useState<string | null>(() => getAccessToken());
  const [loading, setLoading] = useState<boolean>(true);

  async function refreshMe() {
    const token = getAccessToken();
    if (!token) {
      setAdmin(null);
      setToken(null);
      return;
    }

    try {
      const a = await authApi.me();
      setAdmin(a);
      setToken(token);
    } catch {
      clearAccessToken();
      setAdmin(null);
      setToken(null);
    }
  }

  useEffect(() => {
    setLoading(true);
    void refreshMe().finally(() => setLoading(false));
  }, []);

  async function login(identifier: string, password: string, remember: boolean) {
    const res = await authApi.login({ identifier, password });
    setAccessToken(res.accessToken, remember);
    setToken(res.accessToken);
    setAdmin(res.admin);
  }

  function logout() {
    clearAccessToken();
    setToken(null);
    setAdmin(null);
  }

  const value = useMemo<AuthContextValue>(
    () => ({ admin, accessToken, loading, login, logout, refreshMe }),
    [admin, accessToken, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
