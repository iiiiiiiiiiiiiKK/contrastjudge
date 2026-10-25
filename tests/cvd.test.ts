import { describe, expect, it } from 'vitest';
import { parseColorOrThrow } from '../src/lib/color';
import {
  CVD_DEFINITIONS,
  cvdColorDistance,
  simulateCvd,
  simulatePair,
  suggestCvdSeparatedColor,
} from '../src/lib/cvd';
import { contrastRatio } from '../src/lib/wcag';

const RED = parseColorOrThrow('#ff0000');
const GREEN = parseColorOrThrow('#00ff00');
const BLUE = parseColorOrThrow('#0000ff');

describe('simulateCvd', () => {
  it('returns the input unchanged at severity 0', () => {
    for (const type of ['protan', 'deutan', 'tritan'] as const) {
      expect(simulateCvd(RED, type, 0)).toEqual({ ...RED, a: 1 });
    }
  });

  it('produces known protan/deutan results for saturated red at full severity', () => {
    // Machado 2009 severity 1.0 matrices applied to linear-light red (1, 0, 0):
    //   protan: (0.152286, 0.114503, -0.003882) -> #6D4800-ish after gamma encoding
    //   deutan: (0.367322, 0.280085, -0.011820) -> a mustard/olive tone
    const protan = simulateCvd(RED, 'protan', 1);
    expect(protan).toEqual({ r: 109, g: 95, b: 0, a: 1 });

    // Hand-verified from the published matrix: linear (1,0,0) * row 1 (0.367322, 0.280085, -0.01182)
    // = (0.367322, 0.280085, -0.01182) -> gamma encode -> (163, 144, 0).
    const deutan = simulateCvd(RED, 'deutan', 1);
    expect(deutan).toEqual({ r: 163, g: 144, b: 0, a: 1 });
  });

  it('keeps tritan simulation of red nearly unchanged and shifts blue toward cyan', () => {
    const tritanRed = simulateCvd(RED, 'tritan', 1);
    expect(tritanRed.r).toBe(255);
    const tritanBlue = simulateCvd(BLUE, 'tritan', 1);
    // Blue under tritanopia becomes a desaturated cyan-blue: green rises, blue drops.
    expect(tritanBlue).toEqual({ r: 0, g: 107, b: 150, a: 1 });
    expect(tritanBlue.g).toBeGreaterThan(BLUE.g);
    expect(tritanBlue.b).toBeLessThan(BLUE.b);
  });

  it('converts to greyscale for achromatopsia using perceived luminance', () => {
    const grey = simulateCvd(RED, 'achromat', 1);
    expect(grey.r).toBe(grey.g);
    expect(grey.g).toBe(grey.b);
    expect(grey.r).toBe(Math.round(0.299 * 255));
  });

  it('interpolates monotonically between severities', () => {
    const prev = simulateCvd(RED, 'protan', 0.2);
    const next = simulateCvd(RED, 'protan', 0.8);
    expect(next.r).toBeLessThan(prev.r);
  });

  it('preserves alpha', () => {
    const simulated = simulateCvd({ r: 255, g: 0, b: 0, a: 0.4 }, 'deutan', 1);
    expect(simulated.a).toBeCloseTo(0.4, 6);
  });
});

describe('simulatePair', () => {
  it('reports a ratio for every selected type and keeps colours in range', () => {
    const results = simulatePair(parseColorOrThrow('#cc3333'), parseColorOrThrow('#ffffff'), {
      types: ['protan', 'deutan', 'tritan', 'achromat'],
    });
    expect(results).toHaveLength(4);
    for (const result of results) {
      expect(result.ratio).toBeGreaterThanOrEqual(1);
      expect(result.ratio).toBeLessThanOrEqual(21);
      for (const channel of [result.foreground.r, result.foreground.g, result.foreground.b]) {
        expect(channel).toBeGreaterThanOrEqual(0);
        expect(channel).toBeLessThanOrEqual(255);
      }
      expect(result.foregroundHex).toMatch(/^#[0-9A-F]{6}$/);
    }
  });

  it('flags pairs that drop below the threshold', () => {
    // Pure red on black fails differently for protans; use a pair that is marginal by design.
    const results = simulatePair(parseColorOrThrow('#00ff00'), parseColorOrThrow('#ff0000'), {
      threshold: 4.5,
    });
    expect(results.length).toBeGreaterThan(0);
    for (const result of results) {
      expect(result.failsThreshold).toBe(result.ratio < 4.5);
    }
  });

  it('leaves luminance contrast mostly intact for deutan on grey', () => {
    const base = contrastRatio(parseColorOrThrow('#333333'), parseColorOrThrow('#ffffff'));
    const [deutan] = simulatePair(parseColorOrThrow('#333333'), parseColorOrThrow('#ffffff'), {
      types: ['deutan'],
    });
    expect(deutan).toBeDefined();
    // Greys are unaffected by hue rotation, so the ratio should stay within a hair.
    expect(Math.abs((deutan?.ratio ?? 0) - base)).toBeLessThan(0.15);
  });
});

describe('cvdColorDistance', () => {
  it('reports red and green as close for deutan and further apart for tritan', () => {
    const deutan = cvdColorDistance(RED, GREEN, 'deutan', 1);
    const tritan = cvdColorDistance(RED, GREEN, 'tritan', 1);
    expect(deutan).toBeLessThan(tritan);
  });

  it('reports zero distance for identical colours', () => {
    expect(cvdColorDistance(RED, RED, 'protan', 1)).toBeCloseTo(0, 10);
  });
});

describe('suggestCvdSeparatedColor', () => {
  it('finds a hue that separates better, or honestly returns null', () => {
    const alternative = suggestCvdSeparatedColor(RED, GREEN, 'deutan', { minDistance: 0.3 });
    if (alternative) {
      expect(cvdColorDistance(alternative, GREEN, 'deutan', 1)).toBeGreaterThanOrEqual(0.3);
    } else {
      expect(alternative).toBeNull();
    }
  });
});

describe('CVD metadata', () => {
  it('documents all four supported types with prevalence text', () => {
    expect(CVD_DEFINITIONS).toHaveLength(4);
    for (const definition of CVD_DEFINITIONS) {
      expect(definition.description.length).toBeGreaterThan(30);
      expect(definition.prevalence.length).toBeGreaterThan(5);
    }
  });
});
