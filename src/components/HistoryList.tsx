import { useState } from 'react';
import type { HistoryEntry } from '../types';
import { rgbToHex } from '../lib/color';
import { formatRatio } from '../lib/wcag';
import { useI18n } from '../i18n';
import { EmptyState } from './Card';
import { TrashIcon } from './Icons';

interface HistoryListProps {
  readonly history: readonly HistoryEntry[];
  readonly onRestore: (entry: HistoryEntry) => void;
  readonly onClear: () => void;
}

export function HistoryList({ history, onRestore, onClear }: HistoryListProps) {
  const { t } = useI18n();
  // Captured once per mount in a lazy initialiser: calling Date.now() during render would make the
  // component impure, and these labels only need minute-level accuracy.
  const [now] = useState(() => Date.now());

  const timeAgo = (timestamp: number): string => {
    const seconds = Math.max(0, Math.round((now - timestamp) / 1000));
    if (seconds < 60) return t('history.justNow');
    const minutes = Math.round(seconds / 60);
    if (minutes < 60) return t('history.minutesAgo', { count: minutes });
    const hours = Math.round(minutes / 60);
    if (hours < 24) return t('history.hoursAgo', { count: hours });
    return t('history.daysAgo', { count: Math.round(hours / 24) });
  };

  return (
    <div className="card">
      <div className="card__header">
        <h2 className="card__title">{t('history.title')}</h2>
        <span className="card__hint">{t('history.hint', { count: history.length })}</span>
        {history.length > 0 ? (
          <div className="card__actions">
            <button type="button" className="button button--sm button--quiet" onClick={onClear}>
              <TrashIcon />
              {t('history.clear')}
            </button>
          </div>
        ) : null}
      </div>
      <div className="card__body">
        {history.length === 0 ? (
          <EmptyState icon={<TrashIcon />} title={t('history.emptyTitle')}>
            {t('history.emptyBody')}
          </EmptyState>
        ) : (
          <ul className="history-list">
            {history.map((entry) => {
              const fg = rgbToHex(entry.foreground).toUpperCase();
              const bg = rgbToHex(entry.background).toUpperCase();
              return (
                <li className="history-item" key={entry.id}>
                  <span className="history-item__pairs" aria-hidden="true">
                    <span className="history-item__chip" style={{ background: fg }} />
                    <span className="history-item__chip" style={{ background: bg }} />
                  </span>
                  <span className="ratio-cell history-item__ratio">{formatRatio(entry.ratio)}</span>
                  <span className="small muted">
                    {fg} / {bg} · {entry.level} · {entry.fontSizePx}px{entry.bold ? ` ${t('preview.bold')}` : ''}
                  </span>
                  <span className="history-item__time">{timeAgo(entry.createdAt)}</span>
                  <button
                    type="button"
                    className="button button--sm button--quiet"
                    onClick={() => onRestore(entry)}
                    aria-label={t('history.restoreAria', {
                      fg,
                      bg,
                      ratio: formatRatio(entry.ratio),
                    })}
                  >
                    {t('history.restore')}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
