import { create } from 'zustand';
import {
  AppSettingsEntity,
  BrowserStartupBehavior,
  StartupSetupStatus,
  DetectedBrowserFamily,
  SearchEngineProvider,
  BackgroundMode,
} from '../types/database';
import { settingsRepository } from '../services/database/repositories/settingsRepository';
import { backgroundRepository } from '../services/database/repositories/backgroundRepository';
import { detectBrowserFamily } from '../services/browser/browserDetection';

interface SettingsState {
  settings: AppSettingsEntity | null;
  isLoading: boolean;
  error: string | null;
  detectedBrowser: DetectedBrowserFamily;
  customBackgroundUrl: string | null;

  // Actions
  loadSettings: () => Promise<void>;
  setSearchEngine: (engine: SearchEngineProvider) => Promise<void>;
  setStartupBehavior: (behavior: BrowserStartupBehavior) => Promise<void>;
  verifyStartupSetup: () => Promise<void>;
  resetStartupVerification: () => Promise<void>;
  loadCustomBackground: () => Promise<void>;
  setCustomBackgroundUpload: (file: File) => Promise<{ success: boolean; error?: string }>;
  setCustomBackgroundUrl: (url: string) => Promise<{ success: boolean; error?: string }>;
  setBackgroundMode: (mode: BackgroundMode) => Promise<void>;
  setBackgroundOverlay: (overlay: number) => Promise<void>;
  clearBackground: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: null,
  isLoading: false,
  error: null,
  detectedBrowser: detectBrowserFamily(),
  customBackgroundUrl: null,

  loadSettings: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await settingsRepository.getSettings();
      const detected = detectBrowserFamily();
      set({ settings: data, detectedBrowser: detected, isLoading: false });
      // If settings use local upload, pre-load dataUrl
      if (data.backgroundType === 'image' && data.backgroundValue === 'local_upload') {
        const bgData = await backgroundRepository.getLocalBackgroundImage();
        set({ customBackgroundUrl: bgData });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ error: msg, isLoading: false });
    }
  },

  loadCustomBackground: async () => {
    try {
      const bgData = await backgroundRepository.getLocalBackgroundImage();
      set({ customBackgroundUrl: bgData });
    } catch (err) {
      console.warn('[SettingsStore] Failed to load custom background:', err);
    }
  },

  setCustomBackgroundUpload: async (file: File) => {
    try {
      const result = await backgroundRepository.saveLocalBackgroundImage(file);
      if (result.success && result.dataUrl) {
        const updated = await settingsRepository.getSettings();
        set({
          settings: updated,
          customBackgroundUrl: result.dataUrl,
          error: null,
        });
        return { success: true };
      }
      return { success: false, error: result.error || 'Failed to save background image' };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, error: msg };
    }
  },

  setCustomBackgroundUrl: async (url: string) => {
    const valResult = backgroundRepository.validateImageUrl(url);
    if (!valResult.valid) {
      return { success: false, error: valResult.error };
    }

    try {
      const updated = await backgroundRepository.updateBackgroundSettings({
        type: 'image',
        value: url.trim(),
      });
      set({
        settings: updated,
        customBackgroundUrl: url.trim(),
        error: null,
      });
      return { success: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, error: msg };
    }
  },

  setBackgroundMode: async (mode: BackgroundMode) => {
    try {
      const updated = await backgroundRepository.updateBackgroundSettings({ mode });
      set({ settings: updated, error: null });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ error: msg });
    }
  },

  setBackgroundOverlay: async (overlay: number) => {
    try {
      const updated = await backgroundRepository.updateBackgroundSettings({ overlay });
      set({ settings: updated, error: null });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ error: msg });
    }
  },

  clearBackground: async () => {
    try {
      await backgroundRepository.clearLocalBackgroundImage();
      const updated = await settingsRepository.getSettings();
      set({
        settings: updated,
        customBackgroundUrl: null,
        error: null,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ error: msg });
    }
  },

  setSearchEngine: async (engine: SearchEngineProvider) => {
    try {
      const updated = await settingsRepository.updateSearchEngine(engine);
      set({ settings: updated, error: null });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ error: msg });
    }
  },

  setStartupBehavior: async (behavior: BrowserStartupBehavior) => {
    try {
      const detected = get().detectedBrowser;
      const updated = await settingsRepository.updateStartupIntegration(
        behavior,
        undefined,
        detected
      );
      set({ settings: updated, error: null });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ error: msg });
    }
  },

  verifyStartupSetup: async () => {
    try {
      const updated = await settingsRepository.markStartupVerified();
      set({ settings: updated, error: null });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ error: msg });
    }
  },

  resetStartupVerification: async () => {
    try {
      const updated = await settingsRepository.resetStartupVerification();
      set({ settings: updated, error: null });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ error: msg });
    }
  },
}));
