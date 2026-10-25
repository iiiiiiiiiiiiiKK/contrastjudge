import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  try {
    window.localStorage.clear();
  } catch {
    /* ignore */
  }
});

// jsdom has no matchMedia; the theme hook and the pre-paint script both use it.
if (!window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

// jsdom does not implement these; several components call them defensively.
if (!window.URL.createObjectURL) {
  Object.defineProperty(window.URL, 'createObjectURL', { writable: true, value: () => 'blob:mock' });
}
if (!window.URL.revokeObjectURL) {
  Object.defineProperty(window.URL, 'revokeObjectURL', { writable: true, value: () => {} });
}
