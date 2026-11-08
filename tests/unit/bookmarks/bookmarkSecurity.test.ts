import { describe, it, expect, vi } from 'vitest';
import {
  isSafeBookmarkUrl,
  validateBookmarkUrl,
  isSafeIconUrl,
  isValidHexColor,
  isValidLucideIcon,
  ALLOWED_BOOKMARK_SCHEMES,
} from '../../../src/features/bookmarks/utils/bookmarkSecurity';

describe('Bookmark Security Utilities — Milestone 6.1', () => {
  describe('ALLOWED_BOOKMARK_SCHEMES', () => {
    it('only contains https:, http:, and mailto:', () => {
      expect(ALLOWED_BOOKMARK_SCHEMES).toEqual(['https:', 'http:', 'mailto:']);
    });
  });

  describe('isSafeBookmarkUrl & validateBookmarkUrl', () => {
    // Exact test matrix required by specification:
    const testCases: Array<{ input: string; expected: boolean; description: string }> = [
      { input: 'https://github.com', expected: true, description: 'standard https URL' },
      { input: 'http://example.com', expected: true, description: 'standard http URL' },
      { input: 'mailto:user@example.com', expected: true, description: 'mailto with recipient' },
      { input: 'javascript:alert(1)', expected: false, description: 'javascript scheme (XSS vector)' },
      { input: 'data:text/html,<script>alert(1)</script>', expected: false, description: 'data URL' },
      { input: 'vbscript:msgbox(1)', expected: false, description: 'vbscript scheme' },
      { input: 'file:///etc/passwd', expected: false, description: 'local file URL' },
      { input: 'blob:https://example.com/uuid', expected: false, description: 'blob URL' },
      { input: 'chrome://settings', expected: false, description: 'browser internal chrome: URL' },
      { input: 'chrome-extension://example/page.html', expected: false, description: 'chrome-extension scheme' },
      { input: 'about:blank', expected: false, description: 'about: URL' },
      { input: '//example.com', expected: false, description: 'protocol-relative URL' },
      { input: '/relative/path', expected: false, description: 'path-relative URL' },
      { input: 'example.com', expected: false, description: 'missing scheme' },
      { input: '', expected: false, description: 'empty string' },
      { input: '   ', expected: false, description: 'whitespace-only string' },
      { input: 'https://example.com/\x00test', expected: false, description: 'URL containing null byte / control char' },
      { input: 'https://user:pass@example.com', expected: false, description: 'embedded credentials (user:password)' },
      { input: 'http://[invalid-ipv6', expected: false, description: 'malformed URL format' },
    ];

    testCases.forEach(({ input, expected, description }) => {
      it(`evaluates "${input}" as ${expected ? 'SAFE' : 'REJECTED'} (${description})`, () => {
        const isSafe = isSafeBookmarkUrl(input);
        expect(isSafe).toBe(expected);

        const result = validateBookmarkUrl(input);
        expect(result.valid).toBe(expected);
        if (expected) {
          expect(result.normalizedUrl).toBeDefined();
          expect(result.error).toBeUndefined();
        } else {
          expect(result.error).toBeDefined();
          expect(typeof result.error).toBe('string');
        }
      });
    });

    it('rejects URLs with leading or trailing whitespace rather than silently trimming', () => {
      expect(isSafeBookmarkUrl('  https://github.com')).toBe(false);
      expect(isSafeBookmarkUrl('https://github.com  ')).toBe(false);
      expect(isSafeBookmarkUrl('\thttps://github.com')).toBe(false);
      const res = validateBookmarkUrl(' https://github.com ');
      expect(res.valid).toBe(false);
      expect(res.error).toContain('whitespace');
    });

    it('rejects mailto with empty recipient', () => {
      expect(isSafeBookmarkUrl('mailto:')).toBe(false);
      const res = validateBookmarkUrl('mailto:');
      expect(res.valid).toBe(false);
      expect(res.error).toContain('email recipient');
    });

    it('accepts mailto with email and query parameters', () => {
      const res = validateBookmarkUrl('mailto:support@nookspace.io?subject=Help');
      expect(res.valid).toBe(true);
      expect(res.normalizedUrl).toBe('mailto:support@nookspace.io?subject=Help');
    });

    it('does not perform any network requests or external navigation during validation', () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch');
      validateBookmarkUrl('https://malicious-domain-that-must-not-be-queried.invalid/path');
      expect(fetchSpy).not.toHaveBeenCalled();
      fetchSpy.mockRestore();
    });

    it('conservatively normalizes safe URLs without mutating path or query casing', () => {
      const complexUrl = 'https://Example.COM/Path/To/Resource?QueryParam=Value#AnchorTag';
      const result = validateBookmarkUrl(complexUrl);
      expect(result.valid).toBe(true);
      // Host is standard lowercase, path, query, and hash retain original casing
      expect(result.normalizedUrl).toBe('https://example.com/Path/To/Resource?QueryParam=Value#AnchorTag');
    });

    it('does not expose internal stack traces in validation error results', () => {
      const result = validateBookmarkUrl('not_a_valid_url:::');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid URL format');
      expect(JSON.stringify(result)).not.toContain('at ');
      expect(JSON.stringify(result)).not.toContain('.ts');
    });
  });

  describe('Special URL handling (mailto:, localhost, IPs, and edge cases)', () => {
    it('accepts mailto with multiple comma-separated recipients', () => {
      const url = 'mailto:alice@example.com,bob@example.com';
      expect(isSafeBookmarkUrl(url)).toBe(true);
      const res = validateBookmarkUrl(url);
      expect(res.valid).toBe(true);
      expect(res.normalizedUrl).toBe(url);
    });

    it('accepts complex mailto with plus-addressing, cc, bcc, subject, and body', () => {
      const url = 'mailto:user+dev@example.co.uk?cc=team@example.com&subject=Sprint%20Review&body=All%20good';
      expect(isSafeBookmarkUrl(url)).toBe(true);
      const res = validateBookmarkUrl(url);
      expect(res.valid).toBe(true);
      expect(res.normalizedUrl).toBe(url);
    });

    it('accepts case-insensitive uppercase mailto and http schemes', () => {
      expect(isSafeBookmarkUrl('MAILTO:caps@example.com')).toBe(true);
      expect(isSafeBookmarkUrl('HTTP://example.com/test')).toBe(true);
      expect(isSafeBookmarkUrl('HTTPS://example.com/test')).toBe(true);
    });

    it('rejects mailto containing query parameters without an email recipient', () => {
      const url = 'mailto:?subject=NoRecipientHere';
      expect(isSafeBookmarkUrl(url)).toBe(false);
      const res = validateBookmarkUrl(url);
      expect(res.valid).toBe(false);
      expect(res.error).toContain('email recipient');
    });

    it('rejects mailto with newline or carriage-return characters (header injection attempt)', () => {
      expect(isSafeBookmarkUrl('mailto:user@example.com\nsubject=Injected')).toBe(false);
      expect(isSafeBookmarkUrl('mailto:user@example.com\r\ncc=evil@example.com')).toBe(false);
    });

    it('accepts standard local development URLs (localhost and 127.0.0.1 with ports)', () => {
      expect(isSafeBookmarkUrl('http://localhost:3000')).toBe(true);
      expect(isSafeBookmarkUrl('http://localhost:5173/vite')).toBe(true);
      expect(isSafeBookmarkUrl('http://127.0.0.1:8080/dashboard')).toBe(true);
      expect(isSafeBookmarkUrl('https://127.0.0.1:9000/app?debug=true#section')).toBe(true);
    });

    it('accepts complex URLs with custom ports, deep paths, and encoded queries', () => {
      const url = 'https://dev.portal.internal.net:8443/v2/api/explorer?filter=%7B%22id%22%3A1%7D#results';
      expect(isSafeBookmarkUrl(url)).toBe(true);
      const res = validateBookmarkUrl(url);
      expect(res.valid).toBe(true);
      expect(res.normalizedUrl).toBe(url);
    });
  });

  describe('isSafeIconUrl', () => {
    it('accepts valid HTTPS icon URLs', () => {
      expect(isSafeIconUrl('https://cdn.example.com/icons/app.png')).toBe(true);
      expect(isSafeIconUrl('https://assets.github.com/favicon.ico')).toBe(true);
    });

    it('rejects non-HTTPS schemes for remote icons', () => {
      expect(isSafeIconUrl('http://cdn.example.com/icon.png')).toBe(false);
      expect(isSafeIconUrl('javascript:alert(1)')).toBe(false);
      expect(isSafeIconUrl('data:image/svg+xml,...')).toBe(false);
    });

    it('rejects icon URLs with embedded credentials', () => {
      expect(isSafeIconUrl('https://user:pass@cdn.example.com/icon.png')).toBe(false);
    });

    it('rejects excessively long or whitespace-padded icon URLs', () => {
      expect(isSafeIconUrl(' https://cdn.example.com/icon.png ')).toBe(false);
      expect(isSafeIconUrl('https://' + 'a'.repeat(2100) + '.com/icon.png')).toBe(false);
    });
  });

  describe('isValidHexColor', () => {
    it('accepts valid 3, 6, and 8 digit hex color codes', () => {
      expect(isValidHexColor('#fff')).toBe(true);
      expect(isValidHexColor('#FFF')).toBe(true);
      expect(isValidHexColor('#3B82F6')).toBe(true);
      expect(isValidHexColor('#3b82f6')).toBe(true);
      expect(isValidHexColor('#3B82F6AA')).toBe(true);
    });

    it('rejects invalid color formats and dangerous strings', () => {
      expect(isValidHexColor('rgb(255, 0, 0)')).toBe(false);
      expect(isValidHexColor('red')).toBe(false);
      expect(isValidHexColor('#12')).toBe(false);
      expect(isValidHexColor('#12345')).toBe(false);
      expect(isValidHexColor('#1234567')).toBe(false);
      expect(isValidHexColor('#GGGGGG')).toBe(false);
      expect(isValidHexColor('<script>alert(1)</script>')).toBe(false);
    });
  });

  describe('isValidLucideIcon', () => {
    it('accepts valid Lucide icon identifiers', () => {
      expect(isValidLucideIcon('bookmark')).toBe(true);
      expect(isValidLucideIcon('folder')).toBe(true);
      expect(isValidLucideIcon('external-link')).toBe(true);
      expect(isValidLucideIcon('book-open')).toBe(true);
      expect(isValidLucideIcon('FolderPlus')).toBe(true);
    });

    it('rejects empty, overlong, or malicious icon strings', () => {
      expect(isValidLucideIcon('')).toBe(false);
      expect(isValidLucideIcon('   ')).toBe(false);
      expect(isValidLucideIcon('folder/icon')).toBe(false);
      expect(isValidLucideIcon('folder<script>')).toBe(false);
      expect(isValidLucideIcon('a'.repeat(51))).toBe(false);
    });
  });
});
