import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  detectBrowserFamily,
  getBrowserInstructionProfile,
  getNookSpaceUrl,
  openBrowserSettingsPage,
} from '../../../src/services/browser/browserDetection';
import { browserApi } from '../../../src/services/browser';

describe('browserDetection', () => {
  const originalUserAgent = navigator.userAgent;

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('detectBrowserFamily', () => {
    it('detects Google Chrome correctly', () => {
      const chromeUa =
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
      expect(detectBrowserFamily(chromeUa)).toBe('chrome');
    });

    it('detects Microsoft Edge correctly', () => {
      const edgeUa =
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0';
      expect(detectBrowserFamily(edgeUa)).toBe('edge');
    });

    it('detects Brave Browser correctly from user agent', () => {
      const braveUa =
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Brave/120.0.0.0';
      expect(detectBrowserFamily(braveUa)).toBe('brave');
    });

    it('detects Cốc Cốc correctly', () => {
      const cocCocUa =
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 CocCoc/120.0.0.0';
      expect(detectBrowserFamily(cocCocUa)).toBe('coccoc');
    });

    it('detects Zen Browser correctly from user agent', () => {
      const zenUa =
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0 Zen/1.24b';
      expect(detectBrowserFamily(zenUa)).toBe('zen');
    });

    it('detects Mozilla Firefox correctly', () => {
      const firefoxUa =
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0';
      expect(detectBrowserFamily(firefoxUa)).toBe('firefox');
    });

    it('falls back to "other" for unknown user agents', () => {
      const unknownUa = 'CustomAgent/1.0';
      expect(detectBrowserFamily(unknownUa)).toBe('other');
    });
  });

  describe('getBrowserInstructionProfile', () => {
    it('returns accurate settings url and instructions for Chrome', () => {
      const profile = getBrowserInstructionProfile('chrome');
      expect(profile.family).toBe('chrome');
      expect(profile.displayName).toBe('Google Chrome');
      expect(profile.settingsUrl).toBe('chrome://settings/onStartup');
      expect(profile.instructions.length).toBeGreaterThan(0);
      expect(profile.limitationsDescription).toContain('Chromium');
      expect(profile.newTabStatus).toBe('active');
    });

    it('returns accurate settings url and instructions for Edge', () => {
      const profile = getBrowserInstructionProfile('edge');
      expect(profile.family).toBe('edge');
      expect(profile.displayName).toBe('Microsoft Edge');
      expect(profile.settingsUrl).toBe('edge://settings/startHomeNTP');
      expect(profile.instructions.some((s) => s.includes('When Edge starts'))).toBe(true);
    });

    it('returns accurate settings url and instructions for Firefox', () => {
      const profile = getBrowserInstructionProfile('firefox');
      expect(profile.family).toBe('firefox');
      expect(profile.displayName).toBe('Mozilla Firefox');
      expect(profile.settingsUrl).toBe('about:preferences#home');
      expect(profile.instructions.some((s) => s.includes('Custom URLs'))).toBe(true);
    });

    it('returns Zen Browser specific note and instructions', () => {
      const profile = getBrowserInstructionProfile('zen');
      expect(profile.family).toBe('zen');
      expect(profile.displayName).toBe('Zen Browser');
      expect(profile.settingsUrl).toBe('about:preferences#general');
      expect(profile.troubleshootingNote).toBeDefined();
      expect(profile.troubleshootingNote).toContain('Zen Note:');
    });

    it('returns default instructions for fallback "other"', () => {
      const profile = getBrowserInstructionProfile('other');
      expect(profile.displayName).toBe('Web Browser');
      expect(profile.instructions.length).toBeGreaterThan(0);
    });
  });

  describe('getNookSpaceUrl', () => {
    it('returns a valid string URL', () => {
      const url = getNookSpaceUrl();
      expect(typeof url).toBe('string');
      expect(url.length).toBeGreaterThan(0);
    });
  });

  describe('openBrowserSettingsPage', () => {
    it('returns success: true when tabs.create succeeds', async () => {
      vi.spyOn(browserApi.tabs, 'create').mockResolvedValueOnce(undefined);
      const res = await openBrowserSettingsPage('chrome://settings/onStartup');
      expect(res.success).toBe(true);
    });

    it('catches and reports security blockage when tabs.create rejects internal schemes', async () => {
      vi.spyOn(browserApi.tabs, 'create').mockRejectedValueOnce(
        new Error('Cannot navigate to a "chrome://" URL')
      );
      const res = await openBrowserSettingsPage('chrome://settings/onStartup');
      expect(res.success).toBe(false);
      expect(res.blockedBySecurity).toBe(true);
      expect(res.error).toContain('Cannot navigate');
    });
  });
});
