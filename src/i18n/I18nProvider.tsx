import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { DICTIONARIES, LOCALE_LABELS } from './translations';
import type { Locale } from './translations';
import { interpolate } from './messages';
import type { Message, MessageParams } from './messages';
import { I18nContext } from './context';
import type { I18nApi } from './context';

const STORAGE_KEY = 'contrastjudge:locale';

/** Picks Chinese when the browser asks for it, English otherwise. */
function detectLocale(): Locale {
  if (typeof navigator !== 'undefined') {
    const languages = navigator.languages?.length ? navigator.languages : [navigator.language];
    for (const tag of languages) {
      if (typeof tag === 'string' && tag.toLowerCase().startsWith('zh')) return 'zh';
    }
  }
  return 'en';
}

function readStoredLocale(): Locale | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === 'en' || raw === 'zh') return raw;
    if (raw && raw.startsWith('"')) {
      const parsed: unknown = JSON.parse(raw);
      if (parsed === 'en' || parsed === 'zh') return parsed;
    }
  } catch {
    /* storage may be blocked; fall through to detection */
  }
  return null;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => readStoredLocale() ?? detectLocale());

  const setLocale = useCallback((next: Locale) => setLocaleState(next), []);
  const toggleLocale = useCallback(() => setLocaleState((current) => (current === 'zh' ? 'en' : 'zh')), []);

  useEffect(() => {
    document.documentElement.lang = LOCALE_LABELS[locale].htmlLang;
    try {
      window.localStorage.setItem(STORAGE_KEY, locale);
    } catch {
      /* the switch still works for this session */
    }
  }, [locale]);

  const t = useCallback(
    (key: Parameters<I18nApi['t']>[0], params?: MessageParams) =>
      interpolate(DICTIONARIES[locale][key], params, locale),
    [locale],
  );

  const tm = useCallback(
    (message: Message | null | undefined) => (message ? t(message.key, message.params) : ''),
    [t],
  );

  const value = useMemo<I18nApi>(
    () => ({ locale, setLocale, toggleLocale, t, tm }),
    [locale, setLocale, toggleLocale, t, tm],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
