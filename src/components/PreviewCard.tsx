import type { PreviewSettings } from '../types';
import { formatRgb } from '../lib/color';
import type { RGBA } from '../lib/color';
import { useI18n } from '../i18n';
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
  const { t } = useI18n();
  const textStyle = {
    color: formatRgb(foreground),
    fontSize: `${settings.fontSizePx}px`,
    fontWeight: settings.bold ? 700 : 400,
    fontFamily: FONT_STACKS[settings.fontFamily],
    lineHeight: 1.5,
  } as const;

  const secondarySize = Math.max(11, settings.fontSizePx - 3);
  // An empty sample means "use the localised default", so switching language also switches the
  // sample sentence instead of leaving an English pangram in a Chinese UI.
  const sampleText = settings.sampleText.trim() === '' ? t('preview.defaultSample') : settings.sampleText;

  return (
    <section className="card" aria-labelledby="preview-heading">
      <header className="card__header">
        <h2 className="card__title" id="preview-heading">
          <EyeIcon />
          {t('preview.title')}
        </h2>
        <span className="card__hint">
          {t('preview.hint', {
            size: settings.fontSizePx,
            bold: settings.bold ? `, ${t('preview.bold').toLowerCase()}` : '',
          })}
        </span>
      </header>
      <div className="card__body stack">
        <div className="preview-surface" style={{ background: formatRgb(background), color: formatRgb(foreground) }}>
          <p className="preview-surface__text" style={textStyle}>
            {sampleText}
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
              {t('preview.primaryAction')}
            </span>
            <span
              className="preview-button"
              style={{ ...textStyle, borderColor: formatRgb(foreground), fontSize: '0.9rem', fontWeight: 650 }}
            >
              {t('preview.secondary')}
            </span>
            <span className="preview-link" style={{ ...textStyle, fontSize: '0.9rem' }}>
              {t('preview.link')}
            </span>
          </div>
          <p className="small" style={{ ...textStyle, fontSize: `${secondarySize}px`, opacity: 0.9 }}>
            {t('preview.secondaryLine', { size: secondarySize, ratio: ratioText })}
          </p>
        </div>

        <div className="preview-controls">
          <div className="field">
            <label htmlFor="preview-text">{t('preview.sampleText')}</label>
            <input
              id="preview-text"
              type="text"
              value={settings.sampleText}
              onChange={(event) => onChange({ sampleText: event.target.value })}
              placeholder={t('preview.defaultSample')}
            />
          </div>

          <div className="field">
            <label htmlFor="preview-size">{t('preview.fontSize')}</label>
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
              {t('preview.fontSizeHelp')}
            </span>
          </div>

          <div className="field">
            <span className="field__label" id="preview-weight-label">
              {t('preview.weight')}
            </span>
            <div className="segmented" role="group" aria-labelledby="preview-weight-label">
              <button type="button" aria-pressed={!settings.bold} onClick={() => onChange({ bold: false })}>
                {t('preview.regular')}
              </button>
              <button
                type="button"
                aria-pressed={settings.bold}
                onClick={() => onChange({ bold: true })}
                style={{ fontWeight: 700 }}
              >
                {t('preview.bold')}
              </button>
            </div>
          </div>

          <div className="field">
            <label htmlFor="preview-family">{t('preview.typeface')}</label>
            <select
              id="preview-family"
              value={settings.fontFamily}
              onChange={(event) => onChange({ fontFamily: event.target.value as PreviewSettings['fontFamily'] })}
            >
              <option value="sans">{t('preview.sans')}</option>
              <option value="serif">{t('preview.serif')}</option>
              <option value="mono">{t('preview.mono')}</option>
            </select>
          </div>
        </div>
      </div>
    </section>
  );
}
