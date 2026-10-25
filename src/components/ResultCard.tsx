import type { ContrastReport, ThresholdResult } from '../lib/wcag';
import { formatRatio, roundRatio } from '../lib/wcag';
import { AlertIcon, CheckIcon, CrossIcon, ContrastIcon, InfoIcon, SparkleIcon } from './Icons';

interface ResultCardProps {
  readonly report: ContrastReport | null;
  readonly level: 'AA' | 'AAA';
  readonly onLevelChange: (level: 'AA' | 'AAA') => void;
  readonly fontSizePx: number;
  readonly bold: boolean;
  readonly hasAlpha: boolean;
}

function StatusCell({ passes, label }: { passes: boolean; label: string }) {
  return (
    <span className={`status ${passes ? 'status--pass' : 'status--fail'}`}>
      {passes ? <CheckIcon /> : <CrossIcon />}
      {label}
    </span>
  );
}

function thresholdLabel(result: ThresholdResult): string {
  if (result.kind === 'non-text') return 'UI & graphics (1.4.11 AA)';
  const size = result.size === 'large' ? 'Large text' : 'Normal text';
  return `${size} (${result.criterion} ${result.level})`;
}

function Row({ result }: { result: ThresholdResult }) {
  return (
    <tr>
      <th scope="row">{thresholdLabel(result)}</th>
      <td className="ratio-cell">{result.threshold}:1</td>
      <td className="ratio-cell">{formatRatio(result.ratio)}</td>
      <td>
        <StatusCell passes={result.passes} label={result.passes ? 'Pass' : 'Fail'} />
        <span className="visually-hidden"> — {result.explanation}</span>
      </td>
    </tr>
  );
}

export function ResultCard({ report, level, onLevelChange, fontSizePx, bold, hasAlpha }: ResultCardProps) {
  if (!report) {
    return (
      <section className="card result" aria-labelledby="result-heading">
        <header className="card__header">
          <h2 className="card__title" id="result-heading">
            <ContrastIcon />
            Contrast result
          </h2>
        </header>
        <div className="card__body">
          <div className="callout callout--warn" role="status">
            <AlertIcon />
            <div>
              <strong>No result yet.</strong> Fix the colour value marked in red so ContrastJudge can calculate a
              ratio. Invalid input is never converted into a guessed colour.
            </div>
          </div>
        </div>
      </section>
    );
  }

  const activeThreshold = level === 'AAA' ? (report.largeText ? 4.5 : 7) : report.largeText ? 3 : 4.5;
  const activeResult = report.textResults.find(
    (result) => result.level === level && result.size === (report.largeText ? 'large' : 'normal'),
  );
  const passes = activeResult?.passes ?? false;
  const meterPercent = Math.min(100, Math.max(0, ((report.ratio - 1) / 20) * 100));
  const verdictTone = passes ? 'pass' : report.passesAaLarge ? 'warn' : 'fail';
  return (
    <section className="card result" aria-labelledby="result-heading">
      <h2 className="visually-hidden" id="result-heading">
        Contrast result
      </h2>
      <div className="result__hero">
        <div className="result__ratio">
          <span className="result__ratio-label">Contrast ratio</span>
          <span className="result__ratio-value" data-testid="contrast-ratio">
            {formatRatio(report.ratio)}
          </span>
          <span className="result__sub">
            Target {activeThreshold}:1 · {report.largeText ? 'large text' : 'normal text'} · Level {level}
          </span>
        </div>
        <div className="result__verdict">
          <span className={`verdict-badge verdict-badge--${verdictTone}`}>
            {passes ? <CheckIcon /> : <CrossIcon />}
            {passes ? `Passes ${level}` : `Fails ${level}`}
          </span>
          <span className="result__sub">
            Best level: <strong>{report.bestLevel}</strong>
          </span>
        </div>
      </div>

      <div
        className="result__meter"
        role="img"
        aria-label={`Contrast ratio ${formatRatio(report.ratio)} on a scale from 1:1 to 21:1`}
      >
        <div className="result__meter-fill" style={{ width: `${meterPercent}%` }} />
      </div>
      <div className="result__meter-ticks" aria-hidden="true">
        <span>1:1</span>
        <span>3:1</span>
        <span>4.5:1</span>
        <span>7:1</span>
        <span>21:1</span>
      </div>

      <div className="card__body stack">
        <div className="inline" style={{ justifyContent: 'space-between' }}>
          <span className="small muted" id="level-label">
            Judge against
          </span>
          <div className="segmented" role="group" aria-labelledby="level-label">
            <button
              type="button"
              onClick={() => onLevelChange('AA')}
              aria-pressed={level === 'AA'}
              aria-label="Check against WCAG 2.2 level AA"
            >
              AA
            </button>
            <button
              type="button"
              onClick={() => onLevelChange('AAA')}
              aria-pressed={level === 'AAA'}
              aria-label="Check against WCAG 2.2 level AAA"
            >
              AAA
            </button>
          </div>
        </div>

        <table className="result__table">
          <caption>
            Every threshold that applies to this pair, measured at {fontSizePx}px{bold ? ' bold' : ''}. Thresholds are
            compared against the unrounded ratio.
          </caption>
          <thead>
            <tr>
              <th scope="col">Requirement</th>
              <th scope="col">Minimum</th>
              <th scope="col">This pair</th>
              <th scope="col">Outcome</th>
            </tr>
          </thead>
          <tbody>
            {report.textResults.map((result) => (
              <Row key={result.id} result={result} />
            ))}
            <Row result={report.nonTextResult} />
          </tbody>
        </table>

        {hasAlpha ? (
          <div className="callout callout--info">
            <InfoIcon />
            <div>
              A translucent colour was flattened onto its backdrop before measuring, which is what WCAG evaluates. The
              effective pair is <code>{formatRatio(report.ratio)}</code>.
            </div>
          </div>
        ) : null}

        <div>
          <h3 className="small" style={{ marginBottom: '0.45rem', fontWeight: 680 }}>
            <SparkleIcon style={{ width: 15, height: 15, verticalAlign: '-2px', marginRight: 4 }} />
            What to do next
          </h3>
          <ul className="advice">
            {report.advice.map((item) => (
              <li key={item}>
                <SparkleIcon />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="small muted">
          Ratio = (L<sub>lighter</sub> + 0.05) / (L<sub>darker</sub> + 0.05), computed from unrounded sRGB relative
          luminance. A passing ratio means <em>this colour pair</em> meets the contrast success criterion — it is not
          a statement that a whole page conforms to WCAG 2.2. See <a href="#learn">the method notes</a> for details.
        </p>

        <p className="visually-hidden" aria-live="polite">
          {`Contrast ratio ${formatRatio(report.ratio)}. ${
            passes ? `Passes level ${level}.` : `Fails level ${level}; needs ${activeThreshold}:1.`
          }`}
        </p>
        <p className="small muted mono">exact ratio: {roundRatio(report.ratio, 6).toFixed(6)}</p>
      </div>
    </section>
  );
}
