/**
 * WCAG 2.2 contrast maths and conformance checks.
 *
 * References:
 * - WCAG 2.2, definition of "relative luminance": https://www.w3.org/TR/WCAG22/#dfn-relative-luminance
 *   (IEC 61966-2-1 sRGB transfer function with the 0.04045 knee, updated May 2021)
 * - WCAG 2.2, definition of "contrast ratio": https://www.w3.org/TR/WCAG22/#dfn-contrast-ratio
 * - SC 1.4.3 Contrast (Minimum), Level AA: 4.5:1 text, 3:1 large text
 * - SC 1.4.6 Contrast (Enhanced), Level AAA: 7:1 text, 4.5:1 large text
 * - SC 1.4.11 Non-text Contrast, Level AA: 3:1 for UI components and graphical objects
 *
 * Per the Understanding document for 1.4.3, threshold comparisons must use the unrounded
 * ratio: 4.499:1 does not meet 4.5:1. Rounding only happens when the value is displayed.
 *
 * IMPORTANT scope note: meeting these ratios satisfies the contrast success criteria for a
 * specific pair of colours. It does not make a page conform to WCAG as a whole.
 */
import type { RGBA } from './color';
import { normalizeColor } from './color';

export type WcagLevel = 'AA' | 'AAA';
export type TextSizeKind = 'normal' | 'large';

/** The 8-bit sRGB channel -> linear light transfer function from the WCAG definition. */
export function srgbChannelToLinear(channel8bit: number): number {
  const srgb = channel8bit / 255;
  if (srgb <= 0.04045) return srgb / 12.92;
  return ((srgb + 0.055) / 1.055) ** 2.4;
}

/**
 * Relative luminance, L = 0.2126 R + 0.7152 G + 0.0722 B, where R/G/B are linearised sRGB
 * channels. The alpha channel is ignored: WCAG evaluates opaque colour pairs, so callers must
 * composite translucent colours over their background first (see `resolvePair`).
 */
export function relativeLuminance(color: RGBA): number {
  const { r, g, b } = normalizeColor(color);
  const lr = srgbChannelToLinear(r);
  const lg = srgbChannelToLinear(g);
  const lb = srgbChannelToLinear(b);
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
}

/** (L1 + 0.05) / (L2 + 0.05) with L1 the lighter luminance. Range 1-21. Not rounded. */
export function contrastRatio(a: RGBA, b: RGBA): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Rounds for display only. Never use the rounded value for a threshold test. */
export function roundRatio(ratio: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round((ratio + Number.EPSILON) * factor) / factor;
}

export function formatRatio(ratio: number, digits = 2): string {
  return `${roundRatio(ratio, digits).toFixed(digits)}:1`;
}

/** WCAG large-scale text: >= 18pt, or >= 14pt bold. 1pt = 1.333px, so 24px / 18.66px. */
export const LARGE_TEXT_MIN_PX = 24;
export const LARGE_TEXT_BOLD_MIN_PX = 14 * (4 / 3); // 18.666…px

export function isLargeText(fontSizePx: number, bold: boolean): boolean {
  if (!Number.isFinite(fontSizePx) || fontSizePx <= 0) return false;
  return bold ? fontSizePx >= LARGE_TEXT_BOLD_MIN_PX : fontSizePx >= LARGE_TEXT_MIN_PX;
}

export interface ThresholdDefinition {
  readonly id: string;
  /** The success criterion this threshold comes from. */
  readonly criterion: string;
  readonly criterionName: string;
  readonly level: WcagLevel;
  readonly kind: 'text' | 'non-text';
  readonly size?: TextSizeKind;
  readonly threshold: number;
  readonly summary: string;
  readonly appliesTo: string;
}

export const TEXT_THRESHOLDS: readonly ThresholdDefinition[] = [
  {
    id: 'aa-normal',
    criterion: '1.4.3',
    criterionName: 'Contrast (Minimum)',
    level: 'AA',
    kind: 'text',
    size: 'normal',
    threshold: 4.5,
    summary: '4.5:1 for body text',
    appliesTo: 'Text below 18pt (24px), or below 14pt (18.66px) when bold.',
  },
  {
    id: 'aa-large',
    criterion: '1.4.3',
    criterionName: 'Contrast (Minimum)',
    level: 'AA',
    kind: 'text',
    size: 'large',
    threshold: 3,
    summary: '3:1 for large text',
    appliesTo: 'Text at least 18pt (24px), or at least 14pt (18.66px) when bold.',
  },
  {
    id: 'aaa-normal',
    criterion: '1.4.6',
    criterionName: 'Contrast (Enhanced)',
    level: 'AAA',
    kind: 'text',
    size: 'normal',
    threshold: 7,
    summary: '7:1 for body text',
    appliesTo: 'Text below 18pt (24px), or below 14pt (18.66px) when bold.',
  },
  {
    id: 'aaa-large',
    criterion: '1.4.6',
    criterionName: 'Contrast (Enhanced)',
    level: 'AAA',
    kind: 'text',
    size: 'large',
    threshold: 4.5,
    summary: '4.5:1 for large text',
    appliesTo: 'Text at least 18pt (24px), or at least 14pt (18.66px) when bold.',
  },
];

export const NON_TEXT_THRESHOLD: ThresholdDefinition = {
  id: 'aa-non-text',
  criterion: '1.4.11',
  criterionName: 'Non-text Contrast',
  level: 'AA',
  kind: 'non-text',
  threshold: 3,
  summary: '3:1 for UI components and graphics',
  appliesTo:
    'Visual boundaries of active UI components (inputs, buttons, focus indicators) and graphical objects needed to understand content (chart lines, icons carrying meaning).',
};

export interface ThresholdResult {
  readonly id: string;
  readonly criterion: string;
  readonly criterionName: string;
  readonly level: WcagLevel;
  readonly kind: 'text' | 'non-text';
  readonly size?: TextSizeKind;
  readonly threshold: number;
  readonly ratio: number;
  readonly passes: boolean;
  /** How much the ratio is above/below the threshold (negative = short by this much). */
  readonly margin: number;
  readonly summary: string;
  /** Explains the outcome in one sentence, including the reason when it fails. */
  readonly explanation: string;
}

function descriptionOf(definition: ThresholdDefinition): string {
  if (definition.kind === 'non-text') return 'UI components and graphical objects';
  return definition.size === 'large' ? 'large text' : 'normal-size text';
}

/** Compares an unrounded ratio against one threshold and explains the outcome. */
export function evaluateThresholdAgainst(definition: ThresholdDefinition, ratio: number): ThresholdResult {
  // Unrounded comparison, as required by the Understanding document for SC 1.4.3.
  const passes = ratio >= definition.threshold;
  const margin = ratio - definition.threshold;
  const target = `${definition.threshold}:1`;
  const explanation = passes
    ? `Passes ${definition.criterion} (Level ${definition.level}): ${formatRatio(ratio)} meets the ${target} threshold for ${descriptionOf(definition)}.`
    : `Fails ${definition.criterion} (Level ${definition.level}): ${formatRatio(ratio)} is below the ${target} threshold for ${descriptionOf(definition)}, short by ${roundRatio(-margin, 2)}.`;
  return {
    id: definition.id,
    criterion: definition.criterion,
    criterionName: definition.criterionName,
    level: definition.level,
    kind: definition.kind,
    ...(definition.kind === 'text' && definition.size ? { size: definition.size } : {}),
    threshold: definition.threshold,
    ratio,
    passes,
    margin,
    summary: definition.summary,
    explanation,
  };
}

export interface ContrastReport {
  /** The ratio between the resolved opaque colours. */
  readonly ratio: number;
  /** Ratio rounded to the precision WCAG tools conventionally display. */
  readonly displayRatio: string;
  readonly level: WcagLevel;
  readonly largeText: boolean;
  readonly textResults: readonly ThresholdResult[];
  readonly nonTextResult: ThresholdResult;
  /** Every text threshold applicable at the selected level and size passes. */
  readonly passesLevel: boolean;
  /** AA text thresholds all pass (any size). */
  readonly passesAa: boolean;
  /** AAA text thresholds all pass (any size). */
  readonly passesAaa: boolean;
  /** AA non-text (1.4.11) requirement passes. */
  readonly passesNonText: boolean;
  /** AA large-text threshold (3:1) passes — used to soften verdicts for near-misses. */
  readonly passesAaLarge: boolean;
  /** Highest WCAG level fully satisfied for this pair. */
  readonly bestLevel: 'Fail AA' | 'AA' | 'AAA';
  /** Concrete suggestions describing what would need to change. */
  readonly advice: readonly string[];
}

/** The opaque colour pair WCAG actually evaluates, after flattening alpha. */
export interface ResolvedPair {
  readonly foreground: RGBA;
  readonly background: RGBA;
  /** Background used as the backdrop when the background itself is translucent. */
  readonly pageBackground: RGBA;
  readonly foregroundHasAlpha: boolean;
  readonly backgroundHasAlpha: boolean;
}

export function resolvePair(foreground: RGBA, background: RGBA, pageBackground: RGBA): ResolvedPair {
  const page = { ...normalizeColor(pageBackground), a: 1 };
  const bg = background.a < 1 ? blend(background, page) : { ...normalizeColor(background), a: 1 };
  const fg = foreground.a < 1 ? blend(foreground, bg) : { ...normalizeColor(foreground), a: 1 };
  return {
    foreground: fg,
    background: bg,
    pageBackground: page,
    foregroundHasAlpha: normalizeColor(foreground).a < 1,
    backgroundHasAlpha: normalizeColor(background).a < 1,
  };
}

function blend(top: RGBA, bottom: RGBA): RGBA {
  const t = normalizeColor(top);
  const b = normalizeColor(bottom);
  const outA = t.a + b.a * (1 - t.a);
  if (outA === 0) return { r: 0, g: 0, b: 0, a: 0 };
  const channel = (tc: number, bc: number) => Math.round((tc * t.a + bc * b.a * (1 - t.a)) / outA);
  return { r: channel(t.r, b.r), g: channel(t.g, b.g), b: channel(t.b, b.b), a: outA };
}

export interface EvaluateOptions {
  readonly fontSizePx: number;
  readonly bold: boolean;
  readonly level: WcagLevel;
  readonly pageBackground?: RGBA;
}

/** Builds the full WCAG report for a foreground/background pair. */
export function evaluateContrast(foreground: RGBA, background: RGBA, options: EvaluateOptions): ContrastReport {
  const page = options.pageBackground ?? { r: 255, g: 255, b: 255, a: 1 };
  const resolved = resolvePair(foreground, background, page);
  const ratio = contrastRatio(resolved.foreground, resolved.background);
  const largeText = isLargeText(options.fontSizePx, options.bold);

  const textResults = TEXT_THRESHOLDS.map((definition) => evaluateThresholdAgainst(definition, ratio));
  const nonTextResult = evaluateThresholdAgainst(NON_TEXT_THRESHOLD, ratio);

  const get = (id: string): ThresholdResult => {
    const found = textResults.find((result) => result.id === id);
    if (!found) throw new Error(`Missing threshold ${id}`);
    return found;
  };

  const aaNormal = get('aa-normal');
  const aaLarge = get('aa-large');
  const aaaNormal = get('aaa-normal');
  const aaaLarge = get('aaa-large');

  const passesAa = aaNormal.passes && aaLarge.passes;
  const passesAaa = aaaNormal.passes && aaaLarge.passes;
  const passesLevel = passesAa && (options.level === 'AA' || passesAaa);
  const bestLevel: ContrastReport['bestLevel'] = !passesAa ? 'Fail AA' : passesAaa ? 'AAA' : 'AA';

  const advice = buildAdvice({
    ratio,
    largeText,
    passesAa,
    passesAaa,
    passesNonText: nonTextResult.passes,
    level: options.level,
  });

  return {
    ratio,
    displayRatio: formatRatio(ratio),
    level: options.level,
    largeText,
    textResults,
    nonTextResult,
    passesLevel,
    passesAa,
    passesAaa,
    passesNonText: nonTextResult.passes,
    passesAaLarge: aaLarge.passes,
    bestLevel,
    advice,
  };
}

function buildAdvice(input: {
  ratio: number;
  largeText: boolean;
  passesAa: boolean;
  passesAaa: boolean;
  passesNonText: boolean;
  level: WcagLevel;
}): string[] {
  const advice: string[] = [];
  const { ratio, largeText } = input;
  const target = input.level === 'AAA' ? (largeText ? 4.5 : 7) : largeText ? 3 : 4.5;

  if (ratio >= target) {
    if (input.passesAaa) {
      advice.push('This pair clears Level AAA for text. No further adjustment is needed for contrast.');
    } else {
      advice.push(
        `This pair meets Level ${input.level}. To reach Level AAA as well, raise the ratio to ${largeText ? '4.5:1' : '7:1'}.`,
      );
    }
  } else {
    const needed = target / ratio;
    advice.push(
      `Increase the ratio from ${formatRatio(ratio)} to at least ${target}:1 — the luminance gap has to grow by about ${needed.toFixed(2)}×.`,
    );
    if (typicalLuminanceForRatio(ratio) > 0.5) {
      advice.push(
        'The pair is already fairly light overall: darken the foreground, or lighten the background if the foreground must stay.',
      );
    } else {
      advice.push(
        'The pair is fairly dark overall: lighten the foreground, or darken the background if the foreground must stay.',
      );
    }
  }

  if (!input.passesNonText) {
    advice.push('SC 1.4.11 also expects 3:1 for UI component boundaries such as inputs, icons and focus rings.');
  }
  if (largeText && !input.passesAa) {
    advice.push('Large text has a lower bar (3:1 at AA), but this pair does not even reach that.');
  }
  if (!largeText && ratio >= 3 && ratio < 4.5) {
    advice.push('This pair would pass at AA if the text were large: 18pt/24px, or 14pt/18.66px bold.');
  }
  return advice;
}

/** Rough heuristic used only for wording advice: is the pair predominantly light or dark? */
function typicalLuminanceForRatio(ratio: number): number {
  return ratio > 9 ? 0.9 : ratio > 4.5 ? 0.55 : 0.25;
}

/** Convenience helper for batch checks and tests. */
export function contrastSummary(
  foreground: RGBA,
  background: RGBA,
): {
  ratio: number;
  passesAaNormal: boolean;
  passesAaLarge: boolean;
  passesAaaNormal: boolean;
  passesAaaLarge: boolean;
  passesNonTextAa: boolean;
} {
  const ratio = contrastRatio(foreground, background);
  return {
    ratio,
    passesAaNormal: ratio >= 4.5,
    passesAaLarge: ratio >= 3,
    passesAaaNormal: ratio >= 7,
    passesAaaLarge: ratio >= 4.5,
    passesNonTextAa: ratio >= 3,
  };
}
