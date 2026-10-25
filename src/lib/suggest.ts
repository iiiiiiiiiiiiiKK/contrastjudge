/**
 * Suggesting colours that reach a target contrast ratio while staying close to the original.
 *
 * The approach is deliberately simple and predictable rather than clever: for each candidate we
 * move the foreground along the HSL lightness axis in both directions, keep hue and saturation,
 * and accept the first step that reaches the target ratio. Darkening and lightening are grown in
 * parallel and ranked by total perceptual movement (Euclidean distance in HSL space, hue weighted
 * by chroma) so the returned colour is the closest one that works.
 *
 * Everything is deterministic: the same input always produces the same output, which is what
 * makes the suggestion logic unit-testable.
 */
import type { HSLA, RGBA } from './color';
import { hslToRgb, normalizeColor, rgbToHex, rgbToHsl } from './color';
import { contrastRatio, relativeLuminance } from './wcag';

export interface Suggestion {
  /** Adjusted foreground. */
  readonly color: RGBA;
  readonly hex: string;
  /** Ratio achieved against the fixed background. */
  readonly ratio: number;
  /** Direction of the adjustment, useful for labelling the suggestion. */
  readonly direction: 'darker' | 'lighter' | 'unchanged';
  /** Total lightness change in percentage points. */
  readonly lightnessDelta: number;
}

export interface SuggestOptions {
  /** Ratio to reach. Defaults to 4.5 (AA normal text). */
  readonly target?: number;
  /** How many suggestions to return. Defaults to 4. */
  readonly limit?: number;
  /** Lightness step in percentage points. Defaults to 1. */
  readonly step?: number;
  /** Also adjust saturation slightly to find closer matches. Defaults to false. */
  readonly allowSaturationShift?: boolean;
}

const DEFAULT_TARGET = 4.5;
const MAX_STEPS = 100;

function movementCost(from: HSLA, to: HSLA): number {
  const dh = angularDistance(from.h, to.h);
  const ds = to.s - from.s;
  const dl = to.l - from.l;
  // Hue changes matter more when the colour is saturated.
  const chroma = from.s / 100;
  return Math.sqrt((dh * chroma) ** 2 + ds ** 2 + dl ** 2);
}

function angularDistance(a: number, b: number): number {
  const diff = Math.abs(((((a - b) % 360) + 540) % 360) - 180);
  return diff;
}

/**
 * Suggests foreground colours that reach `target` against a fixed background.
 * The input colour is returned untouched (with ratio 1 movement) when it already passes.
 */
export function suggestForegroundColors(
  foreground: RGBA,
  background: RGBA,
  options: SuggestOptions = {},
): Suggestion[] {
  const target = options.target ?? DEFAULT_TARGET;
  const limit = options.limit ?? 4;
  const step = options.step ?? 1;
  const allowSaturationShift = options.allowSaturationShift ?? true;

  const fg = { ...normalizeColor(foreground), a: 1 };
  const bg = { ...normalizeColor(background), a: 1 };
  const baseHsl = rgbToHsl(fg);
  const currentRatio = contrastRatio(fg, bg);

  if (currentRatio >= target) {
    return [
      {
        color: fg,
        hex: rgbToHex(fg).toUpperCase(),
        ratio: currentRatio,
        direction: 'unchanged',
        lightnessDelta: 0,
      },
    ];
  }

  interface Candidate extends Suggestion {
    cost: number;
  }
  const candidates: Candidate[] = [];
  const seen = new Set<string>();

  const saturationOffsets = allowSaturationShift ? [0, -6, 6, -12, 12] : [0];

  for (const satOffset of saturationOffsets) {
    const saturation = clampPercent(baseHsl.s + satOffset);
    for (let i = 1; i <= MAX_STEPS; i += 1) {
      const delta = step * i;
      for (const direction of ['darker', 'lighter'] as const) {
        const lightness = direction === 'darker' ? baseHsl.l - delta : baseHsl.l + delta;
        if (lightness < 0 || lightness > 100) continue;
        const candidateHsl: HSLA = { h: baseHsl.h, s: saturation, l: lightness, a: 1 };
        const candidate = hslToRgb(candidateHsl);
        const key = `${candidate.r},${candidate.g},${candidate.b}`;
        if (seen.has(key)) continue;
        const ratio = contrastRatio(candidate, bg);
        if (ratio + 1e-12 < target) continue;
        seen.add(key);
        candidates.push({
          color: candidate,
          hex: rgbToHex(candidate).toUpperCase(),
          ratio,
          direction,
          lightnessDelta: Number((lightness - baseHsl.l).toFixed(2)),
          cost: movementCost(baseHsl, candidateHsl),
        });
      }
      // Once we have at least one hit in each direction, keep collecting a few more steps so
      // that overshoot alternatives are available, then stop.
      const hitDarker = candidates.some((c) => c.direction === 'darker');
      const hitLighter = candidates.some((c) => c.direction === 'lighter');
      if (hitDarker && hitLighter && i >= 14) break;
    }
  }

  if (candidates.length === 0) {
    // Nothing reachable by lightness alone at this saturation — scan the full lightness range.
    for (let l = 0; l <= 100; l += 1) {
      for (const direction of ['darker', 'lighter'] as const) {
        if ((direction === 'darker' && l >= baseHsl.l) || (direction === 'lighter' && l <= baseHsl.l)) {
          continue;
        }
        const candidateHsl: HSLA = { h: baseHsl.h, s: baseHsl.s, l, a: 1 };
        const candidate = hslToRgb(candidateHsl);
        const key = `${candidate.r},${candidate.g},${candidate.b}`;
        if (seen.has(key)) continue;
        const ratio = contrastRatio(candidate, bg);
        if (ratio + 1e-12 < target) continue;
        seen.add(key);
        candidates.push({
          color: candidate,
          hex: rgbToHex(candidate).toUpperCase(),
          ratio,
          direction,
          lightnessDelta: Number((l - baseHsl.l).toFixed(2)),
          cost: movementCost(baseHsl, candidateHsl),
        });
      }
    }
  }

  candidates.sort((a, b) => a.cost - b.cost || b.ratio - a.ratio);

  // Keep the cheapest hit per direction first, then fill up with the next closest options.
  const picks: Candidate[] = [];
  for (const direction of ['darker', 'lighter'] as const) {
    const best = candidates.find((c) => c.direction === direction);
    if (best) picks.push(best);
  }
  for (const candidate of candidates) {
    if (picks.length >= limit) break;
    if (!picks.includes(candidate)) picks.push(candidate);
  }

  return picks.slice(0, limit).map(({ cost: _cost, ...rest }) => rest);
}

/**
 * Suggests background colours that reach `target` against a fixed foreground, mirroring the
 * foreground logic. Useful when the text colour is fixed by a brand palette.
 */
export function suggestBackgroundColors(
  foreground: RGBA,
  background: RGBA,
  options: SuggestOptions = {},
): Suggestion[] {
  const target = options.target ?? DEFAULT_TARGET;
  const limit = options.limit ?? 3;
  const fg = { ...normalizeColor(foreground), a: 1 };
  const bg = { ...normalizeColor(background), a: 1 };
  const baseHsl = rgbToHsl(bg);
  const currentRatio = contrastRatio(fg, bg);
  if (currentRatio >= target) {
    return [
      {
        color: bg,
        hex: rgbToHex(bg).toUpperCase(),
        ratio: currentRatio,
        direction: 'unchanged',
        lightnessDelta: 0,
      },
    ];
  }

  const results: Suggestion[] = [];
  const seen = new Set<string>();
  for (let i = 1; i <= MAX_STEPS && results.length < limit * 2; i += 1) {
    for (const direction of ['darker', 'lighter'] as const) {
      const lightness = direction === 'darker' ? baseHsl.l - i : baseHsl.l + i;
      if (lightness < 0 || lightness > 100) continue;
      const candidate = hslToRgb({ h: baseHsl.h, s: baseHsl.s, l: lightness, a: 1 });
      const key = `${candidate.r},${candidate.g},${candidate.b}`;
      if (seen.has(key)) continue;
      const ratio = contrastRatio(fg, candidate);
      if (ratio + 1e-12 < target) continue;
      seen.add(key);
      results.push({
        color: candidate,
        hex: rgbToHex(candidate).toUpperCase(),
        ratio,
        direction,
        lightnessDelta: Number((lightness - baseHsl.l).toFixed(2)),
      });
    }
  }
  return results.slice(0, limit);
}

function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, value));
}

/** Suggest a colour that is readable on both a light and a dark surface (rare but useful). */
export function suggestDualSurfaceColor(base: RGBA, light: RGBA, dark: RGBA, target = 4.5): RGBA | null {
  const hsl = rgbToHsl(base);
  let best: { color: RGBA; cost: number } | null = null;
  for (let l = 0; l <= 100; l += 1) {
    const candidate = hslToRgb({ h: hsl.h, s: hsl.s, l, a: 1 });
    if (contrastRatio(candidate, light) < target) continue;
    if (contrastRatio(candidate, dark) < target) continue;
    const cost = Math.abs(l - hsl.l);
    if (!best || cost < best.cost) best = { color: candidate, cost };
  }
  return best?.color ?? null;
}

/** Highest ratio achievable by any colour against this background is with black or white. */
export function maxAchievableRatio(background: RGBA): { ratio: number; color: 'black' | 'white' } {
  const bg = { ...normalizeColor(background), a: 1 };
  const black = { r: 0, g: 0, b: 0, a: 1 };
  const white = { r: 255, g: 255, b: 255, a: 1 };
  const ratioBlack = contrastRatio(black, bg);
  const ratioWhite = contrastRatio(white, bg);
  return ratioBlack >= ratioWhite ? { ratio: ratioBlack, color: 'black' } : { ratio: ratioWhite, color: 'white' };
}

/** True when no colour whatsoever can reach the target against this background. */
export function isTargetUnreachable(background: RGBA, target: number): boolean {
  return maxAchievableRatio(background).ratio + 1e-12 < target;
}

/** Exposed for tests: relative luminance ordering must match the contrast ordering. */
export function luminanceOrder(a: RGBA, b: RGBA): number {
  return relativeLuminance(a) - relativeLuminance(b);
}
