import { useMemo, useState } from 'react';
import type { PaletteEntry } from '../types';
import type { RGBA } from '../lib/color';
import { toCssVariables, toJson } from '../lib/exports';
import type { ExportColor } from '../lib/exports';
import { useI18n } from '../i18n';
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
  const { t } = useI18n();
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

  const download = (content: string, mime: string, filename: string) => {
    if (disabled) {
      onNotify(t('toast.nothingToExport'), 'error');
      return;
    }
    const blobUrl = URL.createObjectURL(new Blob([content], { type: mime }));
    const anchor = document.createElement('a');
    anchor.href = blobUrl;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
  };

  return (
    <div className="card">
      <div className="card__header">
        <h2 className="card__title">
          <LayersIcon />
          {t('export.title')}
        </h2>
        <span className="card__hint">{t('export.hint')}</span>
      </div>
      <div className="card__body">
        {target === 'palette' && palette.length === 0 ? (
          <EmptyState icon={<LayersIcon />} title={t('export.emptyTitle')}>
            {t('export.emptyBody')}
          </EmptyState>
        ) : (
          <div className="export-grid">
            <div className="inline" style={{ gap: '0.6rem' }}>
              <span className="small muted" id="export-source-label">
                {t('export.source')}
              </span>
              <div className="segmented" role="group" aria-labelledby="export-source-label">
                <button type="button" aria-pressed={target === 'pair'} onClick={() => setTarget('pair')}>
                  {t('export.currentPair')}
                </button>
                <button
                  type="button"
                  aria-pressed={target === 'palette'}
                  onClick={() => setTarget('palette')}
                  disabled={palette.length === 0}
                >
                  {t('export.paletteSource', { count: palette.length })}
                </button>
              </div>
            </div>

            <div className="preview-controls" style={{ marginTop: 0 }}>
              <div className="field">
                <label htmlFor="css-format">{t('export.cssFormat')}</label>
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
                <label htmlFor="css-prefix">{t('export.prefix')}</label>
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
                <span className="field__label">{t('export.options')}</span>
                <label className="checkbox-chip" data-checked={includeComments} style={{ alignSelf: 'flex-start' }}>
                  <input
                    type="checkbox"
                    checked={includeComments}
                    onChange={(event) => setIncludeComments(event.target.checked)}
                  />
                  {t('export.contrastComments')}
                </label>
              </div>
            </div>

            <div className="field">
              <span className="field__label" id="css-output-label">
                {t('export.cssOutput')}
              </span>
              <pre className="code-block" aria-labelledby="css-output-label" tabIndex={0}>
                <code>{css}</code>
              </pre>
              <div className="button-row">
                <button
                  type="button"
                  className="button button--sm"
                  onClick={() => onCopy(css, t('toast.copiedLabel.css'))}
                  disabled={disabled}
                >
                  <CopyIcon />
                  {t('export.copyCss')}
                </button>
                <button
                  type="button"
                  className="button button--sm"
                  onClick={() => {
                    download(css, 'text/css;charset=utf-8', 'contrastjudge-tokens.css');
                    if (!disabled) onNotify(t('toast.cssDownloaded'));
                  }}
                  disabled={disabled}
                >
                  <DownloadIcon />
                  {t('export.downloadCss')}
                </button>
              </div>
            </div>

            <div className="field">
              <span className="field__label" id="json-output-label">
                {t('export.jsonOutput')}
              </span>
              <pre className="code-block" aria-labelledby="json-output-label" tabIndex={0}>
                <code>{json}</code>
              </pre>
              <div className="button-row">
                <button
                  type="button"
                  className="button button--sm"
                  onClick={() => onCopy(json, t('toast.copiedLabel.json'))}
                  disabled={disabled}
                >
                  <CopyIcon />
                  {t('export.copyJson')}
                </button>
                <button
                  type="button"
                  className="button button--sm"
                  onClick={() => {
                    download(json, 'application/json', 'contrastjudge-tokens.json');
                    if (!disabled) onNotify(t('toast.jsonDownloaded'));
                  }}
                  disabled={disabled}
                >
                  <DownloadIcon />
                  {t('export.downloadJson')}
                </button>
              </div>
            </div>

            <p className="small muted">{t('export.note')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
