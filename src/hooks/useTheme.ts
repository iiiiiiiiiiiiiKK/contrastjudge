import { useCallback, useEffect, useState } from 'react';

export type ThemeMode = 'light' | 'dark';

const STORAGE_KEY = 'contrastjudge:theme';

function readInitialTheme(): ThemeMode {
  if (typeof document === 'undefined') return 'light';
  const attr = document.documentElement.dataset.theme;
  if (attr === 'light' || attr === 'dark') return attr;
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'light';
}

/**
 * Theme state synced to <html data-theme> and localStorage. The inline script in index.html
 * applies the same value before first paint, so this hook only has to keep it in sync.
 */
export function useTheme(): { theme: ThemeMode; setTheme: (mode: ThemeMode) => void; toggle: () => void } {
  const [theme, setThemeState] = useState<ThemeMode>(readInitialTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      window.localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* storage may be blocked; the theme still works for this session */
    }
  }, [theme]);

  const setTheme = useCallback((mode: ThemeMode) => setThemeState(mode), []);
  const toggle = useCallback(() => setThemeState((current) => (current === 'dark' ? 'light' : 'dark')), []);

  return { theme, setTheme, toggle };
}
