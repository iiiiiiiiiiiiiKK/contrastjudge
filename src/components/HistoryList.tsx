import type { HistoryEntry } from '../types';
import { rgbToHex } from '../lib/color';
import { formatRatio } from '../lib/wcag';
import { EmptyState } from './Card';
import { TrashIcon } from './Icons';

interface HistoryListProps {
  readonly history: readonly HistoryEntry[];
  readonly onRestore: (entry: HistoryEntry) => void;
  readonly onClear: () => void;
}

function timeAgo(timestamp: number): string {
  const seconds = Math.max(0, Math.round((Date.now() - timestamp) / 1000));
  if (seconds < 60) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  return `${Math.round(hours / 24)} d ago`;
}

export function HistoryList({ history, onRestore, onClear }: HistoryListProps) {
  return (
    <div className="card">
      <div className="card__header">
        <h2 className="card__title">Recent checks</h2>
        <span className="card__hint">{history.length} saved in this browser</span>
        {history.length > 0 ? (
          <div className="card__actions">
            <button type="button" className="button button--sm button--quiet" onClick={onClear}>
              <TrashIcon />
              Clear
            </button>
          </div>
        ) : null}
      </div>
      <div className="card__body">
        {history.length === 0 ? (
          <EmptyState icon={<TrashIcon />} title="No saved checks yet">
            Press “Save to history” after a check you want to come back to. The last 12 checks are kept locally.
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
                    {fg} on {bg} · {entry.level} · {entry.fontSizePx}px{entry.bold ? ' bold' : ''}
                  </span>
                  <span className="history-item__time">{timeAgo(entry.createdAt)}</span>
                  <button
                    type="button"
                    className="button button--sm button--quiet"
                    onClick={() => onRestore(entry)}
                    aria-label={`Restore ${fg} on ${bg}, ratio ${formatRatio(entry.ratio)}`}
                  >
                    Restore
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
