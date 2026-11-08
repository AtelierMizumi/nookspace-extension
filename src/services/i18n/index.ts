export * from './types';
export * from './languageDetector';
export * from './i18nStore';

import { useLanguageStore } from './i18nStore';

/**
 * Hook providing reactive translation and locale-aware formatting utilities.
 */
export function useTranslation() {
  const language = useLanguageStore((s) => s.language);
  const isInitialized = useLanguageStore((s) => s.isInitialized);
  const setLanguage = useLanguageStore((s) => s.setLanguage);
  const initializeLanguage = useLanguageStore((s) => s.initializeLanguage);
  const t = useLanguageStore((s) => s.t);
  const formatDate = useLanguageStore((s) => s.formatDate);
  const formatTime = useLanguageStore((s) => s.formatTime);
  const formatNumber = useLanguageStore((s) => s.formatNumber);

  return {
    language,
    isInitialized,
    setLanguage,
    initializeLanguage,
    t,
    formatDate,
    formatTime,
    formatNumber,
  };
}
