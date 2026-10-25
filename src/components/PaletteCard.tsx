import { useState } from 'react';
import type { PaletteEntry } from '../types';
import type { RGBA } from '../lib/color';
import { formatRgb, rgbToHex, rgbToHsl, trimNumber } from '../lib/color';
import { contrastRatio, formatRatio } from '../lib/wcag';
import { useI18n } from '../i18n';
import { CvdSwatchRow } from './CvdCard';
import { EmptyState } from './Card';
import { CopyIcon, PaletteIcon, PlusIcon, TrashIcon } from './Icons';

interface PaletteCardProps {
  readonly palette: readonly PaletteEntry[];
  readonly foreground: RGBA | null;
  readonly background: RGBA | null;
  readonly pageBackground: RGBA;
  readonly onAdd: (name: string, color: RGBA, role: 'text' | 'surface') => void;
  readonly onRemove: (id: string) => void;
  readonly onRename: (id: string, name: string) => void;
  readonly onUse: (entry: PaletteEntry, role: 'foreground' | 'background') => void;
  readonly onCopy: (text: string, label: string) => void;
}

export function PaletteCard({
  palette,
  foreground,
  background,
  pageBackground,
  onAdd,
  onRemove,
  onRename,
  onUse,
  onCopy,
}: PaletteCardProps) {
  const { t } = useI18n();
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const addCurrentPair = () => {
    const prefix = name.trim();
    if (foreground) {
      onAdd(
        prefix === ''
          ? t('palette.textFallback', { n: palette.length + 1 })
          : t('palette.textPrefix', { name: prefix }),
        foreground,
        'text',
      );
    }
    if (background) {
      onAdd(
        prefix === ''
          ? t('palette.surfaceFallback', { n: palette.length + 1 })
          : t('palette.surfacePrefix', { name: prefix }),
        background,
        'surface',
      );
    }
    setName('');
  };

  return (
    <div className="stack--lg stack">
      <div className="card">
        <div className="card__header">
          <h2 className="card__title">
            <PlusIcon style={{ width: 18, height: 18 }} />
            {t('palette.addTitle')}
          </h2>
        </div>
        <div className="card__body">
          <div className="field-row">
            <div className="field-row__grow">
              <label className="visually-hidden" htmlFor="palette-name">
                {t('palette.nameLabel')}
              </label>
              <input
                id="palette-name"
                className="text-input"
                type="text"
                value={name}
                placeholder={t('palette.namePlaceholder')}
                onChange={(event) => setName(event.target.value)}
              />
            </div>
            <button
              type="button"
              className="button button--primary"
              onClick={addCurrentPair}
              disabled={!foreground && !background}
            >
              <PlusIcon />
              {t('palette.addBoth')}
            </button>
          </div>
          <p className="small muted" style={{ marginTop: '0.5rem' }}>
            {t('palette.storageNote')}
          </p>
        </div>
      </div>

      {palette.length === 0 ? (
        <EmptyState
          icon={<PaletteIcon />}
          title={t('palette.emptyTitle')}
          action={
            <button
              type="button"
              className="button button--primary"
              onClick={addCurrentPair}
              disabled={!foreground && !background}
            >
              <PlusIcon />
              {t('palette.savePair')}
            </button>
          }
        >
          {t('palette.emptyBody')}
        </EmptyState>
      ) : (
        <ul className="palette-list">
          {palette.map((entry) => {
            const hex = rgbToHex(entry.color, { alpha: entry.color.a < 1 }).toUpperCase();
            const hsl = rgbToHsl(entry.color);
            const ratio = contrastRatio(entry.color, pageBackground);
            return (
              <li className="palette-item" key={entry.id}>
                <div className="palette-item__swatch" style={{ background: formatRgb(entry.color) }} />
                <div className="palette-item__body">
                  {editingId === entry.id ? (
                    <div className="field-row">
                      <label className="visually-hidden" htmlFor={`rename-${entry.id}`}>
                        {t('palette.newNameAria', { name: entry.name })}
                      </label>
                      <input
                        id={`rename-${entry.id}`}
                        className="text-input"
                        value={editingName}
                        onChange={(event) => setEditingName(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            onRename(entry.id, editingName.trim() === '' ? entry.name : editingName.trim());
                            setEditingId(null);
                          }
                          if (event.key === 'Escape') setEditingId(null);
                        }}
                        autoFocus
                      />
                      <button
                        type="button"
                        className="button button--sm"
                        onClick={() => {
                          onRename(entry.id, editingName.trim() === '' ? entry.name : editingName.trim());
                          setEditingId(null);
                        }}
                      >
                        {t('common.save')}
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="palette-item__name"
                      style={{
                        border: 0,
                        background: 'transparent',
                        padding: 0,
                        textAlign: 'left',
                        cursor: 'pointer',
                        color: 'inherit',
                        font: 'inherit',
                        fontWeight: 650,
                      }}
                      onClick={() => {
                        setEditingId(entry.id);
                        setEditingName(entry.name);
                      }}
                      aria-label={t('palette.renameAria', { name: entry.name })}
                      title={t('palette.renameHint')}
                    >
                      {entry.name}
                    </button>
                  )}
                  <span className="palette-item__hex">
                    {hex} · hsl({trimNumber(hsl.h, 0)} {trimNumber(hsl.s, 0)}% {trimNumber(hsl.l, 0)}%)
                  </span>
                  <span className="small muted">{t('palette.onPageBackground', { ratio: formatRatio(ratio) })}</span>
                  <CvdSwatchRow color={entry.color} />
                  <div className="palette-item__tools">
                    <button type="button" className="button button--sm" onClick={() => onUse(entry, 'foreground')}>
                      {t('palette.useAsText')}
                    </button>
                    <button type="button" className="button button--sm" onClick={() => onUse(entry, 'background')}>
                      {t('palette.useAsSurface')}
                    </button>
                    <button
                      type="button"
                      className="button button--sm button--quiet"
                      onClick={() => onCopy(hex, entry.name)}
                      aria-label={t('palette.copyAria', { hex })}
                    >
                      <CopyIcon />
                      {t('common.copy')}
                    </button>
                    <button
                      type="button"
                      className="button button--sm button--danger"
                      onClick={() => onRemove(entry.id)}
                      aria-label={t('palette.removeAria', { name: entry.name })}
                    >
                      <TrashIcon />
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
