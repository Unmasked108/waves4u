'use client';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { api } from './client';
import { track } from './analytics';
import type { Me } from './types';

export type LoginResult = { twoFactorRequired?: boolean; ticket?: string };

type Ctx = {
  me: Me | null;
  loading: boolean;
  /** Set when this browser was signed out because the account logged in on another device. */
  signedOutElsewhere: boolean;
  login: (email: string, password: string) => Promise<LoginResult>;
  login2fa: (ticket: string, code: string) => Promise<void>;
  register: (data: { name: string; email: string; phone?: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  reload: () => Promise<void>;
};
const AuthCtx = createContext<Ctx>(null as unknown as Ctx);
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [signedOutElsewhere, setElsewhere] = useState(false);

  // Asks the backend who is logged in. The backend answers 200 even for visitors ({ user: null })
  // and renews an expired 15-minute login by itself.
  const reload = useCallback(async () => {
    try {
      const d = await api<any>('/auth/session');
      setMe(d.user ? (d as Me) : null);
      if (d.signedOutElsewhere) setElsewhere(true);
      if (d.refreshed) router.refresh(); // login was just renewed: re-render server pages with it
    } catch {
      setMe(null);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { reload(); }, [reload]);

  const done = async () => { setElsewhere(false); await reload(); router.refresh(); };

  const value: Ctx = {
    me, loading, reload, signedOutElsewhere,
    login: async (email, password) => {
      const r = await api<LoginResult>('/auth/login', { method: 'POST', body: { email, password } });
      if (!r.twoFactorRequired) { await done(); track('login', { method: 'email' }); }
      return r;
    },
    login2fa: async (ticket, code) => {
      await api('/auth/login/2fa', { method: 'POST', body: { ticket, code } });
      await done();
      track('login', { method: 'email_2fa' });
    },
    register: async (data) => {
      await api('/auth/register', { method: 'POST', body: data });
      await done();
      track('sign_up', { method: 'email' });
    },
    logout: async () => { await api('/auth/logout', { method: 'POST' }).catch(() => {}); setMe(null); router.push('/'); router.refresh(); },
  };
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}
