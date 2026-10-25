import type { RGBA } from './lib/color';

export interface PaletteEntry {
  readonly id: string;
  readonly name: string;
  readonly color: RGBA;
  readonly createdAt: number;
}

export interface HistoryEntry {
  readonly id: string;
  readonly foreground: RGBA;
  readonly background: RGBA;
  readonly ratio: number;
  readonly fontSizePx: number;
  readonly bold: boolean;
  readonly level: 'AA' | 'AAA';
  readonly createdAt: number;
}

export interface PreviewSettings {
  readonly sampleText: string;
  readonly fontSizePx: number;
  readonly bold: boolean;
  readonly fontFamily: 'sans' | 'serif' | 'mono';
}

export type CvdSelection = 'protan' | 'deutan' | 'tritan' | 'achromat';

export interface JudgeState {
  /** Raw text in the foreground field — may be invalid. */
  readonly foregroundInput: string;
  /** Raw text in the background field — may be invalid. */
  readonly backgroundInput: string;
  /** Raw text for the page backdrop, used to flatten translucent backgrounds. */
  readonly pageBackgroundInput: string;
  readonly preview: PreviewSettings;
  readonly level: 'AA' | 'AAA';
  readonly targetRatio: number;
  readonly cvdTypes: readonly CvdSelection[];
  readonly cvdSeverity: number;
  readonly palette: readonly PaletteEntry[];
  readonly history: readonly HistoryEntry[];
  readonly activeTab: TabId;
}

export type TabId = 'workspace' | 'palette' | 'batch' | 'learn';

export const DEFAULT_PREVIEW: PreviewSettings = {
  sampleText: 'The quick brown fox jumps over the lazy dog',
  fontSizePx: 16,
  bold: false,
  fontFamily: 'sans',
};

export const initialState: JudgeState = {
  foregroundInput: '#5b6478',
  backgroundInput: '#ffffff',
  pageBackgroundInput: '#ffffff',
  preview: DEFAULT_PREVIEW,
  level: 'AA',
  targetRatio: 4.5,
  cvdTypes: ['protan', 'deutan', 'tritan'],
  cvdSeverity: 1,
  palette: [],
  history: [],
  activeTab: 'workspace',
};
