import axios from 'axios';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import {
  clearAuthSession,
  getAuthToken,
  getStoredUser,
  saveAuthSession,
} from '@/lib/auth-token';

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: 'member' | 'admin';
};

type AuthContextValue = {
  user: AuthUser | null;
  isReady: boolean;
  signIn: (user: AuthUser, token: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let active = true;

    async function restoreSession() {
      try {
        const [token, storedUser] = await Promise.all([getAuthToken(), getStoredUser()]);
        if (!token || !storedUser) {
          await clearAuthSession();
          return;
        }

        // Keep the saved identity available while validating the short-lived JWT.
        if (active) setUser(storedUser);

        try {
          const response = await api.get<{ user?: { userId?: string; email?: string; role?: 'member' | 'admin' } }>('/auth/me');
          const serverUser = response.data.user;
          if (serverUser?.userId && serverUser.email && serverUser.role && active) {
            const restoredUser = { ...storedUser, id: serverUser.userId, email: serverUser.email, role: serverUser.role };
            setUser(restoredUser);
            await saveAuthSession(restoredUser, token);
          }
        } catch (error) {
          if (axios.isAxiosError(error) && error.response?.status === 401) {
            await clearAuthSession();
            if (active) setUser(null);
          }
          // Keep the saved profile on connection/server errors; discovery can show its own API state.
        }
      } finally {
        if (active) setIsReady(true);
      }
    }

    void restoreSession();
    return () => { active = false; };
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    isReady,
    signIn: async (nextUser, token) => {
      await saveAuthSession(nextUser, token);
      setUser(nextUser);
    },
    signOut: async () => {
      await clearAuthSession();
      setUser(null);
    },
  }), [user, isReady]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
