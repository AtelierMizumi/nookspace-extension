import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NookSpaceDB } from '../../../src/services/database/db';
import { SettingsRepository } from '../../../src/services/database/repositories/settingsRepository';
import { AppSettingsEntity } from '../../../src/types/database';

describe('SettingsRepository', () => {
  let testDb: NookSpaceDB;
  let repo: SettingsRepository;

  beforeEach(async () => {
    testDb = new NookSpaceDB(`test-settings-repo-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`);
    await testDb.open();
    repo = new SettingsRepository(testDb);
  });

  afterEach(async () => {
    await testDb.delete();
  });

  it('1. returns default settings when no settings record exists', async () => {
    const settings = await repo.getSettings();
    expect(settings.id).toBe('current_settings');
    expect(settings.startupBehavior).toBe('new-tab-only');
    expect(settings.startupSetupStatus).toBe('not-configured');
    expect(settings.theme).toBe('dark');
  });

  it('2. safely normalizes legacy settings missing startup fields', async () => {
    // Insert legacy record without startupBehavior or startupSetupStatus
    const legacy: any = {
      id: 'current_settings',
      theme: 'light',
      accentColor: '#10b981',
      fontFamily: 'Roboto',
      fontSize: 'sm',
      backgroundType: 'color',
      backgroundValue: '#ffffff',
      widgetOpacity: 80,
      widgetBlur: 5,
      activeWorkspaceId: 'ws-custom',
      updatedAt: 123456789,
    };
    await testDb.settings.put(legacy);

    const settings = await repo.getSettings();
    expect(settings.activeWorkspaceId).toBe('ws-custom');
    expect(settings.theme).toBe('light');
    expect(settings.startupBehavior).toBe('new-tab-only');
    expect(settings.startupSetupStatus).toBe('not-configured');
  });

  it('3. updates startupBehavior to "open-on-startup" and transitions to "manual-verification-required"', async () => {
    await repo.updateStartupIntegration('open-on-startup', undefined, 'chrome');
    const settings = await repo.getSettings();

    expect(settings.startupBehavior).toBe('open-on-startup');
    expect(settings.startupSetupStatus).toBe('manual-verification-required');
    expect(settings.startupSetupBrowser).toBe('chrome');
  });

  it('4. marks startup configuration as verified', async () => {
    await repo.updateStartupIntegration('open-on-startup', undefined, 'firefox');
    let settings = await repo.getSettings();
    expect(settings.startupSetupStatus).toBe('manual-verification-required');

    await repo.markStartupVerified();
    settings = await repo.getSettings();
    expect(settings.startupSetupStatus).toBe('verified');
  });

  it('5. resets startup verification back to manual-verification-required', async () => {
    await repo.updateStartupIntegration('open-on-startup', 'verified', 'edge');
    let settings = await repo.getSettings();
    expect(settings.startupSetupStatus).toBe('verified');

    await repo.resetStartupVerification();
    settings = await repo.getSettings();
    expect(settings.startupSetupStatus).toBe('manual-verification-required');
  });

  it('6. transitions status to "not-configured" when switching to "new-tab-only" or "preserve-browser-startup"', async () => {
    await repo.updateStartupIntegration('open-on-startup', 'verified', 'zen');
    let settings = await repo.getSettings();
    expect(settings.startupSetupStatus).toBe('verified');

    await repo.updateStartupIntegration('preserve-browser-startup');
    settings = await repo.getSettings();
    expect(settings.startupBehavior).toBe('preserve-browser-startup');
    expect(settings.startupSetupStatus).toBe('not-configured');

    await repo.updateStartupIntegration('new-tab-only');
    settings = await repo.getSettings();
    expect(settings.startupBehavior).toBe('new-tab-only');
    expect(settings.startupSetupStatus).toBe('not-configured');

    await repo.updateStartupIntegration('browser-startup');
    settings = await repo.getSettings();
    expect(settings.startupBehavior).toBe('browser-startup');
    expect(settings.startupSetupStatus).toBe('manual-verification-required');

    await repo.updateStartupIntegration('both');
    settings = await repo.getSettings();
    expect(settings.startupBehavior).toBe('both');
    expect(settings.startupSetupStatus).toBe('manual-verification-required');

    await repo.updateStartupIntegration('keep-browser-defaults');
    settings = await repo.getSettings();
    expect(settings.startupBehavior).toBe('keep-browser-defaults');
    expect(settings.startupSetupStatus).toBe('not-configured');
  });

  it('7. rejects invalid startupBehavior via Zod validation', async () => {
    await expect(
      repo.updateStartupIntegration('invalid-behavior' as any)
    ).rejects.toThrow();
  });

  it('8. updates language preference and validates with Zod', async () => {
    await repo.updateLanguage('vi');
    let settings = await repo.getSettings();
    expect(settings.language).toBe('vi');

    await repo.updateLanguage('en');
    settings = await repo.getSettings();
    expect(settings.language).toBe('en');

    await expect(repo.updateLanguage('fr' as any)).rejects.toThrow();
  });

  it('10. updates search engine to duckduckgo and bing with strict validation', async () => {
    let settings = await repo.getSettings();
    expect(settings.searchEngine).toBe('google');

    await repo.updateSearchEngine('duckduckgo');
    settings = await repo.getSettings();
    expect(settings.searchEngine).toBe('duckduckgo');

    await repo.updateSearchEngine('bing');
    settings = await repo.getSettings();
    expect(settings.searchEngine).toBe('bing');

    await expect(repo.updateSearchEngine('yahoo' as any)).rejects.toThrow();
  });

  it('11. preserves all other settings fields when updating startup behavior', async () => {
    await repo.updateSettings({
      activeWorkspaceId: 'ws-important',
      userName: 'Alice',
      accentColor: '#f43f5e',
    });

    await repo.updateStartupIntegration('open-on-startup');
    const settings = await repo.getSettings();

    expect(settings.activeWorkspaceId).toBe('ws-important');
    expect(settings.userName).toBe('Alice');
    expect(settings.accentColor).toBe('#f43f5e');
    expect(settings.startupBehavior).toBe('open-on-startup');
  });
});
