import {
  PomodoroStorageEnvelope,
  PomodoroStorageEnvelopeSchema,
  PomodoroRecoveryMarker,
  PomodoroRecoveryMarkerSchema,
  ActiveTimerState,
  DEFAULT_POMODORO_CONFIG,
  OutboxSessionEntry,
  OutboxSessionEntrySchema,
  DeadLetterSessionEntry,
  DeadLetterSessionEntrySchema,
} from '../../types/pomodoro';
import { browserApi } from '../../services/browser';

export const STORAGE_KEY_ENVELOPE = 'nookspace_pomodoro_envelope';
export const STORAGE_KEY_RECOVERY_MARKER = 'nookspace_pomodoro_recovery_marker';
export const STORAGE_KEY_DEAD_LETTER = 'nookspace_pomodoro_dead_letter';
export const STORAGE_KEY_LAST_DRAINED_AT = 'nookspace_pomodoro_last_drained_at';

export const DEFAULT_ENVELOPE: PomodoroStorageEnvelope = {
  schemaVersion: 1,
  activeTimerState: {
    state: 'idle',
    revision: 1,
    mode: 'focus',
    currentCycleCount: 1,
    nextSuggestedMode: 'focus',
    persistenceHealth: 'healthy',
  },
  pendingOutbox: [],
  recentCommands: [],
  config: DEFAULT_POMODORO_CONFIG,
  lastSavedAt: Date.now(),
};

export class StorageService {
  /**
   * Loads the current Recovery Marker if one exists.
   */
  async loadRecoveryMarker(): Promise<PomodoroRecoveryMarker | null> {
    try {
      const res = await browserApi.storage.local.get<{ [STORAGE_KEY_RECOVERY_MARKER]?: unknown }>(
        STORAGE_KEY_RECOVERY_MARKER
      );
      const val = res[STORAGE_KEY_RECOVERY_MARKER];
      if (!val) return null;
      const parseRes = PomodoroRecoveryMarkerSchema.safeParse(val);
      return parseRes.success ? parseRes.data : null;
    } catch {
      return null;
    }
  }

  /**
   * Sets the Recovery Marker to lock operations and activate Safe Mode.
   */
  async setRecoveryMarker(marker: PomodoroRecoveryMarker): Promise<void> {
    await browserApi.storage.local.set({
      [STORAGE_KEY_RECOVERY_MARKER]: marker,
    });
  }

  /**
   * Removes the Recovery Marker.
   */
  async clearRecoveryMarker(): Promise<void> {
    await browserApi.storage.local.remove(STORAGE_KEY_RECOVERY_MARKER);
  }

  /**
   * Safely loads the storage envelope.
   * If a Recovery Marker exists, forces state: 'recovery_required'.
   * If corruption is detected, saves to quarantine and returns a recovery_required state.
   */
  async loadEnvelope(): Promise<PomodoroStorageEnvelope> {
    const marker = await this.loadRecoveryMarker();
    if (marker) {
      return {
        ...DEFAULT_ENVELOPE,
        activeTimerState: {
          state: 'recovery_required',
          revision: 1,
          mode: 'focus',
          currentCycleCount: 1,
          nextSuggestedMode: 'focus',
          persistenceHealth: 'degraded',
          quarantineKey: marker.quarantineKey,
          failureReason: marker.failureReason,
          detectedAt: marker.detectedAt,
        },
      };
    }

    let rawData: unknown = null;
    try {
      const res = await browserApi.storage.local.get<{ [STORAGE_KEY_ENVELOPE]?: unknown }>(
        STORAGE_KEY_ENVELOPE
      );
      rawData = res[STORAGE_KEY_ENVELOPE];
    } catch (readErr: any) {
      // Storage API Exception
      const failureReason = `STORAGE_READ_EXCEPTION: ${readErr?.message || String(readErr)}`;
      await this.setRecoveryMarker({
        schemaVersion: 1,
        isRecoveryRequired: true,
        failureReason,
        detectedAt: Date.now(),
      });
      return {
        ...DEFAULT_ENVELOPE,
        activeTimerState: {
          state: 'recovery_required',
          revision: 1,
          mode: 'focus',
          currentCycleCount: 1,
          nextSuggestedMode: 'focus',
          persistenceHealth: 'unavailable',
          failureReason,
          detectedAt: Date.now(),
        },
      };
    }

    if (!rawData) {
      return { ...DEFAULT_ENVELOPE, lastSavedAt: Date.now() };
    }

    // Validate using Zod schema
    const parseResult = PomodoroStorageEnvelopeSchema.safeParse(rawData);
    if (parseResult.success) {
      return parseResult.data;
    }

    // Corruption detected!
    const timestamp = Date.now();
    const quarantineKey = `nookspace_quarantine_envelope_${timestamp}`;
    const failureReason = `SCHEMA_MISMATCH: ${parseResult.error.message.slice(0, 200)}`;

    // Quarantine raw data
    try {
      await browserApi.storage.local.set({ [quarantineKey]: rawData });
    } catch {
      // Best-effort quarantine
    }

    // Attempt to salvage any valid pendingOutbox items from rawData if it was an object
    const salvagedOutbox: OutboxSessionEntry[] = [];
    if (typeof rawData === 'object' && rawData !== null && 'pendingOutbox' in rawData) {
      const rawOutbox = (rawData as any).pendingOutbox;
      if (Array.isArray(rawOutbox)) {
        for (const item of rawOutbox) {
          const itemParse = OutboxSessionEntrySchema.safeParse(item);
          if (itemParse.success) {
            salvagedOutbox.push(itemParse.data);
          }
        }
      }
    }

    if (salvagedOutbox.length > 0) {
      await this.appendDeadLetter(
        salvagedOutbox.map((entry) => ({
          ...entry,
          transferredAt: timestamp,
          originalFailureReason: 'SALVAGED_FROM_CORRUPTED_ENVELOPE',
          status: 'pending',
        }))
      );
    }

    await this.setRecoveryMarker({
      schemaVersion: 1,
      isRecoveryRequired: true,
      quarantineKey,
      failureReason,
      detectedAt: timestamp,
    });

    return {
      ...DEFAULT_ENVELOPE,
      activeTimerState: {
        state: 'recovery_required',
        revision: 1,
        mode: 'focus',
        currentCycleCount: 1,
        nextSuggestedMode: 'focus',
        persistenceHealth: 'degraded',
        quarantineKey,
        failureReason,
        detectedAt: timestamp,
      },
    };
  }

  /**
   * Persists the storage envelope atomically.
   */
  async saveEnvelope(envelope: PomodoroStorageEnvelope): Promise<void> {
    const payload = {
      ...envelope,
      lastSavedAt: Date.now(),
    };
    await browserApi.storage.local.set({
      [STORAGE_KEY_ENVELOPE]: payload,
    });
  }

  /**
   * Dead-Letter management
   */
  async loadDeadLetter(): Promise<DeadLetterSessionEntry[]> {
    try {
      const res = await browserApi.storage.local.get<{ [STORAGE_KEY_DEAD_LETTER]?: unknown }>(
        STORAGE_KEY_DEAD_LETTER
      );
      const val = res[STORAGE_KEY_DEAD_LETTER];
      if (!Array.isArray(val)) return [];
      const entries: DeadLetterSessionEntry[] = [];
      for (const item of val) {
        const parsed = DeadLetterSessionEntrySchema.safeParse(item);
        if (parsed.success) entries.push(parsed.data);
      }
      return entries;
    } catch {
      return [];
    }
  }

  async saveDeadLetter(entries: DeadLetterSessionEntry[]): Promise<void> {
    await browserApi.storage.local.set({
      [STORAGE_KEY_DEAD_LETTER]: entries,
    });
  }

  async appendDeadLetter(entries: DeadLetterSessionEntry[]): Promise<void> {
    const existing = await this.loadDeadLetter();
    const existingIds = new Set(existing.map((e) => e.sessionId));
    const newItems = entries.filter((e) => !existingIds.has(e.sessionId));
    // Enforce max 200 dead letter entries
    const combined = [...existing, ...newItems].slice(0, 200);
    await this.saveDeadLetter(combined);
  }
}

export const storageService = new StorageService();
