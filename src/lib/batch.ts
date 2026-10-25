/**
 * Batch checking: parse a list of foreground/background pairs from plain text.
 *
 * Accepted line formats (whitespace tolerant, blank lines and `#`-comments ignored):
 *   #111111 #ffffff
 *   #111111, #ffffff, Primary button
 *   #111111 on #ffffff
 *   #111111 -> #ffffff | Card title
 *   rgb(17 17 17) on hsl(0 0% 100%)
 *
 * Because colours can be written with `#` prefix, comments are only recognised when the line
 * starts with `//` or `;` — a leading `#` is always a colour.
 */
import type { RGBA } from './color';
import { normalizeColor, parseColor, rgbToHex } from './color';
import { contrastRatio, evaluateThresholdAgainst, NON_TEXT_THRESHOLD, TEXT_THRESHOLDS } from './wcag';
import type { ThresholdResult } from './wcag';
import type { BatchRow, BatchRowResult } from './exports';
import { msg } from '../i18n/messages';
import type { Message } from '../i18n/messages';
import { createTranslator } from '../i18n/format';
import type { Translator } from '../i18n/format';

export interface BatchParseIssue {
  readonly line: number;
  readonly text: string;
  /** Translatable explanation of why the line was skipped. */
  readonly message: Message;
}

export interface BatchParseResult {
  readonly rows: readonly BatchRow[];
  readonly issues: readonly BatchParseIssue[];
}

const SEPARATORS = /\s+on\s+|\s*->\s*|\s*\|\s*|\s*=>\s*/i;

function splitPair(line: string): { fgToken: string; bgToken: string; label: string } | null {
  // Only the first separator is meaningful: a label such as "Body text on white" contains " on "
  // as well, and splitting on every occurrence would eat the label.
  const match = SEPARATORS.exec(line);
  if (match) {
    const fgToken = line.slice(0, match.index).trim();
    const rest = line.slice(match.index + match[0].length);
    const [bgPart = '', ...labelParts] = rest.split(/\s*[,|]\s*/);
    return {
      fgToken,
      bgToken: bgPart.trim(),
      label: labelParts.join(', ').trim(),
    };
  }

  const commaParts = line.split(',').map((part) => part.trim());
  if (commaParts.length >= 2) {
    return {
      fgToken: commaParts[0] ?? '',
      bgToken: commaParts[1] ?? '',
      label: commaParts.slice(2).join(', ').trim(),
    };
  }

  const tokens = tokenize(line);
  if (tokens.length >= 2) {
    return { fgToken: tokens[0] ?? '', bgToken: tokens[1] ?? '', label: tokens.slice(2).join(' ').trim() };
  }
  return null;
}

/** Splits a line into colour-ish tokens while keeping `rgb(...)` groups together. */
function tokenize(line: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let depth = 0;
  for (const char of line) {
    if (char === '(') depth += 1;
    if (char === ')') depth = Math.max(0, depth - 1);
    if (depth === 0 && (char === ' ' || char === '\t')) {
      if (current.trim() !== '') tokens.push(current.trim());
      current = '';
      continue;
    }
    current += char;
  }
  if (current.trim() !== '') tokens.push(current.trim());
  return tokens;
}

export function parseBatch(input: string, defaults: { fontSizePx?: number; bold?: boolean } = {}): BatchParseResult {
  const rows: BatchRow[] = [];
  const issues: BatchParseIssue[] = [];
  const fontSizePx = defaults.fontSizePx ?? 16;
  const bold = defaults.bold ?? false;

  const lines = input.split(/\r?\n/);
  lines.forEach((rawLine, index) => {
    const line = rawLine.trim();
    if (line === '' || line.startsWith('//') || line.startsWith(';')) return;

    const split = splitPair(line);
    if (!split) {
      issues.push({
        line: index + 1,
        text: line,
        message: msg('batch.issueNoPair'),
      });
      return;
    }

    const fg = parseColor(split.fgToken);
    if (!fg.ok) {
      issues.push({ line: index + 1, text: line, message: msg('batch.issueForeground', { message: fg.message }) });
      return;
    }
    const bg = parseColor(split.bgToken);
    if (!bg.ok) {
      issues.push({ line: index + 1, text: line, message: msg('batch.issueBackground', { message: bg.message }) });
      return;
    }

    rows.push({
      // Unnamed rows are labelled "Line n"; the UI translates that suffix when it renders.
      label: split.label === '' ? `#${index + 1}` : split.label,
      foreground: fg.color,
      background: bg.color,
      fontSizePx,
      bold,
    });
  });

  return { rows, issues };
}

/** Evaluates parsed rows into a report-ready shape. */
export function evaluateBatch(rows: readonly BatchRow[]): BatchRowResult[] {
  return rows.map((row) => {
    // Batch rows are compared as opaque colours: WCAG evaluates the resolved colour pair.
    const fg = { ...normalizeColor(row.foreground), a: 1 };
    const bg = { ...normalizeColor(row.background), a: 1 };
    const ratio = contrastRatio(fg, bg);
    const results: ThresholdResult[] = [
      ...TEXT_THRESHOLDS.map((definition) => evaluateThresholdAgainst(definition, ratio)),
      evaluateThresholdAgainst(NON_TEXT_THRESHOLD, ratio),
    ];
    const passes = (id: string) => results.find((result) => result.id === id)?.passes ?? false;
    const failing = results.filter((result) => !result.passes);
    return {
      label: row.label,
      foregroundHex: rgbToHex(fg).toUpperCase(),
      backgroundHex: rgbToHex(bg).toUpperCase(),
      ratio,
      results,
      passesAaNormal: passes('aa-normal'),
      passesAaaNormal: passes('aaa-normal'),
      passesNonText: passes('aa-non-text'),
      worstFailure: failing.length === 0 ? null : (failing[0]?.explanation ?? null),
    };
  });
}

export interface BatchSummary {
  readonly total: number;
  readonly failingAaNormal: number;
  readonly failingAaaNormal: number;
  readonly failingNonText: number;
  readonly bestRatio: number;
  readonly worstRatio: number;
}

export function summarizeBatch(results: readonly BatchRowResult[]): BatchSummary | null {
  if (results.length === 0) return null;
  const ratios = results.map((row) => row.ratio);
  return {
    total: results.length,
    failingAaNormal: results.filter((row) => !row.passesAaNormal).length,
    failingAaaNormal: results.filter((row) => !row.passesAaaNormal).length,
    failingNonText: results.filter((row) => !row.passesNonText).length,
    bestRatio: Math.max(...ratios),
    worstRatio: Math.min(...ratios),
  };
}

/**
 * Sample batch content. The labels are translated, so the example reads naturally in either
 * language while the colour pairs (and therefore the ratios) stay byte-identical.
 */
export function buildBatchExample(t: Translator): string {
  return [
    `#0f172a on #ffffff, ${t('batch.exampleLabels.body')}`,
    `#94a3b8 on #ffffff, ${t('batch.exampleLabels.muted')}`,
    `#ffffff on #2563eb, ${t('batch.exampleLabels.button')}`,
    `#f8fafc on #0f172a, ${t('batch.exampleLabels.dark')}`,
  ].join('\n');
}

/** English example, kept for tests and non-UI callers. */
export const BATCH_EXAMPLE = buildBatchExample(createTranslator('en'));

/** Extracts every distinct colour used in a batch input, for the palette exporter. */
export function extractBatchColors(rows: readonly BatchRow[]): RGBA[] {
  const seen = new Set<string>();
  const out: RGBA[] = [];
  for (const row of rows) {
    for (const color of [row.foreground, row.background]) {
      const hex = rgbToHex(color).toUpperCase();
      if (seen.has(hex)) continue;
      seen.add(hex);
      out.push(color);
    }
  }
  return out;
}
