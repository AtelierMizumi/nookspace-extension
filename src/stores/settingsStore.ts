import { create } from 'zustand';
import {
  AppSettingsEntity,
  BrowserStartupBehavior,
  StartupSetupStatus,
  DetectedBrowserFamily,
  SearchEngineProvider,
} from '../types/database';
import { settingsRepository } from '../services/database/repositories/settingsRepository';
import { detectBrowserFamily } from '../services/browser/browserDetection';

interface SettingsState {
  settings: AppSettingsEntity | null;
  isLoading: boolean;
  error: string | null;
  detectedBrowser: DetectedBrowserFamily;

  // Actions
  loadSettings: () => Promise<void>;
  setSearchEngine: (engine: SearchEngineProvider) => Promise<void>;
  setStartupBehavior: (behavior: BrowserStartupBehavior) => Promise<void>;
  verifyStartupSetup: () => Promise<void>;
  resetStartupVerification: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: null,
  isLoading: false,
  error: null,
  detectedBrowser: detectBrowserFamily(),

  loadSettings: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await settingsRepository.getSettings();
      const detected = detectBrowserFamily();
      set({ settings: data, detectedBrowser: detected, isLoading: false });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ error: msg, isLoading: false });
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
