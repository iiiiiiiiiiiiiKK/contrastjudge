/**
 * Colour parsing and conversion.
 *
 * Everything here is a pure function: no DOM, no globals, no side effects. This keeps the
 * WCAG maths testable in isolation and guarantees that no colour value ever leaves the browser.
 *
 * Parsing is deliberately strict. An invalid input returns a typed error instead of being
 * silently coerced into some "close enough" colour, because a contrast tool that quietly
 * changes your colours is worse than one that refuses to answer.
 *
 * Error messages are returned as translatable `Message` objects (a dictionary key plus params)
 * rather than baked-in English, so the UI can render them in the active language.
 */
import { NAMED_COLORS } from './named-colors';
import { msg } from '../i18n/messages';
import type { Message } from '../i18n/messages';

/** sRGB colour with an alpha channel. r/g/b are integers 0-255, a is 0-1. */
export interface RGBA {
  readonly r: number;
  readonly g: number;
  readonly b: number;
  readonly a: number;
}

/** HSL colour. h is degrees 0-360, s and l are percentages 0-100, a is 0-1. */
export interface HSLA {
  readonly h: number;
  readonly s: number;
  readonly l: number;
  readonly a: number;
}

export type ParseErrorCode =
  | 'empty'
  | 'unknown-format'
  | 'bad-hex'
  | 'bad-number'
  | 'out-of-range'
  | 'bad-alpha'
  | 'bad-angle'
  | 'unbalanced'
  | 'mixed-syntax';

export interface ParseSuccess {
  readonly ok: true;
  /** The parsed colour. */
  readonly color: RGBA;
  /** Which syntax the input used, for display/debugging. */
  readonly format: ColorFormat;
  /** True when the alpha channel is below 1. */
  readonly hasAlpha: boolean;
}

export interface ParseFailure {
  readonly ok: false;
  readonly code: ParseErrorCode;
  /** Translatable explanation, safe to show in the UI. */
  readonly message: Message;
}

export type ColorFormat = 'hex' | 'rgb' | 'hsl' | 'named' | 'keyword';
export type ParseResult = ParseSuccess | ParseFailure;

const HEX_DIGITS = /^[0-9a-f]+$/i;

function fail(
  code: ParseErrorCode,
  key: Message['key'],
  params?: Readonly<Record<string, string | number>>,
): ParseFailure {
  return { ok: false, code, message: msg(key, params) };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function clampByte(value: number): number {
  return clamp(Math.round(value), 0, 255);
}

/** Normalises any RGBA-ish input into integer channels and a 0-1 alpha. */
export function normalizeColor(input: RGBA): RGBA {
  return {
    r: clampByte(input.r),
    g: clampByte(input.g),
    b: clampByte(input.b),
    a: clamp(Number.isFinite(input.a) ? input.a : 1, 0, 1),
  };
}

// --------------------------------------------------------------------------------------
// Parsing
// --------------------------------------------------------------------------------------

const NUMBER = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i;

function parseNumeric(raw: string): number | null {
  const token = raw.trim();
  if (token === '') return null;
  if (!NUMBER.test(token)) return null;
  const value = Number(token);
  return Number.isFinite(value) ? value : null;
}

function parseAlpha(raw: string | undefined): number | null {
  if (raw === undefined) return 1;
  const token = raw.trim();
  if (token === 'none') return 1;
  if (token.endsWith('%')) {
    const value = parseNumeric(token.slice(0, -1));
    if (value === null) return null;
    if (value < 0 || value > 100) return null;
    return value / 100;
  }
  const value = parseNumeric(token);
  if (value === null || value < 0 || value > 1) return null;
  return value;
}

/** Splits the inside of a `fn(...)` into components, accepting legacy commas and modern spaces. */
function splitComponents(body: string): { parts: string[]; separator: ',' | ' ' | null } | null {
  const trimmed = body.trim();
  if (trimmed === '') return null;
  const hasComma = trimmed.includes(',');
  // `rgb(0 0 0 / 50%)` uses a slash to separate alpha.
  const slashSplit = trimmed.split('/');
  if (slashSplit.length > 2) return null;
  const main = (slashSplit[0] ?? '').trim();
  const alphaFromSlash = slashSplit.length === 2 ? (slashSplit[1] ?? '').trim() : undefined;

  let parts: string[];
  let separator: ',' | ' ';

  if (hasComma) {
    parts = main.split(',').map((part) => part.trim());
    separator = ',';
    if (alphaFromSlash !== undefined) return null; // `rgb(0,0,0/50%)` is invalid
  } else {
    parts = main.split(/\s+/).filter((part) => part !== '');
    separator = ' ';
  }

  if (alphaFromSlash !== undefined) parts.push(alphaFromSlash);
  if (parts.length < 3 || parts.length > 4) return null;
  return { parts, separator };
}

function parseHex(input: string): ParseResult {
  const digits = input.slice(1);
  if (!HEX_DIGITS.test(digits)) {
    return fail('bad-hex', 'parse.badHex', { value: input });
  }
  let r: number;
  let g: number;
  let b: number;
  let a = 1;
  switch (digits.length) {
    case 3:
    case 4: {
      const chars = digits.split('');
      const expand = (index: number) => {
        const ch = chars[index] ?? '0';
        return Number.parseInt(ch + ch, 16);
      };
      r = expand(0);
      g = expand(1);
      b = expand(2);
      if (digits.length === 4) a = expand(3) / 255;
      break;
    }
    case 6:
    case 8: {
      r = Number.parseInt(digits.slice(0, 2), 16);
      g = Number.parseInt(digits.slice(2, 4), 16);
      b = Number.parseInt(digits.slice(4, 6), 16);
      if (digits.length === 8) a = Number.parseInt(digits.slice(6, 8), 16) / 255;
      break;
    }
    default:
      return fail('bad-hex', 'parse.badHexLength', { value: input, count: digits.length });
  }
  return {
    ok: true,
    color: { r, g, b, a },
    format: 'hex',
    hasAlpha: a < 1,
  };
}

function parseRgbFunction(name: string, body: string): ParseResult {
  const split = splitComponents(body);
  if (!split) {
    return fail('bad-number', 'parse.badNumberArity', { call: `${name}(${body})` });
  }
  const { parts } = split;
  const channels: number[] = [];
  let usedPercent = false;
  let usedNumber = false;

  for (let i = 0; i < 3; i += 1) {
    const token = (parts[i] ?? '').trim();
    if (token === 'none') {
      channels.push(0);
      continue;
    }
    if (token.endsWith('%')) {
      const value = parseNumeric(token.slice(0, -1));
      if (value === null) return fail('bad-number', 'parse.badPercent', { value: token });
      if (value < 0 || value > 100) {
        return fail('out-of-range', 'parse.outOfRangePercent', { value: token });
      }
      channels.push((value / 100) * 255);
      usedPercent = true;
    } else {
      const value = parseNumeric(token);
      if (value === null) return fail('bad-number', 'parse.badNumber', { value: token });
      if (value < 0 || value > 255) {
        return fail('out-of-range', 'parse.outOfRangeChannel', { value: token });
      }
      channels.push(value);
      usedNumber = true;
    }
  }

  if (usedPercent && usedNumber) {
    return fail('mixed-syntax', 'parse.mixedSyntax');
  }

  const alpha = parseAlpha(parts[3]);
  if (alpha === null) {
    return fail('bad-alpha', 'parse.badAlpha', { value: (parts[3] ?? '').trim() });
  }

  return {
    ok: true,
    color: {
      r: clampByte(channels[0] ?? 0),
      g: clampByte(channels[1] ?? 0),
      b: clampByte(channels[2] ?? 0),
      a: alpha,
    },
    format: 'rgb',
    hasAlpha: alpha < 1,
  };
}

function parseAngle(raw: string): number | null {
  const token = raw.trim().toLowerCase();
  if (token === 'none') return 0;
  const match = /^([+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)(deg|grad|rad|turn)?$/.exec(token);
  if (!match) return null;
  const value = Number(match[1]);
  if (!Number.isFinite(value)) return null;
  const unit = match[2] ?? 'deg';
  switch (unit) {
    case 'deg':
      return value;
    case 'grad':
      return (value * 360) / 400;
    case 'rad':
      return (value * 180) / Math.PI;
    case 'turn':
      return value * 360;
    default:
      return null;
  }
}

function parseHslFunction(name: string, body: string): ParseResult {
  const split = splitComponents(body);
  if (!split) {
    return fail('bad-number', 'parse.badNumberArityHsl', { call: `${name}(${body})` });
  }
  const { parts } = split;

  const hue = parseAngle(parts[0] ?? '');
  if (hue === null) {
    return fail('bad-angle', 'parse.badAngle', { value: (parts[0] ?? '').trim() });
  }

  const readPercent = (token: string, legacy: boolean): number | null => {
    const trimmed = token.trim();
    if (trimmed === 'none') return 0;
    const hasPercent = trimmed.endsWith('%');
    // In the legacy comma syntax CSS requires a percentage for saturation/lightness; the modern
    // space syntax also accepts a bare number. Being strict here matches what browsers accept.
    if (!hasPercent && legacy) return null;
    const value = parseNumeric(hasPercent ? trimmed.slice(0, -1) : trimmed);
    if (value === null) return null;
    if (value < 0 || value > 100) return null;
    return value;
  };

  const saturation = readPercent(parts[1] ?? '', split.separator === ',');
  if (saturation === null) {
    return fail('out-of-range', 'parse.outOfRangeSaturation', { value: (parts[1] ?? '').trim() });
  }
  const lightness = readPercent(parts[2] ?? '', split.separator === ',');
  if (lightness === null) {
    return fail('out-of-range', 'parse.outOfRangeLightness', { value: (parts[2] ?? '').trim() });
  }

  const alpha = parseAlpha(parts[3]);
  if (alpha === null) {
    return fail('bad-alpha', 'parse.badAlpha', { value: (parts[3] ?? '').trim() });
  }

  const { r, g, b } = hslToRgbChannels({ h: hue, s: saturation, l: lightness });
  return {
    ok: true,
    color: { r, g, b, a: alpha },
    format: 'hsl',
    hasAlpha: alpha < 1,
  };
}

/**
 * Parses a colour string. Accepts `#rgb`, `#rgba`, `#rrggbb`, `#rrggbbaa`,
 * `rgb()`/`rgba()`, `hsl()`/`hsla()` (legacy comma syntax and modern space syntax),
 * CSS named colours and the `transparent` keyword.
 */
export function parseColor(input: string): ParseResult {
  const raw = input.trim();
  if (raw === '') return fail('empty', 'parse.empty');

  if (raw.startsWith('#')) return parseHex(raw);

  const fnMatch = /^([a-z]+)\s*\(([^()]*)\)$/i.exec(raw);
  if (fnMatch) {
    const name = (fnMatch[1] ?? '').toLowerCase();
    const body = fnMatch[2] ?? '';
    if (name === 'rgb' || name === 'rgba') return parseRgbFunction(name, body);
    if (name === 'hsl' || name === 'hsla') return parseHslFunction(name, body);
    return fail('unknown-format', 'parse.unknownFormatFn', { name });
  }

  if (raw.includes('(') || raw.includes(')')) {
    return fail('unbalanced', 'parse.unbalanced', { value: raw });
  }

  const lower = raw.toLowerCase();
  if (lower === 'transparent') {
    return { ok: true, color: { r: 0, g: 0, b: 0, a: 0 }, format: 'keyword', hasAlpha: true };
  }
  const named = NAMED_COLORS[lower];
  if (named !== undefined) {
    const parsed = parseHex(named);
    if (parsed.ok) {
      return { ...parsed, format: 'named' };
    }
  }

  return fail('unknown-format', 'parse.unknownFormat', { value: raw });
}

/**
 * Convenience wrapper for tests and callers that can treat failure as a programming error.
 * The thrown message is English on purpose: it is a developer-facing invariant, not UI copy.
 */
export function parseColorOrThrow(input: string): RGBA {
  const parsed = parseColor(input);
  if (!parsed.ok) throw new Error(`Invalid colour "${input}" (${parsed.code})`);
  return parsed.color;
}

// --------------------------------------------------------------------------------------
// Conversion
// --------------------------------------------------------------------------------------

export function rgbToHex(color: RGBA, options: { alpha?: boolean } = {}): string {
  const { r, g, b, a } = normalizeColor(color);
  const hex = (value: number) => value.toString(16).padStart(2, '0');
  const base = `#${hex(r)}${hex(g)}${hex(b)}`;
  if (!options.alpha) return base;
  return `${base}${hex(clampByte(a * 255))}`;
}

export function rgbToHsl(color: RGBA): HSLA {
  const { r, g, b, a } = normalizeColor(color);
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;
  const l = (max + min) / 2;

  let h = 0;
  let s = 0;
  if (delta !== 0) {
    s = delta / (1 - Math.abs(2 * l - 1));
    switch (max) {
      case rn:
        h = ((gn - bn) / delta) % 6;
        break;
      case gn:
        h = (bn - rn) / delta + 2;
        break;
      default:
        h = (rn - gn) / delta + 4;
        break;
    }
    h *= 60;
    if (h < 0) h += 360;
  }

  return { h, s: s * 100, l: l * 100, a };
}

export function hslToRgbChannels(hsl: { h: number; s: number; l: number }): { r: number; g: number; b: number } {
  const h = ((hsl.h % 360) + 360) % 360;
  const s = clamp(hsl.s, 0, 100) / 100;
  const l = clamp(hsl.l, 0, 100) / 100;

  if (s === 0) {
    const value = clampByte(l * 255);
    return { r: value, g: value, b: value };
  }

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = h / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r1 = 0;
  let g1 = 0;
  let b1 = 0;
  if (hp >= 0 && hp < 1) [r1, g1, b1] = [c, x, 0];
  else if (hp < 2) [r1, g1, b1] = [x, c, 0];
  else if (hp < 3) [r1, g1, b1] = [0, c, x];
  else if (hp < 4) [r1, g1, b1] = [0, x, c];
  else if (hp < 5) [r1, g1, b1] = [x, 0, c];
  else [r1, g1, b1] = [c, 0, x];

  const m = l - c / 2;
  return {
    r: clampByte((r1 + m) * 255),
    g: clampByte((g1 + m) * 255),
    b: clampByte((b1 + m) * 255),
  };
}

export function hslToRgb(color: HSLA): RGBA {
  const { r, g, b } = hslToRgbChannels(color);
  return { r, g, b, a: clamp(color.a, 0, 1) };
}

/** Formats a colour as a CSS `rgb()`/`rgba()` string, omitting alpha when it is 1. */
export function formatRgb(color: RGBA): string {
  const { r, g, b, a } = normalizeColor(color);
  if (a >= 1) return `rgb(${r}, ${g}, ${b})`;
  return `rgba(${r}, ${g}, ${b}, ${trimNumber(a, 3)})`;
}

/** Formats a colour as a CSS `hsl()`/`hsla()` string. */
export function formatHsl(color: RGBA): string {
  const hsl = rgbToHsl(color);
  const h = Math.round(hsl.h * 10) / 10;
  const s = Math.round(hsl.s * 10) / 10;
  const l = Math.round(hsl.l * 10) / 10;
  if (hsl.a >= 1) return `hsl(${h}, ${s}%, ${l}%)`;
  return `hsla(${h}, ${s}%, ${l}%, ${trimNumber(hsl.a, 3)})`;
}

/** Formats a colour the way a designer would type it back in: 6-digit hex, plus alpha when needed. */
export function formatHex(color: RGBA, options: { alpha?: 'auto' | 'never' | 'always' } = {}): string {
  const { a } = normalizeColor(color);
  const mode = options.alpha ?? 'auto';
  const withAlpha = mode === 'always' || (mode === 'auto' && a < 1);
  const hex = rgbToHex(color, { alpha: withAlpha });
  return hex.toUpperCase();
}

export function trimNumber(value: number, digits = 2): string {
  const rounded = Number(value.toFixed(digits));
  return String(rounded);
}

/** Flattens a translucent colour onto an opaque background (source-over). */
export function compositeOver(foreground: RGBA, background: RGBA): RGBA {
  const fg = normalizeColor(foreground);
  const bg = normalizeColor(background);
  const alpha = fg.a + bg.a * (1 - fg.a);
  if (alpha === 0) return { r: 0, g: 0, b: 0, a: 0 };
  const mix = (f: number, b: number) => (f * fg.a + b * bg.a * (1 - fg.a)) / alpha;
  return {
    r: clampByte(mix(fg.r, bg.r)),
    g: clampByte(mix(fg.g, bg.g)),
    b: clampByte(mix(fg.b, bg.b)),
    a: clamp(alpha, 0, 1),
  };
}

/** True when two colours are the same after rounding to 8-bit channels. */
export function colorsEqual(a: RGBA, b: RGBA): boolean {
  const x = normalizeColor(a);
  const y = normalizeColor(b);
  return x.r === y.r && x.g === y.g && x.b === y.b && Math.abs(x.a - y.a) < 0.001;
}
