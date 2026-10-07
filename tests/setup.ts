import '@testing-library/jest-dom/vitest';
import '../src/lib/i18n';

process.env.ENVIRONMENT = 'test';

if (typeof window !== 'undefined' && !window.ResizeObserver) {
  window.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
