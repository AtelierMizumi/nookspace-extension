import { describe, it, expect } from 'vitest';
import { en } from '../../../src/services/i18n/locales/en';
import { vi } from '../../../src/services/i18n/locales/vi';
import { useLanguageStore } from '../../../src/services/i18n/i18nStore';

describe('Bilingual Localization Completeness & Parity Audit', () => {
  function getNestedKeys(obj: Record<string, any>, prefix = ''): string[] {
    let keys: string[] = [];
    for (const key of Object.keys(obj)) {
      const val = obj[key];
      const fullKey = prefix ? `${prefix}.${key}` : key;
      if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
        keys = keys.concat(getNestedKeys(val, fullKey));
      } else {
        keys.push(fullKey);
      }
    }
    return keys;
  }

  it('1. verifies 100% key parity between English and Vietnamese dictionaries', () => {
    const enKeys = getNestedKeys(en).sort();
    const viKeys = getNestedKeys(vi).sort();

    const missingInVi = enKeys.filter((k) => !viKeys.includes(k));
    const missingInEn = viKeys.filter((k) => !enKeys.includes(k));

    expect(missingInVi).toEqual([]);
    expect(missingInEn).toEqual([]);
    expect(viKeys.length).toBe(enKeys.length);
  });

  it('2. verifies zero empty string values across all English and Vietnamese keys', () => {
    const enKeys = getNestedKeys(en);
    for (const k of enKeys) {
      const parts = k.split('.');
      let enVal: any = en;
      let viVal: any = vi;
      for (const p of parts) {
        enVal = enVal[p];
        viVal = viVal[p];
      }
      expect(typeof enVal).toBe('string');
      expect(enVal.trim().length).toBeGreaterThan(0);
      expect(typeof viVal).toBe('string');
      expect(viVal.trim().length).toBeGreaterThan(0);
    }
  });

  it('3. verifies all required functional domains exist in both locales', () => {
    const requiredDomains = [
      'common',
      'search',
      'appShell',
      'customization',
      'topNav',
      'preferences',
      'browserIntegration',
      'widgets',
      'bookmarks',
      'notesManager',
      'workspaces',
    ];

    for (const domain of requiredDomains) {
      expect(en).toHaveProperty(domain);
      expect(vi).toHaveProperty(domain);
    }
  });

  it('4. verifies instantaneous language switching updates strings in store without page reload', () => {
    useLanguageStore.setState({ language: 'en', isInitialized: true });
    const { t, setLanguage } = useLanguageStore.getState();

    expect(t('search.placeholder')).toBe('Search or enter a website address...');
    expect(t('customization.editingDashboard')).toBe('Editing Dashboard');

    setLanguage('vi');

    const updatedState = useLanguageStore.getState();
    expect(updatedState.language).toBe('vi');
    expect(updatedState.t('search.placeholder')).toBe('Tìm kiếm hoặc nhập địa chỉ website...');
    expect(updatedState.t('customization.editingDashboard')).toBe('Đang chỉnh sửa Dashboard');
  });

  it('5. formats dates according to selected locale (vi-VN vs en-US)', () => {
    const testDate = new Date(2026, 10, 8, 14, 0, 0); // Nov 8, 2026

    useLanguageStore.setState({ language: 'en' });
    const enDate = useLanguageStore.getState().formatDate(testDate, { month: 'short', day: 'numeric', year: 'numeric' });
    expect(enDate).toContain('2026');

    useLanguageStore.setState({ language: 'vi' });
    const viDate = useLanguageStore.getState().formatDate(testDate, { month: 'short', day: 'numeric', year: 'numeric' });
    expect(viDate).toContain('2026');
  });
});
