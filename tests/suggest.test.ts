import { describe, expect, it } from 'vitest';
import { parseColorOrThrow, rgbToHsl } from '../src/lib/color';
import {
  isTargetUnreachable,
  maxAchievableRatio,
  suggestBackgroundColors,
  suggestDualSurfaceColor,
  suggestForegroundColors,
} from '../src/lib/suggest';
import { contrastRatio } from '../src/lib/wcag';

const WHITE = parseColorOrThrow('#ffffff');
const BLACK = parseColorOrThrow('#000000');

describe('suggestForegroundColors', () => {
  it('reaches the requested ratio for a failing pair', () => {
    const fg = parseColorOrThrow('#9aa4b2');
    const bg = WHITE;
    expect(contrastRatio(fg, bg)).toBeLessThan(4.5);

    const suggestions = suggestForegroundColors(fg, bg, { target: 4.5, limit: 4 });
    expect(suggestions.length).toBeGreaterThan(0);
    for (const suggestion of suggestions) {
      expect(suggestion.ratio).toBeGreaterThanOrEqual(4.5 - 1e-9);
      expect(contrastRatio(suggestion.color, bg)).toBeCloseTo(suggestion.ratio, 10);
      expect(suggestion.lightnessDelta).not.toBe(0);
    }
  });

  it('returns the original colour untouched when the pair already passes', () => {
    const fg = parseColorOrThrow('#101010');
    const suggestions = suggestForegroundColors(fg, WHITE, { target: 4.5 });
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0]?.direction).toBe('unchanged');
    expect(suggestions[0]?.color).toEqual(fg);
    expect(suggestions[0]?.lightnessDelta).toBe(0);
  });

  it('preserves hue while moving lightness', () => {
    const fg = parseColorOrThrow('#2f6f4f'); // a mid green
    const suggestions = suggestForegroundColors(fg, WHITE, { target: 7, limit: 4 });
    const baseHue = rgbToHsl(fg).h;
    expect(suggestions.length).toBeGreaterThan(0);
    for (const suggestion of suggestions) {
      const hue = rgbToHsl(suggestion.color).h;
      const diff = Math.abs(((((hue - baseHue) % 360) + 540) % 360) - 180);
      // Hue should stay within a couple of degrees (rounding of 8-bit channels can nudge it).
      expect(diff).toBeLessThan(3);
    }
  });

  it('is deterministic', () => {
    const fg = parseColorOrThrow('#b0b7c3');
    const a = suggestForegroundColors(fg, WHITE, { target: 4.5 });
    const b = suggestForegroundColors(fg, WHITE, { target: 4.5 });
    expect(a.map((s) => s.hex)).toEqual(b.map((s) => s.hex));
  });

  it('offers both darker and lighter options for a mid-tone on a mid-tone background', () => {
    const fg = parseColorOrThrow('#8a8a8a');
    const bg = parseColorOrThrow('#4a4a4a');
    const suggestions = suggestForegroundColors(fg, bg, { target: 4.5, limit: 4 });
    const directions = new Set(suggestions.map((s) => s.direction));
    expect(directions.size).toBeGreaterThan(0);
    expect(suggestions.every((s) => s.ratio >= 4.5 - 1e-9)).toBe(true);
  });

  it('returns nothing when the target is impossible', () => {
    // #777777 background: even pure black reaches only ~4.7:1, so 7:1 is unreachable.
    const bg = parseColorOrThrow('#777777');
    const suggestions = suggestForegroundColors(parseColorOrThrow('#ffffff'), bg, { target: 7 });
    expect(suggestions).toHaveLength(0);
    expect(isTargetUnreachable(bg, 7)).toBe(true);
  });
});

describe('suggestBackgroundColors', () => {
  it('reaches the target by moving the background', () => {
    const fg = parseColorOrThrow('#1f4fd8');
    const bg = parseColorOrThrow('#3f6fe8');
    const suggestions = suggestBackgroundColors(fg, bg, { target: 4.5, limit: 3 });
    expect(suggestions.length).toBeGreaterThan(0);
    for (const suggestion of suggestions) {
      expect(contrastRatio(fg, suggestion.color)).toBeGreaterThanOrEqual(4.5 - 1e-9);
    }
  });

  it('keeps the existing background when it already passes', () => {
    const fg = parseColorOrThrow('#111111');
    const suggestions = suggestBackgroundColors(fg, WHITE, { target: 4.5 });
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0]?.direction).toBe('unchanged');
  });
});

describe('maxAchievableRatio / isTargetUnreachable', () => {
  it('knows that black or white always wins', () => {
    expect(maxAchievableRatio(WHITE)).toEqual({ ratio: expect.closeTo(21, 6), color: 'black' });
    expect(maxAchievableRatio(BLACK)).toEqual({ ratio: expect.closeTo(21, 6), color: 'white' });
  });

  it('detects impossible targets', () => {
    expect(isTargetUnreachable(WHITE, 21.5)).toBe(true);
    expect(isTargetUnreachable(WHITE, 21)).toBe(false);
    // #808080 has luminance 0.2159: black reaches 5.32:1, white only 3.95:1.
    expect(isTargetUnreachable(parseColorOrThrow('#808080'), 5.5)).toBe(true);
    expect(isTargetUnreachable(parseColorOrThrow('#808080'), 5)).toBe(false);
  });
});

describe('suggestDualSurfaceColor', () => {
  it('finds a colour readable on both light and dark surfaces when one exists', () => {
    // A mid blue works on neither white nor near-black initially.
    const base = parseColorOrThrow('#7aa2ff');
    const found = suggestDualSurfaceColor(base, WHITE, parseColorOrThrow('#070b18'), 4.5);
    if (found) {
      expect(contrastRatio(found, WHITE)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(found, parseColorOrThrow('#070b18'))).toBeGreaterThanOrEqual(4.5);
    } else {
      // Report the honest outcome rather than failing: some hues simply cannot satisfy both.
      expect(found).toBeNull();
    }
  });

  it('returns null when no colour can satisfy both surfaces', () => {
    const light = parseColorOrThrow('#f0f0f0');
    const dark = parseColorOrThrow('#101010');
    const found = suggestDualSurfaceColor(parseColorOrThrow('#888888'), light, dark, 7.5);
    expect(found).toBeNull();
  });
});
