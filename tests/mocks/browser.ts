import { vi } from 'vitest';

export function createMockBrowser() {
  const storageData = new Map<string, unknown>();
  const alarms = new Map<string, unknown>();
  const alarmListeners = new Set<(alarm: { name: string }) => void>();
  const notifications: Array<{ id: string; options: unknown }> = [];
  const createdTabs: Array<{ url: string; active?: boolean }> = [];

  const mock = {
    storage: {
      local: {
        get: vi.fn((keys: string | string[], callback: (res: Record<string, unknown>) => void) => {
          const result: Record<string, unknown> = {};
          const keyList = Array.isArray(keys) ? keys : [keys];
          for (const k of keyList) {
            if (storageData.has(k)) {
              result[k] = storageData.get(k);
            }
          }
          callback(result);
        }),
        set: vi.fn((items: Record<string, unknown>, callback?: () => void) => {
          for (const [k, v] of Object.entries(items)) {
            storageData.set(k, v);
          }
          if (callback) callback();
        }),
        remove: vi.fn((keys: string | string[], callback?: () => void) => {
          const keyList = Array.isArray(keys) ? keys : [keys];
          for (const k of keyList) {
            storageData.delete(k);
          }
          if (callback) callback();
        }),
      },
    },
    alarms: {
      create: vi.fn((name: string, info: unknown) => {
        alarms.set(name, info);
      }),
      clear: vi.fn((name: string, callback: (cleared: boolean) => void) => {
        const existed = alarms.delete(name);
        callback(existed);
      }),
      onAlarm: {
        addListener: vi.fn((listener: (alarm: { name: string }) => void) => {
          alarmListeners.add(listener);
        }),
        removeListener: vi.fn((listener: (alarm: { name: string }) => void) => {
          alarmListeners.delete(listener);
        }),
      },
    },
    notifications: {
      create: vi.fn((id: string, options: unknown, callback: (createdId: string) => void) => {
        const notifId = id || `mock-id-${Date.now()}`;
        notifications.push({ id: notifId, options });
        callback(notifId);
      }),
    },
    tabs: {
      create: vi.fn((options: { url: string; active?: boolean }, callback?: () => void) => {
        createdTabs.push(options);
        if (callback) callback();
      }),
    },
    runtime: {
      getPlatformInfo: vi.fn((callback: (info: { os: string }) => void) => {
        callback({ os: 'win' });
      }),
    },
  };

  return {
    mock,
    storageData,
    alarms,
    alarmListeners,
    notifications,
    createdTabs,
    triggerAlarm(name: string) {
      for (const listener of alarmListeners) {
        listener({ name });
      }
    },
  };
}
