import { BrowserApi, NotificationOptions, AlarmOptions } from './types';

/**
 * Deterministically generates a vibrant, aesthetically pleasing color from a string.
 */
function hashStringToColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, 65%, 45%)`;
}

/**
 * Safe domain and monogram extractor without external network dependency.
 */
function getDomainMonogram(urlOrDomain: string): { letter: string; color: string; domain: string } {
  try {
    let clean = urlOrDomain.trim();
    if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
      clean = `https://${clean}`;
    }
    const parsed = new URL(clean);
    const domain = parsed.hostname.replace(/^www\./, '');
    const letter = (domain.charAt(0) || 'N').toUpperCase();
    const color = hashStringToColor(domain);
    return { letter, color, domain };
  } catch {
    const cleanFallback = urlOrDomain.replace(/[^a-zA-Z0-9]/g, '');
    const letter = (cleanFallback.charAt(0) || 'N').toUpperCase();
    return { letter, color: hashStringToColor(cleanFallback || 'default'), domain: urlOrDomain };
  }
}

// Check for WebExtension browser global or chrome global
function getExtensionGlobal(): any {
  if (typeof globalThis !== 'undefined') {
    if ('browser' in globalThis && (globalThis as any).browser?.runtime) {
      return (globalThis as any).browser;
    }
    if ('chrome' in globalThis && (globalThis as any).chrome?.runtime) {
      return (globalThis as any).chrome;
    }
  }
  return null;
}

/**
 * Invokes a WebExtension API that may return a Promise (native Gecko / modern Chromium)
 * or invoke a callback with runtime.lastError (Chromium legacy style).
 */
function callBrowserApi<T>(
  fnWithCallback: (cb: (val: T) => void) => any,
  fnPromiseOnly: () => Promise<T> | any,
  defaultValue: T,
  ext: any
): Promise<T> {
  return new Promise((resolve) => {
    let settled = false;
    const done = (val?: T) => {
      if (!settled) {
        settled = true;
        if (ext?.runtime?.lastError) {
          // Suppress unchecked lastError in Chromium
        }
        resolve(val !== undefined ? val : defaultValue);
      }
    };

    try {
      const res = fnWithCallback((val: T) => done(val));
      if (res && typeof res.then === 'function') {
        res.then((val: T) => done(val)).catch(() => done(defaultValue));
      }
    } catch {
      try {
        const res = fnPromiseOnly();
        if (res && typeof res.then === 'function') {
          res.then((val: T) => done(val)).catch(() => done(defaultValue));
        } else {
          done(defaultValue);
        }
      } catch {
        done(defaultValue);
      }
    }
  });
}

export const browserApi: BrowserApi = {
  storage: {
    local: {
      async get<T = Record<string, unknown>>(keys: string | string[]): Promise<T> {
        const ext = getExtensionGlobal();
        if (ext?.storage?.local) {
          return callBrowserApi<T>(
            (cb) => ext.storage.local.get(keys, cb),
            () => ext.storage.local.get(keys),
            {} as T,
            ext
          );
        }
        // Fallback to localStorage in non-extension environment
        const result: Record<string, unknown> = {};
        const keyList = Array.isArray(keys) ? keys : [keys];
        for (const k of keyList) {
          const val = localStorage.getItem(`nookspace:${k}`);
          if (val !== null) {
            try {
              result[k] = JSON.parse(val);
            } catch {
              result[k] = val;
            }
          }
        }
        return result as T;
      },
      async set(items: Record<string, unknown>): Promise<void> {
        const ext = getExtensionGlobal();
        if (ext?.storage?.local) {
          return callBrowserApi<void>(
            (cb) => ext.storage.local.set(items, () => cb()),
            () => ext.storage.local.set(items),
            undefined,
            ext
          );
        }
        for (const [key, val] of Object.entries(items)) {
          localStorage.setItem(`nookspace:${key}`, JSON.stringify(val));
        }
      },
      async remove(keys: string | string[]): Promise<void> {
        const ext = getExtensionGlobal();
        if (ext?.storage?.local) {
          return callBrowserApi<void>(
            (cb) => ext.storage.local.remove(keys, () => cb()),
            () => ext.storage.local.remove(keys),
            undefined,
            ext
          );
        }
        const keyList = Array.isArray(keys) ? keys : [keys];
        for (const k of keyList) {
          localStorage.removeItem(`nookspace:${k}`);
        }
      },
    },
  },

  alarms: {
    async create(name: string, alarmInfo: AlarmOptions): Promise<void> {
      const ext = getExtensionGlobal();
      if (ext?.alarms?.create) {
        try {
          const res = ext.alarms.create(name, alarmInfo);
          if (res && typeof res.then === 'function') {
            await res;
          }
        } catch {
          // Silently handle error
        }
      }
    },
    async clear(name: string): Promise<boolean> {
      const ext = getExtensionGlobal();
      if (ext?.alarms?.clear) {
        return callBrowserApi<boolean>(
          (cb) => ext.alarms.clear(name, (wasCleared: boolean) => cb(Boolean(wasCleared))),
          () => ext.alarms.clear(name),
          false,
          ext
        );
      }
      return false;
    },
    onAlarm(callback: (alarm: { name: string }) => void): () => void {
      const ext = getExtensionGlobal();
      if (ext?.alarms?.onAlarm?.addListener) {
        const listener = (alarm: { name: string }) => callback(alarm);
        ext.alarms.onAlarm.addListener(listener);
        return () => {
          ext.alarms.onAlarm.removeListener(listener);
        };
      }
      return () => {};
    },
  },

  notifications: {
    async create(options: NotificationOptions): Promise<string> {
      const ext = getExtensionGlobal();
      if (ext?.notifications?.create) {
        const notificationOptions = {
          type: 'basic',
          iconUrl: options.iconUrl || 'icon/128.png',
          title: options.title,
          message: options.message,
        };
        return callBrowserApi<string>(
          (cb) => ext.notifications.create('', notificationOptions, (id: string) => cb(id || 'notification-id')),
          () => ext.notifications.create(notificationOptions),
          'notification-id',
          ext
        );
      }
      // Fallback to Web Notification API if permitted
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        new Notification(options.title, { body: options.message });
      }
      return 'web-fallback-notification';
    },
  },

  tabs: {
    async create(url: string): Promise<void> {
      const ext = getExtensionGlobal();
      if (ext?.tabs?.create) {
        return callBrowserApi<void>(
          (cb) => ext.tabs.create({ url, active: true }, () => cb()),
          () => ext.tabs.create({ url, active: true }),
          undefined,
          ext
        );
      }
      if (typeof window !== 'undefined') {
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    },
  },

  runtime: {
    async getPlatform(): Promise<string> {
      const ext = getExtensionGlobal();
      if (ext?.runtime?.getPlatformInfo) {
        const extractOs = (info: any) =>
          typeof info === 'object' && info?.os ? info.os : typeof info === 'string' ? info : 'unknown';
        return callBrowserApi<string>(
          (cb) => {
            const res = ext.runtime.getPlatformInfo((info: { os?: string }) => cb(extractOs(info)));
            if (res && typeof res.then === 'function') {
              res.then((info: any) => cb(extractOs(info))).catch(() => cb('unknown'));
            }
          },
          async () => {
            const info = await ext.runtime.getPlatformInfo();
            return extractOs(info);
          },
          'unknown',
          ext
        );
      }
      return 'web';
    },
  },

  utils: {
    getDomainMonogram,
  },
};
