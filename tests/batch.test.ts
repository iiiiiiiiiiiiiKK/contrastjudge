import { describe, expect, it } from 'vitest';
import { BATCH_EXAMPLE, evaluateBatch, extractBatchColors, parseBatch, summarizeBatch } from '../src/lib/batch';
import { createTranslator, translateMessage } from '../src/i18n/format';

const tEn = createTranslator('en');
const tZh = createTranslator('zh');
const tm = (message: Parameters<typeof translateMessage>[1]) => translateMessage(tEn, message);
const tmZh = (message: Parameters<typeof translateMessage>[1]) => translateMessage(tZh, message);

describe('parseBatch', () => {
  it('parses the documented line formats', () => {
    const { rows, issues } = parseBatch(
      [
        '#111111 #ffffff',
        '#111111, #ffffff, Primary button',
        '#111111 on #ffffff',
        '#111111 -> #ffffff | Card title',
        'rgb(17 17 17) on hsl(0 0% 100%)',
      ].join('\n'),
    );
    expect(issues).toHaveLength(0);
    expect(rows).toHaveLength(5);
    expect(rows[0]?.foreground).toEqual({ r: 17, g: 17, b: 17, a: 1 });
    expect(rows[0]?.background).toEqual({ r: 255, g: 255, b: 255, a: 1 });
    expect(rows[1]?.label).toBe('Primary button');
    expect(rows[3]?.label).toBe('Card title');
    expect(rows[4]?.foreground).toEqual({ r: 17, g: 17, b: 17, a: 1 });
    expect(rows[4]?.background).toEqual({ r: 255, g: 255, b: 255, a: 1 });
  });

  it('skips blank lines and comment lines', () => {
    const { rows, issues } = parseBatch('\n\n// a comment\n; another\n#111 on #fff\n\n');
    expect(rows).toHaveLength(1);
    expect(issues).toHaveLength(0);
  });

  it('reports each unparseable line with its number and a translatable reason', () => {
    const { rows, issues } = parseBatch(
      ['#111 on #fff', 'only-one-colour', '#zzz on #fff', '#111 on #zzz'].join('\n'),
    );
    expect(rows).toHaveLength(1);
    expect(issues).toHaveLength(3);
    expect(issues[0]?.line).toBe(2);
    expect(tm(issues[0]!.message)).toMatch(/two colours/i);
    expect(tm(issues[1]!.message)).toMatch(/^Foreground: /);
    expect(tm(issues[2]!.message)).toMatch(/^Background: /);
    // The Chinese dictionary must cover the same keys, otherwise the UI would show English.
    expect(tmZh(issues[0]!.message)).toMatch(/找不到两个颜色/);
  });

  it('labels unnamed rows by line number', () => {
    const { rows } = parseBatch('#111 on #fff');
    // Unnamed rows carry a "#n" marker that the UI renders as "Line n" / "第 n 行".
    expect(rows[0]?.label).toBe('#1');
  });

  it('respects default font settings', () => {
    const { rows } = parseBatch('#111 on #fff', { fontSizePx: 24, bold: true });
    expect(rows[0]?.fontSizePx).toBe(24);
    expect(rows[0]?.bold).toBe(true);
  });

  it('parses the built-in example without issues', () => {
    const { rows, issues } = parseBatch(BATCH_EXAMPLE);
    expect(issues).toHaveLength(0);
    expect(rows.length).toBeGreaterThanOrEqual(4);
  });
});

describe('evaluateBatch', () => {
  const results = evaluateBatch(
    parseBatch(['#0f172a on #ffffff, Passes everything', '#9aa4b2 on #ffffff, Muted fails'].join('\n')).rows,
  );

  it('computes ratios and all five thresholds per row', () => {
    expect(results).toHaveLength(2);
    expect(results[0]?.ratio).toBeCloseTo(17.85, 2);
    expect(results[0]?.results).toHaveLength(5);
    expect(results[0]?.passesAaNormal).toBe(true);
    expect(results[0]?.passesAaaNormal).toBe(true);
    expect(results[0]?.passesNonText).toBe(true);
  });

  it('marks failing rows and records the worst failure', () => {
    const muted = results[1];
    expect(muted?.passesAaNormal).toBe(false);
    expect(muted?.passesNonText).toBe(false);
    expect(muted?.worstFailure).toBeTruthy();
    expect(muted?.foregroundHex).toBe('#9AA4B2');
  });

  it('explains each threshold outcome in both languages', () => {
    for (const row of results) {
      for (const threshold of row.results) {
        const english = tm(threshold.explanation);
        expect(english).toMatch(/Passes|Fails/);
        expect(english).toContain(`${threshold.threshold}:1`);
        expect(tmZh(threshold.explanation)).toMatch(/通过|未通过/);
      }
    }
  });
});

describe('summarizeBatch', () => {
  it('returns null for an empty batch', () => {
    expect(summarizeBatch([])).toBeNull();
  });

  it('counts failures and ratio extremes', () => {
    const summary = summarizeBatch(
      evaluateBatch(parseBatch(['#0f172a on #ffffff', '#9aa4b2 on #ffffff', '#ffffff on #2563eb'].join('\n')).rows),
    );
    expect(summary?.total).toBe(3);
    expect(summary?.failingAaNormal).toBeGreaterThanOrEqual(1);
    expect(summary?.bestRatio).toBeCloseTo(17.85, 2);
    expect(summary?.worstRatio).toBeLessThan(5);
  });
});

describe('extractBatchColors', () => {
  it('de-duplicates colours by hex value', () => {
    const rows = parseBatch(['#fff on #fff', '#000 on #fff', 'white on #000'].join('\n')).rows;
    const colors = extractBatchColors(rows);
    expect(colors).toHaveLength(2);
  });
});
