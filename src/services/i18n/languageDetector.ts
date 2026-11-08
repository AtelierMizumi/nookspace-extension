import { SupportedLanguage } from './types';

/**
 * Detects browser preferred language, returning 'vi' if Vietnamese is preferred,
 * or 'en' as default.
 */
export function detectBrowserLanguage(languagesOverride?: readonly string[]): SupportedLanguage {
  try {
    let languages: readonly string[] = [];

    if (languagesOverride !== undefined) {
      languages = languagesOverride;
    } else if (typeof navigator !== 'undefined') {
      if (Array.isArray(navigator.languages) && navigator.languages.length > 0) {
        languages = navigator.languages;
      } else if (navigator.language) {
        languages = [navigator.language];
      }
    }

    for (const lang of languages) {
      if (typeof lang === 'string') {
        const clean = lang.trim().toLowerCase();
        if (clean === 'vi' || clean.startsWith('vi-') || clean.startsWith('vi_')) {
          return 'vi';
        }
      }
    }
  } catch {
    // Fallback on error
  }

  return 'en';
}
