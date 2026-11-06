import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { browserApi } from '@/services/browser';
import { createMockBrowser } from '../mocks/browser';

describe('Browser API Abstraction Service', () => {
  let mockHarness: ReturnType<typeof createMockBrowser>;

  beforeEach(() => {
    mockHarness = createMockBrowser();
    (globalThis as any).chrome = mockHarness.mock;
  });

  afterEach(() => {
    delete (globalThis as any).chrome;
    delete (globalThis as any).browser;
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('Storage Local', () => {
    it('sets, gets and removes values in extension storage', async () => {
      await browserApi.storage.local.set({ theme: 'dark', version: 1 });
      const result = await browserApi.storage.local.get<{ theme: string; version: number }>(['theme', 'version']);
      expect(result.theme).toBe('dark');
      expect(result.version).toBe(1);

      await browserApi.storage.local.remove('theme');
      const afterRemove = await browserApi.storage.local.get<{ theme?: string }>('theme');
      expect(afterRemove.theme).toBeUndefined();
    });

    it('falls back to localStorage when browser global is absent', async () => {
      delete (globalThis as any).chrome;
      await browserApi.storage.local.set({ activeTab: 'study' });
      const stored = await browserApi.storage.local.get<{ activeTab: string }>('activeTab');
      expect(stored.activeTab).toBe('study');
    });
  });

  describe('Alarms', () => {
    it('schedules and clears an alarm', async () => {
      await browserApi.alarms.create('pomodoro-alarm', { when: Date.now() + 1500000 });
      expect(mockHarness.alarms.has('pomodoro-alarm')).toBe(true);

      const cleared = await browserApi.alarms.clear('pomodoro-alarm');
      expect(cleared).toBe(true);
      expect(mockHarness.alarms.has('pomodoro-alarm')).toBe(false);
    });

    it('dispatches alarm events through registered listeners', async () => {
      const listener = vi.fn();
      const unsubscribe = browserApi.alarms.onAlarm(listener);

      mockHarness.triggerAlarm('study-session-end');
      expect(listener).toHaveBeenCalledWith({ name: 'study-session-end' });

      unsubscribe();
      mockHarness.triggerAlarm('study-session-end');
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe('Notifications', () => {
    it('creates a desktop notification with options', async () => {
      const id = await browserApi.notifications.create({
        title: 'Session Complete',
        message: 'Time for a break!',
      });
      expect(id).toBeDefined();
      expect(mockHarness.notifications.length).toBe(1);
      expect(mockHarness.notifications[0].options).toEqual({
        type: 'basic',
        iconUrl: 'icon/128.png',
        title: 'Session Complete',
        message: 'Time for a break!',
      });
    });
  });

  describe('Tabs', () => {
    it('creates a new browser tab with given url', async () => {
      await browserApi.tabs.create('https://github.com');
      expect(mockHarness.createdTabs).toHaveLength(1);
      expect(mockHarness.createdTabs[0]).toEqual({
        url: 'https://github.com',
        active: true,
      });
    });
  });

  describe('Domain Monogram Utility', () => {
    it('extracts letter, domain and consistent HSL color', () => {
      const g1 = browserApi.utils.getDomainMonogram('https://github.com/trending');
      expect(g1.domain).toBe('github.com');
      expect(g1.letter).toBe('G');
      expect(g1.color).toMatch(/^hsl\(\d+,\s*65%,\s*45%\)$/);

      // Deterministic: same domain produces identical color
      const g2 = browserApi.utils.getDomainMonogram('github.com');
      expect(g2.color).toBe(g1.color);

      // Different domain produces expected letter
      const n1 = browserApi.utils.getDomainMonogram('https://notion.so');
      expect(n1.letter).toBe('N');
    });
  });
});
