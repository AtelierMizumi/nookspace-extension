import { create } from 'zustand';
import { SupportedLanguage } from './types';
import { en } from './locales/en';
import { vi } from './locales/vi';
import { detectBrowserLanguage } from './languageDetector';
import { settingsRepository } from '../database/repositories/settingsRepository';
import { browserApi } from '../browser';

export const STORAGE_KEY_LANGUAGE = 'nookspace_language';

const dictionaries: Record<SupportedLanguage, any> = {
  en,
  vi,
};

interface LanguageState {
  language: SupportedLanguage;
  isInitialized: boolean;
  setLanguage: (lang: SupportedLanguage) => Promise<void>;
  initializeLanguage: () => Promise<void>;
  t: (path: string, params?: Record<string, string | number>) => string;
  formatDate: (date: Date | number, options?: Intl.DateTimeFormatOptions) => string;
  formatTime: (date: Date | number, options?: Intl.DateTimeFormatOptions) => string;
  formatNumber: (num: number, options?: Intl.NumberFormatOptions) => string;
}

/**
 * Resolves a dot-notated path in an object dictionary.
 */
function resolvePath(obj: any, path: string): string | undefined {
  if (!obj || typeof obj !== 'object') return undefined;
  const parts = path.split('.');
  let current = obj;
  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = current[part];
    } else {
      return undefined;
    }
  }
  return typeof current === 'string' ? current : undefined;
}

/**
 * Interpolates `{param}` tokens in a template string.
 */
function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    return params[key] !== undefined ? String(params[key]) : `{${key}}`;
  });
}

export const useLanguageStore = create<LanguageState>((set, get) => ({
  language: 'en',
  isInitialized: false,

  initializeLanguage: async () => {
    let resolvedLanguage: SupportedLanguage = 'en';

    // 1. Check fast localStorage cache first
    if (typeof localStorage !== 'undefined') {
      const cached = localStorage.getItem(STORAGE_KEY_LANGUAGE) as SupportedLanguage | null;
      if (cached && (cached === 'en' || cached === 'vi')) {
        resolvedLanguage = cached;
      }
    }

    // 2. Fetch from IndexedDB settings repository
    try {
      const dbSettings = await settingsRepository.getSettings();
      if (dbSettings?.language && (dbSettings.language === 'en' || dbSettings.language === 'vi')) {
        resolvedLanguage = dbSettings.language;
      } else {
        // First install detection
        const detected = detectBrowserLanguage();
        resolvedLanguage = detected;
        // Persist initial detected choice to settings so it won't be overridden later
        await settingsRepository.updateLanguage(detected);
      }
    } catch {
      // Fallback to detected language or default
      if (!resolvedLanguage) {
        resolvedLanguage = detectBrowserLanguage();
      }
    }

    // Cache locally
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_LANGUAGE, resolvedLanguage);
    }

    // Set document lang attribute
    if (typeof document !== 'undefined') {
      document.documentElement.lang = resolvedLanguage;
    }

    set({ language: resolvedLanguage, isInitialized: true });

    // Setup cross-tab storage listener
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if (e.key === STORAGE_KEY_LANGUAGE && e.newValue) {
          const newLang = e.newValue as SupportedLanguage;
          if (newLang === 'en' || newLang === 'vi') {
            if (typeof document !== 'undefined') {
              document.documentElement.lang = newLang;
            }
            set({ language: newLang });
          }
        }
      });
    }
  },

  setLanguage: async (lang: SupportedLanguage) => {
    if (lang !== 'en' && lang !== 'vi') return;

    // Update state immediately
    set({ language: lang });

    // Update document attribute
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang;
    }

    // Update localStorage for fast anti-flash/cross-tab sync
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_LANGUAGE, lang);
    }

    // Broadcast via extension storage
    try {
      await browserApi.storage.local.set({ [STORAGE_KEY_LANGUAGE]: lang });
    } catch {
      // Ignore in non-extension contexts
    }

    // Persist to IndexedDB
    try {
      await settingsRepository.updateLanguage(lang);
    } catch (err) {
      console.warn('[i18nStore] Failed to persist language to settings repository:', err);
    }
  },

  t: (path: string, params?: Record<string, string | number>): string => {
    const currentLang = get().language;
    const currentDict = dictionaries[currentLang] || en;
    const fallbackDict = en;

    const value = resolvePath(currentDict, path) ?? resolvePath(fallbackDict, path);
    if (value === undefined) {
      return path;
    }
    return interpolate(value, params);
  },

  formatDate: (date: Date | number, options?: Intl.DateTimeFormatOptions): string => {
    const lang = get().language;
    const locale = lang === 'vi' ? 'vi-VN' : 'en-US';
    const d = typeof date === 'number' ? new Date(date) : date;
    return d.toLocaleDateString(locale, options);
  },

  formatTime: (date: Date | number, options?: Intl.DateTimeFormatOptions): string => {
    const lang = get().language;
    const locale = lang === 'vi' ? 'vi-VN' : 'en-US';
    const d = typeof date === 'number' ? new Date(date) : date;
    return d.toLocaleTimeString(locale, options);
  },

  formatNumber: (num: number, options?: Intl.NumberFormatOptions): string => {
    const lang = get().language;
    const locale = lang === 'vi' ? 'vi-VN' : 'en-US';
    return num.toLocaleString(locale, options);
  },
}));
