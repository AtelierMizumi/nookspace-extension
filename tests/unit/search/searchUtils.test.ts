import { describe, it, expect } from 'vitest';
import { resolveSearchOrUrl, buildSearchUrl } from '../../../src/features/search/searchUtils';

describe('searchUtils — resolveSearchOrUrl & buildSearchUrl', () => {
  it('1. rejects empty and whitespace-only queries by returning null', () => {
    expect(resolveSearchOrUrl('')).toBeNull();
    expect(resolveSearchOrUrl('   ')).toBeNull();
    expect(resolveSearchOrUrl('\t\n')).toBeNull();
  });

  it('2. navigates directly to valid http and https URLs', () => {
    const httpsRes = resolveSearchOrUrl('https://github.com/giabaoqh/nookspace-extension');
    expect(httpsRes).toEqual({
      type: 'direct-url',
      url: 'https://github.com/giabaoqh/nookspace-extension',
    });

    const httpRes = resolveSearchOrUrl('http://example.com/page?test=true');
    expect(httpRes).toEqual({
      type: 'direct-url',
      url: 'http://example.com/page?test=true',
    });
  });

  it('3. recognizes domain-like inputs without protocol and prepends https://', () => {
    const domainRes = resolveSearchOrUrl('github.com');
    expect(domainRes).toEqual({
      type: 'direct-url',
      url: 'https://github.com/',
    });

    const subdomainRes = resolveSearchOrUrl('developer.mozilla.org/en-US/docs');
    expect(subdomainRes).toEqual({
      type: 'direct-url',
      url: 'https://developer.mozilla.org/en-US/docs',
    });

    const localhostRes = resolveSearchOrUrl('localhost:3000');
    expect(localhostRes).toEqual({
      type: 'direct-url',
      url: 'https://localhost:3000/',
    });

    const ipRes = resolveSearchOrUrl('192.168.1.1:8080/dashboard');
    expect(ipRes).toEqual({
      type: 'direct-url',
      url: 'https://192.168.1.1:8080/dashboard',
    });
  });

  it('4. treats normal text queries with spaces as web searches', () => {
    const textRes = resolveSearchOrUrl('react 18 hooks tutorial', 'google');
    expect(textRes?.type).toBe('search-query');
    expect(textRes?.query).toBe('react 18 hooks tutorial');
    expect(textRes?.url).toContain('https://www.google.com/search?q=react+18+hooks+tutorial');
  });

  it('5. safely defangs and converts unsafe protocol schemes to search queries instead of executing them', () => {
    const jsInjection = resolveSearchOrUrl('javascript:alert(document.cookie)', 'google');
    expect(jsInjection?.type).toBe('search-query');
    expect(jsInjection?.url).not.toBe('javascript:alert(document.cookie)');
    expect(jsInjection?.url).toContain('https://www.google.com/search');

    const dataInjection = resolveSearchOrUrl('data:text/html,<script>alert(1)</script>', 'bing');
    expect(dataInjection?.type).toBe('search-query');
    expect(dataInjection?.url).toContain('https://www.bing.com/search');

    const fileInjection = resolveSearchOrUrl('file:///etc/passwd', 'duckduckgo');
    expect(fileInjection?.type).toBe('search-query');
    expect(fileInjection?.url).toContain('https://duckduckgo.com');
  });

  it('6. formats search URLs accurately across supported providers', () => {
    const googleUrl = buildSearchUrl('google', 'nookspace extension');
    expect(googleUrl).toBe('https://www.google.com/search?q=nookspace+extension');

    const bingUrl = buildSearchUrl('bing', 'local-first workspace');
    expect(bingUrl).toBe('https://www.bing.com/search?q=local-first+workspace');

    const ddgUrl = buildSearchUrl('duckduckgo', 'privacy extension');
    expect(ddgUrl).toBe('https://duckduckgo.com/?q=privacy+extension');
  });

  it('7. safely handles special characters and URL encoding', () => {
    const specialQuery = 'C++ & C# vs Python 3.12!';
    const url = buildSearchUrl('google', specialQuery);
    expect(url).toContain('C%2B%2B+%26+C%23+vs+Python+3.12%21');
  });
});
