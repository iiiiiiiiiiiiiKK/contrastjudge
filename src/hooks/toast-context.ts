import { createContext, useContext } from 'react';

export type ToastTone = 'success' | 'error' | 'info';

export interface ToastMessage {
  readonly id: number;
  readonly text: string;
  readonly tone: ToastTone;
}

export interface ToastContextValue {
  readonly toasts: readonly ToastMessage[];
  readonly notify: (text: string, tone?: ToastTone) => void;
  readonly dismiss: (id: number) => void;
}

export const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside a ToastProvider');
  return context;
}
