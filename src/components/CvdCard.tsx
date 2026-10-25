import { useMemo } from 'react';
import type { RGBA } from '../lib/color';
import { formatRgb, rgbToHex } from '../lib/color';
import { CVD_DEFINITIONS, simulateCvd, simulatePair } from '../lib/cvd';
import type { CvdType } from '../lib/cvd';
import { formatRatio } from '../lib/wcag';
import type { CvdSelection } from '../types';
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
  const results = useMemo(
    () =>
      simulatePair(foreground, background, {
        severity,
        threshold,
        types: ALL_TYPES.filter((type) => selected.includes(type)),
      }),
    [foreground, background, severity, threshold, selected],
  );

  const sampleText = 'The quick brown fox';
  const sampleSecondary = 'Secondary text at 90% size';

  return (
    <Card id="cvd" title="Colour-vision simulation" icon={<EyeIcon />} hint="Machado 2009 model · illustrative only">
      <div className="stack">
        <div className="chip-row" role="group" aria-label="Colour-vision deficiencies to simulate">
          {CVD_DEFINITIONS.map((definition) => {
            const checked = selected.includes(definition.id);
            return (
              <label
                key={definition.id}
                className="checkbox-chip"
                data-checked={checked}
                title={definition.description}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggle(definition.id)}
                  aria-describedby="cvd-prevalence-note"
                />
                {definition.shortName}
              </label>
            );
          })}
        </div>

        <div className="field">
          <label htmlFor="cvd-severity">Severity</label>
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
            0% = normal colour vision, 100% = full dichromacy. Values in between model anomalous trichromacy.
          </span>
        </div>

        {results.length === 0 ? (
          <p className="small muted" role="status">
            Select at least one simulation to compare how this pair changes.
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
                    <strong style={{ fontWeight: 700 }}>{sampleText}</strong>
                    <span style={{ fontSize: '0.82em' }}>{sampleSecondary}</span>
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
                      Button
                    </span>
                  </div>
                  <div className="cvd-card__meta">
                    <span className="cvd-card__title">{definition?.shortName ?? result.type}</span>
                    <span className="ratio-cell">
                      {formatRatio(result.ratio)}{' '}
                      <span className={`status ${result.failsThreshold ? 'status--fail' : 'status--pass'}`}>
                        {result.failsThreshold ? <CrossIcon /> : <CheckIcon />}
                        {result.failsThreshold ? `below ${threshold}:1` : `meets ${threshold}:1`}
                      </span>
                    </span>
                    <span>
                      {result.foregroundHex} on {result.backgroundHex}
                    </span>
                    <span>
                      {result.type === 'achromat'
                        ? 'Greyscale conversion based on perceived luminance.'
                        : definition?.prevalence}
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
            <strong>Simulations are an approximation, not a diagnosis.</strong> Real colour vision varies between
            people, changes with age and lighting, and no matrix can stand in for testing with users. Treat a red flag
            here as a prompt to add a second, non-colour signal.
          </div>
        </div>

        <p className="small muted">
          Matrices from Machado, Oliveira &amp; Fernandes (2009) applied to linear-light sRGB, with interpolation
          between the published 0.1 severity steps. Original foreground {rgbToHex(foreground).toUpperCase()},
          background {rgbToHex(background).toUpperCase()}.
        </p>
      </div>
    </Card>
  );
}

/** Standalone single-colour preview used by the palette tab. */
export function CvdSwatchRow({
  color,
  types = ['protan', 'deutan', 'tritan', 'achromat'],
}: {
  color: RGBA;
  types?: readonly CvdType[];
}) {
  return (
    <div className="chip-row">
      {types.map((type) => {
        const definition = CVD_DEFINITIONS.find((item) => item.id === type);
        const simulated = simulateCvd(color, type, 1);
        return (
          <span
            key={type}
            className="pill"
            title={`${definition?.name ?? type}: ${rgbToHex(simulated).toUpperCase()}`}
          >
            <span
              className="swatch-dot"
              style={{ background: formatRgb(simulated), marginRight: 0 }}
              aria-hidden="true"
            />
            {definition?.shortName ?? type}
          </span>
        );
      })}
    </div>
  );
}
