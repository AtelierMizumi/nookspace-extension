import { db, NookSpaceDB } from '../db';
import {
  AppSettingsEntity,
  BackgroundMode,
  CustomBackgroundImageEntity,
} from '../../../types/database';
import {
  BackgroundModeSchema,
  BackgroundOverlaySchema,
} from '../../../features/backup/schemas/entitySchemas';

export const MAX_BACKGROUND_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
export const ALLOWED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const ALLOWED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

export interface BackgroundValidationResult {
  valid: boolean;
  error?: string;
  width?: number;
  height?: number;
}

export class BackgroundRepository {
  constructor(private database: NookSpaceDB = db) {}

  /**
   * Validates local file format, size, and decodes image bytes to ensure validity.
   */
  async validateImageFile(file: File): Promise<BackgroundValidationResult> {
    if (!file) {
      return { valid: false, error: 'No file provided' };
    }

    if (file.size > MAX_BACKGROUND_FILE_SIZE_BYTES) {
      return {
        valid: false,
        error: `File size exceeds the 10MB limit (${(file.size / (1024 * 1024)).toFixed(1)}MB).`,
      };
    }

    const lowerName = file.name.toLowerCase();
    const hasValidExtension = ALLOWED_IMAGE_EXTENSIONS.some((ext) => lowerName.endsWith(ext));
    const hasValidMime = ALLOWED_IMAGE_MIME_TYPES.includes(file.type);

    if (!hasValidExtension && !hasValidMime) {
      return {
        valid: false,
        error: 'Unsupported image format. Please upload JPEG, PNG, or WebP.',
      };
    }

    // Decode image in memory to ensure not corrupt
    return new Promise((resolve) => {
      if (typeof window === 'undefined') {
        resolve({ valid: true });
        return;
      }

      const reader = new FileReader();
      reader.onerror = () => {
        resolve({ valid: false, error: 'Failed to read file from disk.' });
      };
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => {
          resolve({ valid: false, error: 'Invalid or corrupted image data.' });
        };
        img.onload = () => {
          if (img.naturalWidth === 0 || img.naturalHeight === 0) {
            resolve({ valid: false, error: 'Image has zero dimensions.' });
          } else {
            resolve({ valid: true, width: img.naturalWidth, height: img.naturalHeight });
          }
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    });
  }

  /**
   * Reads a file, validates it, and saves it into local IndexedDB storage.
   */
  async saveLocalBackgroundImage(
    file: File
  ): Promise<{ success: boolean; dataUrl?: string; error?: string }> {
    const validation = await this.validateImageFile(file);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('FileReader error'));
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });

    const record: CustomBackgroundImageEntity = {
      id: 'custom_background_image',
      dataUrl,
      mimeType: file.type || 'image/jpeg',
      fileName: file.name,
      size: file.size,
      updatedAt: Date.now(),
    };

    // Store in settings table without bloating universal backup
    await (this.database.settings as any).put(record);

    // Update current settings to point to local upload
    const currentSettings = await this.database.settings.get('current_settings');
    if (currentSettings) {
      await this.database.settings.put({
        ...currentSettings,
        backgroundType: 'image',
        backgroundValue: 'local_upload',
        updatedAt: Date.now(),
      });
    }

    return { success: true, dataUrl };
  }

  /**
   * Retrieves the stored local background image Data URL from IndexedDB.
   */
  async getLocalBackgroundImage(): Promise<string | null> {
    try {
      const record = (await (this.database.settings as any).get(
        'custom_background_image'
      )) as CustomBackgroundImageEntity | undefined;
      return record?.dataUrl || null;
    } catch (err) {
      console.warn('[BackgroundRepository] Failed to read local background:', err);
      return null;
    }
  }

  /**
   * Deletes custom background image from IndexedDB and reverts settings.
   */
  async clearLocalBackgroundImage(): Promise<void> {
    await (this.database.settings as any).delete('custom_background_image');

    const currentSettings = await this.database.settings.get('current_settings');
    if (currentSettings) {
      await this.database.settings.put({
        ...currentSettings,
        backgroundType: 'color',
        backgroundValue: '#09090b',
        updatedAt: Date.now(),
      });
    }
  }

  /**
   * Validates syntax and protocol for remote background image URL.
   */
  validateImageUrl(url: string): { valid: boolean; error?: string } {
    if (!url || typeof url !== 'string' || !url.trim()) {
      return { valid: false, error: 'URL cannot be empty.' };
    }

    const trimmed = url.trim();

    // Prevent unsafe protocol schemes
    const lower = trimmed.toLowerCase();
    if (
      lower.startsWith('javascript:') ||
      lower.startsWith('data:') ||
      lower.startsWith('file:') ||
      lower.startsWith('blob:')
    ) {
      return {
        valid: false,
        error: 'Only standard HTTPS/HTTP web image addresses are permitted.',
      };
    }

    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
        return {
          valid: false,
          error: 'URL must use HTTPS protocol.',
        };
      }
      return { valid: true };
    } catch {
      return { valid: false, error: 'Invalid URL format.' };
    }
  }

  /**
   * Tests whether an image URL can be fetched/rendered in the browser.
   */
  async testImageUrlLoad(url: string): Promise<boolean> {
    if (typeof window === 'undefined') return true;

    return new Promise((resolve) => {
      const img = new Image();
      const timer = setTimeout(() => {
        img.src = '';
        resolve(false);
      }, 7000);

      img.onload = () => {
        clearTimeout(timer);
        resolve(img.naturalWidth > 0);
      };
      img.onerror = () => {
        clearTimeout(timer);
        resolve(false);
      };
      img.src = url;
    });
  }

  /**
   * Updates background display properties (mode, overlay, type, value).
   */
  async updateBackgroundSettings(options: {
    type?: 'color' | 'gradient' | 'image';
    value?: string;
    mode?: BackgroundMode;
    overlay?: number;
  }): Promise<AppSettingsEntity> {
    const current = (await this.database.settings.get('current_settings')) || {
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
      updatedAt: Date.now(),
    };

    const updated: AppSettingsEntity = {
      ...current,
      backgroundType: options.type !== undefined ? options.type : current.backgroundType,
      backgroundValue: options.value !== undefined ? options.value : current.backgroundValue,
      backgroundMode:
        options.mode !== undefined
          ? BackgroundModeSchema.parse(options.mode)
          : current.backgroundMode || 'cover',
      backgroundOverlay:
        options.overlay !== undefined
          ? BackgroundOverlaySchema.parse(options.overlay)
          : current.backgroundOverlay !== undefined
          ? current.backgroundOverlay
          : 50,
      updatedAt: Date.now(),
    };

    await this.database.settings.put(updated);
    return updated;
  }
}

export const backgroundRepository = new BackgroundRepository();
