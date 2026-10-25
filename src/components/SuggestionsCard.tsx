import { useMemo } from 'react';
import type { RGBA } from '../lib/color';
import { formatRgb, rgbToHex } from '../lib/color';
import { formatRatio } from '../lib/wcag';
import {
  isTargetUnreachable,
  maxAchievableRatio,
  suggestBackgroundColors,
  suggestForegroundColors,
} from '../lib/suggest';
import type { Suggestion } from '../lib/suggest';
import { useI18n } from '../i18n';
import { AlertIcon, SparkleIcon } from './Icons';
import { Card } from './Card';

interface SuggestionsCardProps {
  readonly foreground: RGBA;
  readonly background: RGBA;
  readonly target: number;
  readonly targetOptions: readonly number[];
  readonly onTargetChange: (value: number) => void;
  readonly onApplyForeground: (color: RGBA) => void;
  readonly onApplyBackground: (color: RGBA) => void;
}

function SuggestChip({
  suggestion,
  roleLabel,
  roleKey,
  onApply,
  counterpart,
}: {
  suggestion: Suggestion;
  roleLabel: string;
  roleKey: 'text' | 'surface';
  onApply: (color: RGBA) => void;
  /** The colour that stays fixed; drawn under/over the suggestion for a true preview. */
  counterpart: RGBA;
}) {
  const { t } = useI18n();
  // The chip shows the suggested colour as a surface with the counterpart colour on top, so the
  // preview is exactly the pair the suggestion would create.
  const chipBackground = rgbToHex(suggestion.color);
  const chipText = rgbToHex(counterpart);
  const amount = Math.abs(suggestion.lightnessDelta).toFixed(1).replace(/\.0$/, '');
  const direction =
    suggestion.direction === 'unchanged'
      ? t('suggest.alreadyPasses')
      : t(suggestion.direction === 'darker' ? 'suggest.darker' : 'suggest.lighter', { amount });

  return (
    <button
      type="button"
      className="suggestion"
      onClick={() => onApply(suggestion.color)}
      // No aria-label: WCAG 2.5.3 requires the accessible name to contain the visible label, and the
      // chip already shows the hex, the ratio and the direction.
      data-role={roleKey}
    >
      <span className="suggestion__chip" style={{ background: chipBackground, color: chipText }}>
        {suggestion.hex}
      </span>{' '}
      <span className="suggestion__meta">
        <span className="suggestion__ratio">{formatRatio(suggestion.ratio)}</span> <span>{direction}</span>{' '}
      </span>
      <span className="visually-hidden">— {t('suggest.chipUseAs', { role: roleLabel })}</span>
    </button>
  );
}

export function SuggestionsCard({
  foreground,
  background,
  target,
  targetOptions,
  onTargetChange,
  onApplyForeground,
  onApplyBackground,
}: SuggestionsCardProps) {
  const { t } = useI18n();
  const foregroundSuggestions = useMemo(
    () => suggestForegroundColors(foreground, background, { target, limit: 4 }),
    [foreground, background, target],
  );
  const backgroundSuggestions = useMemo(
    () => suggestBackgroundColors(foreground, background, { target, limit: 3 }),
    [foreground, background, target],
  );
  const unreachable = useMemo(() => isTargetUnreachable(background, target), [background, target]);
  const ceiling = useMemo(() => maxAchievableRatio(background), [background]);

  return (
    <Card id="suggestions" title={t('suggest.title')} icon={<SparkleIcon />} hint={t('suggest.hint')}>
      <div className="stack">
        <div className="inline" style={{ justifyContent: 'space-between' }}>
          <span className="small muted" id="target-label">
            {t('suggest.target')}
          </span>
          <div className="segmented" role="group" aria-labelledby="target-label">
            {targetOptions.map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={Math.abs(option - target) < 1e-9}
                onClick={() => onTargetChange(option)}
              >
                {option}:1
              </button>
            ))}
          </div>
        </div>

        {unreachable ? (
          <div className="callout callout--fail">
            <AlertIcon />
            <div>
              <strong>{t('suggest.unreachable', { target })}</strong>{' '}
              {t('suggest.unreachableBest', {
                ratio: formatRatio(ceiling.ratio),
                colour: ceiling.color,
              })}
            </div>
          </div>
        ) : null}

        <div>
          <h3 className="small" style={{ marginBottom: '0.45rem', fontWeight: 680 }}>
            {t('suggest.adjustText')}
          </h3>
          <div className="suggestion-grid">
            {foregroundSuggestions.map((suggestion) => (
              <SuggestChip
                key={`fg-${suggestion.hex}`}
                suggestion={suggestion}
                roleLabel={t('suggest.roleText')}
                roleKey="text"
                counterpart={background}
                onApply={onApplyForeground}
              />
            ))}
          </div>
        </div>

        <div>
          <h3 className="small" style={{ marginBottom: '0.45rem', fontWeight: 680 }}>
            {t('suggest.adjustBackground')}
          </h3>
          <div className="suggestion-grid">
            {backgroundSuggestions.map((suggestion) => (
              <SuggestChip
                key={`bg-${suggestion.hex}`}
                suggestion={suggestion}
                roleLabel={t('suggest.roleSurface')}
                roleKey="surface"
                counterpart={foreground}
                onApply={onApplyBackground}
              />
            ))}
          </div>
          <p className="small muted" style={{ marginTop: '0.4rem' }}>
            {t('suggest.note')}
          </p>
        </div>

        <div className="callout callout--info">
          <SparkleIcon />
          <div>{t('suggest.info')}</div>
        </div>
      </div>
    </Card>
  );
}

/** Small inline swatch preview used in the palette rows. */
export function Swatch({ color, label }: { color: RGBA; label: string }) {
  return (
    <span
      className="swatch-dot"
      style={{ background: formatRgb(color) }}
      role="img"
      aria-label={`${label}: ${rgbToHex(color).toUpperCase()}`}
    />
  );
}
