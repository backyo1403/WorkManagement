'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

/**
 * Which PIN-protected notebooks are currently unlocked.
 *
 * Unlocks live in sessionStorage keyed by the moment they happened, and expire
 * after two hours — so a notebook left open on a shared screen re-locks itself,
 * and closing the tab clears everything. The PIN itself is never held here; the
 * server verified it and this only records that it succeeded.
 */

const KEY = 'bachoffice.unlockedNotebooks';
export const NOTEBOOK_AUTO_LOCK_MS = 2 * 60 * 60 * 1000;

interface LockValue {
  isUnlocked: (notebookId: string | null | undefined) => boolean;
  markUnlocked: (notebookId: string) => void;
  lock: (notebookId: string) => void;
  lockAll: () => void;
}

const LockCtx = createContext<LockValue | null>(null);

export function useNotebookLocks() {
  const v = useContext(LockCtx);
  if (!v) throw new Error('useNotebookLocks must be used inside <NotebookLockProvider>');
  return v;
}

function read(): Record<string, number> {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(sessionStorage.getItem(KEY) ?? '{}') as Record<string, number>;
  } catch {
    return {};
  }
}

function write(map: Record<string, number>) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(map));
  } catch {
    // Private mode — the unlock simply won't survive a reload.
  }
}

export function NotebookLockProvider({ children }: { children: React.ReactNode }) {
  const [unlocked, setUnlocked] = useState<Record<string, number>>({});

  // Adopt stored unlocks after mount so server and client render the same tree.
  useEffect(() => {
    setUnlocked(read());
  }, []);

  // Sweep expired unlocks so a notebook visibly re-locks without a reload.
  useEffect(() => {
    const id = setInterval(() => {
      setUnlocked((cur) => {
        const now = Date.now();
        const next = Object.fromEntries(
          Object.entries(cur).filter(([, at]) => now - at < NOTEBOOK_AUTO_LOCK_MS),
        );
        if (Object.keys(next).length !== Object.keys(cur).length) {
          write(next);
          return next;
        }
        return cur;
      });
    }, 30_000);
    return () => clearInterval(id);
  }, []);

  const isUnlocked = useCallback(
    (notebookId: string | null | undefined) => {
      if (!notebookId) return true;
      const at = unlocked[notebookId];
      return !!at && Date.now() - at < NOTEBOOK_AUTO_LOCK_MS;
    },
    [unlocked],
  );

  const markUnlocked = useCallback((notebookId: string) => {
    setUnlocked((cur) => {
      const next = { ...cur, [notebookId]: Date.now() };
      write(next);
      return next;
    });
  }, []);

  const lock = useCallback((notebookId: string) => {
    setUnlocked((cur) => {
      const next = { ...cur };
      delete next[notebookId];
      write(next);
      return next;
    });
  }, []);

  const lockAll = useCallback(() => {
    setUnlocked({});
    write({});
  }, []);

  const value = useMemo<LockValue>(
    () => ({ isUnlocked, markUnlocked, lock, lockAll }),
    [isUnlocked, markUnlocked, lock, lockAll],
  );

  return <LockCtx.Provider value={value}>{children}</LockCtx.Provider>;
}
