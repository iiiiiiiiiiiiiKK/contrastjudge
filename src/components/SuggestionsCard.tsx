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

function directionLabel(suggestion: Suggestion): string {
  if (suggestion.direction === 'unchanged') return 'Already passes';
  const amount = Math.abs(suggestion.lightnessDelta).toFixed(1).replace(/\.0$/, '');
  return `${suggestion.direction === 'darker' ? 'Darker' : 'Lighter'} by ${amount}%`;
}

function SuggestChip({
  suggestion,
  role,
  onApply,
  counterpart,
}: {
  suggestion: Suggestion;
  role: 'text' | 'surface';
  onApply: (color: RGBA) => void;
  /** The colour that stays fixed; drawn on top of / below the suggestion for a true preview. */
  counterpart: RGBA;
}) {
  // The chip shows the suggested colour as a surface with the counterpart colour on top, so the
  // preview is exactly the pair the suggestion would create.
  const chipBackground = rgbToHex(suggestion.color);
  const chipText = rgbToHex(counterpart);
  return (
    <button
      type="button"
      className="suggestion"
      onClick={() => onApply(suggestion.color)}
      // No aria-label: WCAG 2.5.3 requires the accessible name to contain the visible label, and the
      // chip already shows the hex, the ratio and the direction. Extra context is appended as
      // visually hidden text so the name still starts with what a sighted user reads.
    >
      <span className="suggestion__chip" style={{ background: chipBackground, color: chipText }}>
        {suggestion.hex}
      </span>{' '}
      <span className="suggestion__meta">
        <span className="suggestion__ratio">{formatRatio(suggestion.ratio)}</span>{' '}
        <span>{directionLabel(suggestion)}</span>{' '}
        {/* The separator keeps the computed accessible name readable ("#817272 4.58:1 …") while the
            flex/grid layout keeps the visual spacing. */}
      </span>
      <span className="visually-hidden">— use as the {role} colour</span>
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
    <Card
      id="suggestions"
      title="Accessible alternatives"
      icon={<SparkleIcon />}
      hint="Keeps the original hue where possible"
    >
      <div className="stack">
        <div className="inline" style={{ justifyContent: 'space-between' }}>
          <span className="small muted" id="target-label">
            Target ratio
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
              <strong>No colour can reach {target}:1 on this background.</strong> The best possible pair here is{' '}
              {formatRatio(ceiling.ratio)} using {ceiling.color}. Pick a different background instead.
            </div>
          </div>
        ) : null}

        <div>
          <h3 className="small" style={{ marginBottom: '0.45rem', fontWeight: 680 }}>
            Adjust the text colour
          </h3>
          <div className="suggestion-grid">
            {foregroundSuggestions.map((suggestion) => (
              <SuggestChip
                key={`fg-${suggestion.hex}`}
                suggestion={suggestion}
                role="text"
                counterpart={background}
                onApply={onApplyForeground}
              />
            ))}
          </div>
        </div>

        <div>
          <h3 className="small" style={{ marginBottom: '0.45rem', fontWeight: 680 }}>
            Or adjust the background
          </h3>
          <div className="suggestion-grid">
            {backgroundSuggestions.map((suggestion) => (
              <SuggestChip
                key={`bg-${suggestion.hex}`}
                suggestion={suggestion}
                role="surface"
                counterpart={foreground}
                onApply={onApplyBackground}
              />
            ))}
          </div>
          <p className="small muted" style={{ marginTop: '0.4rem' }}>
            Selecting a suggestion updates the corresponding field. Nothing is applied automatically, so you can
            compare before committing.
          </p>
        </div>

        <div className="callout callout--info">
          <SparkleIcon />
          <div>
            Suggestions move lightness in 1% steps and keep hue and saturation. They are a starting point — check the
            result in a real page, because rendering, transparency and font weight all change perceived contrast.
          </div>
        </div>
      </div>
    </Card>
  );
}

/** Small inline swatch preview used in the CVD card and palette rows. */
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
