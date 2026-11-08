/**
 * Smart Bookmarks Security Utilities
 *
 * Implements strict, offline URL validation and scheme allowlisting to prevent
 * Stored XSS, arbitrary script execution (javascript:, vbscript:), and unexpected protocol handlers.
 *
 * Conforms to local-first, privacy-first principles: zero network calls, zero telemetry.
 */

export const ALLOWED_BOOKMARK_SCHEMES = ['https:', 'http:', 'mailto:'] as const;
export type AllowedBookmarkScheme = typeof ALLOWED_BOOKMARK_SCHEMES[number];

export const HEX_COLOR_REGEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
export const LUCIDE_ICON_REGEX = /^[a-zA-Z0-9-]+$/;

export interface BookmarkUrlValidationResult {
  valid: boolean;
  normalizedUrl?: string;
  error?: string;
}

/**
 * Validates a raw URL against strict security criteria:
 * - Reject empty or non-string inputs.
 * - Reject leading or trailing whitespace.
 * - Reject ASCII control characters.
 * - Parse with standard WHATWG URL constructor.
 * - Restrict protocol strictly to https:, http:, or mailto:.
 * - Require valid hostname for http: and https:.
 * - Reject embedded credentials (user:password) in http: and https:.
 * - Require non-empty recipient for mailto:.
 * - Reject protocol-relative and path-relative URLs.
 * - Performs NO network requests or external navigation.
 */
export function validateBookmarkUrl(rawUrl: string): BookmarkUrlValidationResult {
  if (typeof rawUrl !== 'string' || rawUrl.length === 0) {
    return { valid: false, error: 'URL cannot be empty' };
  }

  // Reject leading/trailing whitespace rather than silently trimming ambiguous input
  if (rawUrl !== rawUrl.trim()) {
    return { valid: false, error: 'URL must not contain leading or trailing whitespace' };
  }

  // Reject control characters (0x00 to 0x1F and 0x7F)
  if (/[\x00-\x1F\x7F]/.test(rawUrl)) {
    return { valid: false, error: 'URL contains prohibited control characters' };
  }

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }

  // Protocol check
  const protocol = parsed.protocol.toLowerCase();
  if (!ALLOWED_BOOKMARK_SCHEMES.includes(protocol as AllowedBookmarkScheme)) {
    return {
      valid: false,
      error: `Unsupported scheme: "${parsed.protocol}". Only https:, http:, and mailto: are permitted.`,
    };
  }

  // HTTP and HTTPS specific constraints
  if (protocol === 'http:' || protocol === 'https:') {
    if (!parsed.hostname || parsed.hostname.length === 0) {
      return { valid: false, error: 'HTTP and HTTPS URLs must have a valid hostname' };
    }

    // Prohibit embedded credentials (e.g., https://user:pass@example.com)
    if (parsed.username !== '' || parsed.password !== '') {
      return { valid: false, error: 'URLs with embedded credentials (user:password) are prohibited' };
    }
  }

  // Mailto specific constraints
  if (protocol === 'mailto:') {
    if (!parsed.pathname || parsed.pathname.trim().length === 0) {
      return { valid: false, error: 'Mailto URL must specify an email recipient' };
    }
    if (parsed.username !== '' || parsed.password !== '') {
      return { valid: false, error: 'Mailto URLs must not contain authentication credentials' };
    }
  }

  return {
    valid: true,
    normalizedUrl: parsed.href,
  };
}

/**
 * Returns true if the raw URL is safe and compliant with the allowed schemes.
 */
export function isSafeBookmarkUrl(rawUrl: string): boolean {
  return validateBookmarkUrl(rawUrl).valid;
}

/**
 * Validates an optional icon URL.
 * Requires HTTPS protocol, valid hostname, no embedded credentials, and length <= 2048.
 * Does not make any network requests.
 */
export function isSafeIconUrl(rawUrl: string): boolean {
  if (typeof rawUrl !== 'string' || rawUrl.length === 0 || rawUrl.length > 2048) {
    return false;
  }
  if (rawUrl !== rawUrl.trim() || /[\x00-\x1F\x7F]/.test(rawUrl)) {
    return false;
  }
  try {
    const parsed = new URL(rawUrl);
    return (
      parsed.protocol === 'https:' &&
      Boolean(parsed.hostname) &&
      parsed.hostname.length > 0 &&
      parsed.username === '' &&
      parsed.password === ''
    );
  } catch {
    return false;
  }
}

/**
 * Validates a color string as a standard hex color code (#RGB, #RRGGBB, #RRGGBBAA).
 */
export function isValidHexColor(color: string): boolean {
  return typeof color === 'string' && HEX_COLOR_REGEX.test(color);
}

/**
 * Validates that an icon identifier conforms to Lucide icon naming (alphanumeric + hyphen).
 */
export function isValidLucideIcon(icon: string): boolean {
  return typeof icon === 'string' && icon.length > 0 && icon.length <= 50 && LUCIDE_ICON_REGEX.test(icon);
}
