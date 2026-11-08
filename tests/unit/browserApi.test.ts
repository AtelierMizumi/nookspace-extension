import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { browserApi } from '@/services/browser';
import { createMockBrowser, createMockGeckoBrowser } from '../mocks/browser';

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

  describe('Error Handling and Chromium Runtime Safety', () => {
    it('gracefully handles and clears runtime.lastError without throwing or rejecting', async () => {
      // Simulate Chromium setting runtime.lastError during notification or storage call
      (globalThis as any).chrome.runtime.lastError = { message: 'User denied notification permission' };

      const id = await browserApi.notifications.create({
        title: 'Session Complete',
        message: 'Notification with error',
      });
      expect(id).toBeDefined();

      // Test storage.local with lastError
      (globalThis as any).chrome.runtime.lastError = { message: 'Quota exceeded error' };
      const getResult = await browserApi.storage.local.get('nonexistent');
      expect(getResult).toBeDefined();

      await browserApi.storage.local.set({ key: 'val' });
      await browserApi.storage.local.remove('key');

      // Test alarms.clear with lastError
      (globalThis as any).chrome.runtime.lastError = { message: 'Alarm not found' };
      const cleared = await browserApi.alarms.clear('unknown-alarm');
      expect(cleared).toBe(false);

      // Clean up simulated lastError
      delete (globalThis as any).chrome.runtime.lastError;
    });
  });

  describe('Mozilla Firefox / Gecko Native Promise Runtime Compatibility', () => {
    let geckoHarness: ReturnType<typeof createMockGeckoBrowser>;

    beforeEach(() => {
      delete (globalThis as any).chrome;
      geckoHarness = createMockGeckoBrowser();
      (globalThis as any).browser = geckoHarness.mock;
    });

    afterEach(() => {
      delete (globalThis as any).browser;
    });

    it('sets, gets, and removes values via native Gecko Promise storage', async () => {
      await browserApi.storage.local.set({ geckoWorkspace: 'coding', active: true });
      const stored = await browserApi.storage.local.get<{ geckoWorkspace: string; active: boolean }>([
        'geckoWorkspace',
        'active',
      ]);
      expect(stored.geckoWorkspace).toBe('coding');
      expect(stored.active).toBe(true);

      await browserApi.storage.local.remove('geckoWorkspace');
      const afterRemove = await browserApi.storage.local.get<{ geckoWorkspace?: string }>('geckoWorkspace');
      expect(afterRemove.geckoWorkspace).toBeUndefined();
    });

    it('schedules, clears, and receives alarms in native Gecko environment', async () => {
      await browserApi.alarms.create('gecko-pomodoro-timer', { delayInMinutes: 25 });
      expect(geckoHarness.alarms.has('gecko-pomodoro-timer')).toBe(true);

      const listener = vi.fn();
      const unsub = browserApi.alarms.onAlarm(listener);
      geckoHarness.triggerAlarm('gecko-pomodoro-timer');
      expect(listener).toHaveBeenCalledWith({ name: 'gecko-pomodoro-timer' });
      unsub();

      const wasCleared = await browserApi.alarms.clear('gecko-pomodoro-timer');
      expect(wasCleared).toBe(true);
      expect(geckoHarness.alarms.has('gecko-pomodoro-timer')).toBe(false);
    });

    it('creates desktop notifications via native Gecko Promise notifications API', async () => {
      const id = await browserApi.notifications.create({
        title: 'Gecko Focus Finished',
        message: 'Take a quick 5 min walk!',
      });
      expect(id).toMatch(/^gecko-notif-/);
      expect(geckoHarness.notifications).toHaveLength(1);
      expect(geckoHarness.notifications[0].options).toEqual({
        type: 'basic',
        iconUrl: 'icon/128.png',
        title: 'Gecko Focus Finished',
        message: 'Take a quick 5 min walk!',
      });
    });

    it('creates browser tabs via native Gecko Promise tabs API', async () => {
      await browserApi.tabs.create('https://developer.mozilla.org');
      expect(geckoHarness.createdTabs).toHaveLength(1);
      expect(geckoHarness.createdTabs[0]).toEqual({
        url: 'https://developer.mozilla.org',
        active: true,
      });
    });

    it('queries platform info via native Gecko Promise runtime API', async () => {
      const os = await browserApi.runtime.getPlatform();
      expect(os).toBe('win');
    });

    it('safely handles Promise rejection in Gecko APIs without crashing', async () => {
      // Force get to reject
      geckoHarness.mock.storage.local.get = vi.fn().mockRejectedValue(new Error('IndexedDB quota reached'));
      const fallback = await browserApi.storage.local.get('nonexistent');
      expect(fallback).toEqual({});

      // Force clear to reject
      geckoHarness.mock.alarms.clear = vi.fn().mockRejectedValue(new Error('Alarm system failure'));
      const clearFallback = await browserApi.alarms.clear('broken-alarm');
      expect(clearFallback).toBe(false);
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
