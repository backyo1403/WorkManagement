'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useData } from './DataProvider';
import type { PersonDTO } from '@/lib/types';

/**
 * Login gate and idle auto-lock.
 *
 * The session id lives in sessionStorage, so closing the tab logs out and each
 * tab has its own session. This is a workspace lock, not a security boundary —
 * see the note on the login API route.
 */

const SESSION_KEY = 'bachoffice.session';

const IDLE_EVENTS: Array<keyof WindowEventMap> = [
  'mousemove', 'mousedown', 'keydown', 'touchstart', 'wheel', 'scroll',
];

interface AuthValue {
  user: PersonDTO | null;
  /** False until the stored session has been read, so we don't flash the login screen. */
  ready: boolean;
  error: string;
  login: (username: string, password: string) => Promise<boolean>;
  logout: (reason?: string) => void;
}

const AuthCtx = createContext<AuthValue | null>(null);

export function useAuth() {
  const v = useContext(AuthCtx);
  if (!v) throw new Error('useAuth must be used inside <AuthProvider>');
  return v;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { people, settings, loading } = useData();
  const [userId, setUserId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');

  // Restore the session once the people list is available to validate it against.
  useEffect(() => {
    if (loading) return;
    try {
      const stored = sessionStorage.getItem(SESSION_KEY);
      if (stored && people.some((p) => p.id === stored)) setUserId(stored);
    } catch {
      // sessionStorage unavailable — the user simply logs in again.
    }
    setReady(true);
  }, [loading, people]);

  const user = useMemo(() => people.find((p) => p.id === userId) ?? null, [people, userId]);

  const login = useCallback(async (username: string, password: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const body = (await res.json()) as { user?: PersonDTO; error?: string };
      if (!res.ok || !body.user) {
        setError(body.error ?? 'Sai tên đăng nhập hoặc mật khẩu');
        return false;
      }
      setUserId(body.user.id);
      setError('');
      try {
        sessionStorage.setItem(SESSION_KEY, body.user.id);
      } catch {
        // Non-fatal: the session just won't survive a reload.
      }
      return true;
    } catch {
      setError('Mất kết nối tới máy chủ');
      return false;
    }
  }, []);

  const logout = useCallback((reason = '') => {
    setUserId(null);
    setError(reason);
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch {
      // Nothing to clean up.
    }
  }, []);

  // Idle auto-lock. `autoLockMinutes = 0` disables it.
  useEffect(() => {
    const minutes = settings.autoLockMinutes;
    if (!userId || !minutes) return;

    let timer: ReturnType<typeof setTimeout>;
    const arm = () => {
      clearTimeout(timer);
      timer = setTimeout(() => logout('Phiên đã tự khoá do không hoạt động'), minutes * 60000);
    };
    IDLE_EVENTS.forEach((ev) => window.addEventListener(ev, arm, { passive: true }));
    arm();

    return () => {
      clearTimeout(timer);
      IDLE_EVENTS.forEach((ev) => window.removeEventListener(ev, arm));
    };
  }, [userId, settings.autoLockMinutes, logout]);

  const value = useMemo<AuthValue>(
    () => ({ user, ready: ready && !loading, error, login, logout }),
    [user, ready, loading, error, login, logout],
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}
