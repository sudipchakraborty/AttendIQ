import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { PropsWithChildren } from 'react';
import { api } from '../../shared/api';
import { errorMessage } from '../../shared/format';

export type Role = 'Admin' | 'HR' | 'Viewer';
export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  version: number;
}
interface Session {
  developmentBypass?: boolean;
  user: User | null;
  permissions: string[];
  setupRequired: boolean;
  csrfToken: string;
}
interface Auth extends Session {
  loading: boolean;
  error: string;
  refresh: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  setup: (body: { name: string; email: string; password: string; token: string }) => Promise<void>;
  logout: () => Promise<void>;
  can: (permission: string) => boolean;
}
const Context = createContext<Auth | null>(null);
export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session>({
    user: null,
    permissions: [],
    setupRequired: false,
    csrfToken: '',
  });
  const [loading, setLoading] = useState(true),
    [error, setError] = useState('');
  const refresh = useCallback(async () => {
    setError('');
    try {
      setSession(await api<Session>('/auth/session'));
    } catch (error) {
      setError(errorMessage(error));
      setSession((current) => ({ ...current, user: null, permissions: [] }));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void refresh();
    const expired = () => {
      setSession((current) => ({ ...current, user: null, permissions: [] }));
      void refresh();
    };
    window.addEventListener('attendiq:unauthorized', expired);
    return () => window.removeEventListener('attendiq:unauthorized', expired);
  }, [refresh]);
  const login = async (email: string, password: string) => {
    setSession(await api<Session>('/auth/login', 'POST', { email, password }));
  };
  const setup = async (body: { name: string; email: string; password: string; token: string }) => {
    setSession(await api<Session>('/auth/setup', 'POST', body));
  };
  const logout = async () => {
    await api('/auth/logout', 'POST');
    setSession((current) => ({ ...current, user: null, permissions: [] }));
    await refresh();
  };
  return (
    <Context.Provider
      value={{
        ...session,
        loading,
        error,
        refresh,
        login,
        setup,
        logout,
        can: (permission) => session.permissions.includes(permission),
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useAuth() {
  const context = useContext(Context);
  if (!context) throw new Error('Auth provider missing');
  return context;
}
