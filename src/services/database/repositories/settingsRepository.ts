import { db, NookSpaceDB } from '../db';
import {
  AppSettingsEntity,
  BrowserStartupBehavior,
  StartupSetupStatus,
  DetectedBrowserFamily,
  SupportedLanguage,
  SearchEngineProvider,
} from '../../../types/database';
import {
  BrowserStartupBehaviorSchema,
  StartupSetupStatusSchema,
  DetectedBrowserFamilySchema,
  LanguageCodeSchema,
  SearchEngineProviderSchema,
} from '../../../features/backup/schemas/entitySchemas';

export class SettingsRepository {
  constructor(private database: NookSpaceDB = db) {}

  /**
   * Retrieves application settings, returning safe defaults if missing or incomplete.
   */
  async getSettings(): Promise<AppSettingsEntity> {
    const raw = await this.database.settings.get('current_settings');
    const now = Date.now();

    if (!raw) {
      return {
        id: 'current_settings',
        theme: 'dark',
        accentColor: '#6366f1',
        fontFamily: 'Inter',
        fontSize: 'md',
        backgroundType: 'color',
        backgroundValue: '#09090b',
        widgetOpacity: 90,
        widgetBlur: 10,
        activeWorkspaceId: 'ws-default-personal',
        userName: 'Explorer',
        language: 'en',
        searchEngine: 'google',
        startupBehavior: 'new-tab-only',
        startupSetupStatus: 'not-configured',
        updatedAt: now,
      };
    }

    // Defensive normalization for existing/legacy settings
    return {
      ...raw,
      language: raw.language || 'en',
      searchEngine: raw.searchEngine || 'google',
      startupBehavior: raw.startupBehavior || 'new-tab-only',
      startupSetupStatus: raw.startupSetupStatus || 'not-configured',
    };
  }

  /**
   * Updates settings fields transactionally.
   */
  async updateSettings(updates: Partial<AppSettingsEntity>): Promise<AppSettingsEntity> {
    const current = await this.getSettings();
    const updated: AppSettingsEntity = {
      ...current,
      ...updates,
      id: 'current_settings',
      updatedAt: Date.now(),
    };

    await this.database.settings.put(updated);
    return updated;
  }

  /**
   * Updates the user's preferred language with strict schema validation.
   */
  async updateLanguage(language: SupportedLanguage): Promise<AppSettingsEntity> {
    const validated = LanguageCodeSchema.parse(language);
    return this.updateSettings({ language: validated });
  }

  /**
   * Updates the user's preferred search engine with strict schema validation.
   */
  async updateSearchEngine(engine: SearchEngineProvider): Promise<AppSettingsEntity> {
    const validated = SearchEngineProviderSchema.parse(engine);
    return this.updateSettings({ searchEngine: validated });
  }

  /**
   * Updates browser startup behavior and setup status with strict schema validation.
   */
  async updateStartupIntegration(
    behavior: BrowserStartupBehavior,
    status?: StartupSetupStatus,
    browserFamily?: DetectedBrowserFamily
  ): Promise<AppSettingsEntity> {
    // Validate inputs
    const validatedBehavior = BrowserStartupBehaviorSchema.parse(behavior);
    const validatedStatus = status ? StartupSetupStatusSchema.parse(status) : undefined;
    const validatedFamily = browserFamily ? DetectedBrowserFamilySchema.parse(browserFamily) : undefined;

    const current = await this.getSettings();

    // Determine appropriate status transition
    const isStartupConfigRequired =
      validatedBehavior === 'browser-startup' ||
      validatedBehavior === 'both' ||
      validatedBehavior === 'open-on-startup';

    let nextStatus: StartupSetupStatus;
    if (validatedStatus) {
      nextStatus = validatedStatus;
    } else if (isStartupConfigRequired) {
      nextStatus = current.startupSetupStatus === 'verified' ? 'verified' : 'manual-verification-required';
    } else {
      nextStatus = 'not-configured';
    }

    const updated: AppSettingsEntity = {
      ...current,
      startupBehavior: validatedBehavior,
      startupSetupStatus: nextStatus,
      startupSetupBrowser: validatedFamily || current.startupSetupBrowser,
      updatedAt: Date.now(),
    };

    await this.database.settings.put(updated);
    return updated;
  }

  /**
   * Explicitly marks browser startup configuration as verified by the user.
   */
  async markStartupVerified(): Promise<AppSettingsEntity> {
    const current = await this.getSettings();
    const updated: AppSettingsEntity = {
      ...current,
      startupSetupStatus: 'verified',
      updatedAt: Date.now(),
    };

    await this.database.settings.put(updated);
    return updated;
  }

  /**
   * Resets startup verification status.
   */
  async resetStartupVerification(): Promise<AppSettingsEntity> {
    const current = await this.getSettings();
    const updated: AppSettingsEntity = {
      ...current,
      startupSetupStatus: 'manual-verification-required',
      updatedAt: Date.now(),
    };

    await this.database.settings.put(updated);
    return updated;
  }
}

export const settingsRepository = new SettingsRepository();
