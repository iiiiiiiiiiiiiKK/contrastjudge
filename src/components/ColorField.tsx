import { useEffect, useId, useRef, useState } from 'react';
import type { ChangeEvent, ReactNode } from 'react';
import type { ParseResult, RGBA } from '../lib/color';
import { formatRgb, rgbToHex, rgbToHsl, trimNumber } from '../lib/color';
import { useI18n } from '../i18n';
import { AlertIcon, CopyIcon, PipetteIcon } from './Icons';

export interface ColorFieldProps {
  readonly label: string;
  readonly role: string;
  readonly value: string;
  readonly parsed: ParseResult;
  readonly onChange: (value: string) => void;
  readonly onCopy?: () => void;
  readonly idPrefix: string;
  readonly disabled?: boolean;
  /** Optional extra controls rendered after the hex input. */
  readonly children?: ReactNode;
}

interface EyeDropperResult {
  sRGBHex: string;
}

interface EyeDropperLike {
  open: () => Promise<EyeDropperResult>;
}

type EyeDropperCtor = new () => EyeDropperLike;

function getEyeDropper(): EyeDropperCtor | null {
  if (typeof window === 'undefined') return null;
  const candidate = (window as unknown as { EyeDropper?: EyeDropperCtor }).EyeDropper;
  return typeof candidate === 'function' ? candidate : null;
}

function toColorInputValue(color: RGBA): string {
  return rgbToHex({ ...color, a: 1 }).toLowerCase();
}

export function ColorField(props: ColorFieldProps) {
  const { label, role, value, parsed, onChange, onCopy, idPrefix, disabled, children } = props;
  const { t, tm } = useI18n();
  const inputId = `${idPrefix}-text`;
  const errorId = `${idPrefix}-error`;
  const helperId = `${idPrefix}-helper`;
  const colorInputId = useId();
  const [dropperState, setDropperState] = useState<'idle' | 'unsupported' | 'error'>('idle');
  const [dropperMessage, setDropperMessage] = useState<string>('');
  const eyedropperAvailable = useRef<boolean>(false);

  useEffect(() => {
    eyedropperAvailable.current = getEyeDropper() !== null;
  }, []);

  const valid = parsed.ok;
  const swatchColor = valid ? toColorInputValue(parsed.color) : '#808080';

  const handleText = (event: ChangeEvent<HTMLInputElement>) => {
    onChange(event.target.value);
  };

  const handlePicker = (event: ChangeEvent<HTMLInputElement>) => {
    onChange(event.target.value.toUpperCase());
  };

  const handleEyeDropper = async () => {
    const Ctor = getEyeDropper();
    if (!Ctor) {
      setDropperState('unsupported');
      setDropperMessage(t('colorField.dropperUnsupported'));
      return;
    }
    try {
      const dropper = new Ctor();
      const result = await dropper.open();
      setDropperState('idle');
      setDropperMessage('');
      onChange(result.sRGBHex.toUpperCase());
    } catch (error) {
      // AbortError means the user pressed Escape — not an error worth shouting about.
      const aborted = error instanceof Error && error.name === 'AbortError';
      if (aborted) {
        setDropperState('idle');
        setDropperMessage('');
        return;
      }
      setDropperState('error');
      setDropperMessage(
        t('colorField.dropperError', {
          message: error instanceof Error ? error.message : String(error),
        }),
      );
    }
  };

  const hsl = valid ? rgbToHsl(parsed.color) : null;

  return (
    <div className="color-field">
      <div className="color-field__top">
        <div className="swatch-input">
          <input
            id={colorInputId}
            type="color"
            value={swatchColor}
            onChange={handlePicker}
            disabled={disabled}
            aria-label={t('colorField.pickerAria', { label })}
            aria-describedby={helperId}
          />
          <span
            className="swatch-input__preview"
            style={{ background: valid ? formatRgb(parsed.color) : undefined }}
          />
          <span className="swatch-input__label" aria-hidden="true">
            {t('colorField.pick')}
          </span>
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <label className="color-field__label" htmlFor={inputId}>
            {label}
          </label>
          <span className="color-field__role">{role}</span>
        </div>
        {onCopy ? (
          <button type="button" className="button button--sm button--quiet" onClick={onCopy}>
            <CopyIcon />
            {t('common.copy')}
          </button>
        ) : null}
      </div>

      <div className="field-row">
        <div className="field-row__grow">
          <input
            id={inputId}
            className="text-input"
            type="text"
            inputMode="text"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            value={value}
            onChange={handleText}
            disabled={disabled}
            aria-invalid={!valid}
            aria-describedby={`${helperId}${valid ? '' : ` ${errorId}`}`}
            placeholder={t('colorField.placeholder')}
          />
        </div>
        <button
          type="button"
          className="button button--sm"
          onClick={() => {
            void handleEyeDropper();
          }}
          disabled={disabled}
          title={t('colorField.eyedropperTitle')}
        >
          <PipetteIcon />
          {t('colorField.eyedropper')}
        </button>
      </div>

      {!valid ? (
        <p className="field-error" id={errorId}>
          <AlertIcon />
          <span>{tm(parsed.message)}</span>
        </p>
      ) : null}

      {dropperState === 'unsupported' ? (
        <p className="small muted" role="status">
          {dropperMessage}
        </p>
      ) : null}
      {dropperState === 'error' ? (
        <p className="field-error" role="alert">
          <AlertIcon />
          <span>{dropperMessage}</span>
        </p>
      ) : null}

      <p className="color-field__meta" id={helperId}>
        {valid && hsl ? (
          <>
            <span>{rgbToHex(parsed.color, { alpha: parsed.color.a < 1 }).toUpperCase()}</span>
            <span>{formatRgb(parsed.color)}</span>
            <span>
              hsl({trimNumber(hsl.h, 1)} {trimNumber(hsl.s, 1)}% {trimNumber(hsl.l, 1)}%)
            </span>
            {parsed.color.a < 1 ? (
              <span>{t('colorField.alpha', { value: trimNumber(parsed.color.a, 2) })}</span>
            ) : null}
            <span>{t('colorField.parsedAs', { format: parsed.format })}</span>
          </>
        ) : (
          <span>{t('colorField.hint')}</span>
        )}
      </p>

      {children}
    </div>
  );
}
