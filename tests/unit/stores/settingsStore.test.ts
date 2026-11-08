import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useSettingsStore } from '../../../src/stores/settingsStore';
import { settingsRepository } from '../../../src/services/database/repositories/settingsRepository';

describe('useSettingsStore', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    useSettingsStore.setState({
      settings: null,
      isLoading: false,
      error: null,
      detectedBrowser: 'chrome',
    });
  });

  it('1. loads settings and populates state', async () => {
    vi.spyOn(settingsRepository, 'getSettings').mockResolvedValueOnce({
      id: 'current_settings',
      theme: 'dark',
      accentColor: '#6366f1',
      fontFamily: 'Inter',
      fontSize: 'md',
      backgroundType: 'color',
      backgroundValue: '#09090b',
      widgetOpacity: 90,
      widgetBlur: 10,
      activeWorkspaceId: 'ws-default',
      startupBehavior: 'new-tab-only',
      startupSetupStatus: 'not-configured',
      updatedAt: Date.now(),
    });

    await useSettingsStore.getState().loadSettings();

    const state = useSettingsStore.getState();
    expect(state.isLoading).toBe(false);
    expect(state.settings?.startupBehavior).toBe('new-tab-only');
    expect(state.error).toBeNull();
  });

  it('2. sets startup behavior and updates state', async () => {
    vi.spyOn(settingsRepository, 'updateStartupIntegration').mockResolvedValueOnce({
      id: 'current_settings',
      theme: 'dark',
      accentColor: '#6366f1',
      fontFamily: 'Inter',
      fontSize: 'md',
      backgroundType: 'color',
      backgroundValue: '#09090b',
      widgetOpacity: 90,
      widgetBlur: 10,
      activeWorkspaceId: 'ws-default',
      startupBehavior: 'open-on-startup',
      startupSetupStatus: 'manual-verification-required',
      startupSetupBrowser: 'chrome',
      updatedAt: Date.now(),
    });

    await useSettingsStore.getState().setStartupBehavior('open-on-startup');

    const state = useSettingsStore.getState();
    expect(state.settings?.startupBehavior).toBe('open-on-startup');
    expect(state.settings?.startupSetupStatus).toBe('manual-verification-required');
  });

  it('3. verifies startup setup and sets verified status', async () => {
    vi.spyOn(settingsRepository, 'markStartupVerified').mockResolvedValueOnce({
      id: 'current_settings',
      theme: 'dark',
      accentColor: '#6366f1',
      fontFamily: 'Inter',
      fontSize: 'md',
      backgroundType: 'color',
      backgroundValue: '#09090b',
      widgetOpacity: 90,
      widgetBlur: 10,
      activeWorkspaceId: 'ws-default',
      startupBehavior: 'open-on-startup',
      startupSetupStatus: 'verified',
      updatedAt: Date.now(),
    });

    await useSettingsStore.getState().verifyStartupSetup();

    const state = useSettingsStore.getState();
    expect(state.settings?.startupSetupStatus).toBe('verified');
  });

  it('4. resets startup verification', async () => {
    vi.spyOn(settingsRepository, 'resetStartupVerification').mockResolvedValueOnce({
      id: 'current_settings',
      theme: 'dark',
      accentColor: '#6366f1',
      fontFamily: 'Inter',
      fontSize: 'md',
      backgroundType: 'color',
      backgroundValue: '#09090b',
      widgetOpacity: 90,
      widgetBlur: 10,
      activeWorkspaceId: 'ws-default',
      startupBehavior: 'open-on-startup',
      startupSetupStatus: 'manual-verification-required',
      updatedAt: Date.now(),
    });

    await useSettingsStore.getState().resetStartupVerification();

    const state = useSettingsStore.getState();
    expect(state.settings?.startupSetupStatus).toBe('manual-verification-required');
  });

  it('5. captures and sets error if repository throws', async () => {
    vi.spyOn(settingsRepository, 'getSettings').mockRejectedValueOnce(new Error('IndexedDB failure'));

    await useSettingsStore.getState().loadSettings();

    const state = useSettingsStore.getState();
    expect(state.error).toBe('IndexedDB failure');
    expect(state.isLoading).toBe(false);
  });

  it('6. updates search engine in settings store', async () => {
    vi.spyOn(settingsRepository, 'updateSearchEngine').mockResolvedValueOnce({
      id: 'current_settings',
      theme: 'dark',
      accentColor: '#6366f1',
      fontFamily: 'Inter',
      fontSize: 'md',
      backgroundType: 'color',
      backgroundValue: '#09090b',
      widgetOpacity: 90,
      widgetBlur: 10,
      activeWorkspaceId: 'ws-default',
      searchEngine: 'duckduckgo',
      updatedAt: Date.now(),
    });

    await useSettingsStore.getState().setSearchEngine('duckduckgo');

    const state = useSettingsStore.getState();
    expect(state.settings?.searchEngine).toBe('duckduckgo');
    expect(state.error).toBeNull();
  });
});
