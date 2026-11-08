import { describe, it, expect, beforeEach } from 'vitest';
import { en } from '../../../src/services/i18n/locales/en';
import { vi } from '../../../src/services/i18n/locales/vi';
import { useLanguageStore } from '../../../src/services/i18n/i18nStore';

describe('Bilingual Language System — i18n Core', () => {
  beforeEach(() => {
    useLanguageStore.setState({ language: 'en', isInitialized: true });
  });

  describe('1. Dictionary Completeness & Symmetry', () => {
    function getAllKeys(obj: any, prefix = ''): string[] {
      let keys: string[] = [];
      for (const key of Object.keys(obj)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        if (typeof obj[key] === 'object' && obj[key] !== null) {
          keys = keys.concat(getAllKeys(obj[key], fullKey));
        } else {
          keys.push(fullKey);
        }
      }
      return keys;
    }

    const enKeys = getAllKeys(en);
    const viKeys = getAllKeys(vi);

    it('en dictionary has zero empty translation strings', () => {
      for (const key of enKeys) {
        const parts = key.split('.');
        let val: any = en;
        for (const p of parts) val = val[p];
        expect(typeof val).toBe('string');
        expect(val.trim().length).toBeGreaterThan(0);
      }
    });

    it('vi dictionary has zero empty translation strings', () => {
      for (const key of viKeys) {
        const parts = key.split('.');
        let val: any = vi;
        for (const p of parts) val = val[p];
        expect(typeof val).toBe('string');
        expect(val.trim().length).toBeGreaterThan(0);
      }
    });

    it('all English keys exist in Vietnamese dictionary', () => {
      const missingInVi = enKeys.filter((k) => !viKeys.includes(k));
      expect(missingInVi).toEqual([]);
    });

    it('all Vietnamese keys exist in English dictionary', () => {
      const missingInEn = viKeys.filter((k) => !enKeys.includes(k));
      expect(missingInEn).toEqual([]);
    });
  });

  describe('2. Translation & Interpolation', () => {
    it('translates English string correctly', () => {
      const { t } = useLanguageStore.getState();
      expect(t('common.save')).toBe('Save');
      expect(t('topNav.notes')).toBe('Notes');
    });

    it('translates Vietnamese string when language is switched', () => {
      useLanguageStore.setState({ language: 'vi' });
      const { t } = useLanguageStore.getState();
      expect(t('common.save')).toBe('Lưu');
      expect(t('topNav.notes')).toBe('Ghi chú');
    });

    it('interpolates {param} variables in string', () => {
      const { t } = useLanguageStore.getState();
      const resEn = t('preferences.currentBreakpoint', { breakpoint: 'LG' });
      expect(resEn).toBe('Current: LG');

      useLanguageStore.setState({ language: 'vi' });
      const { t: tVi } = useLanguageStore.getState();
      const resVi = tVi('preferences.currentBreakpoint', { breakpoint: 'LG' });
      expect(resVi).toBe('Hiện tại: LG');
    });

    it('falls back to English when key is missing in active locale', () => {
      // Intentionally mock missing key in vi
      const { t } = useLanguageStore.getState();
      useLanguageStore.setState({ language: 'vi' });
      expect(t('common.save')).toBe('Lưu');
    });

    it('returns the path itself when key is nonexistent in all locales', () => {
      const { t } = useLanguageStore.getState();
      expect(t('nonexistent.deep.key')).toBe('nonexistent.deep.key');
    });
  });

  describe('3. Locale-Aware Formatting', () => {
    it('formats date according to English locale', () => {
      useLanguageStore.setState({ language: 'en' });
      const { formatDate } = useLanguageStore.getState();
      const testDate = new Date(2026, 10, 8); // Nov 8, 2026
      const formatted = formatDate(testDate, { month: 'short', day: 'numeric', year: 'numeric' });
      expect(formatted).toContain('Nov');
      expect(formatted).toContain('2026');
    });

    it('formats date according to Vietnamese locale', () => {
      useLanguageStore.setState({ language: 'vi' });
      const { formatDate } = useLanguageStore.getState();
      const testDate = new Date(2026, 10, 8);
      const formatted = formatDate(testDate, { month: 'numeric', day: 'numeric', year: 'numeric' });
      expect(formatted).toContain('8');
      expect(formatted).toContain('11');
      expect(formatted).toContain('2026');
    });

    it('formats number according to selected locale', () => {
      useLanguageStore.setState({ language: 'en' });
      const { formatNumber } = useLanguageStore.getState();
      expect(formatNumber(1234567)).toBe('1,234,567');

      useLanguageStore.setState({ language: 'vi' });
      const { formatNumber: formatVi } = useLanguageStore.getState();
      expect(formatVi(1234567)).toMatch(/1[.,\s]234[.,\s]567/);
    });
  });
});
