import { interpolate } from './messages';
import type { Message, MessageParams } from './messages';
import { DICTIONARIES } from './translations';
import type { Locale, TranslationKey } from './translations';

/** The minimal translator surface used by pure formatting helpers. */
export type Translator = (key: TranslationKey, params?: MessageParams) => string;

/** Builds a translator for a locale without React — used by tests and by the report exporters. */
export function createTranslator(locale: Locale): Translator {
  const dict = DICTIONARIES[locale];
  return (key, params) => interpolate(dict[key], params, locale);
}

/** Resolves a `Message` (key + params) to text. */
export function translateMessage(t: Translator, message: Message): string {
  return t(message.key, message.params);
}
