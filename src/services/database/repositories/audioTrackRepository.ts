import { db, NookSpaceDB } from '../db';
import { LocalAudioTrackEntity } from '../../../types/database';

export const MAX_AUDIO_FILE_SIZE_BYTES = 100 * 1024 * 1024; // 100MB per file

export const SUPPORTED_AUDIO_EXTENSIONS = [
  '.mp3',
  '.wav',
  '.ogg',
  '.oga',
  '.m4a',
  '.aac',
  '.flac',
  '.opus',
  '.webm',
];

export const SUPPORTED_AUDIO_MIME_TYPES = [
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/wave',
  'audio/x-wav',
  'audio/ogg',
  'audio/x-ogg',
  'audio/mp4',
  'audio/x-m4a',
  'audio/m4a',
  'audio/aac',
  'audio/x-aac',
  'audio/flac',
  'audio/x-flac',
  'audio/opus',
  'audio/webm',
];

export interface AudioValidationResult {
  valid: boolean;
  error?: string;
  duration?: number;
}

export interface AudioImportResult {
  success: boolean;
  imported: LocalAudioTrackEntity[];
  errors: string[];
}

/**
 * Checks if browser HTMLAudioElement claims it can play a given MIME type.
 */
export function canBrowserPlayMimeType(mimeType: string): boolean {
  if (typeof window === 'undefined' || typeof Audio === 'undefined') {
    return true; // Test or headless fallback
  }
  try {
    const audio = new Audio();
    if (typeof audio.canPlayType !== 'function') return true;
    const canPlay = audio.canPlayType(mimeType);

    // In JSDOM or synthetic test environments, canPlayType always returns empty string ("")
    if (canPlay === '') {
      if (typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent)) {
        return true;
      }
      return false;
    }
    return canPlay === 'probably' || canPlay === 'maybe';
  } catch {
    return true;
  }
}

/**
 * Estimates duration of an audio File by loading metadata in an off-screen HTMLAudioElement.
 */
export async function extractAudioDuration(file: File): Promise<number | undefined> {
  if (typeof window === 'undefined' || typeof Audio === 'undefined' || typeof URL === 'undefined') {
    return undefined;
  }

  // In JSDOM, media loading events do not fire
  if (typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent)) {
    return undefined;
  }

  let objectUrl: string | null = null;
  try {
    objectUrl = URL.createObjectURL(file);
    const audio = new Audio();
    audio.preload = 'metadata';

    const duration = await new Promise<number | undefined>((resolve) => {
      const timeoutId = setTimeout(() => {
        resolve(undefined);
      }, 3000);

      audio.onloadedmetadata = () => {
        clearTimeout(timeoutId);
        if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
          resolve(Math.round(audio.duration));
        } else {
          resolve(undefined);
        }
      };

      audio.onerror = () => {
        clearTimeout(timeoutId);
        resolve(undefined);
      };

      audio.src = objectUrl!;
    });

    return duration;
  } catch {
    return undefined;
  } finally {
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
    }
  }
}

export class AudioTrackRepository {
  constructor(private database: NookSpaceDB = db) {}

  /**
   * Validates file size, extension, MIME type, and basic browser playback capability.
   */
  async validateAudioFile(file: File): Promise<AudioValidationResult> {
    if (!file) {
      return { valid: false, error: 'No file provided.' };
    }

    if (file.size === 0) {
      return { valid: false, error: 'File is empty (0 bytes).' };
    }

    if (file.size > MAX_AUDIO_FILE_SIZE_BYTES) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      return {
        valid: false,
        error: `File size exceeds 100MB limit (${sizeMB}MB).`,
      };
    }

    const lowerName = file.name.toLowerCase();
    const hasSupportedExt = SUPPORTED_AUDIO_EXTENSIONS.some((ext) => lowerName.endsWith(ext));
    const effectiveMime = file.type.toLowerCase();

    // Reject pure video formats
    if (
      effectiveMime.startsWith('video/') &&
      effectiveMime !== 'video/webm' &&
      !lowerName.endsWith('.webm')
    ) {
      return {
        valid: false,
        error: 'Video files are not supported as music tracks.',
      };
    }

    const hasSupportedMime =
      SUPPORTED_AUDIO_MIME_TYPES.includes(effectiveMime) || effectiveMime.startsWith('audio/');

    if (!hasSupportedExt && !hasSupportedMime) {
      return {
        valid: false,
        error: 'Unsupported audio format. Supported: MP3, WAV, OGG, M4A, AAC, FLAC, OPUS.',
      };
    }

    // Check browser codec support if MIME type is known
    if (effectiveMime && !canBrowserPlayMimeType(effectiveMime)) {
      return {
        valid: false,
        error: `Your browser cannot play this codec (${effectiveMime}).`,
      };
    }

    const duration = await extractAudioDuration(file);

    return { valid: true, duration };
  }

  /**
   * Imports multiple local audio files into Dexie IndexedDB.
   */
  async importAudioFiles(files: FileList | File[]): Promise<AudioImportResult> {
    const fileList = Array.from(files);
    const imported: LocalAudioTrackEntity[] = [];
    const errors: string[] = [];

    if (fileList.length === 0) {
      return { success: false, imported: [], errors: ['No files selected.'] };
    }

    // Check available storage quota if API is supported
    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
      try {
        const estimate = await navigator.storage.estimate();
        const totalIncomingSize = fileList.reduce((acc, f) => acc + f.size, 0);
        if (
          estimate.quota !== undefined &&
          estimate.usage !== undefined &&
          estimate.quota - estimate.usage < totalIncomingSize
        ) {
          return {
            success: false,
            imported: [],
            errors: ['Insufficient browser storage quota to import selected files.'],
          };
        }
      } catch {
        // Non-blocking quota check failure
      }
    }

    // Get current track count to compute sequential order
    const currentCount = await this.database.audioTracks.count();
    let nextOrder = currentCount;

    for (const file of fileList) {
      const validation = await this.validateAudioFile(file);
      if (!validation.valid) {
        errors.push(`${file.name}: ${validation.error || 'Validation failed'}`);
        continue;
      }

      // Format fallback name from file name (strip extension)
      const cleanName = file.name.replace(/\.[^/.]+$/, '').trim() || file.name;

      // Generate UUID
      const trackId =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `track_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

      const newTrack: LocalAudioTrackEntity = {
        id: trackId,
        name: cleanName,
        artist: undefined,
        mimeType: file.type || 'audio/mpeg',
        fileSize: file.size,
        duration: validation.duration,
        blob: file, // Store Blob directly in Dexie
        createdAt: Date.now(),
        order: nextOrder++,
      };

      try {
        await this.database.audioTracks.add(newTrack);
        imported.push(newTrack);
      } catch (err: any) {
        errors.push(`${file.name}: ${err?.message || 'Failed to save to local database'}`);
      }
    }

    return {
      success: imported.length > 0,
      imported,
      errors,
    };
  }

  /**
   * Retrieves all imported audio tracks sorted by order.
   */
  async getAllTracks(): Promise<LocalAudioTrackEntity[]> {
    try {
      return await this.database.audioTracks.orderBy('order').toArray();
    } catch (err) {
      console.warn('[AudioTrackRepository] Failed to retrieve tracks:', err);
      return [];
    }
  }

  /**
   * Retrieves a single audio track by ID.
   */
  async getTrackById(id: string): Promise<LocalAudioTrackEntity | undefined> {
    try {
      return await this.database.audioTracks.get(id);
    } catch (err) {
      console.warn(`[AudioTrackRepository] Failed to get track ${id}:`, err);
      return undefined;
    }
  }

  /**
   * Deletes an audio track by ID from IndexedDB.
   */
  async deleteTrack(id: string): Promise<boolean> {
    try {
      await this.database.audioTracks.delete(id);
      return true;
    } catch (err) {
      console.warn(`[AudioTrackRepository] Failed to delete track ${id}:`, err);
      return false;
    }
  }

  /**
   * Updates track metadata such as name or artist.
   */
  async updateTrackMetadata(
    id: string,
    updates: Partial<Pick<LocalAudioTrackEntity, 'name' | 'artist' | 'lastPlayedAt'>>
  ): Promise<boolean> {
    try {
      await this.database.audioTracks.update(id, updates);
      return true;
    } catch (err) {
      console.warn(`[AudioTrackRepository] Failed to update track ${id}:`, err);
      return false;
    }
  }

  /**
   * Reorders tracks according to an array of track IDs.
   */
  async reorderTracks(orderedIds: string[]): Promise<boolean> {
    try {
      await this.database.transaction('rw', this.database.audioTracks, async () => {
        for (let i = 0; i < orderedIds.length; i++) {
          await this.database.audioTracks.update(orderedIds[i], { order: i });
        }
      });
      return true;
    } catch (err) {
      console.warn('[AudioTrackRepository] Failed to reorder tracks:', err);
      return false;
    }
  }
}

export const audioTrackRepository = new AudioTrackRepository();
