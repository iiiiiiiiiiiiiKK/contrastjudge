import type { ContrastReport, ThresholdResult } from '../lib/wcag';
import { formatRatio, roundRatio } from '../lib/wcag';
import { useI18n } from '../i18n';
import type { TranslationKey } from '../i18n';
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

function thresholdLabelKey(result: ThresholdResult): TranslationKey {
  if (result.kind === 'non-text') return 'result.thresholdNonText';
  return result.size === 'large' ? 'result.thresholdLarge' : 'result.thresholdNormal';
}

export function ResultCard({ report, level, onLevelChange, fontSizePx, bold, hasAlpha }: ResultCardProps) {
  const { t, tm } = useI18n();

  if (!report) {
    return (
      <section className="card result" aria-labelledby="result-heading">
        <header className="card__header">
          <h2 className="card__title" id="result-heading">
            <ContrastIcon />
            {t('result.title')}
          </h2>
        </header>
        <div className="card__body">
          <div className="callout callout--warn" role="status">
            <AlertIcon />
            <div>
              <strong>{t('result.emptyTitle')}</strong> {t('result.emptyBody')}
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

  const rowLabel = (result: ThresholdResult) =>
    t(thresholdLabelKey(result), { criterion: result.criterion, level: result.level });

  return (
    <section className="card result" aria-labelledby="result-heading">
      <h2 className="visually-hidden" id="result-heading">
        {t('result.title')}
      </h2>
      <div className="result__hero">
        <div className="result__ratio">
          <span className="result__ratio-label">{t('result.ratioLabel')}</span>
          <span className="result__ratio-value" data-testid="contrast-ratio">
            {formatRatio(report.ratio)}
          </span>
          <span className="result__sub">
            {t('result.targetLine', {
              threshold: activeThreshold,
              size: t(report.largeText ? 'result.sizeLarge' : 'result.sizeNormal'),
              level,
            })}
          </span>
        </div>
        <div className="result__verdict">
          <span className={`verdict-badge verdict-badge--${verdictTone}`}>
            {passes ? <CheckIcon /> : <CrossIcon />}
            {t(passes ? 'result.passesLevel' : 'result.failsLevel', { level })}
          </span>
          <span className="result__sub">
            {t('result.bestLevel')} <strong>{report.bestLevel}</strong>
          </span>
        </div>
      </div>

      <div
        className="result__meter"
        role="img"
        aria-label={t('result.scaleAria', { ratio: formatRatio(report.ratio) })}
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
            {t('result.judgeAgainst')}
          </span>
          <div className="segmented" role="group" aria-labelledby="level-label">
            <button
              type="button"
              onClick={() => onLevelChange('AA')}
              aria-pressed={level === 'AA'}
              aria-label={t('result.levelAAaria')}
            >
              AA
            </button>
            <button
              type="button"
              onClick={() => onLevelChange('AAA')}
              aria-pressed={level === 'AAA'}
              aria-label={t('result.levelAAAaria')}
            >
              AAA
            </button>
          </div>
        </div>

        <table className="result__table">
          <caption>
            {t('result.tableCaption', {
              size: fontSizePx,
              bold: bold ? `, ${t('preview.bold').toLowerCase()}` : '',
            })}
          </caption>
          <thead>
            <tr>
              <th scope="col">{t('result.colRequirement')}</th>
              <th scope="col">{t('result.colMinimum')}</th>
              <th scope="col">{t('result.colPair')}</th>
              <th scope="col">{t('result.colOutcome')}</th>
            </tr>
          </thead>
          <tbody>
            {report.textResults.map((result) => (
              <tr key={result.id}>
                <th scope="row">{rowLabel(result)}</th>
                <td className="ratio-cell">{result.threshold}:1</td>
                <td className="ratio-cell">{formatRatio(result.ratio)}</td>
                <td>
                  <StatusCell passes={result.passes} label={t(result.passes ? 'common.pass' : 'common.fail')} />
                  <span className="visually-hidden"> — {tm(result.explanation)}</span>
                </td>
              </tr>
            ))}
            <tr>
              <th scope="row">{rowLabel(report.nonTextResult)}</th>
              <td className="ratio-cell">{report.nonTextResult.threshold}:1</td>
              <td className="ratio-cell">{formatRatio(report.nonTextResult.ratio)}</td>
              <td>
                <StatusCell
                  passes={report.nonTextResult.passes}
                  label={t(report.nonTextResult.passes ? 'common.pass' : 'common.fail')}
                />
                <span className="visually-hidden"> — {tm(report.nonTextResult.explanation)}</span>
              </td>
            </tr>
          </tbody>
        </table>

        {hasAlpha ? (
          <div className="callout callout--info">
            <InfoIcon />
            <div>{t('result.alphaCallout', { ratio: formatRatio(report.ratio) })}</div>
          </div>
        ) : null}

        <div>
          <h3 className="small" style={{ marginBottom: '0.45rem', fontWeight: 680 }}>
            <SparkleIcon style={{ width: 15, height: 15, verticalAlign: '-2px', marginRight: 4 }} />
            {t('result.nextSteps')}
          </h3>
          <ul className="advice">
            {report.advice.map((item, index) => (
              <li key={`${item.key}-${index}`}>
                <SparkleIcon />
                <span>{tm(item)}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="small muted">
          {t('result.footerNote')} <a href="#learn">{t('result.footerLink')}</a>
        </p>

        <p className="visually-hidden" aria-live="polite">
          {passes
            ? t('result.liveAnnounceMeets', { ratio: formatRatio(report.ratio), level })
            : t('result.liveAnnounceFails', { ratio: formatRatio(report.ratio) })}
        </p>
        <p className="small muted mono">{t('result.exact', { value: roundRatio(report.ratio, 6).toFixed(6) })}</p>
      </div>
    </section>
  );
}
