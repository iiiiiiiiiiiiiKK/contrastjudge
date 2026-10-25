import { useState } from 'react';
import type { PaletteEntry } from '../types';
import type { RGBA } from '../lib/color';
import { formatRgb, rgbToHex, rgbToHsl, trimNumber } from '../lib/color';
import { contrastRatio, formatRatio } from '../lib/wcag';
import { CvdSwatchRow } from './CvdCard';
import { EmptyState } from './Card';
import { CopyIcon, PaletteIcon, PlusIcon, TrashIcon } from './Icons';

interface PaletteCardProps {
  readonly palette: readonly PaletteEntry[];
  readonly foreground: RGBA | null;
  readonly background: RGBA | null;
  readonly pageBackground: RGBA;
  readonly onAdd: (name: string, color: RGBA, role: string) => void;
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
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const addCurrentPair = () => {
    if (foreground) onAdd(name === '' ? `Text ${palette.length + 1}` : `${name} text`, foreground, 'text');
    if (background) {
      onAdd(name === '' ? `Surface ${palette.length + 1}` : `${name} surface`, background, 'surface');
    }
    setName('');
  };

  return (
    <div className="stack--lg stack">
      <div className="card">
        <div className="card__header">
          <h2 className="card__title">
            <PlusIcon style={{ width: 18, height: 18 }} />
            Save the current pair
          </h2>
        </div>
        <div className="card__body">
          <div className="field-row">
            <div className="field-row__grow">
              <label className="visually-hidden" htmlFor="palette-name">
                Palette entry name prefix
              </label>
              <input
                id="palette-name"
                className="text-input"
                type="text"
                value={name}
                placeholder="e.g. Marketing site"
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
              Add both colours
            </button>
          </div>
          <p className="small muted" style={{ marginTop: '0.5rem' }}>
            Colours are stored in this browser only (localStorage). Nothing is uploaded, and clearing site data
            removes them permanently.
          </p>
        </div>
      </div>

      {palette.length === 0 ? (
        <EmptyState
          icon={<PaletteIcon />}
          title="No saved colours yet"
          action={
            <button
              type="button"
              className="button button--primary"
              onClick={addCurrentPair}
              disabled={!foreground && !background}
            >
              <PlusIcon />
              Save the current pair
            </button>
          }
        >
          Saved colours show their HEX, RGB and HSL values, contrast against the page background, and how they look
          with each colour-vision deficiency. They feed the CSS and JSON exporters.
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
                        New name for {entry.name}
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
                        Save
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
                      aria-label={`Rename ${entry.name}`}
                      title="Click to rename"
                    >
                      {entry.name}
                    </button>
                  )}
                  <span className="palette-item__hex">
                    {hex} · hsl({trimNumber(hsl.h, 0)} {trimNumber(hsl.s, 0)}% {trimNumber(hsl.l, 0)}%)
                  </span>
                  <span className="small muted">{formatRatio(ratio)} on page background</span>
                  <CvdSwatchRow color={entry.color} />
                  <div className="palette-item__tools">
                    <button type="button" className="button button--sm" onClick={() => onUse(entry, 'foreground')}>
                      Use as text
                    </button>
                    <button type="button" className="button button--sm" onClick={() => onUse(entry, 'background')}>
                      Use as surface
                    </button>
                    <button
                      type="button"
                      className="button button--sm button--quiet"
                      onClick={() => onCopy(hex, entry.name)}
                      aria-label={`Copy ${hex} to the clipboard`}
                    >
                      <CopyIcon />
                      Copy
                    </button>
                    <button
                      type="button"
                      className="button button--sm button--danger"
                      onClick={() => onRemove(entry.id)}
                      aria-label={`Remove ${entry.name} from the palette`}
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
