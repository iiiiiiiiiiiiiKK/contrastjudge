import { useMemo, useState } from 'react';
import { BATCH_EXAMPLE, evaluateBatch, parseBatch, summarizeBatch } from '../lib/batch';
import type { BatchParseResult } from '../lib/batch';
import { formatRatio } from '../lib/wcag';
import { toCsvReport, toMarkdownReport } from '../lib/exports';
import { downloadFile, slugify } from '../lib/exports';
import { AlertIcon, CheckIcon, CrossIcon, DownloadIcon, ListIcon, SparkleIcon } from './Icons';

interface BatchPanelProps {
  readonly onCopy: (text: string, label: string) => void;
  readonly onNotify: (message: string, tone?: 'success' | 'error' | 'info') => void;
}

const EMPTY_PARSE: BatchParseResult = { rows: [], issues: [] };

export function BatchPanel({ onCopy, onNotify }: BatchPanelProps) {
  const [input, setInput] = useState(BATCH_EXAMPLE);
  const [title, setTitle] = useState('Design system audit');

  const parsed = useMemo(() => (input.trim() === '' ? EMPTY_PARSE : parseBatch(input)), [input]);
  const results = useMemo(() => evaluateBatch(parsed.rows), [parsed.rows]);
  const summary = useMemo(() => summarizeBatch(results), [results]);

  const handleLoadExample = () => {
    setInput(BATCH_EXAMPLE);
    setTitle('Design system audit');
  };

  const handleClear = () => {
    setInput('');
  };

  const handleDownloadMarkdown = () => {
    if (results.length === 0) {
      onNotify('Add at least one valid foreground/background pair first.', 'error');
      return;
    }
    const markdown = toMarkdownReport(results, {
      title,
      note: parsed.issues.length
        ? `Note: ${parsed.issues.length} line(s) could not be parsed and were skipped.`
        : undefined,
    });
    downloadFile(`${slugify(title)}-contrast-audit.md`, markdown, 'text/markdown;charset=utf-8');
    onNotify('Markdown report downloaded.');
  };

  const handleDownloadCsv = () => {
    if (results.length === 0) {
      onNotify('Add at least one valid foreground/background pair first.', 'error');
      return;
    }
    downloadFile(`${slugify(title)}-contrast-audit.csv`, toCsvReport(results), 'text/csv;charset=utf-8');
    onNotify('CSV report downloaded.');
  };

  return (
    <div className="stack">
      <div className="card">
        <div className="card__header">
          <h2 className="card__title">
            <ListIcon />
            Batch contrast audit
          </h2>
          <span className="card__hint">One pair per line</span>
          <div className="card__actions">
            <button type="button" className="button button--sm" onClick={handleLoadExample}>
              <SparkleIcon />
              Load example
            </button>
            <button type="button" className="button button--sm button--quiet" onClick={handleClear}>
              Clear
            </button>
          </div>
        </div>
        <div className="card__body batch-layout">
          <div className="stack">
            <div className="field">
              <label htmlFor="batch-title">Report title</label>
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
              <label htmlFor="batch-input">Colour pairs</label>
              <textarea
                id="batch-input"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                rows={9}
                spellCheck={false}
                aria-describedby="batch-syntax"
                placeholder={'#0f172a on #ffffff, Body text\n#ffffff, #2563eb, Button label'}
              />
              <span className="small muted" id="batch-syntax">
                Accepted: <code>#111 on #fff</code>, <code>#111, #fff, Label</code>, <code>#111 &rarr; #fff</code>,
                <code> rgb()</code> and <code>hsl()</code>. Lines starting with <code>//</code> or <code>;</code> are
                ignored.
              </span>
            </div>

            <div className="button-row">
              <button type="button" className="button" onClick={handleDownloadMarkdown}>
                <DownloadIcon />
                Markdown report
              </button>
              <button type="button" className="button" onClick={handleDownloadCsv}>
                <DownloadIcon />
                CSV
              </button>
              <button
                type="button"
                className="button button--quiet"
                onClick={() => {
                  onCopy(input, 'colour pairs');
                }}
              >
                Copy input
              </button>
            </div>

            {parsed.issues.length > 0 ? (
              <div>
                <h3 className="small" style={{ fontWeight: 680, marginBottom: '0.35rem' }}>
                  {parsed.issues.length} line{parsed.issues.length === 1 ? '' : 's'} skipped
                </h3>
                <ul className="issue-list">
                  {parsed.issues.map((issue) => (
                    <li key={`${issue.line}-${issue.text}`}>
                      <AlertIcon style={{ width: 16, height: 16, flex: 'none', marginTop: 2 }} />
                      <span>
                        <code>line {issue.line}</code> — {issue.message}
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
                      {summary.total} pairs
                    </span>
                    <span className={`pill ${summary.failingAaNormal === 0 ? 'pill--pass' : 'pill--fail'}`}>
                      {summary.failingAaNormal} fail AA text
                    </span>
                    <span className="pill">{summary.failingAaaNormal} fail AAA text</span>
                    <span className="pill">{summary.failingNonText} fail non-text</span>
                  </div>
                </div>
                <p className="small muted">
                  Worst {formatRatio(summary.worstRatio)} · best {formatRatio(summary.bestRatio)}
                </p>
              </div>
            ) : null}

            {results.length === 0 ? (
              <div className="empty-state">
                <ListIcon />
                <h3>No valid pairs yet</h3>
                <p>
                  Type a pair above or load the example. Each line becomes one row in the report, with the ratio and
                  every WCAG threshold it does or does not meet.
                </p>
              </div>
            ) : (
              <div
                className="batch-table-wrap"
                tabIndex={0}
                role="region"
                aria-label="Batch results table (scrollable)"
              >
                <table className="data-table">
                  <caption className="visually-hidden">Batch contrast results: {results.length} pairs</caption>
                  <thead>
                    <tr>
                      <th scope="col">Pair</th>
                      <th scope="col">Colours</th>
                      <th scope="col">Ratio</th>
                      <th scope="col">AA</th>
                      <th scope="col">AAA</th>
                      <th scope="col">Non-text</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((row, index) => (
                      <tr key={`${row.label}-${index}`}>
                        <th scope="row" style={{ fontWeight: 600 }}>
                          {row.label}
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
                            {row.passesAaNormal ? 'Pass' : 'Fail'}
                          </span>
                        </td>
                        <td>
                          <span className={`status ${row.passesAaaNormal ? 'status--pass' : 'status--fail'}`}>
                            {row.passesAaaNormal ? <CheckIcon /> : <CrossIcon />}
                            {row.passesAaaNormal ? 'Pass' : 'Fail'}
                          </span>
                        </td>
                        <td>
                          <span className={`status ${row.passesNonText ? 'status--pass' : 'status--fail'}`}>
                            {row.passesNonText ? <CheckIcon /> : <CrossIcon />}
                            {row.passesNonText ? 'Pass' : 'Fail'}
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
