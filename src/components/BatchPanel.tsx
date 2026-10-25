import { useMemo, useState } from 'react';
import { buildBatchExample, evaluateBatch, parseBatch, summarizeBatch } from '../lib/batch';
import type { BatchParseResult } from '../lib/batch';
import { formatRatio } from '../lib/wcag';
import { downloadFile, slugify, toCsvReport, toMarkdownReport } from '../lib/exports';
import { useI18n } from '../i18n';
import { AlertIcon, CheckIcon, CrossIcon, DownloadIcon, ListIcon, SparkleIcon } from './Icons';

interface BatchPanelProps {
  readonly onCopy: (text: string, label: string) => void;
  readonly onNotify: (message: string, tone?: 'success' | 'error' | 'info') => void;
}

const EMPTY_PARSE: BatchParseResult = { rows: [], issues: [] };

export function BatchPanel({ onCopy, onNotify }: BatchPanelProps) {
  const { t, tm, locale } = useI18n();
  const [input, setInput] = useState(() => buildBatchExample(t));
  const [title, setTitle] = useState(() => t('batch.defaultTitle'));

  const parsed = useMemo(() => (input.trim() === '' ? EMPTY_PARSE : parseBatch(input)), [input]);
  const results = useMemo(() => evaluateBatch(parsed.rows), [parsed.rows]);
  const summary = useMemo(() => summarizeBatch(results), [results]);

  const handleLoadExample = () => {
    setInput(buildBatchExample(t));
    setTitle(t('batch.defaultTitle'));
  };

  const handleDownloadMarkdown = () => {
    if (results.length === 0) {
      onNotify(t('batch.nothing'), 'error');
      return;
    }
    const markdown = toMarkdownReport(results, {
      title,
      locale,
      note: parsed.issues.length > 0 ? t('report.skippedNote', { count: parsed.issues.length }) : undefined,
    });
    downloadFile(`${slugify(title)}-contrast-audit.md`, markdown, 'text/markdown;charset=utf-8');
    onNotify(t('batch.downloadedMd'));
  };

  const handleDownloadCsv = () => {
    if (results.length === 0) {
      onNotify(t('batch.nothing'), 'error');
      return;
    }
    downloadFile(`${slugify(title)}-contrast-audit.csv`, toCsvReport(results), 'text/csv;charset=utf-8');
    onNotify(t('batch.downloadedCsv'));
  };

  return (
    <div className="stack">
      <div className="card">
        <div className="card__header">
          <h2 className="card__title">
            <ListIcon />
            {t('batch.title')}
          </h2>
          <span className="card__hint">{t('batch.hint')}</span>
          <div className="card__actions">
            <button type="button" className="button button--sm" onClick={handleLoadExample}>
              <SparkleIcon />
              {t('batch.loadExample')}
            </button>
            <button
              type="button"
              className="button button--sm button--quiet"
              onClick={() => {
                setInput('');
              }}
            >
              {t('batch.clear')}
            </button>
          </div>
        </div>
        <div className="card__body batch-layout">
          <div className="stack">
            <div className="field">
              <label htmlFor="batch-title">{t('batch.reportTitle')}</label>
              <input
                id="batch-title"
                className="text-input"
                type="text"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                style={{ fontFamily: 'var(--font-sans)' }}
              />
            </div>

            <div className="field">
              <label htmlFor="batch-input">{t('batch.pairsLabel')}</label>
              <textarea
                id="batch-input"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                rows={9}
                spellCheck={false}
                aria-describedby="batch-syntax"
                placeholder={t('batch.placeholder')}
              />
              <span className="small muted" id="batch-syntax">
                {t('batch.syntaxHelp')}
              </span>
            </div>

            <div className="button-row">
              <button type="button" className="button" onClick={handleDownloadMarkdown}>
                <DownloadIcon />
                {t('batch.downloadMd')}
              </button>
              <button type="button" className="button" onClick={handleDownloadCsv}>
                <DownloadIcon />
                {t('batch.downloadCsv')}
              </button>
              <button
                type="button"
                className="button button--quiet"
                onClick={() => {
                  onCopy(input, t('toast.copiedLabel.pairs'));
                }}
              >
                {t('batch.copyInput')}
              </button>
            </div>

            {parsed.issues.length > 0 ? (
              <div>
                <h3 className="small" style={{ fontWeight: 680, marginBottom: '0.35rem' }}>
                  {t(parsed.issues.length === 1 ? 'batch.skipped' : 'batch.skippedPlural', {
                    count: parsed.issues.length,
                  })}
                </h3>
                <ul className="issue-list">
                  {parsed.issues.map((issue) => (
                    <li key={`${issue.line}-${issue.text}`}>
                      <AlertIcon style={{ width: 16, height: 16, flex: 'none', marginTop: 2 }} />
                      <span>
                        <code>{t('batch.lineLabel', { line: issue.line })}</code> — {tm(issue.message)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>

          <div className="stack">
            {summary ? (
              <div className="card__body" style={{ padding: 0 }}>
                <div className="inline" style={{ justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <div className="inline">
                    <span className={`pill ${summary.failingAaNormal === 0 ? 'pill--pass' : 'pill--fail'}`}>
                      {t('batch.summaryPairs', { total: summary.total })}
                    </span>
                    <span className={`pill ${summary.failingAaNormal === 0 ? 'pill--pass' : 'pill--fail'}`}>
                      {t('batch.summaryFailAa', { count: summary.failingAaNormal })}
                    </span>
                    <span className="pill">{t('batch.summaryFailAaa', { count: summary.failingAaaNormal })}</span>
                    <span className="pill">{t('batch.summaryFailNonText', { count: summary.failingNonText })}</span>
                  </div>
                </div>
                <p className="small muted">
                  {t('batch.worstBest', {
                    worst: formatRatio(summary.worstRatio),
                    best: formatRatio(summary.bestRatio),
                  })}
                </p>
              </div>
            ) : null}

            {results.length === 0 ? (
              <div className="empty-state">
                <ListIcon />
                <h3>{t('batch.noValidTitle')}</h3>
                <p>{t('batch.noValidBody')}</p>
              </div>
            ) : (
              <div className="batch-table-wrap" tabIndex={0} role="region" aria-label={t('batch.tableAria')}>
                <table className="data-table">
                  <caption className="visually-hidden">{t('batch.caption', { count: results.length })}</caption>
                  <thead>
                    <tr>
                      <th scope="col">{t('batch.colPair')}</th>
                      <th scope="col">{t('batch.colColours')}</th>
                      <th scope="col">{t('batch.colRatio')}</th>
                      <th scope="col">{t('batch.colAa')}</th>
                      <th scope="col">{t('batch.colAaa')}</th>
                      <th scope="col">{t('batch.colNonText')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((row, index) => (
                      <tr key={`${row.label}-${index}`}>
                        <th scope="row" style={{ fontWeight: 600 }}>
                          {row.label.startsWith('#') ? t('batch.lineLabel', { line: row.label.slice(1) }) : row.label}
                        </th>
                        <td>
                          <span className="swatch-dot" style={{ background: row.foregroundHex }} aria-hidden="true" />
                          <span className="mono small">{row.foregroundHex}</span>
                          <br />
                          <span className="swatch-dot" style={{ background: row.backgroundHex }} aria-hidden="true" />
                          <span className="mono small">{row.backgroundHex}</span>
                        </td>
                        <td className="ratio-cell">{formatRatio(row.ratio)}</td>
                        <td>
                          <span className={`status ${row.passesAaNormal ? 'status--pass' : 'status--fail'}`}>
                            {row.passesAaNormal ? <CheckIcon /> : <CrossIcon />}
                            {t(row.passesAaNormal ? 'common.pass' : 'common.fail')}
                          </span>
                        </td>
                        <td>
                          <span className={`status ${row.passesAaaNormal ? 'status--pass' : 'status--fail'}`}>
                            {row.passesAaaNormal ? <CheckIcon /> : <CrossIcon />}
                            {t(row.passesAaaNormal ? 'common.pass' : 'common.fail')}
                          </span>
                        </td>
                        <td>
                          <span className={`status ${row.passesNonText ? 'status--pass' : 'status--fail'}`}>
                            {row.passesNonText ? <CheckIcon /> : <CrossIcon />}
                            {t(row.passesNonText ? 'common.pass' : 'common.fail')}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
