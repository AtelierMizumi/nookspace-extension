import '@testing-library/jest-dom';
import 'fake-indexeddb/auto';

// Polyfill ResizeObserver for jsdom test environment
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

