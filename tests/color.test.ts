import { describe, expect, it } from 'vitest';
import {
  colorsEqual,
  compositeOver,
  formatHex,
  formatHsl,
  formatRgb,
  hslToRgb,
  normalizeColor,
  parseColor,
  parseColorOrThrow,
  rgbToHex,
  rgbToHsl,
  trimNumber,
} from '../src/lib/color';

describe('parseColor — hex', () => {
  it('parses 3, 4, 6 and 8 digit hex', () => {
    expect(parseColor('#abc')).toEqual({
      ok: true,
      color: { r: 0xaa, g: 0xbb, b: 0xcc, a: 1 },
      format: 'hex',
      hasAlpha: false,
    });
    expect(parseColorOrThrow('#abcd')).toEqual({ r: 0xaa, g: 0xbb, b: 0xcc, a: 0xdd / 255 });
    expect(parseColorOrThrow('#112233')).toEqual({ r: 0x11, g: 0x22, b: 0x33, a: 1 });
    expect(parseColorOrThrow('#11223380')).toEqual({ r: 0x11, g: 0x22, b: 0x33, a: 0x80 / 255 });
  });

  it('is case insensitive and tolerates surrounding whitespace', () => {
    expect(parseColorOrThrow('  #AABBCC  ')).toEqual({ r: 170, g: 187, b: 204, a: 1 });
  });

  it('rejects malformed hex instead of guessing', () => {
    const bad = parseColor('#12345');
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.code).toBe('bad-hex');

    const nonHex = parseColor('#gggggg');
    expect(nonHex.ok).toBe(false);
    if (!nonHex.ok) expect(nonHex.code).toBe('bad-hex');
  });
});

describe('parseColor — rgb()/rgba()', () => {
  it('accepts legacy comma syntax, modern space syntax and slash alpha', () => {
    expect(parseColorOrThrow('rgb(255, 0, 0)')).toEqual({ r: 255, g: 0, b: 0, a: 1 });
    expect(parseColorOrThrow('rgb(255 0 0)')).toEqual({ r: 255, g: 0, b: 0, a: 1 });
    expect(parseColorOrThrow('rgba(255, 0, 0, 0.5)')).toEqual({ r: 255, g: 0, b: 0, a: 0.5 });
    expect(parseColorOrThrow('rgb(255 0 0 / 50%)')).toEqual({ r: 255, g: 0, b: 0, a: 0.5 });
    expect(parseColorOrThrow('rgb(0 0 0 / .25)')).toEqual({ r: 0, g: 0, b: 0, a: 0.25 });
  });

  it('accepts percentage channels and rounds them', () => {
    expect(parseColorOrThrow('rgb(100% 0% 0%)')).toEqual({ r: 255, g: 0, b: 0, a: 1 });
    expect(parseColorOrThrow('rgb(50% 50% 50%)')).toEqual({ r: 128, g: 128, b: 128, a: 1 });
  });

  it('rejects out-of-range, mixed and malformed values', () => {
    const over = parseColor('rgb(256, 0, 0)');
    expect(over.ok).toBe(false);
    if (!over.ok) expect(over.code).toBe('out-of-range');

    const negative = parseColor('rgb(-1 0 0)');
    expect(negative.ok).toBe(false);

    const mixed = parseColor('rgb(100% 0 0)');
    expect(mixed.ok).toBe(false);
    if (!mixed.ok) expect(mixed.code).toBe('mixed-syntax');

    const badAlpha = parseColor('rgba(0, 0, 0, 2)');
    expect(badAlpha.ok).toBe(false);
    if (!badAlpha.ok) expect(badAlpha.code).toBe('bad-alpha');

    const wrongCount = parseColor('rgb(0, 0)');
    expect(wrongCount.ok).toBe(false);
  });
});

describe('parseColor — hsl()/hsla()', () => {
  it('converts hue/saturation/lightness to rgb', () => {
    expect(parseColorOrThrow('hsl(0, 100%, 50%)')).toEqual({ r: 255, g: 0, b: 0, a: 1 });
    expect(parseColorOrThrow('hsl(120 100% 50%)')).toEqual({ r: 0, g: 255, b: 0, a: 1 });
    expect(parseColorOrThrow('hsl(240 100% 50% / 0.5)')).toEqual({ r: 0, g: 0, b: 255, a: 0.5 });
    expect(parseColorOrThrow('hsl(0 0% 50%)')).toEqual({ r: 128, g: 128, b: 128, a: 1 });
  });

  it('supports angle units and hue wrapping', () => {
    expect(parseColorOrThrow('hsl(360 100% 50%)')).toEqual({ r: 255, g: 0, b: 0, a: 1 });
    expect(parseColorOrThrow('hsl(-120 100% 50%)')).toEqual({ r: 0, g: 0, b: 255, a: 1 });
    expect(parseColorOrThrow('hsl(0.5turn 100% 50%)')).toEqual({ r: 0, g: 255, b: 255, a: 1 });
    expect(parseColorOrThrow('hsl(200grad 100% 50%)')).toEqual({ r: 0, g: 255, b: 255, a: 1 });
  });

  it('rejects invalid saturation/lightness and bad angles', () => {
    const badS = parseColor('hsl(0, 120%, 50%)');
    expect(badS.ok).toBe(false);
    if (!badS.ok) expect(badS.code).toBe('out-of-range');

    const badAngle = parseColor('hsl(spin, 50%, 50%)');
    expect(badAngle.ok).toBe(false);
    if (!badAngle.ok) expect(badAngle.code).toBe('bad-angle');
  });
});

describe('parseColor — keywords and errors', () => {
  it('resolves CSS named colours and transparent', () => {
    expect(parseColorOrThrow('rebeccapurple')).toEqual({ r: 0x66, g: 0x33, b: 0x99, a: 1 });
    expect(parseColorOrThrow('WHITE')).toEqual({ r: 255, g: 255, b: 255, a: 1 });
    expect(parseColorOrThrow('transparent')).toEqual({ r: 0, g: 0, b: 0, a: 0 });
  });

  it('reports empty input, unknown formats and unbalanced parentheses', () => {
    const empty = parseColor('   ');
    expect(empty.ok).toBe(false);
    if (!empty.ok) expect(empty.code).toBe('empty');

    const unknown = parseColor('lab(50% 40 59)');
    expect(unknown.ok).toBe(false);
    if (!unknown.ok) expect(unknown.code).toBe('unknown-format');

    const unbalanced = parseColor('rgb(1 2 3');
    expect(unbalanced.ok).toBe(false);
    if (!unbalanced.ok) expect(unbalanced.code).toBe('unbalanced');

    const nonsense = parseColor('#');
    expect(nonsense.ok).toBe(false);
  });

  it('never silently coerces an invalid colour', () => {
    for (const input of ['#12', 'rgb(a b c)', 'hsl(10, 10, 10)', 'notacolour', '#fff fff']) {
      expect(parseColor(input).ok).toBe(false);
    }
  });
});

describe('conversions', () => {
  it('round-trips rgb -> hsl -> rgb for the full sRGB cube samples', () => {
    for (let r = 0; r <= 255; r += 17) {
      for (let g = 0; g <= 255; g += 17) {
        for (let b = 0; b <= 255; b += 17) {
          const source = { r, g, b, a: 1 };
          const back = hslToRgb(rgbToHsl(source));
          expect(back).toEqual(source);
        }
      }
    }
  });

  it('formats hex, rgb and hsl consistently', () => {
    const color = { r: 0x1f, g: 0x4f, b: 0xd8, a: 1 };
    expect(rgbToHex(color)).toBe('#1f4fd8');
    expect(formatHex(color)).toBe('#1F4FD8');
    expect(formatRgb(color)).toBe('rgb(31, 79, 216)');
    expect(formatHsl(color)).toBe('hsl(224.4, 74.9%, 48.4%)');
    expect(formatRgb({ r: 1, g: 2, b: 3, a: 0.5 })).toBe('rgba(1, 2, 3, 0.5)');
    expect(formatHex({ r: 1, g: 2, b: 3, a: 0.5 })).toBe('#01020380');
  });

  it('composites translucent colours over a backdrop', () => {
    const half = compositeOver({ r: 0, g: 0, b: 0, a: 0.5 }, { r: 255, g: 255, b: 255, a: 1 });
    expect(half).toEqual({ r: 128, g: 128, b: 128, a: 1 });
    const opaque = compositeOver({ r: 10, g: 20, b: 30, a: 1 }, { r: 255, g: 255, b: 255, a: 1 });
    expect(opaque).toEqual({ r: 10, g: 20, b: 30, a: 1 });
  });

  it('normalises stray values', () => {
    expect(normalizeColor({ r: -20, g: 300, b: 12.6, a: 2 })).toEqual({ r: 0, g: 255, b: 13, a: 1 });
    expect(trimNumber(0.5, 3)).toBe('0.5');
    expect(trimNumber(1.23456, 2)).toBe('1.23');
  });

  it('compares colours after rounding', () => {
    expect(colorsEqual({ r: 1, g: 2, b: 3, a: 1 }, { r: 1, g: 2, b: 3, a: 1 })).toBe(true);
    expect(colorsEqual({ r: 1, g: 2, b: 3, a: 1 }, { r: 1, g: 2, b: 4, a: 1 })).toBe(false);
  });
});
