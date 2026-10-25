import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { AlertIcon, CheckIcon } from '../components/Icons';
import { ToastContext } from './toast-context';
import type { ToastMessage, ToastTone } from './toast-context';

const DURATION_MS = 3600;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const counter = useRef(0);
  const timers = useRef(new Map<number, number>());

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
    const timer = timers.current.get(id);
    if (timer !== undefined) {
      window.clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const notify = useCallback(
    (text: string, tone: ToastTone = 'success') => {
      counter.current += 1;
      const id = counter.current;
      setToasts((current) => [...current.slice(-2), { id, text, tone }]);
      const timer = window.setTimeout(() => dismiss(id), DURATION_MS);
      timers.current.set(id, timer);
    },
    [dismiss],
  );

  useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach((timer) => window.clearTimeout(timer));
      pending.clear();
    };
  }, []);

  const value = useMemo(() => ({ toasts, notify, dismiss }), [toasts, notify, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-region" role="status" aria-live="polite" aria-atomic="false">
        {toasts.map((toast) => (
          <output key={toast.id} className={`toast${toast.tone === 'error' ? ' toast--error' : ''}`}>
            {toast.tone === 'error' ? <AlertIcon /> : <CheckIcon />}
            <span>{toast.text}</span>
          </output>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
