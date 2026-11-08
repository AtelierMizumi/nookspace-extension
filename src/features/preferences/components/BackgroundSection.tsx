import React, { useState, useRef, useEffect } from 'react';
import {
  Image as ImageIcon,
  Upload,
  Link as LinkIcon,
  RotateCcw,
  Check,
  AlertCircle,
  Eye,
  Loader2,
  Trash2,
} from 'lucide-react';
import { useSettingsStore } from '../../../stores/settingsStore';
import { BackgroundMode } from '../../../types/database';
import { Button, IconButton } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { useTranslation } from '../../../services/i18n';
import { backgroundRepository } from '../../../services/database/repositories/backgroundRepository';

export const BackgroundSection: React.FC = () => {
  const { t } = useTranslation();
  const {
    settings,
    customBackgroundUrl,
    setCustomBackgroundUpload,
    setCustomBackgroundUrl,
    setBackgroundMode,
    setBackgroundOverlay,
    clearBackground,
  } = useSettingsStore();

  const [activeTab, setActiveTab] = useState<'upload' | 'url'>('upload');
  const [urlInput, setUrlInput] = useState('');
  const [urlPreview, setUrlPreview] = useState<string | null>(null);
  const [isTestingUrl, setIsTestingUrl] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);

  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedPreview, setUploadedPreview] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const isCustomBgActive = settings?.backgroundType === 'image';
  const currentMode: BackgroundMode = settings?.backgroundMode || 'cover';
  const currentOverlay: number = settings?.backgroundOverlay !== undefined ? settings.backgroundOverlay : 50;

  // Sync initial URL if already set as remote URL
  useEffect(() => {
    if (settings?.backgroundType === 'image' && settings.backgroundValue !== 'local_upload') {
      setUrlInput(settings.backgroundValue);
      setUrlPreview(settings.backgroundValue);
    }
  }, [settings?.backgroundType, settings?.backgroundValue]);

  // Handle local file selection and validation
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    setIsUploading(true);

    try {
      const validation = await backgroundRepository.validateImageFile(file);
      if (!validation.valid) {
        setUploadError(validation.error || t('preferences.background.invalidImage'));
        setIsUploading(false);
        return;
      }

      setSelectedFileName(file.name);

      // Create temporary preview for instant feedback
      const previewUrl = URL.createObjectURL(file);
      setUploadedPreview(previewUrl);

      // Persist to IndexedDB
      const result = await setCustomBackgroundUpload(file);
      if (!result.success) {
        setUploadError(result.error || t('preferences.background.saveFailed'));
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Handle URL verification & preview
  const handleTestUrl = async () => {
    if (!urlInput.trim()) return;

    setUrlError(null);
    setIsTestingUrl(true);

    const validation = backgroundRepository.validateImageUrl(urlInput);
    if (!validation.valid) {
      setUrlError(validation.error || t('preferences.background.invalidUrl'));
      setIsTestingUrl(false);
      return;
    }

    const loadsSuccessfully = await backgroundRepository.testImageUrlLoad(urlInput.trim());
    setIsTestingUrl(false);

    if (loadsSuccessfully) {
      setUrlPreview(urlInput.trim());
    } else {
      setUrlError(t('preferences.background.urlLoadError'));
    }
  };

  // Apply tested URL as background
  const handleApplyUrl = async () => {
    if (!urlPreview) {
      await handleTestUrl();
    }
    if (urlInput.trim()) {
      const result = await setCustomBackgroundUrl(urlInput.trim());
      if (!result.success) {
        setUrlError(result.error || t('preferences.background.saveFailed'));
      }
    }
  };

  // Reset to default theme background
  const handleResetDefault = async () => {
    await clearBackground();
    setUrlPreview(null);
    setUrlInput('');
    setUploadedPreview(null);
    setSelectedFileName(null);
    setUploadError(null);
    setUrlError(null);
  };

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div>
        <span className="font-semibold text-foreground block text-xs">
          {t('preferences.background.title')}
        </span>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          {t('preferences.background.description')}
        </p>
      </div>

      {/* Tabs: Local Upload vs Image URL */}
      <div className="flex items-center gap-1.5 p-1 rounded-lg bg-secondary/50 border border-border/50">
        <button
          type="button"
          onClick={() => setActiveTab('upload')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md text-xs font-medium transition-all ${
            activeTab === 'upload'
              ? 'bg-card text-foreground shadow-xs font-semibold'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Upload className="h-3.5 w-3.5" />
          <span>{t('preferences.background.tabUpload')}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('url')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md text-xs font-medium transition-all ${
            activeTab === 'url'
              ? 'bg-card text-foreground shadow-xs font-semibold'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <LinkIcon className="h-3.5 w-3.5" />
          <span>{t('preferences.background.tabUrl')}</span>
        </button>
      </div>

      {/* Tab 1: Local File Upload */}
      {activeTab === 'upload' && (
        <div className="space-y-2.5 p-3 rounded-xl border border-border/50 bg-card/60">
          <input
            ref={fileInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            className="hidden"
            id="nookspace-bg-file-input"
          />

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="space-y-1 text-left w-full sm:w-auto">
              <span className="text-xs font-medium text-foreground block">
                {t('preferences.background.uploadPrompt')}
              </span>
              <p className="text-[10px] text-muted-foreground">
                {t('preferences.background.uploadSpecs')}
              </p>
            </div>

            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
              className="w-full sm:w-auto shrink-0"
              leftIcon={
                isUploading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Upload className="h-3.5 w-3.5" />
                )
              }
            >
              {isUploading
                ? t('common.loading')
                : t('preferences.background.chooseFileBtn')}
            </Button>
          </div>

          {selectedFileName && (
            <div className="flex items-center gap-1.5 text-[11px] text-primary bg-primary/10 px-2 py-1 rounded">
              <Check className="h-3 w-3" />
              <span className="truncate">{selectedFileName}</span>
            </div>
          )}

          {uploadError && (
            <div className="flex items-center gap-1.5 text-[11px] text-destructive bg-destructive/10 p-2 rounded">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              <span>{uploadError}</span>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Remote HTTPS URL */}
      {activeTab === 'url' && (
        <div className="space-y-2.5 p-3 rounded-xl border border-border/50 bg-card/60">
          <span className="text-xs font-medium text-foreground block">
            {t('preferences.background.urlPrompt')}
          </span>

          <div className="flex items-center gap-2">
            <Input
              type="url"
              placeholder="https://images.unsplash.com/photo-..."
              value={urlInput}
              onChange={(e) => {
                setUrlInput(e.target.value);
                setUrlError(null);
              }}
              className="text-xs h-8 flex-1"
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleTestUrl}
              disabled={isTestingUrl || !urlInput.trim()}
              className="h-8 shrink-0 text-xs"
              leftIcon={
                isTestingUrl ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Eye className="h-3 w-3" />
                )
              }
            >
              {t('preferences.background.previewBtn')}
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleApplyUrl}
              disabled={!urlInput.trim()}
              className="h-8 shrink-0 text-xs"
            >
              {t('common.save')}
            </Button>
          </div>

          {urlError && (
            <div className="flex items-center gap-1.5 text-[11px] text-destructive bg-destructive/10 p-2 rounded">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              <span>{urlError}</span>
            </div>
          )}
        </div>
      )}

      {/* Display Controls (Mode & Overlay Intensity) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        {/* Display Mode */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-foreground block">
            {t('preferences.background.displayMode')}
          </label>
          <div className="grid grid-cols-2 gap-1">
            {(['cover', 'contain', 'stretch', 'center'] as BackgroundMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setBackgroundMode(mode)}
                className={`py-1.5 px-2 rounded-md text-[11px] font-medium capitalize border transition-all text-center ${
                  currentMode === mode
                    ? 'border-primary bg-primary/10 text-primary font-semibold'
                    : 'border-border/60 hover:bg-secondary/60 text-muted-foreground hover:text-foreground'
                }`}
              >
                {t(`preferences.background.modes.${mode}`)}
              </button>
            ))}
          </div>
        </div>

        {/* Dark Overlay Intensity */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-foreground block">
            {t('preferences.background.overlayIntensity')}
          </label>
          <div className="grid grid-cols-4 gap-1">
            {([0, 25, 50, 75] as const).map((intensity) => (
              <button
                key={intensity}
                type="button"
                onClick={() => setBackgroundOverlay(intensity)}
                className={`py-1.5 px-1 rounded-md text-[11px] font-medium border transition-all text-center ${
                  currentOverlay === intensity
                    ? 'border-primary bg-primary/10 text-primary font-semibold'
                    : 'border-border/60 hover:bg-secondary/60 text-muted-foreground hover:text-foreground'
                }`}
              >
                {intensity}%
              </button>
            ))}
          </div>
          <span className="text-[10px] text-muted-foreground/80 block">
            {t('preferences.background.overlayHint')}
          </span>
        </div>
      </div>

      {/* Reset Default Background */}
      {isCustomBgActive && (
        <div className="pt-2 flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground">
            {t('preferences.background.activeStatus')}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleResetDefault}
            className="text-xs h-7 text-muted-foreground hover:text-destructive"
            leftIcon={<RotateCcw className="h-3 w-3" />}
          >
            {t('preferences.background.restoreDefault')}
          </Button>
        </div>
      )}
    </div>
  );
};
