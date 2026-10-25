import { useMemo, useState } from 'react';
import type { PaletteEntry } from '../types';
import type { RGBA } from '../lib/color';
import { toCssVariables, toJson } from '../lib/exports';
import type { ExportColor } from '../lib/exports';
import { EmptyState } from './Card';
import { CopyIcon, DownloadIcon, LayersIcon } from './Icons';

interface ExportCardProps {
  readonly palette: readonly PaletteEntry[];
  readonly foreground: RGBA | null;
  readonly background: RGBA | null;
  readonly pageBackground: RGBA;
  readonly onCopy: (text: string, label: string) => void;
  readonly onNotify: (message: string, tone?: 'success' | 'error' | 'info') => void;
}

type Target = 'palette' | 'pair';

export function ExportCard({ palette, foreground, background, pageBackground, onCopy, onNotify }: ExportCardProps) {
  const [target, setTarget] = useState<Target>(palette.length > 0 ? 'palette' : 'pair');
  const [cssFormat, setCssFormat] = useState<'hex' | 'rgb' | 'hsl'>('hex');
  const [prefix, setPrefix] = useState('--cj-');
  const [includeComments, setIncludeComments] = useState(true);

  const colors: ExportColor[] = useMemo(() => {
    if (target === 'pair') {
      const list: ExportColor[] = [];
      if (foreground) list.push({ id: 'text', name: 'text', color: foreground, role: 'text' });
      if (background) list.push({ id: 'surface', name: 'surface', color: background, role: 'surface' });
      return list;
    }
    return palette.map((entry) => ({
      id: entry.id,
      name: entry.name,
      color: entry.color,
      role: 'palette',
    }));
  }, [target, palette, foreground, background]);

  const css = useMemo(
    () =>
      toCssVariables(colors, {
        format: cssFormat,
        prefix: prefix.trim() === '' ? '--cj-' : prefix.trim(),
        includeContrastComments: includeComments,
        referenceBackground: pageBackground,
      }),
    [colors, cssFormat, prefix, includeComments, pageBackground],
  );

  const json = useMemo(
    () =>
      toJson(colors, {
        name: target === 'pair' ? 'Current colour pair' : 'ContrastJudge palette',
        includeContrastMatrix: true,
      }),
    [colors, target],
  );

  const disabled = colors.length === 0;

  return (
    <div className="card">
      <div className="card__header">
        <h2 className="card__title">
          <LayersIcon />
          Export
        </h2>
        <span className="card__hint">CSS custom properties &amp; JSON tokens</span>
      </div>
      <div className="card__body">
        {target === 'palette' && palette.length === 0 ? (
          <EmptyState icon={<LayersIcon />} title="Nothing to export from the palette">
            Save at least one colour in the Palette tab, or switch the source to “Current pair”.
          </EmptyState>
        ) : (
          <div className="export-grid">
            <div className="inline" style={{ gap: '0.6rem' }}>
              <span className="small muted" id="export-source-label">
                Source
              </span>
              <div className="segmented" role="group" aria-labelledby="export-source-label">
                <button type="button" aria-pressed={target === 'pair'} onClick={() => setTarget('pair')}>
                  Current pair
                </button>
                <button
                  type="button"
                  aria-pressed={target === 'palette'}
                  onClick={() => setTarget('palette')}
                  disabled={palette.length === 0}
                >
                  Palette ({palette.length})
                </button>
              </div>
            </div>

            <div className="preview-controls" style={{ marginTop: 0 }}>
              <div className="field">
                <label htmlFor="css-format">CSS value format</label>
                <select
                  id="css-format"
                  value={cssFormat}
                  onChange={(event) => setCssFormat(event.target.value as 'hex' | 'rgb' | 'hsl')}
                >
                  <option value="hex">Hex (#RRGGBB)</option>
                  <option value="rgb">rgb() / rgba()</option>
                  <option value="hsl">hsl() / hsla()</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="css-prefix">Property prefix</label>
                <input
                  id="css-prefix"
                  className="text-input"
                  type="text"
                  value={prefix}
                  onChange={(event) => setPrefix(event.target.value)}
                  style={{ fontFamily: 'var(--font-mono)' }}
                />
              </div>
              <div className="field">
                <span className="field__label">Options</span>
                <label className="checkbox-chip" data-checked={includeComments} style={{ alignSelf: 'flex-start' }}>
                  <input
                    type="checkbox"
                    checked={includeComments}
                    onChange={(event) => setIncludeComments(event.target.checked)}
                  />
                  Contrast comments
                </label>
              </div>
            </div>

            <div className="field">
              <span className="field__label" id="css-output-label">
                CSS custom properties
              </span>
              <pre className="code-block" aria-labelledby="css-output-label" tabIndex={0}>
                <code>{css}</code>
              </pre>
              <div className="button-row">
                <button
                  type="button"
                  className="button button--sm"
                  onClick={() => onCopy(css, 'CSS variables')}
                  disabled={disabled}
                >
                  <CopyIcon />
                  Copy CSS
                </button>
                <button
                  type="button"
                  className="button button--sm"
                  onClick={() => {
                    if (disabled) {
                      onNotify('There is nothing to export yet.', 'error');
                      return;
                    }
                    const blobUrl = URL.createObjectURL(new Blob([css], { type: 'text/css;charset=utf-8' }));
                    const anchor = document.createElement('a');
                    anchor.href = blobUrl;
                    anchor.download = 'contrastjudge-tokens.css';
                    document.body.appendChild(anchor);
                    anchor.click();
                    anchor.remove();
                    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
                    onNotify('CSS file downloaded.');
                  }}
                  disabled={disabled}
                >
                  <DownloadIcon />
                  Download .css
                </button>
              </div>
            </div>

            <div className="field">
              <span className="field__label" id="json-output-label">
                JSON design tokens (includes the full contrast matrix)
              </span>
              <pre className="code-block" aria-labelledby="json-output-label" tabIndex={0}>
                <code>{json}</code>
              </pre>
              <div className="button-row">
                <button
                  type="button"
                  className="button button--sm"
                  onClick={() => onCopy(json, 'JSON tokens')}
                  disabled={disabled}
                >
                  <CopyIcon />
                  Copy JSON
                </button>
                <button
                  type="button"
                  className="button button--sm"
                  onClick={() => {
                    if (disabled) {
                      onNotify('There is nothing to export yet.', 'error');
                      return;
                    }
                    const blobUrl = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
                    const anchor = document.createElement('a');
                    anchor.href = blobUrl;
                    anchor.download = 'contrastjudge-tokens.json';
                    document.body.appendChild(anchor);
                    anchor.click();
                    anchor.remove();
                    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
                    onNotify('JSON file downloaded.');
                  }}
                  disabled={disabled}
                >
                  <DownloadIcon />
                  Download .json
                </button>
              </div>
            </div>

            <p className="small muted">
              Every exported ratio is recalculated from the colour values at export time using the same WCAG formula
              shown in the result panel. Comments reference the current page background colour.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
