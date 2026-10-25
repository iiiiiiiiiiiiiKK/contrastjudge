import { useMemo } from 'react';
import type { RGBA } from '../lib/color';
import { formatRgb, rgbToHex } from '../lib/color';
import { CVD_DEFINITIONS, simulateCvd, simulatePair } from '../lib/cvd';
import type { CvdType } from '../lib/cvd';
import { formatRatio } from '../lib/wcag';
import type { CvdSelection } from '../types';
import { useI18n } from '../i18n';
import { AlertIcon, CheckIcon, CrossIcon, EyeIcon } from './Icons';
import { Card } from './Card';

interface CvdCardProps {
  readonly foreground: RGBA;
  readonly background: RGBA;
  readonly threshold: number;
  readonly selected: readonly CvdSelection[];
  readonly severity: number;
  readonly onToggle: (type: CvdSelection) => void;
  readonly onSeverityChange: (value: number) => void;
}

const ALL_TYPES: CvdSelection[] = ['protan', 'deutan', 'tritan', 'achromat'];

export function CvdCard({
  foreground,
  background,
  threshold,
  selected,
  severity,
  onToggle,
  onSeverityChange,
}: CvdCardProps) {
  const { t } = useI18n();
  const results = useMemo(
    () =>
      simulatePair(foreground, background, {
        severity,
        threshold,
        types: ALL_TYPES.filter((type) => selected.includes(type)),
      }),
    [foreground, background, severity, threshold, selected],
  );

  return (
    <Card id="cvd" title={t('cvd.title')} icon={<EyeIcon />} hint={t('cvd.hint')}>
      <div className="stack">
        <div className="chip-row" role="group" aria-label={t('cvd.typesLabel')}>
          {CVD_DEFINITIONS.map((definition) => {
            const checked = selected.includes(definition.id);
            return (
              <label
                key={definition.id}
                className="checkbox-chip"
                data-checked={checked}
                title={t(definition.descriptionKey)}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggle(definition.id)}
                  aria-describedby="cvd-prevalence-note"
                />
                {t(definition.shortNameKey)}
              </label>
            );
          })}
        </div>

        <div className="field">
          <label htmlFor="cvd-severity">{t('cvd.severity')}</label>
          <div className="range-row">
            <input
              id="cvd-severity"
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={severity}
              onChange={(event) => onSeverityChange(Number(event.target.value))}
              aria-describedby="cvd-severity-help"
            />
            <output htmlFor="cvd-severity">{Math.round(severity * 100)}%</output>
          </div>
          <span className="small muted" id="cvd-severity-help">
            {t('cvd.severityHelp')}
          </span>
        </div>

        {results.length === 0 ? (
          <p className="small muted" role="status">
            {t('cvd.selectOne')}
          </p>
        ) : (
          <div className="cvd-grid">
            {results.map((result) => {
              const definition = CVD_DEFINITIONS.find((item) => item.id === result.type);
              const simulatedBg = formatRgb(result.background);
              return (
                <div className="cvd-card" key={result.type}>
                  <div
                    className="cvd-card__sample"
                    style={{ background: simulatedBg, color: formatRgb(result.foreground) }}
                  >
                    <strong style={{ fontWeight: 700 }}>{t('cvd.sampleText')}</strong>
                    <span style={{ fontSize: '0.82em' }}>{t('cvd.sampleSecondary')}</span>
                    <span
                      style={{
                        display: 'inline-block',
                        alignSelf: 'flex-start',
                        marginTop: '0.15rem',
                        padding: '0.18rem 0.55rem',
                        border: `1px solid ${formatRgb(result.foreground)}`,
                        borderRadius: 8,
                        fontSize: '0.78em',
                        fontWeight: 650,
                      }}
                    >
                      {t('cvd.sampleButton')}
                    </span>
                  </div>
                  <div className="cvd-card__meta">
                    <span className="cvd-card__title">{t(definition?.shortNameKey ?? 'cvd.protanShort')}</span>
                    <span className="ratio-cell">
                      {formatRatio(result.ratio)}{' '}
                      <span className={`status ${result.failsThreshold ? 'status--fail' : 'status--pass'}`}>
                        {result.failsThreshold ? <CrossIcon /> : <CheckIcon />}
                        {t(result.failsThreshold ? 'cvd.below' : 'cvd.meets', { threshold })}
                      </span>
                    </span>
                    <span>
                      {result.foregroundHex} / {result.backgroundHex}
                    </span>
                    <span>
                      {result.type === 'achromat'
                        ? t('cvd.achromatNote')
                        : t(definition?.prevalenceKey ?? 'cvd.protanPrevalence')}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="callout callout--warn" id="cvd-prevalence-note">
          <AlertIcon />
          <div>
            <strong>{t('cvd.disclaimerTitle')}</strong> {t('cvd.disclaimerBody')}
          </div>
        </div>

        <p className="small muted">
          {t('cvd.footnote')}{' '}
          {t('cvd.footnotePair', {
            fg: rgbToHex(foreground).toUpperCase(),
            bg: rgbToHex(background).toUpperCase(),
          })}
        </p>
      </div>
    </Card>
  );
}

/** Standalone single-colour preview used by the palette rows. */
export function CvdSwatchRow({
  color,
  types = ['protan', 'deutan', 'tritan', 'achromat'],
}: {
  color: RGBA;
  types?: readonly CvdType[];
}) {
  const { t } = useI18n();
  return (
    <div className="chip-row">
      {types.map((type) => {
        const definition = CVD_DEFINITIONS.find((item) => item.id === type);
        const simulated = simulateCvd(color, type, 1);
        const label = t(definition?.shortNameKey ?? 'cvd.protanShort');
        return (
          <span
            key={type}
            className="pill"
            title={`${t(definition?.nameKey ?? 'cvd.protanName')}: ${rgbToHex(simulated).toUpperCase()}`}
          >
            <span
              className="swatch-dot"
              style={{ background: formatRgb(simulated), marginRight: 0 }}
              aria-hidden="true"
            />
            {label}
          </span>
        );
      })}
    </div>
  );
}
