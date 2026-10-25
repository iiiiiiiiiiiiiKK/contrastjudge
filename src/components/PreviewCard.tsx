import type { PreviewSettings } from '../types';
import { formatRgb } from '../lib/color';
import type { RGBA } from '../lib/color';
import { EyeIcon } from './Icons';

interface PreviewCardProps {
  readonly settings: PreviewSettings;
  readonly onChange: (patch: Partial<PreviewSettings>) => void;
  readonly foreground: RGBA;
  readonly background: RGBA;
  readonly effectiveBackground: RGBA;
  readonly ratioText: string;
}

const FONT_STACKS: Record<PreviewSettings['fontFamily'], string> = {
  sans: 'var(--font-sans)',
  serif: 'var(--font-serif)',
  mono: 'var(--font-mono)',
};

export function PreviewCard({
  settings,
  onChange,
  foreground,
  background,
  effectiveBackground,
  ratioText,
}: PreviewCardProps) {
  const textStyle = {
    color: formatRgb(foreground),
    fontSize: `${settings.fontSizePx}px`,
    fontWeight: settings.bold ? 700 : 400,
    fontFamily: FONT_STACKS[settings.fontFamily],
    lineHeight: 1.5,
  } as const;

  return (
    <section className="card" aria-labelledby="preview-heading">
      <header className="card__header">
        <h2 className="card__title" id="preview-heading">
          <EyeIcon />
          Live preview
        </h2>
        <span className="card__hint">
          Real text at {settings.fontSizePx}px{settings.bold ? ', bold' : ''}
        </span>
      </header>
      <div className="card__body stack">
        <div className="preview-surface" style={{ background: formatRgb(background), color: formatRgb(foreground) }}>
          <p className="preview-surface__text" style={textStyle}>
            {settings.sampleText}
          </p>
          <div className="preview-surface__buttons">
            <span
              className="preview-button preview-button--solid"
              style={{
                ...textStyle,
                background: formatRgb(foreground),
                color: formatRgb(effectiveBackground),
                borderColor: formatRgb(foreground),
                fontSize: '0.9rem',
                fontWeight: 650,
              }}
            >
              Primary action
            </span>
            <span
              className="preview-button"
              style={{ ...textStyle, borderColor: formatRgb(foreground), fontSize: '0.9rem', fontWeight: 650 }}
            >
              Secondary
            </span>
            <span className="preview-link" style={{ ...textStyle, fontSize: '0.9rem' }}>
              A text link
            </span>
          </div>
          <p
            className="small"
            style={{ ...textStyle, fontSize: `${Math.max(11, settings.fontSizePx - 3)}px`, opacity: 0.9 }}
          >
            Secondary line — captions and helper text sit at {Math.max(11, settings.fontSizePx - 3)}px and are judged
            against the same pair ({ratioText}).
          </p>
        </div>

        <div className="preview-controls">
          <div className="field">
            <label htmlFor="preview-text">Sample text</label>
            <input
              id="preview-text"
              type="text"
              value={settings.sampleText}
              onChange={(event) => onChange({ sampleText: event.target.value })}
              placeholder="Type your own copy…"
            />
          </div>

          <div className="field">
            <label htmlFor="preview-size">Font size</label>
            <div className="range-row">
              <input
                id="preview-size"
                type="range"
                min={10}
                max={48}
                step={1}
                value={settings.fontSizePx}
                onChange={(event) => onChange({ fontSizePx: Number(event.target.value) })}
                aria-describedby="preview-size-help"
              />
              <output htmlFor="preview-size">{settings.fontSizePx}px</output>
            </div>
            <span className="small muted" id="preview-size-help">
              WCAG large text starts at 24px, or 18.66px when bold.
            </span>
          </div>

          <div className="field">
            <span className="field__label" id="preview-weight-label">
              Weight
            </span>
            <div className="segmented" role="group" aria-labelledby="preview-weight-label">
              <button type="button" aria-pressed={!settings.bold} onClick={() => onChange({ bold: false })}>
                Regular
              </button>
              <button
                type="button"
                aria-pressed={settings.bold}
                onClick={() => onChange({ bold: true })}
                style={{ fontWeight: 700 }}
              >
                Bold
              </button>
            </div>
          </div>

          <div className="field">
            <label htmlFor="preview-family">Typeface</label>
            <select
              id="preview-family"
              value={settings.fontFamily}
              onChange={(event) => onChange({ fontFamily: event.target.value as PreviewSettings['fontFamily'] })}
            >
              <option value="sans">Sans-serif</option>
              <option value="serif">Serif</option>
              <option value="mono">Monospace</option>
            </select>
          </div>
        </div>
      </div>
    </section>
  );
}
