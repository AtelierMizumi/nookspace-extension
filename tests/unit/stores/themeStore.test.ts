import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useThemeStore } from '@/stores/themeStore';
import { createMockBrowser } from '../../mocks/browser';

describe('Theme Store', () => {
  let mockHarness: ReturnType<typeof createMockBrowser>;

  beforeEach(() => {
    mockHarness = createMockBrowser();
    (globalThis as any).chrome = mockHarness.mock;
    localStorage.clear();
    document.documentElement.className = '';
  });

  it('initializes with default dark theme', async () => {
    await useThemeStore.getState().initializeTheme();
    expect(useThemeStore.getState().theme).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('switches to light theme and updates document class', () => {
    useThemeStore.getState().setTheme('light');
    expect(useThemeStore.getState().theme).toBe('light');
    expect(useThemeStore.getState().resolvedTheme).toBe('light');
    expect(document.documentElement.classList.contains('light')).toBe(true);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(localStorage.getItem('nookspace_theme_mode')).toBe('light');
  });

  it('switches to system mode', () => {
    // Mock matchMedia returning dark
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: true,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    useThemeStore.getState().setTheme('system');
    expect(useThemeStore.getState().theme).toBe('system');
    expect(useThemeStore.getState().resolvedTheme).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });
});
