/** Message primitives shared by the dictionary and by the pure `lib` modules. */
import type { Locale, TranslationKey } from './translations';
import { DICTIONARIES } from './translations';

/**
 * A parameter value may be a primitive or another message. Nested messages let a sentence refer to
 * a phrase that itself needs translating, e.g. "…below the 4.5:1 threshold for {large text}".
 */
export type MessageParam = string | number | Message;
export type MessageParams = Readonly<Record<string, MessageParam>>;

/** A translatable message: a dictionary key plus the values to interpolate into it. */
export interface Message {
  readonly key: TranslationKey;
  readonly params?: MessageParams;
}

/** Builds a message without repeating the type name at every call site. */
export function msg(key: TranslationKey, params?: MessageParams): Message {
  return params === undefined ? { key } : { key, params };
}

/**
 * Replaces `{name}` placeholders. Nested messages are resolved with the same dictionary, unknown
 * placeholders are left untouched (so a typo is visible rather than silent), and a single pass is
 * enough because resolution is recursive per parameter.
 */
export function interpolate(template: string, params?: MessageParams, locale: Locale = 'en'): string {
  if (!params) return template;
  const dict = DICTIONARIES[locale];
  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = params[name];
    if (value === undefined) return match;
    if (typeof value === 'object') {
      return interpolate(dict[value.key], value.params, locale);
    }
    return String(value);
  });
}
