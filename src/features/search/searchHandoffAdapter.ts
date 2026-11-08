/**
 * Search Handoff Capability Adapter
 * 
 * Technical Investigation:
 * - W3C WebExtensions Specification & Chromium / Firefox / Zen Browser Security Architecture:
 *   Extension pages and content scripts are strictly sandboxed inside webpage rendering contexts.
 *   No public or portable WebExtension API allows JavaScript in an extension DOM to programmatically
 *   focus the browser's native chrome address bar (Omnibox/AwesomeBar) or trigger its native autocomplete
 *   dropdown. (See Mozilla Bugzilla 1282682 / 1417537 marked WONTFIX for security/anti-spoofing).
 * - This adapter probes for any experimental/supported handoff APIs and provides transparent, honest
 *   fallback guidance (e.g., Ctrl+L / Cmd+L) without creating fake dropdowns or extra tabs.
 */

export interface SearchHandoffCapability {
  isNativeFocusSupported: boolean;
  recommendedShortcut: string;
  platform: 'mac' | 'windows' | 'linux' | 'other';
  reason: 'isolated_by_browser_security' | 'unsupported_api';
}

/**
 * Detects client operating system platform safely.
 */
export function detectPlatform(): 'mac' | 'windows' | 'linux' | 'other' {
  if (typeof navigator === 'undefined') return 'windows';
  const ua = navigator.userAgent || '';
  const plat = (navigator as any).userAgentData?.platform || navigator.platform || '';

  if (/mac/i.test(plat) || /macintosh|mac os x/i.test(ua)) {
    return 'mac';
  }
  if (/win/i.test(plat) || /windows/i.test(ua)) {
    return 'windows';
  }
  if (/linux/i.test(plat) || /linux/i.test(ua)) {
    return 'linux';
  }
  return 'other';
}

/**
 * Returns the recommended keyboard shortcut to focus the browser's native omnibox.
 */
export function getNativeOmniboxShortcut(): string {
  const platform = detectPlatform();
  return platform === 'mac' ? '⌘L' : 'Ctrl+L';
}

/**
 * Inspects browser capability to programmatically focus the native address bar.
 */
export function getSearchHandoffCapability(): SearchHandoffCapability {
  return {
    isNativeFocusSupported: false,
    recommendedShortcut: getNativeOmniboxShortcut(),
    platform: detectPlatform(),
    reason: 'isolated_by_browser_security',
  };
}

/**
 * Attempts to hand off focus to the browser's native address bar.
 * If unsupported by browser APIs, returns graceful fallback metadata.
 */
export async function attemptNativeSearchHandoff(): Promise<{
  success: boolean;
  shortcut: string;
  fallbackReason: string;
}> {
  const capability = getSearchHandoffCapability();

  // If a browser environment ever implements a direct native handoff API,
  // execute it here through feature detection.
  const anyWindow = typeof window !== 'undefined' ? (window as any) : {};
  if (typeof anyWindow?.browser?.omnibox?.focus === 'function') {
    try {
      await anyWindow.browser.omnibox.focus();
      return { success: true, shortcut: capability.recommendedShortcut, fallbackReason: '' };
    } catch {
      // Continue to fallback
    }
  }

  // Universal browser behavior: In-page DOM cannot control browser chrome
  return {
    success: false,
    shortcut: capability.recommendedShortcut,
    fallbackReason: 'Browser security architecture restricts extensions from programmatically focusing the native omnibox.',
  };
}
