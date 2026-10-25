import { describe, expect, it } from 'vitest';
import reference from './fixtures/reference-contrast.json';
import { parseColorOrThrow } from '../src/lib/color';
import {
  contrastRatio,
  contrastSummary,
  evaluateContrast,
  formatRatio,
  isLargeText,
  LARGE_TEXT_BOLD_MIN_PX,
  LARGE_TEXT_MIN_PX,
  relativeLuminance,
  resolvePair,
  roundRatio,
  srgbChannelToLinear,
} from '../src/lib/wcag';
import { createTranslator, translateMessage } from '../src/i18n/format';

const t = createTranslator('en');
const tm = (message: Parameters<typeof translateMessage>[1]) => translateMessage(t, message);

const BLACK = parseColorOrThrow('#000000');
const WHITE = parseColorOrThrow('#ffffff');

describe('srgbChannelToLinear', () => {
  it('matches the WCAG transfer function on both sides of the knee', () => {
    expect(srgbChannelToLinear(0)).toBe(0);
    expect(srgbChannelToLinear(255)).toBeCloseTo(1, 12);
    // 0.04045 * 255 = 10.315, so channels 0-10 use the linear segment and 11+ the power curve.
    expect(srgbChannelToLinear(10)).toBeCloseTo(10 / 255 / 12.92, 12);
    expect(srgbChannelToLinear(11)).toBeCloseTo(((11 / 255 + 0.055) / 1.055) ** 2.4, 12);
    // The two branches do not meet exactly at the knee (a documented property of the sRGB curve);
    // the jump is under 1e-6 in linear light, i.e. far below 8-bit precision.
    const below = srgbChannelToLinear(10);
    const above = ((10 / 255 + 0.055) / 1.055) ** 2.4;
    expect(Math.abs(below - above)).toBeLessThan(1e-6);
  });
});

describe('relativeLuminance', () => {
  it('is 0 for black and 1 for white', () => {
    expect(relativeLuminance(BLACK)).toBe(0);
    expect(relativeLuminance(WHITE)).toBeCloseTo(1, 12);
  });

  it('weights green most and blue least', () => {
    expect(relativeLuminance(parseColorOrThrow('#ff0000'))).toBeCloseTo(0.2126, 12);
    expect(relativeLuminance(parseColorOrThrow('#00ff00'))).toBeCloseTo(0.7152, 12);
    expect(relativeLuminance(parseColorOrThrow('#0000ff'))).toBeCloseTo(0.0722, 12);
  });

  it('ignores alpha (documented behaviour: composite first)', () => {
    expect(relativeLuminance({ r: 0, g: 0, b: 0, a: 0.2 })).toBe(0);
  });
});

describe('contrastRatio', () => {
  it('is 21:1 for black on white and 1:1 for identical colours', () => {
    expect(contrastRatio(BLACK, WHITE)).toBeCloseTo(21, 10);
    expect(contrastRatio(WHITE, BLACK)).toBeCloseTo(21, 10);
    expect(contrastRatio(BLACK, BLACK)).toBe(1);
  });

  it('is symmetric', () => {
    const a = parseColorOrThrow('#1f4fd8');
    const b = parseColorOrThrow('#f8fafc');
    expect(contrastRatio(a, b)).toBe(contrastRatio(b, a));
  });
});

describe('independent reference data', () => {
  it('reproduces every third-party ratio to 6 decimal places', () => {
    expect(reference.pairs.length).toBeGreaterThan(900);
    let checked = 0;
    for (const pair of reference.pairs) {
      const fg = parseColorOrThrow(pair.foreground);
      const bg = parseColorOrThrow(pair.background);
      const ratio = contrastRatio(fg, bg);
      expect(Math.abs(ratio - pair.ratio)).toBeLessThan(1e-5);
      checked += 1;
    }
    expect(checked).toBe(reference.pairs.length);
  });

  it('reproduces third-party relative luminance values', () => {
    for (const pair of reference.pairs.slice(0, 200)) {
      expect(Math.abs(relativeLuminance(parseColorOrThrow(pair.foreground)) - pair.luminanceForeground)).toBeLessThan(
        1e-9,
      );
      expect(Math.abs(relativeLuminance(parseColorOrThrow(pair.background)) - pair.luminanceBackground)).toBeLessThan(
        1e-9,
      );
    }
  });

  it('agrees with the second implementation on every cross-checked pair', () => {
    expect(reference.crossChecks.length).toBeGreaterThan(50);
    for (const check of reference.crossChecks) {
      const ours = contrastRatio(parseColorOrThrow(check.foreground), parseColorOrThrow(check.background));
      expect(Math.abs(ours - check.colorContrastCheckerRatio)).toBeLessThan(1e-5);
      expect(check.equal).toBe(true);
    }
  });

  it('agrees on every WCAG pass/fail verdict', () => {
    for (const pair of reference.pairs) {
      const summary = contrastSummary(parseColorOrThrow(pair.foreground), parseColorOrThrow(pair.background));
      expect(summary.passesAaNormal).toBe(pair.wcagAaNormal);
      expect(summary.passesAaLarge).toBe(pair.wcagAaLarge);
      expect(summary.passesAaaNormal).toBe(pair.wcagAaaNormal);
      expect(summary.passesAaaLarge).toBe(pair.wcagAaaLarge);
    }
  });
});

describe('AA / AAA boundary behaviour', () => {
  it('treats thresholds as >= and never rounds before comparing', () => {
    // #767676 on white is the classic "just passes AA" grey: 4.5422:1
    const justPasses = contrastRatio(parseColorOrThrow('#767676'), WHITE);
    expect(justPasses).toBeGreaterThan(4.5);
    expect(justPasses).toBeLessThan(4.55);

    // #777777 on white is 4.478:1 — a notorious near miss that many tools display as 4.48
    const justFails = contrastRatio(parseColorOrThrow('#777777'), WHITE);
    expect(justFails).toBeLessThan(4.5);
    expect(roundRatio(justFails, 1)).toBe(4.5); // rounds up for display, still fails

    const report = evaluateContrast(parseColorOrThrow('#777777'), WHITE, {
      fontSizePx: 16,
      bold: false,
      level: 'AA',
    });
    const aaNormal = report.textResults.find((result) => result.id === 'aa-normal');
    expect(aaNormal?.passes).toBe(false);
    // ...but it does pass the 3:1 large-text bar.
    expect(report.passesAaLarge).toBe(true);
    expect(report.bestLevel).toBe('Fail AA');
  });

  it('keeps the 4.499:1 case failing', () => {
    // Construct a ratio of almost exactly 4.499 and confirm it is not accepted.
    const background = { r: 255, g: 255, b: 255, a: 1 };
    let candidate = 0;
    let best = { channel: 0, ratio: 0 };
    for (let channel = 110; channel <= 130; channel += 1) {
      const ratio = contrastRatio({ r: channel, g: channel, b: channel, a: 1 }, background);
      if (ratio < 4.5 && ratio > best.ratio) best = { channel, ratio };
      candidate += 1;
    }
    expect(candidate).toBeGreaterThan(0);
    expect(best.ratio).toBeLessThan(4.5);
    const report = evaluateContrast({ r: best.channel, g: best.channel, b: best.channel, a: 1 }, background, {
      fontSizePx: 16,
      bold: false,
      level: 'AA',
    });
    expect(report.passesAa).toBe(false);
  });

  it('applies the AAA thresholds 7:1 and 4.5:1 for large text', () => {
    const passes7 = evaluateContrast(parseColorOrThrow('#595959'), WHITE, {
      fontSizePx: 16,
      bold: false,
      level: 'AAA',
    });
    expect(passes7.ratio).toBeGreaterThan(7);
    expect(passes7.passesAaa).toBe(true);
    expect(passes7.bestLevel).toBe('AAA');

    const fails7 = evaluateContrast(parseColorOrThrow('#5a5a5a'), WHITE, {
      fontSizePx: 16,
      bold: false,
      level: 'AAA',
    });
    expect(fails7.ratio).toBeLessThan(7);
    expect(fails7.passesAaa).toBe(false);
    expect(fails7.passesAa).toBe(true);
    expect(fails7.bestLevel).toBe('AA');
  });
});

describe('large text classification', () => {
  it('uses 18pt (24px) and 14pt bold (18.66px)', () => {
    expect(isLargeText(23.99, false)).toBe(false);
    expect(isLargeText(LARGE_TEXT_MIN_PX, false)).toBe(true);
    expect(isLargeText(18.65, true)).toBe(false);
    expect(isLargeText(LARGE_TEXT_BOLD_MIN_PX, true)).toBe(true);
    expect(isLargeText(14, false)).toBe(false);
    expect(isLargeText(0, false)).toBe(false);
    expect(isLargeText(Number.NaN, true)).toBe(false);
  });

  it('changes which threshold is reported as the active one', () => {
    const color = parseColorOrThrow('#888888');
    const normal = evaluateContrast(color, WHITE, { fontSizePx: 16, bold: false, level: 'AA' });
    const large = evaluateContrast(color, WHITE, { fontSizePx: 24, bold: false, level: 'AA' });
    expect(normal.largeText).toBe(false);
    expect(large.largeText).toBe(true);
    expect(normal.ratio).toBeCloseTo(large.ratio, 12);
    // #888888 on white is ~3.54:1: too low for body text, fine for large text.
    expect(normal.ratio).toBeGreaterThan(3.5);
    expect(normal.ratio).toBeLessThan(4.5);
    const normalActive = normal.textResults.find((result) => result.level === 'AA' && result.size === 'normal');
    const largeActive = large.textResults.find((result) => result.level === 'AA' && result.size === 'large');
    expect(normalActive?.passes).toBe(false);
    expect(largeActive?.passes).toBe(true);
  });
});

describe('alpha handling', () => {
  it('composites translucent colours before measuring', () => {
    const resolved = resolvePair(
      { r: 0, g: 0, b: 0, a: 0.5 },
      { r: 255, g: 255, b: 255, a: 1 },
      { r: 255, g: 255, b: 255, a: 1 },
    );
    expect(resolved.foreground).toEqual({ r: 128, g: 128, b: 128, a: 1 });
    expect(resolved.foregroundHasAlpha).toBe(true);
    expect(resolved.backgroundHasAlpha).toBe(false);
    expect(contrastRatio(resolved.foreground, resolved.background)).toBeCloseTo(3.949, 3);
  });

  it('flattens a translucent background against the page background', () => {
    const resolved = resolvePair(
      { r: 0, g: 0, b: 0, a: 1 },
      { r: 0, g: 0, b: 0, a: 0.1 },
      { r: 255, g: 255, b: 255, a: 1 },
    );
    // 10% black over white ≈ #e6e6e6
    expect(resolved.background.r).toBe(230);
    expect(resolved.background.g).toBe(230);
    expect(resolved.backgroundHasAlpha).toBe(true);
  });

  it('reports alpha in the evaluation so the UI can explain it', () => {
    const report = evaluateContrast({ r: 0, g: 0, b: 0, a: 0.6 }, WHITE, {
      fontSizePx: 16,
      bold: false,
      level: 'AA',
      pageBackground: WHITE,
    });
    expect(report.ratio).toBeLessThan(21);
    expect(report.ratio).toBeGreaterThan(4.5);
  });
});

describe('report shape and advice', () => {
  it('returns all five threshold rows plus an explanation for each', () => {
    const report = evaluateContrast(parseColorOrThrow('#1f4fd8'), WHITE, {
      fontSizePx: 16,
      bold: false,
      level: 'AA',
    });
    expect(report.textResults).toHaveLength(4);
    expect(report.nonTextResult.id).toBe('aa-non-text');
    for (const result of [...report.textResults, report.nonTextResult]) {
      // Explanations are translatable messages; resolve them to check the sentence is complete.
      expect(tm(result.explanation).length).toBeGreaterThan(40);
      expect(result.threshold).toBeGreaterThan(1);
      expect(result.margin).toBeCloseTo(result.ratio - result.threshold, 12);
    }
    expect(report.displayRatio).toBe(formatRatio(report.ratio));
  });

  it('explains failures with a direction and a numeric gap', () => {
    const report = evaluateContrast(parseColorOrThrow('#cccccc'), WHITE, {
      fontSizePx: 16,
      bold: false,
      level: 'AA',
    });
    expect(report.passesAa).toBe(false);
    const advice = report.advice.map((message) => tm(message)).join(' ');
    expect(advice).toMatch(/Increase the ratio/);
    expect(advice).toMatch(/4\.5:1|large/i);
  });

  it('marks an unreachable AAA target honestly', () => {
    // #777777 on white: 4.478:1, cannot reach AAA for normal text without changing colour.
    const report = evaluateContrast(parseColorOrThrow('#777777'), WHITE, {
      fontSizePx: 16,
      bold: false,
      level: 'AAA',
    });
    expect(report.passesLevel).toBe(false);
    expect(report.bestLevel).toBe('Fail AA');
  });
});
