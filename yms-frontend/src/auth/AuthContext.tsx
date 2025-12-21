import type { ReactNode } from 'react';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';

import * as authApi from '../api/auth';
import { clearAccessToken, getAccessToken, setAccessToken } from './token';

export type AuthState = {
  user: authApi.UserDto | null;
  accessToken: string | null;
  loading: boolean;
};

type AuthContextValue = AuthState & {
  login: (identifier: string, password: string, remember: boolean) => Promise<void>;
  logout: () => void;
  refreshMe: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<authApi.UserDto | null>(null);
  const [accessToken, setToken] = useState<string | null>(() => getAccessToken());
  const [loading, setLoading] = useState<boolean>(true);

  async function refreshMe() {
    const token = getAccessToken();
    if (!token) {
      setUser(null);
      setToken(null);
      return;
    }

    try {
      const a = await authApi.me();
      setUser(a);
      setToken(token);
    } catch {
      clearAccessToken();
      setUser(null);
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
    setUser(res.user);
  }

  function logout() {
    clearAccessToken();
    setToken(null);
    setUser(null);
  }

  const value = useMemo<AuthContextValue>(
    () => ({ user, accessToken, loading, login, logout, refreshMe }),
    [user, accessToken, loading],
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
