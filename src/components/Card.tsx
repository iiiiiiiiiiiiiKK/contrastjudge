import type { ReactNode } from 'react';
import { useI18n } from '../i18n';

export function SkipLink() {
  const { t } = useI18n();
  return (
    <a className="skip-link" href="#main-content">
      {t('common.skipToContent')}
    </a>
  );
}

interface CardProps {
  readonly title: string;
  readonly icon?: ReactNode;
  readonly hint?: string;
  readonly actions?: ReactNode;
  readonly children: ReactNode;
  readonly id?: string;
  readonly labelledBy?: string;
}

export function Card({ title, icon, hint, actions, children, id, labelledBy }: CardProps) {
  const headingId = labelledBy ?? `${id ?? title}-heading`;
  return (
    <section className="card" id={id} aria-labelledby={headingId}>
      <header className="card__header">
        <h2 className="card__title" id={headingId}>
          {icon}
          {title}
        </h2>
        {hint ? <span className="card__hint">{hint}</span> : null}
        {actions ? <div className="card__actions">{actions}</div> : null}
      </header>
      <div className="card__body">{children}</div>
    </section>
  );
}

interface EmptyStateProps {
  readonly icon: ReactNode;
  readonly title: string;
  readonly children: ReactNode;
  readonly action?: ReactNode;
}

export function EmptyState({ icon, title, children, action }: EmptyStateProps) {
  return (
    <div className="empty-state">
      {icon}
      <h3>{title}</h3>
      <p>{children}</p>
      {action}
    </div>
  );
}
