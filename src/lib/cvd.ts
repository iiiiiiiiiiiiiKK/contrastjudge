/**
 * Colour vision deficiency (CVD) simulation.
 *
 * Model: Machado, Oliveira & Fernandes (2009), "A Physiologically-based Model for Simulation of
 * Color Vision Deficiency", IEEE TVCG 15(6). The published tables provide 3x3 matrices per
 * deficiency type at severity steps of 0.1, applied to **linear-light** sRGB. Intermediate
 * severities are linearly interpolated between the two nearest rows, which the paper describes
 * as an accurate approximation.
 *
 * A simulation is an aid, not a diagnosis: real colour vision varies between people, and no
 * simulation can replace testing with users. The UI must say so wherever the result appears.
 */
import type { RGBA } from './color';
import { hslToRgb, normalizeColor, rgbToHex, rgbToHsl } from './color';
import { CVD_MATRIX_TABLE } from './cvd-matrices';
import type { CvdMatrixRow } from './cvd-matrices';
import { contrastRatio } from './wcag';

export type CvdType = 'protan' | 'deutan' | 'tritan' | 'achromat';

export interface CvdDefinition {
  readonly id: CvdType;
  readonly name: string;
  readonly shortName: string;
  readonly prevalence: string;
  readonly description: string;
}

export const CVD_DEFINITIONS: readonly CvdDefinition[] = [
  {
    id: 'protan',
    name: 'Protanopia / protanomaly (red-blind, red-weak)',
    shortName: 'Protan',
    prevalence: '≈1% of men, 0.01% of women for protanopia',
    description:
      'Reduced or absent L-cone response. Reds darken dramatically and can collapse into green or brown; red-on-black text is the classic failure case.',
  },
  {
    id: 'deutan',
    name: 'Deuteranopia / deuteranomaly (green-blind, green-weak)',
    shortName: 'Deutan',
    prevalence: '≈1% of men for deuteranopia, up to 5% of men for deuteranomaly',
    description:
      'Reduced or absent M-cone response, the most common CVD. Red and green hues become hard to tell apart, while blue and yellow stay distinguishable.',
  },
  {
    id: 'tritan',
    name: 'Tritanopia / tritanomaly (blue-blind, blue-weak)',
    shortName: 'Tritan',
    prevalence: '≈0.01% of people, affects men and women equally',
    description:
      'Reduced or absent S-cone response. Blue and green collapse together, and yellow can look pink or grey.',
  },
  {
    id: 'achromat',
    name: 'Achromatopsia (total colour blindness)',
    shortName: 'Achromat',
    prevalence: '≈0.003% of people',
    description:
      'No functioning cones for colour: the world is seen in shades of grey. Luminance contrast is the only signal that remains.',
  },
];

/** Rotates an HSV-style hue toward luminance; used for the achromat simulation. */
function luminanceOf(color: RGBA): number {
  const { r, g, b } = normalizeColor(color);
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function srgbToLinear(channel: number): number {
  const value = channel / 255;
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function linearToSrgb(value: number): number {
  const clamped = Math.min(1, Math.max(0, value));
  const encoded = clamped <= 0.0031308 ? clamped * 12.92 : 1.055 * clamped ** (1 / 2.4) - 0.055;
  return Math.round(encoded * 255);
}

function findRow(severity: number): { low: CvdMatrixRow; high: CvdMatrixRow; t: number } {
  const clamped = Math.min(1, Math.max(0, severity));
  const index = Math.min(CVD_MATRIX_TABLE.length - 1, Math.round(clamped * 10));
  const high = CVD_MATRIX_TABLE[index] ?? CVD_MATRIX_TABLE[0]!;
  const lowIndex = Math.max(0, Math.floor(clamped * 10));
  const low = CVD_MATRIX_TABLE[lowIndex] ?? CVD_MATRIX_TABLE[0]!;
  const span = high.severity - low.severity;
  const t = span === 0 ? 0 : (clamped - low.severity) / span;
  return { low, high, t };
}

function interpolateMatrix(type: 'protan' | 'deutan' | 'tritan', severity: number): number[] {
  const { low, high, t } = findRow(severity);
  const a = low[type];
  const b = high[type];
  return a.map((value, index) => value + ((b[index] ?? value) - value) * t);
}

/**
 * Simulates how a colour appears under a colour vision deficiency.
 *
 * @param color   The sRGB colour to simulate.
 * @param type    Which deficiency to simulate.
 * @param severity 0 = normal vision, 1 = full dichromacy. Defaults to 1.
 */
export function simulateCvd(color: RGBA, type: CvdType, severity = 1): RGBA {
  const source = normalizeColor(color);
  if (type === 'achromat') {
    const l = luminanceOf(source);
    const grey = Math.round(Math.min(255, Math.max(0, l)));
    return { r: grey, g: grey, b: grey, a: source.a };
  }

  const matrix = interpolateMatrix(type, Math.min(1, Math.max(0, severity)));
  const lr = srgbToLinear(source.r);
  const lg = srgbToLinear(source.g);
  const lb = srgbToLinear(source.b);

  const [m00 = 1, m01 = 0, m02 = 0, m10 = 0, m11 = 1, m12 = 0, m20 = 0, m21 = 0, m22 = 1] = matrix;

  const r = m00 * lr + m01 * lg + m02 * lb;
  const g = m10 * lr + m11 * lg + m12 * lb;
  const b = m20 * lr + m21 * lg + m22 * lb;

  return {
    r: linearToSrgb(r),
    g: linearToSrgb(g),
    b: linearToSrgb(b),
    a: source.a,
  };
}

export interface CvdPairResult {
  readonly type: CvdType;
  readonly label: string;
  readonly foreground: RGBA;
  readonly background: RGBA;
  readonly foregroundHex: string;
  readonly backgroundHex: string;
  readonly ratio: number;
  /** True when the simulated pair loses contrast compared with normal vision. */
  readonly reduced: boolean;
  /** True when the simulated pair drops below the given threshold. */
  readonly failsThreshold: boolean;
}

/** Simulates a whole foreground/background pair and reports the resulting contrast. */
export function simulatePair(
  foreground: RGBA,
  background: RGBA,
  options: { severity?: number; threshold?: number; types?: readonly CvdType[] } = {},
): CvdPairResult[] {
  const severity = options.severity ?? 1;
  const threshold = options.threshold ?? 4.5;
  const types = options.types ?? CVD_DEFINITIONS.map((definition) => definition.id);
  const base = contrastRatio({ ...normalizeColor(foreground), a: 1 }, { ...normalizeColor(background), a: 1 });

  return types.map((type) => {
    const definition = CVD_DEFINITIONS.find((item) => item.id === type);
    const fg = simulateCvd(foreground, type, severity);
    const bg = simulateCvd(background, type, severity);
    const ratio = contrastRatio(fg, bg);
    return {
      type,
      label: definition?.shortName ?? type,
      foreground: fg,
      background: bg,
      foregroundHex: rgbToHex(fg).toUpperCase(),
      backgroundHex: rgbToHex(bg).toUpperCase(),
      ratio,
      reduced: ratio < base - 0.01,
      failsThreshold: ratio + 1e-12 < threshold,
    };
  });
}

/**
 * A rough "hue separation" hint: how different two colours look under a given CVD type,
 * measured as the Euclidean distance of their simulated HSL hue/chroma. Useful for telling a
 * user that a red/green status pair stays indistinguishable for most deutans.
 */
export function cvdColorDistance(a: RGBA, b: RGBA, type: CvdType, severity = 1): number {
  const sa = rgbToHsl(simulateCvd(a, type, severity));
  const sb = rgbToHsl(simulateCvd(b, type, severity));
  const chromeA = (sa.s / 100) * (1 - Math.abs((2 * sa.l) / 100 - 1));
  const chromeB = (sb.s / 100) * (1 - Math.abs((2 * sb.l) / 100 - 1));
  const pointA = {
    x: chromeA * Math.cos((sa.h * Math.PI) / 180),
    y: chromeA * Math.sin((sa.h * Math.PI) / 180),
    l: sa.l / 100,
  };
  const pointB = {
    x: chromeB * Math.cos((sb.h * Math.PI) / 180),
    y: chromeB * Math.sin((sb.h * Math.PI) / 180),
    l: sb.l / 100,
  };
  return Math.sqrt((pointA.x - pointB.x) ** 2 + (pointA.y - pointB.y) ** 2 + (pointA.l - pointB.l) ** 2);
}

/** Suggests an alternative hue that keeps luminance but separates better for a CVD type. */
export function suggestCvdSeparatedColor(
  base: RGBA,
  other: RGBA,
  type: CvdType,
  options: { minDistance?: number } = {},
): RGBA | null {
  const minDistance = options.minDistance ?? 0.35;
  const hsl = rgbToHsl(base);
  // Walk outward from the original hue in both directions and take the first shift that
  // separates the colours enough under the chosen simulation.
  for (let shift = 5; shift <= 180; shift += 5) {
    for (const direction of [1, -1] as const) {
      const hue = (((hsl.h + shift * direction) % 360) + 360) % 360;
      const candidate = hslToRgb({ h: hue, s: hsl.s, l: hsl.l, a: 1 });
      if (cvdColorDistance(candidate, other, type) >= minDistance) return candidate;
    }
  }
  return null;
}
