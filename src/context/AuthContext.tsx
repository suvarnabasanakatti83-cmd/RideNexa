import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { AuthUser, DriverRecord, UserRole } from '../types/ridenexa';

const TOKEN_KEY = 'ridenexa_jwt_token';

interface AuthContextValue {
  user: AuthUser | null;
  driverProfile: DriverRecord | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (payload: {
    name: string;
    email: string;
    password: string;
    role: UserRole;
    phone?: string;
    vehicleModel?: string;
    plateNumber?: string;
  }) => Promise<AuthUser>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
  apiFetch: <T>(url: string, options?: RequestInit) => Promise<T>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState<AuthUser | null>(null);
  const [driverProfile, setDriverProfile] = useState<DriverRecord | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const apiFetch = useCallback(
    async <T,>(url: string, options: RequestInit = {}): Promise<T> => {
      const headers = new Headers(options.headers || {});
      if (!headers.has('Content-Type') && options.body) {
        headers.set('Content-Type', 'application/json');
      }
      const activeToken = token || localStorage.getItem(TOKEN_KEY);
      if (activeToken && !headers.has('Authorization')) {
        headers.set('Authorization', `Bearer ${activeToken}`);
      }

      const response = await fetch(url, { ...options, headers });
      const data = await response.json().catch(() => ({}));
      if (response.status === 401) {
        localStorage.removeItem(TOKEN_KEY);
        setToken(null);
        setUser(null);
        setDriverProfile(null);
      }
      if (!response.ok) {
        throw new Error(data.error || `Request failed (${response.status})`);
      }
      return data as T;
    },
    [token]
  );

  const refreshProfile = useCallback(async () => {
    const stored = localStorage.getItem(TOKEN_KEY);
    if (!stored) {
      setUser(null);
      setDriverProfile(null);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${stored}` },
      });
      if (!res.ok) {
        localStorage.removeItem(TOKEN_KEY);
        setToken(null);
        setUser(null);
        setDriverProfile(null);
      } else {
        const data = (await res.json()) as { user: AuthUser; driverProfile: DriverRecord | null };
        setUser(data.user);
        setDriverProfile(data.driverProfile);
      }
    } catch {
      // Keep current state on transient network glitch
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshProfile();
  }, [refreshProfile]);

  const login = useCallback(async (email: string, password: string): Promise<AuthUser> => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'Unable to sign in.');
    }
    localStorage.setItem(TOKEN_KEY, data.token);
    setToken(data.token);
    setUser(data.user);
    setDriverProfile(data.driverProfile || null);
    return data.user as AuthUser;
  }, []);

  const register = useCallback(
    async (payload: {
      name: string;
      email: string;
      password: string;
      role: UserRole;
      phone?: string;
      vehicleModel?: string;
      plateNumber?: string;
    }): Promise<AuthUser> => {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Unable to create account.');
      }
      localStorage.setItem(TOKEN_KEY, data.token);
      setToken(data.token);
      setUser(data.user);
      setDriverProfile(data.driverProfile || null);
      return data.user as AuthUser;
    },
    []
  );

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
    setDriverProfile(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        driverProfile,
        token,
        loading,
        login,
        register,
        logout,
        refreshProfile,
        apiFetch,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
