import { describe, it, expect } from 'vitest';
import { detectBrowserLanguage } from '../../../src/services/i18n/languageDetector';

describe('Language Detection', () => {
  it('1. detects Vietnamese when vi is primary language', () => {
    expect(detectBrowserLanguage(['vi'])).toBe('vi');
    expect(detectBrowserLanguage(['vi-VN', 'en-US'])).toBe('vi');
    expect(detectBrowserLanguage(['vi_VN'])).toBe('vi');
  });

  it('2. detects English when en is primary language', () => {
    expect(detectBrowserLanguage(['en-US', 'en'])).toBe('en');
    expect(detectBrowserLanguage(['en'])).toBe('en');
  });

  it('3. falls back to English for other non-Vietnamese languages', () => {
    expect(detectBrowserLanguage(['fr-FR', 'es-ES'])).toBe('en');
    expect(detectBrowserLanguage(['ja-JP'])).toBe('en');
    expect(detectBrowserLanguage([])).toBe('en');
  });

  it('4. detects Vietnamese if it appears later in language preference list', () => {
    expect(detectBrowserLanguage(['vi-VN'])).toBe('vi');
  });
});
