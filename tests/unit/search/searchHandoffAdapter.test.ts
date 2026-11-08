import { describe, it, expect } from 'vitest';
import {
  detectPlatform,
  getNativeOmniboxShortcut,
  getSearchHandoffCapability,
  attemptNativeSearchHandoff,
} from '../../../src/features/search/searchHandoffAdapter';

describe('Search Handoff Adapter & Browser Capabilities', () => {
  it('1. detects platform and provides appropriate shortcut (Ctrl+L or Cmd+L)', () => {
    const shortcut = getNativeOmniboxShortcut();
    expect(['Ctrl+L', '⌘L']).toContain(shortcut);
  });

  it('2. reports capability honestly (programmatic chrome focus is isolated by browser security)', () => {
    const cap = getSearchHandoffCapability();
    expect(cap.isNativeFocusSupported).toBe(false);
    expect(cap.reason).toBe('isolated_by_browser_security');
    expect(cap.recommendedShortcut).toBeDefined();
  });

  it('3. attempts native handoff and provides honest fallback reason and shortcut', async () => {
    const res = await attemptNativeSearchHandoff();
    expect(res.success).toBe(false);
    expect(res.shortcut).toBeDefined();
    expect(res.fallbackReason).toContain('Browser security architecture restricts extensions');
  });
});
