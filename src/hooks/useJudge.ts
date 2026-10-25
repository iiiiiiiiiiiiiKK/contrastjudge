import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { JudgeState, PaletteEntry, HistoryEntry, TabId, PreviewSettings, CvdSelection } from '../types';
import { initialState } from '../types';
import type { CvdType } from '../lib/cvd';
import { parseColor } from '../lib/color';
import type { ParseResult, RGBA } from '../lib/color';
import { evaluateContrast } from '../lib/wcag';
import type { ContrastReport } from '../lib/wcag';
import { readStorage, writeStorage, isRecord } from '../lib/storage';

const STORAGE_KEY = 'state-v1';

function isRgba(value: unknown): value is RGBA {
  return (
    isRecord(value) &&
    typeof value.r === 'number' &&
    typeof value.g === 'number' &&
    typeof value.b === 'number' &&
    typeof value.a === 'number'
  );
}

function isPaletteEntry(value: unknown): value is PaletteEntry {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.createdAt === 'number' &&
    isRgba(value.color)
  );
}

function isHistoryEntry(value: unknown): value is HistoryEntry {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.createdAt === 'number' &&
    typeof value.ratio === 'number' &&
    isRgba(value.foreground) &&
    isRgba(value.background)
  );
}

function isPreview(value: unknown): value is PreviewSettings {
  return (
    isRecord(value) &&
    typeof value.sampleText === 'string' &&
    typeof value.fontSizePx === 'number' &&
    typeof value.bold === 'boolean' &&
    (value.fontFamily === 'sans' || value.fontFamily === 'serif' || value.fontFamily === 'mono')
  );
}

function loadState(): JudgeState {
  const stored = readStorage<Partial<JudgeState>>(STORAGE_KEY, {}, isRecord);
  const themeSafe: JudgeState = {
    ...initialState,
    foregroundInput:
      typeof stored.foregroundInput === 'string' ? stored.foregroundInput : initialState.foregroundInput,
    backgroundInput:
      typeof stored.backgroundInput === 'string' ? stored.backgroundInput : initialState.backgroundInput,
    pageBackgroundInput:
      typeof stored.pageBackgroundInput === 'string' ? stored.pageBackgroundInput : initialState.pageBackgroundInput,
    level: stored.level === 'AAA' ? 'AAA' : 'AA',
    targetRatio: typeof stored.targetRatio === 'number' && stored.targetRatio >= 1 ? stored.targetRatio : 4.5,
    cvdSeverity: typeof stored.cvdSeverity === 'number' ? Math.min(1, Math.max(0, stored.cvdSeverity)) : 1,
    cvdTypes: Array.isArray(stored.cvdTypes)
      ? stored.cvdTypes.filter(
          (item): item is CvdSelection =>
            item === 'protan' || item === 'deutan' || item === 'tritan' || item === 'achromat',
        )
      : initialState.cvdTypes,
    preview: isPreview(stored.preview) ? stored.preview : initialState.preview,
    palette: Array.isArray(stored.palette) ? stored.palette.filter(isPaletteEntry) : [],
    history: Array.isArray(stored.history) ? stored.history.filter(isHistoryEntry).slice(0, 12) : [],
    // Never restore the tab: opening on the workspace keeps the first paint predictable.
    activeTab: 'workspace',
  };
  return themeSafe;
}

export interface JudgeApi {
  readonly state: JudgeState;
  readonly foreground: ParseResult;
  readonly background: ParseResult;
  readonly pageBackground: ParseResult;
  readonly foregroundColor: RGBA | null;
  readonly backgroundColor: RGBA | null;
  readonly pageBackgroundColor: RGBA;
  readonly report: ContrastReport | null;
  setForegroundInput: (value: string) => void;
  setBackgroundInput: (value: string) => void;
  setPageBackgroundInput: (value: string) => void;
  swap: () => void;
  randomize: () => void;
  reset: () => void;
  setPreview: (patch: Partial<PreviewSettings>) => void;
  setLevel: (level: 'AA' | 'AAA') => void;
  setTargetRatio: (value: number) => void;
  toggleCvdType: (type: CvdSelection) => void;
  setCvdSeverity: (value: number) => void;
  addPaletteColor: (name: string, color: RGBA) => boolean;
  removePaletteColor: (id: string) => void;
  renamePaletteColor: (id: string, name: string) => void;
  usePaletteColor: (entry: PaletteEntry, role: 'foreground' | 'background') => void;
  recordHistory: () => void;
  clearHistory: () => void;
  restoreHistory: (entry: HistoryEntry) => void;
  setActiveTab: (tab: TabId) => void;
}

const RANDOM_PALETTE = [
  ['#0f172a', '#f8fafc'],
  ['#1f4fd8', '#eef2ff'],
  ['#b3261e', '#fff5f3'],
  ['#0b6b3a', '#eafaf0'],
  ['#5b21b6', '#f6f1ff'],
  ['#8a4b00', '#fff8ea'],
  ['#0a5a8c', '#eaf7ff'],
  ['#6b7280', '#111827'],
  ['#7c2d12', '#ffedd5'],
  ['#065f46', '#052e26'],
] as const;

export function useJudge(): JudgeApi {
  const [state, setState] = useState<JudgeState>(loadState);
  // Mirror of the latest committed state, so callbacks that must answer synchronously (e.g.
  // "was this colour already in the palette?") read a value that is never stale. Writing to the
  // ref inside an effect keeps render pure.
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
    writeStorage(STORAGE_KEY, state);
  }, [state]);

  const foreground = useMemo(() => parseColor(state.foregroundInput), [state.foregroundInput]);
  const background = useMemo(() => parseColor(state.backgroundInput), [state.backgroundInput]);
  const pageBackground = useMemo(() => parseColor(state.pageBackgroundInput), [state.pageBackgroundInput]);

  const foregroundColor = foreground.ok ? foreground.color : null;
  const backgroundColor = background.ok ? background.color : null;
  const pageBackgroundColor = useMemo(
    () => (pageBackground.ok ? pageBackground.color : { r: 255, g: 255, b: 255, a: 1 }),
    [pageBackground],
  );

  const report = useMemo(() => {
    if (!foregroundColor || !backgroundColor) return null;
    return evaluateContrast(foregroundColor, backgroundColor, {
      fontSizePx: state.preview.fontSizePx,
      bold: state.preview.bold,
      level: state.level,
      pageBackground: pageBackgroundColor,
    });
  }, [
    foregroundColor,
    backgroundColor,
    pageBackgroundColor,
    state.preview.fontSizePx,
    state.preview.bold,
    state.level,
  ]);

  const setForegroundInput = useCallback((value: string) => {
    setState((current) => ({ ...current, foregroundInput: value }));
  }, []);
  const setBackgroundInput = useCallback((value: string) => {
    setState((current) => ({ ...current, backgroundInput: value }));
  }, []);
  const setPageBackgroundInput = useCallback((value: string) => {
    setState((current) => ({ ...current, pageBackgroundInput: value }));
  }, []);

  const swap = useCallback(() => {
    setState((current) => ({
      ...current,
      foregroundInput: current.backgroundInput,
      backgroundInput: current.foregroundInput,
    }));
  }, []);

  const randomize = useCallback(() => {
    const pick = RANDOM_PALETTE[Math.floor(Math.random() * RANDOM_PALETTE.length)] ?? RANDOM_PALETTE[0];
    setState((current) => ({
      ...current,
      foregroundInput: pick[0],
      backgroundInput: pick[1],
      pageBackgroundInput: current.pageBackgroundInput,
    }));
  }, []);

  const reset = useCallback(() => {
    setState((current) => ({
      ...current,
      foregroundInput: initialState.foregroundInput,
      backgroundInput: initialState.backgroundInput,
      pageBackgroundInput: initialState.pageBackgroundInput,
      preview: initialState.preview,
      level: initialState.level,
      targetRatio: initialState.targetRatio,
      cvdSeverity: initialState.cvdSeverity,
      cvdTypes: initialState.cvdTypes,
    }));
  }, []);

  const setPreview = useCallback((patch: Partial<PreviewSettings>) => {
    setState((current) => ({ ...current, preview: { ...current.preview, ...patch } }));
  }, []);

  const setLevel = useCallback((level: 'AA' | 'AAA') => {
    setState((current) => ({ ...current, level, targetRatio: level === 'AAA' ? 7 : 4.5 }));
  }, []);

  const setTargetRatio = useCallback((value: number) => {
    setState((current) => ({ ...current, targetRatio: Math.min(21, Math.max(1, value)) }));
  }, []);

  const toggleCvdType = useCallback((type: CvdSelection) => {
    setState((current) => {
      const has = current.cvdTypes.includes(type);
      const next = has ? current.cvdTypes.filter((item) => item !== type) : [...current.cvdTypes, type];
      return { ...current, cvdTypes: next };
    });
  }, []);

  const setCvdSeverity = useCallback((value: number) => {
    setState((current) => ({ ...current, cvdSeverity: Math.min(1, Math.max(0, value)) }));
  }, []);

  const addPaletteColor = useCallback((name: string, color: RGBA) => {
    // Duplicate detection has to be synchronous so callers can report the true outcome — a value
    // computed inside a state updater would still be stale when this function returns.
    const isDuplicate = (palette: readonly PaletteEntry[]) =>
      palette.some((entry) => entry.color.r === color.r && entry.color.g === color.g && entry.color.b === color.b);
    if (isDuplicate(stateRef.current.palette)) return false;
    const entry: PaletteEntry = {
      id: `pal-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: name.trim() === '' ? 'Untitled colour' : name.trim(),
      color: { ...color },
      createdAt: Date.now(),
    };
    // The updater re-checks, so two clicks in one tick still cannot add the same colour twice.
    setState((current) =>
      isDuplicate(current.palette) ? current : { ...current, palette: [...current.palette, entry] },
    );
    return true;
  }, []);

  const removePaletteColor = useCallback((id: string) => {
    setState((current) => ({ ...current, palette: current.palette.filter((entry) => entry.id !== id) }));
  }, []);

  const renamePaletteColor = useCallback((id: string, name: string) => {
    setState((current) => ({
      ...current,
      palette: current.palette.map((entry) => (entry.id === id ? { ...entry, name } : entry)),
    }));
  }, []);

  const usePaletteColor = useCallback((entry: PaletteEntry, role: 'foreground' | 'background') => {
    const hex = `#${[entry.color.r, entry.color.g, entry.color.b]
      .map((channel) => channel.toString(16).padStart(2, '0'))
      .join('')}`.toUpperCase();
    setState((current) =>
      role === 'foreground'
        ? { ...current, foregroundInput: hex, activeTab: 'workspace' }
        : { ...current, backgroundInput: hex, activeTab: 'workspace' },
    );
  }, []);

  const recordHistory = useCallback(() => {
    setState((current) => {
      const fg = parseColor(current.foregroundInput);
      const bg = parseColor(current.backgroundInput);
      if (!fg.ok || !bg.ok) return current;
      const ratio = evaluateContrast(fg.color, bg.color, {
        fontSizePx: current.preview.fontSizePx,
        bold: current.preview.bold,
        level: current.level,
      }).ratio;
      const duplicate = current.history[0];
      if (duplicate && duplicate.ratio === ratio && duplicate.foreground && duplicate.background) {
        const same =
          duplicate.foreground.r === fg.color.r &&
          duplicate.foreground.g === fg.color.g &&
          duplicate.foreground.b === fg.color.b &&
          duplicate.background.r === bg.color.r &&
          duplicate.background.g === bg.color.g &&
          duplicate.background.b === bg.color.b;
        if (same) return current;
      }
      const entry: HistoryEntry = {
        id: `hist-${Date.now()}`,
        foreground: fg.color,
        background: bg.color,
        ratio,
        fontSizePx: current.preview.fontSizePx,
        bold: current.preview.bold,
        level: current.level,
        createdAt: Date.now(),
      };
      return { ...current, history: [entry, ...current.history].slice(0, 12) };
    });
  }, []);

  const clearHistory = useCallback(() => {
    setState((current) => ({ ...current, history: [] }));
  }, []);

  const restoreHistory = useCallback((entry: HistoryEntry) => {
    const toHex = (color: RGBA) =>
      `#${[color.r, color.g, color.b].map((channel) => channel.toString(16).padStart(2, '0')).join('')}`.toUpperCase();
    setState((current) => ({
      ...current,
      foregroundInput: toHex(entry.foreground),
      backgroundInput: toHex(entry.background),
      level: entry.level === 'AAA' ? 'AAA' : 'AA',
      preview: { ...current.preview, fontSizePx: entry.fontSizePx, bold: entry.bold },
    }));
  }, []);

  const setActiveTab = useCallback((tab: TabId) => {
    setState((current) => ({ ...current, activeTab: tab }));
  }, []);

  return {
    state,
    foreground,
    background,
    pageBackground,
    foregroundColor,
    backgroundColor,
    pageBackgroundColor,
    report,
    setForegroundInput,
    setBackgroundInput,
    setPageBackgroundInput,
    swap,
    randomize,
    reset,
    setPreview,
    setLevel,
    setTargetRatio,
    toggleCvdType,
    setCvdSeverity,
    addPaletteColor,
    removePaletteColor,
    renamePaletteColor,
    usePaletteColor,
    recordHistory,
    clearHistory,
    restoreHistory,
    setActiveTab,
  };
}

export type { CvdType };
