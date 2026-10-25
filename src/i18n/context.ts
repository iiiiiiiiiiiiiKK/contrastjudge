import { createContext, useContext } from 'react';
import type { Locale, TranslationKey } from './translations';
import type { Message, MessageParams } from './messages';

export interface I18nApi {
  readonly locale: Locale;
  readonly setLocale: (locale: Locale) => void;
  readonly toggleLocale: () => void;
  /** Translate a key, with optional `{placeholder}` values (values may be nested messages). */
  readonly t: (key: TranslationKey, params?: MessageParams) => string;
  /** Translate a pre-built message object (used by the pure lib modules). */
  readonly tm: (message: Message | null | undefined) => string;
}

export const I18nContext = createContext<I18nApi | null>(null);

export function useI18n(): I18nApi {
  const context = useContext(I18nContext);
  if (!context) throw new Error('useI18n must be used inside an I18nProvider');
  return context;
}
