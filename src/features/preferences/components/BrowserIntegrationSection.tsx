import React, { useEffect, useState } from 'react';
import {
  ExternalLink,
  Copy,
  Check,
  AlertCircle,
  Info,
  CheckCircle2,
  Compass,
} from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { useSettingsStore } from '../../../stores/settingsStore';
import { useTranslation } from '../../../services/i18n';
import {
  BrowserStartupBehavior,
  DetectedBrowserFamily,
} from '../../../types/database';
import {
  getBrowserInstructionProfile,
  getNookSpaceUrl,
  openBrowserSettingsPage,
} from '../../../services/browser/browserDetection';

interface BrowserIntegrationSectionProps {
  className?: string;
}

export const BrowserIntegrationSection: React.FC<BrowserIntegrationSectionProps> = ({
  className = '',
}) => {
  const {
    settings,
    detectedBrowser,
    loadSettings,
    setStartupBehavior,
    verifyStartupSetup,
    resetStartupVerification,
  } = useSettingsStore();

  const { t, language } = useTranslation();

  const [copiedUrl, setCopiedUrl] = useState(false);
  const [openSettingsFeedback, setOpenSettingsFeedback] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const rawBehavior: BrowserStartupBehavior = settings?.startupBehavior || 'new-tab-only';
  // Normalize legacy behavior values
  const currentBehavior: BrowserStartupBehavior =
    rawBehavior === 'open-on-startup'
      ? 'browser-startup'
      : rawBehavior === 'preserve-browser-startup'
      ? 'keep-browser-defaults'
      : rawBehavior;

  const currentStatus = settings?.startupSetupStatus || 'not-configured';
  const extensionUrl = getNookSpaceUrl();
  const profile = getBrowserInstructionProfile(detectedBrowser);

  const handleCopyUrl = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(extensionUrl);
        setCopiedUrl(true);
        setTimeout(() => setCopiedUrl(false), 2500);
      }
    } catch (err) {
      console.warn('[BrowserIntegration] Clipboard copy failed:', err);
    }
  };

  const handleOpenSettings = async () => {
    setOpenSettingsFeedback(null);
    const result = await openBrowserSettingsPage(profile.settingsUrl);
    if (!result.success) {
      setOpenSettingsFeedback(
        t('browserIntegration.settingsBlockedNotice', { url: profile.settingsUrl })
      );
    }
  };

  const isGuidedSetupVisible =
    currentBehavior === 'browser-startup' ||
    currentBehavior === 'both' ||
    rawBehavior === 'open-on-startup';

  return (
    <div className={`space-y-4 ${className}`} data-testid="browser-integration-section">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-border/40">
        <div className="flex items-center gap-2">
          <Compass className="w-4 h-4 text-primary" />
          <span className="font-semibold text-foreground text-sm">
            {t('browserIntegration.title')}
          </span>
        </div>
        <Badge variant="outline" className="text-[10px] px-1.5 py-0.5">
          {profile.displayName}
        </Badge>
      </div>

      {/* Part A: New Tab Integration */}
      <div className="bg-card/60 rounded-lg p-3 border border-border/60 space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-medium text-foreground text-xs">
            {t('browserIntegration.newTabTitle')}
          </span>
          <Badge variant="success" className="text-[10px] bg-emerald-500/15 text-emerald-500 border-emerald-500/30">
            {t('common.active')}
          </Badge>
        </div>
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          {t('browserIntegration.newTabDesc', { contract: 'chrome_url_overrides.newtab' })}
        </p>
        <p className="text-[10px] text-muted-foreground/80 italic flex items-start gap-1.5 pt-1">
          <Info className="w-3.5 h-3.5 shrink-0 text-muted-foreground/60 mt-0.5" />
          <span>{t('browserIntegration.newTabLimitation')}</span>
        </p>
      </div>

      {/* Part B: Browser Startup Behavior (4 choices) */}
      <div className="space-y-2">
        <label className="font-medium text-foreground block text-xs">
          {t('browserIntegration.startupTitle')}
        </label>
        <div className="grid grid-cols-1 gap-2" role="radiogroup" aria-label={t('browserIntegration.startupTitle')}>
          {/* Option 1: New Tab Only */}
          <div
            role="radio"
            aria-checked={currentBehavior === 'new-tab-only'}
            tabIndex={0}
            onClick={() => setStartupBehavior('new-tab-only')}
            onKeyDown={(e) => {
              if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault();
                setStartupBehavior('new-tab-only');
              }
            }}
            className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all ${
              currentBehavior === 'new-tab-only'
                ? 'border-primary bg-primary/5 shadow-xs'
                : 'border-border/60 hover:border-border hover:bg-muted/30'
            }`}
            data-testid="option-new-tab-only"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium text-foreground text-xs">
                {t('browserIntegration.optNewTabOnly')}
              </span>
              <div
                className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                  currentBehavior === 'new-tab-only'
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-muted-foreground/40'
                }`}
              >
                {currentBehavior === 'new-tab-only' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {t('browserIntegration.optNewTabOnlyDesc')}
            </p>
          </div>

          {/* Option 2: Browser Startup */}
          <div
            role="radio"
            aria-checked={currentBehavior === 'browser-startup'}
            tabIndex={0}
            onClick={() => setStartupBehavior('browser-startup')}
            onKeyDown={(e) => {
              if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault();
                setStartupBehavior('browser-startup');
              }
            }}
            className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all ${
              currentBehavior === 'browser-startup'
                ? 'border-primary bg-primary/5 shadow-xs'
                : 'border-border/60 hover:border-border hover:bg-muted/30'
            }`}
            data-testid="option-browser-startup"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium text-foreground text-xs">
                {t('browserIntegration.optBrowserStartup')}
              </span>
              <div
                className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                  currentBehavior === 'browser-startup'
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-muted-foreground/40'
                }`}
              >
                {currentBehavior === 'browser-startup' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {t('browserIntegration.optBrowserStartupDesc')}
            </p>
          </div>

          {/* Option 3: Both */}
          <div
            role="radio"
            aria-checked={currentBehavior === 'both'}
            tabIndex={0}
            onClick={() => setStartupBehavior('both')}
            onKeyDown={(e) => {
              if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault();
                setStartupBehavior('both');
              }
            }}
            className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all ${
              currentBehavior === 'both'
                ? 'border-primary bg-primary/5 shadow-xs'
                : 'border-border/60 hover:border-border hover:bg-muted/30'
            }`}
            data-testid="option-both"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium text-foreground text-xs">
                {t('browserIntegration.optBoth')}
              </span>
              <div
                className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                  currentBehavior === 'both'
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-muted-foreground/40'
                }`}
              >
                {currentBehavior === 'both' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {t('browserIntegration.optBothDesc')}
            </p>
          </div>

          {/* Option 4: Keep Browser Defaults */}
          <div
            role="radio"
            aria-checked={currentBehavior === 'keep-browser-defaults'}
            tabIndex={0}
            onClick={() => setStartupBehavior('keep-browser-defaults')}
            onKeyDown={(e) => {
              if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault();
                setStartupBehavior('keep-browser-defaults');
              }
            }}
            className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all ${
              currentBehavior === 'keep-browser-defaults'
                ? 'border-primary bg-primary/5 shadow-xs'
                : 'border-border/60 hover:border-border hover:bg-muted/30'
            }`}
            data-testid="option-keep-browser-defaults"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium text-foreground text-xs">
                {t('browserIntegration.optKeepDefaults')}
              </span>
              <div
                className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                  currentBehavior === 'keep-browser-defaults'
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-muted-foreground/40'
                }`}
              >
                {currentBehavior === 'keep-browser-defaults' && (
                  <div className="w-1.5 h-1.5 rounded-full bg-white" />
                )}
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {t('browserIntegration.optKeepDefaultsDesc')}
            </p>
          </div>
        </div>
      </div>

      {/* Guided Setup Experience (Shown when Option 2 or Option 3 is selected) */}
      {isGuidedSetupVisible && (
        <div
          className="bg-muted/20 border border-primary/20 rounded-lg p-3 space-y-3 transition-all"
          data-testid="guided-setup-panel"
        >
          {/* Status & Browser identification */}
          <div className="flex items-center justify-between pb-2 border-b border-border/40">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-foreground text-xs">
                {t('browserIntegration.guidedSetupTitle', { browser: profile.displayName })}
              </span>
            </div>
            {currentStatus === 'verified' ? (
              <Badge variant="success" className="text-[10px] bg-emerald-500/15 text-emerald-500 border-emerald-500/30 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                {t('browserIntegration.verifiedBadge')}
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-500 border-amber-500/30">
                {t('browserIntegration.pendingBadge')}
              </Badge>
            )}
          </div>

          {/* Browser Limitation Disclosure */}
          <div className="text-[11px] text-muted-foreground bg-muted/40 p-2.5 rounded border border-border/40 space-y-1">
            <div className="flex items-center gap-1.5 font-medium text-foreground text-xs">
              <Info className="w-3.5 h-3.5 text-primary" />
              <span>{t('browserIntegration.permissionNotice')}</span>
            </div>
            <p className="leading-relaxed">{profile.limitationsDescription}</p>
          </div>

          {/* Step-by-Step Instructions */}
          <div className="space-y-1.5">
            <span className="font-medium text-foreground text-xs block">
              {t('browserIntegration.stepByStepTitle')}
            </span>
            <ol className="list-decimal list-inside space-y-1 text-[11px] text-muted-foreground">
              {profile.instructions.map((step, idx) => (
                <li key={idx} className="leading-relaxed pl-1">
                  <span className="text-foreground/90">{step}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* Extension URL Box */}
          <div className="space-y-1">
            <span className="font-medium text-foreground text-[11px] block">
              {t('browserIntegration.extensionUrlLabel')}
            </span>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={extensionUrl}
                className="flex-1 bg-background text-[11px] font-mono px-2.5 py-1.5 rounded border border-border text-foreground truncate select-all"
                data-testid="extension-url-input"
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={handleCopyUrl}
                className="shrink-0 text-xs flex items-center gap-1.5"
                data-testid="copy-url-btn"
              >
                {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedUrl ? t('common.copied') : t('browserIntegration.copyUrlBtn')}</span>
              </Button>
            </div>
          </div>

          {/* Settings Action Button */}
          <div className="pt-1 flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenSettings}
              className="text-xs flex items-center gap-1.5"
              data-testid="open-settings-btn"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>{t('browserIntegration.openSettingsBtn', { pageName: profile.settingsPageName })}</span>
            </Button>
          </div>

          {/* Feedback if browser blocked direct settings navigation */}
          {openSettingsFeedback && (
            <div
              className="text-[11px] text-amber-500 bg-amber-500/10 border border-amber-500/20 p-2 rounded flex items-start gap-1.5"
              data-testid="settings-blocked-notice"
            >
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{openSettingsFeedback}</span>
            </div>
          )}

          {/* Zen Browser specific note */}
          {profile.troubleshootingNote && (
            <div
              className="text-[11px] text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 p-2 rounded space-y-0.5"
              data-testid="zen-troubleshooting-note"
            >
              <span className="font-semibold block text-indigo-300">
                {t('browserIntegration.zenNoteTitle')}
              </span>
              <p className="leading-relaxed">{profile.troubleshootingNote}</p>
            </div>
          )}

          {/* Verification Step */}
          <div className="pt-2 border-t border-border/40 flex items-center justify-between">
            <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer select-none">
              <input
                type="checkbox"
                checked={currentStatus === 'verified'}
                onChange={(e) => {
                  if (e.target.checked) {
                    verifyStartupSetup();
                  } else {
                    resetStartupVerification();
                  }
                }}
                className="rounded border-border text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                data-testid="verify-setup-checkbox"
              />
              <span>{t('browserIntegration.verifyCheckbox')}</span>
            </label>
          </div>

          {/* Transparency Disclaimer */}
          <p className="text-[10px] text-muted-foreground/70 italic leading-tight pt-1">
            {t('browserIntegration.disclaimer')}
          </p>
        </div>
      )}
    </div>
  );
};
