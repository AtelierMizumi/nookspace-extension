import { DetectedBrowserFamily } from '../../types/database';
import { browserApi } from './index';

export interface BrowserInstructionProfile {
  family: DetectedBrowserFamily;
  displayName: string;
  settingsUrl: string;
  settingsPageName: string;
  instructions: string[];
  limitationsDescription: string;
  troubleshootingNote?: string;
  newTabStatus: 'active';
  newTabDescription: string;
}

/**
 * Detects the user's browser family from navigator.userAgent and feature hints.
 * Safe for execution in browser runtime, WebExtensions, and Node.js testing environments.
 */
export function detectBrowserFamily(userAgentOverride?: string): DetectedBrowserFamily {
  const ua =
    userAgentOverride !== undefined
      ? userAgentOverride
      : typeof navigator !== 'undefined'
      ? navigator.userAgent || ''
      : '';

  // 1. Zen Browser (Gecko-based fork, distinct UI and sidebar)
  if (/Zen\/\d+|ZenBrowser/i.test(ua) || (typeof window !== 'undefined' && 'zen' in window)) {
    return 'zen';
  }

  // 2. Microsoft Edge (Chromium-based)
  if (/Edg\/\d+|Edge\/\d+/i.test(ua)) {
    return 'edge';
  }

  // 3. Cốc Cốc Browser
  if (/CocCoc/i.test(ua)) {
    return 'coccoc';
  }

  // 4. Brave Browser
  if (
    /Brave\/\d+/i.test(ua) ||
    (typeof navigator !== 'undefined' && (navigator as any).brave && typeof (navigator as any).brave.isBrave === 'function')
  ) {
    return 'brave';
  }

  // 5. Mozilla Firefox
  if (/Firefox\/\d+|Gecko\/\d+/i.test(ua)) {
    return 'firefox';
  }

  // 6. Google Chrome & generic Chromium
  if (/Chrome\/\d+|Chromium\/\d+/i.test(ua)) {
    return 'chrome';
  }

  return 'other';
}

/**
 * Returns the exact runtime URL for NookSpace New Tab page.
 */
export function getNookSpaceUrl(): string {
  if (typeof globalThis !== 'undefined') {
    const ext = (globalThis as any).browser || (globalThis as any).chrome;
    if (ext?.runtime?.getURL) {
      try {
        return ext.runtime.getURL('entrypoints/newtab/index.html');
      } catch {
        // Fallback below
      }
    }
  }

  if (typeof window !== 'undefined' && window.location?.href) {
    // If already running on newtab page, return origin + path without hash/query
    try {
      const url = new URL(window.location.href);
      return `${url.origin}${url.pathname}`;
    } catch {
      return window.location.href;
    }
  }

  return 'chrome-extension://[id]/entrypoints/newtab/index.html';
}

/**
 * Retrieves comprehensive guided setup and capability profiles for each browser family.
 */
export function getBrowserInstructionProfile(family: DetectedBrowserFamily): BrowserInstructionProfile {
  switch (family) {
    case 'chrome':
      return {
        family: 'chrome',
        displayName: 'Google Chrome',
        settingsUrl: 'chrome://settings/onStartup',
        settingsPageName: 'On startup settings',
        instructions: [
          'Open Chrome Settings by navigating to chrome://settings/onStartup (or use the button below).',
          'Under the "On startup" section, choose "Open a specific page or set of pages".',
          'Click "Add a new page" and paste the copied NookSpace extension URL, or click "Use current pages" if NookSpace is currently open.',
          '(Optional) Alternatively, choose "Continue where you left off" if you wish Chrome to restore all tabs including NookSpace upon launch.',
        ],
        limitationsDescription:
          'Due to Chromium MV3 security policies, WebExtensions cannot silently or programmatically modify your browser startup pages without user intervention.',
        newTabStatus: 'active',
        newTabDescription:
          'NookSpace is active as your primary New Tab page via the chrome_url_overrides.newtab manifest contract.',
      };

    case 'edge':
      return {
        family: 'edge',
        displayName: 'Microsoft Edge',
        settingsUrl: 'edge://settings/startHomeNTP',
        settingsPageName: 'Start, home, and new tabs',
        instructions: [
          'Open Edge Settings by navigating to edge://settings/startHomeNTP.',
          'Under the "When Edge starts" section, select "Open these pages:".',
          'Click "Add a new page" and paste the copied NookSpace extension URL.',
          'Confirm by clicking "Add". Edge will now launch NookSpace alongside your browser.',
        ],
        limitationsDescription:
          'Microsoft Edge restricts extensions from directly reconfiguring browser startup pages to protect user control.',
        newTabStatus: 'active',
        newTabDescription:
          'NookSpace is active as your New Tab page. Edge displays NookSpace whenever a new tab is opened.',
      };

    case 'brave':
      return {
        family: 'brave',
        displayName: 'Brave Browser',
        settingsUrl: 'brave://settings/getStarted',
        settingsPageName: 'Get started settings',
        instructions: [
          'Open Brave Settings at brave://settings/getStarted.',
          'Under "On startup", select "Open a specific page or set of pages".',
          'Click "Add a new page" and paste the NookSpace extension URL.',
          'Save changes to ensure NookSpace opens whenever Brave launches.',
        ],
        limitationsDescription:
          'Brave maintains strict shielding that prevents extensions from altering startup defaults automatically.',
        newTabStatus: 'active',
        newTabDescription:
          'NookSpace is active as your New Tab page override in Brave.',
      };

    case 'coccoc':
      return {
        family: 'coccoc',
        displayName: 'Cốc Cốc',
        settingsUrl: 'coccoc://settings/onStartup',
        settingsPageName: 'Cài đặt Khi khởi động',
        instructions: [
          'Truy cập cài đặt Cốc Cốc tại coccoc://settings/onStartup.',
          'Tại mục "Khi khởi động", chọn "Mở một trang cụ thể hoặc tập hợp các trang".',
          'Nhấn "Thêm một trang mới" và dán liên kết extension NookSpace đã sao chép.',
          'Xác nhận thêm trang để Cốc Cốc mở NookSpace mỗi khi khởi chạy.',
        ],
        limitationsDescription:
          'Cốc Cốc yêu cầu người dùng tự chọn trang khởi động trong phần cài đặt trình duyệt để đảm bảo tính an toàn.',
        newTabStatus: 'active',
        newTabDescription:
          'NookSpace hoạt động bình thường trên trang Tab Mới của Cốc Cốc.',
      };

    case 'zen':
      return {
        family: 'zen',
        displayName: 'Zen Browser',
        settingsUrl: 'about:preferences#general',
        settingsPageName: 'Zen General Preferences',
        instructions: [
          '1. Enable New Tab Override: Type about:config in Zen URL bar, search for "zen.urlbar.replace-newtab", and set it to false. (This allows custom extensions to replace Zen\'s floating search popup).',
          '2. Homepage & Startup: Open about:preferences#home or about:preferences#general.',
          '3. Under "Homepage and new windows", NookSpace is declared via chrome_settings_overrides.homepage in the extension manifest.',
          '4. Under Startup, choose "Open your home page" to launch NookSpace upon startup, or keep "Open previous windows and tabs" if you wish to restore previous workspace tabs.',
          '5. Press Ctrl+T or click the New Tab button (+) to verify NookSpace displays as your New Tab.',
        ],
        limitationsDescription:
          'Zen Browser defaults to a Floating URL Bar popup on New Tab (zen.urlbar.replace-newtab = true). WebExtensions cannot programmatically modify about:config internal preferences due to Gecko security policies.',
        troubleshootingNote:
          'Zen Note: Zen replaces New Tab with its URL bar popup by default. To display NookSpace on Ctrl+T and "+", open about:config, search for "zen.urlbar.replace-newtab", and set it to false. NookSpace also provides automatic Homepage override via chrome_settings_overrides.homepage.',
        newTabStatus: 'active',
        newTabDescription:
          'NookSpace is registered as the New Tab override in Zen Browser. Requires zen.urlbar.replace-newtab=false in about:config to bypass Zen\'s URL bar popup.',
      };

    case 'firefox':
      return {
        family: 'firefox',
        displayName: 'Mozilla Firefox',
        settingsUrl: 'about:preferences#home',
        settingsPageName: 'Home Preferences',
        instructions: [
          'Open Firefox Preferences by navigating to about:preferences#home.',
          'Under "New Windows and Tabs", find the "Homepage and new windows" dropdown.',
          'Select "Custom URLs..." from the dropdown menu.',
          'Paste the copied NookSpace extension URL into the URL input field.',
          'Verify that "When Firefox starts" in General preferences is set to "Open your home page" (or "Open previous windows and tabs").',
        ],
        limitationsDescription:
          'Mozilla Firefox does not support Chromium-style startup_pages manifest overrides. Configuring NookSpace as your custom Homepage enables automatic launch on startup.',
        newTabStatus: 'active',
        newTabDescription:
          'NookSpace is active as your New Tab page via chrome_url_overrides.newtab in Firefox.',
      };

    case 'other':
    default:
      return {
        family: 'other',
        displayName: 'Web Browser',
        settingsUrl: 'chrome://settings',
        settingsPageName: 'Browser Settings',
        instructions: [
          'Open your browser preferences or settings menu.',
          'Navigate to the "On Startup" or "Homepage" configuration section.',
          'Choose the option to open a specific page on startup.',
          'Paste the copied NookSpace extension URL as the startup page destination.',
        ],
        limitationsDescription:
          'Standard WebExtension APIs across modern browsers do not permit extensions to unilaterally change browser startup configuration.',
        newTabStatus: 'active',
        newTabDescription:
          'NookSpace functions as the New Tab override in all compliant WebExtension browsers.',
      };
  }
}

/**
 * Attempts to open the browser's startup settings page in a new tab.
 * In Chromium and Firefox, navigation to internal schemes (chrome://, edge://, about:)
 * is commonly blocked by extension security sandbox.
 * Returns { success: true } if opened, or { success: false, blockedBySecurity: true }
 * if blocked by browser policy.
 */
export async function openBrowserSettingsPage(
  settingsUrl: string
): Promise<{ success: boolean; blockedBySecurity?: boolean; error?: string }> {
  try {
    await browserApi.tabs.create(settingsUrl);
    return { success: true };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    // Typical browser error: "Cannot navigate to a 'chrome://' URL"
    return {
      success: false,
      blockedBySecurity: true,
      error: errorMsg,
    };
  }
}
