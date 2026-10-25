import { describe, expect, it } from 'vitest';
import { DICTIONARIES, LOCALE_LABELS, LOCALES } from '../src/i18n/translations';
import { createTranslator, translateMessage } from '../src/i18n/format';
import { interpolate, msg } from '../src/i18n/messages';

describe('locale catalogue', () => {
  it('ships exactly two locales, each with valid HTML lang codes', () => {
    expect([...LOCALES]).toEqual(['en', 'zh']);
    expect(LOCALE_LABELS.en.htmlLang).toBe('en');
    expect(LOCALE_LABELS.zh.htmlLang).toBe('zh-CN');
  });

  it('has the same key set in every dictionary', () => {
    const englishKeys = Object.keys(DICTIONARIES.en).sort();
    const chineseKeys = Object.keys(DICTIONARIES.zh).sort();
    expect(chineseKeys).toEqual(englishKeys);
    expect(englishKeys.length).toBeGreaterThan(250);
  });

  it('never leaves a value empty or accidentally English in the Chinese dictionary', () => {
    const englishOnly = new Set([
      // Deliberately untranslated: proper nouns, criterion numbers, code samples, ratio formats.
      'header.languageShort',
      'hero.badgeStandard',
      'hero.badgeCriteria',
      'tabs.method',
      'footer.github',
      'footer.wcag',
      'language.switchedToEn',
      'learn.refMachado',
      'colorField.alpha',
      'colorField.placeholder',
      'colorField.parsedAs',
      'batch.downloadCsv',
      'batch.colAa',
      'batch.colAaa',
    ]);
    for (const [key, value] of Object.entries(DICTIONARIES.zh)) {
      expect(value.length, key).toBeGreaterThan(0);
      if (englishOnly.has(key)) continue;
      // Any remaining ASCII-heavy string would be an untranslated leak.
      const hasCjk = /[\u4e00-\u9fff]/.test(value);
      expect(hasCjk, `key ${key} is not translated: ${value}`).toBe(true);
    }
  });

  it('uses the same placeholders in both languages', () => {
    const placeholders = (value: string) => [...value.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();
    for (const key of Object.keys(DICTIONARIES.en) as (keyof typeof DICTIONARIES.en)[]) {
      expect(placeholders(DICTIONARIES.zh[key]), `placeholder mismatch for ${key}`).toEqual(
        placeholders(DICTIONARIES.en[key]),
      );
    }
  });
});

describe('interpolate', () => {
  it('replaces named placeholders', () => {
    expect(interpolate('Ratio {ratio} at level {level}', { ratio: '4.54:1', level: 'AA' })).toBe(
      'Ratio 4.54:1 at level AA',
    );
  });

  it('leaves unknown placeholders visible instead of dropping them', () => {
    expect(interpolate('Hello {name}', {})).toBe('Hello {name}');
  });

  it('resolves nested messages', () => {
    const translated = interpolate(
      'below the {threshold}:1 threshold for {target}',
      { threshold: 4.5, target: msg('result.targetLargeText') },
      'en',
    );
    expect(translated).toBe('below the 4.5:1 threshold for large text');
  });

  it('resolves nested messages in the target language', () => {
    const translated = interpolate('{target}', { target: msg('result.targetLargeText') }, 'zh');
    expect(translated).toBe('大号文本要求的');
  });

  it('handles numeric and string params side by side', () => {
    expect(interpolate('{a}-{b}', { a: 1, b: 'two' })).toBe('1-two');
  });
});

describe('translators', () => {
  it('builds a translator per locale that resolves keys and params', () => {
    const en = createTranslator('en');
    const zh = createTranslator('zh');
    expect(en('common.pass')).toBe('Pass');
    expect(zh('common.pass')).toBe('通过');
    expect(en('result.targetLine', { threshold: 4.5, size: en('result.sizeLarge'), level: 'AA' })).toBe(
      'Target 4.5:1 · large text · Level AA',
    );
    expect(zh('result.targetLine', { threshold: 4.5, size: zh('result.sizeLarge'), level: 'AA' })).toBe(
      '目标 4.5:1 · 大号文本 · 等级 AA',
    );
  });

  it('translates Message objects', () => {
    const zh = createTranslator('zh');
    expect(translateMessage(zh, msg('suggest.alreadyPasses'))).toBe('已达标');
  });

  it('never returns an undefined placeholder for real messages', () => {
    for (const locale of LOCALES) {
      const t = createTranslator(locale);
      // Both dictionaries are typed against the English key set, so indexing by the English keys
      // covers everything the translator can be asked for.
      const keys = Object.keys(DICTIONARIES.en) as (keyof typeof DICTIONARIES.en)[];
      for (const key of keys) {
        const rendered = t(key, {});
        expect(rendered).not.toContain('undefined');
      }
    }
  });
});
