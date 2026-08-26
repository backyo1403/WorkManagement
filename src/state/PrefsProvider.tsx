'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { makeT, type TranslateFn } from '@/lib/i18n';
import { groupDef, type GroupKey, type Lang, type Theme, type WorkGroupDef } from '@/lib/types';

/**
 * Display preferences that must survive a reload and apply before first paint:
 * light/dark theme, the active work group, and the UI language.
 *
 * They live in localStorage (read by the inline script in layout.tsx so there is
 * no flash of the wrong theme) and are mirrored into the Settings row by the
 * pages that change them, so a fresh browser picks up the same choice.
 */

const THEME_KEY = 'bachoffice.theme';
const GROUP_KEY = 'bachoffice.group';
const LANG_KEY = 'bachoffice.lang';

interface PrefsValue {
  theme: Theme;
  toggleTheme: () => void;
  /** '' means "all groups". */
  group: GroupKey | '';
  groupInfo: WorkGroupDef | null;
  /** Selecting the group that is already active clears the filter. */
  setGroup: (key: GroupKey) => void;
  clearGroup: () => void;
  lang: Lang;
  setLang: (l: Lang) => void;
  t: TranslateFn;
}

const PrefsCtx = createContext<PrefsValue | null>(null);

export function usePrefs() {
  const v = useContext(PrefsCtx);
  if (!v) throw new Error('usePrefs must be used inside <PrefsProvider>');
  return v;
}

function readStored<T extends string>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    return (localStorage.getItem(key) as T) ?? fallback;
  } catch {
    return fallback;
  }
}

export function PrefsProvider({ children }: { children: React.ReactNode }) {
  // Start from the server-rendered defaults, then adopt the stored values in an
  // effect — reading localStorage during render would break hydration.
  const [theme, setTheme] = useState<Theme>('light');
  const [group, setGroupState] = useState<GroupKey | ''>('');
  const [lang, setLangState] = useState<Lang>('vi');

  useEffect(() => {
    const stored = readStored<Theme>(THEME_KEY, '' as Theme);
    const attr = document.documentElement.getAttribute('data-theme') as Theme | null;
    setTheme(stored || attr || 'light');
    setGroupState(readStored<GroupKey | ''>(GROUP_KEY, ''));
    setLangState(readStored<Lang>(LANG_KEY, 'vi'));
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    if (group) document.documentElement.setAttribute('data-group', group);
    else document.documentElement.removeAttribute('data-group');
  }, [group]);

  const persist = (key: string, value: string) => {
    try {
      localStorage.setItem(key, value);
    } catch {
      // Private mode or a full quota — the app still works for this session.
    }
  };

  const toggleTheme = useCallback(() => {
    setTheme((cur) => {
      const next: Theme = cur === 'dark' ? 'light' : 'dark';
      persist(THEME_KEY, next);
      return next;
    });
  }, []);

  const setGroup = useCallback((key: GroupKey) => {
    setGroupState((cur) => {
      const next = cur === key ? '' : key;
      persist(GROUP_KEY, next);
      return next;
    });
  }, []);

  const clearGroup = useCallback(() => {
    setGroupState('');
    persist(GROUP_KEY, '');
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    persist(LANG_KEY, l);
  }, []);

  const value = useMemo<PrefsValue>(
    () => ({
      theme,
      toggleTheme,
      group,
      groupInfo: groupDef(group),
      setGroup,
      clearGroup,
      lang,
      setLang,
      t: makeT(lang),
    }),
    [theme, toggleTheme, group, setGroup, clearGroup, lang, setLang],
  );

  return <PrefsCtx.Provider value={value}>{children}</PrefsCtx.Provider>;
}
