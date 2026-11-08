import { SearchEngineProvider } from '../../types/database';
import { NavigationResult, SEARCH_ENGINES } from './types';

// Unsafe protocols that should never be navigated to directly
const UNSAFE_PROTOCOLS = [
  'javascript:',
  'data:',
  'file:',
  'vbscript:',
  'about:',
  'chrome:',
  'chrome-extension:',
  'moz-extension:',
  'edge:',
  'blob:',
];

// Regex matching domain-like strings (e.g. google.com, sub.domain.co.uk, localhost:3000, 192.168.1.1:8080)
const DOMAIN_REGEX =
  /^(localhost|(\d{1,3}\.){3}\d{1,3}|([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,})(:[0-9]{1,5})?(\/.*)?$/;

/**
 * Validates and resolves user input into either a direct URL or a search query.
 */
export function resolveSearchOrUrl(
  input: string,
  provider: SearchEngineProvider = 'google'
): NavigationResult | null {
  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }

  // Check for unsafe protocol injections
  const lower = trimmed.toLowerCase();
  for (const unsafe of UNSAFE_PROTOCOLS) {
    if (lower.startsWith(unsafe)) {
      // Treat unsafe protocol strings as search queries to prevent malicious execution
      return {
        type: 'search-query',
        url: buildSearchUrl(provider, trimmed),
        query: trimmed,
        provider,
      };
    }
  }

  // If the input contains whitespace, it's a search phrase, not a direct URL
  if (/\s/.test(trimmed)) {
    return {
      type: 'search-query',
      url: buildSearchUrl(provider, trimmed),
      query: trimmed,
      provider,
    };
  }

  // Check if it has an explicit safe scheme (http:// or https://)
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        return {
          type: 'direct-url',
          url: parsed.href,
        };
      }
    } catch {
      // Invalid URL string, fall back to search query
    }
  }

  // Check if it's a domain-like string (e.g. github.com, localhost:5173, etc.)
  if (DOMAIN_REGEX.test(trimmed)) {
    try {
      const targetUrl = `https://${trimmed}`;
      const parsed = new URL(targetUrl);
      if (parsed.protocol === 'https:') {
        return {
          type: 'direct-url',
          url: parsed.href,
        };
      }
    } catch {
      // Fallback
    }
  }

  // Default: submit as search query
  return {
    type: 'search-query',
    url: buildSearchUrl(provider, trimmed),
    query: trimmed,
    provider,
  };
}

/**
 * Builds a search query URL safely using URL and URLSearchParams.
 */
export function buildSearchUrl(provider: SearchEngineProvider, query: string): string {
  const config = SEARCH_ENGINES[provider] || SEARCH_ENGINES.google;
  try {
    const url = new URL(config.searchUrl);
    url.searchParams.set(config.queryParam, query);
    return url.toString();
  } catch {
    return `${config.searchUrl}?${config.queryParam}=${encodeURIComponent(query)}`;
  }
}
