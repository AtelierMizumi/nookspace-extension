export interface NotificationOptions {
  title: string;
  message: string;
  iconUrl?: string;
}

export interface AlarmOptions {
  when?: number;
  delayInMinutes?: number;
  periodInMinutes?: number;
}

export interface BrowserStorageArea {
  get<T = Record<string, unknown>>(keys: string | string[]): Promise<T>;
  set(items: Record<string, unknown>): Promise<void>;
  remove(keys: string | string[]): Promise<void>;
}

export interface BrowserApi {
  storage: {
    local: BrowserStorageArea;
  };
  alarms: {
    create: (name: string, alarmInfo: AlarmOptions) => Promise<void>;
    clear: (name: string) => Promise<boolean>;
    onAlarm: (callback: (alarm: { name: string }) => void) => () => void;
  };
  notifications: {
    create: (options: NotificationOptions) => Promise<string>;
  };
  tabs: {
    create: (url: string) => Promise<void>;
    navigateCurrentTab: (url: string) => Promise<void>;
  };
  runtime: {
    getPlatform: () => Promise<string>;
  };
  utils: {
    getDomainMonogram: (urlOrDomain: string) => { letter: string; color: string; domain: string };
  };
}
