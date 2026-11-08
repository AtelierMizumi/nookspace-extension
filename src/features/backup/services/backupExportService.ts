import { db, NookSpaceDB } from '../../../services/database/db';
import {
  NookSpaceUniversalBackupV1,
  BackupExportResult,
  BackupExportOptions,
  BackupExportWarning,
  BACKUP_FORMAT_IDENTIFIER,
  BACKUP_FORMAT_VERSION,
  BACKUP_LARGE_SIZE_WARNING_BYTES,
  BackupExportError,
} from '../types/backupTypes';
import { NookSpaceUniversalBackupV1Schema } from '../schemas/backupV1Schema';
import { calculateBackupChecksum } from './backupIntegrityService';
import { serializeBackupToJson } from './backupSerializationService';
import { isSafeBookmarkUrl } from '../../bookmarks/utils/bookmarkSecurity';

export const DEFAULT_APP_VERSION = '0.1.0-alpha.41';

/**
 * Resolves application release version from extension manifest if available,
 * otherwise falls back to project default version constant.
 */
export function getAppVersion(): string {
  try {
    if (typeof globalThis !== 'undefined') {
      const ext = (globalThis as any).browser || (globalThis as any).chrome;
      const manifestVersion = ext?.runtime?.getManifest?.()?.version;
      if (manifestVersion && typeof manifestVersion === 'string') {
        return manifestVersion;
      }
    }
  } catch {
    // Non-blocking in headless/test environments
  }
  return DEFAULT_APP_VERSION;
}

/**
 * Generates a standard formatted backup filename:
 * nookspace-backup-YYYY-MM-DD-HHMMSS.json
 */
export function formatBackupFilename(date: Date = new Date()): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const hh = pad(date.getHours());
  const mm = pad(date.getMinutes());
  const ss = pad(date.getSeconds());
  return `nookspace-backup-${y}-${m}-${d}-${hh}${mm}${ss}.json`;
}

export class BackupExportService {
  constructor(private database: NookSpaceDB = db) {}

  /**
   * Captures a consistent read-only snapshot across all 17 active database tables,
   * sorts entities deterministically, validates the V1 envelope, generates SHA-256 integrity,
   * and produces a downloadable JSON Blob.
   *
   * GUARANTEE: Never performs any write, delete, update, or migration operation on user data.
   */
  async createFullBackup(options: BackupExportOptions = {}): Promise<BackupExportResult> {
    const warnings: BackupExportWarning[] = [];
    const now = Date.now();
    const appVersion = options.appVersionOverride || getAppVersion();
    const schemaVersion = this.database.verno || 4;

    // Define all 17 user-data tables for the readonly transaction
    const tables = [
      this.database.workspaces,
      this.database.settings,
      this.database.widgetInstances,
      this.database.widgetLayouts,
      this.database.todos,
      this.database.notes,
      this.database.noteCollections,
      this.database.noteTags,
      this.database.noteBookmarkLinks,
      this.database.bookmarks,
      this.database.bookmarkGroups,
      this.database.focusSessions,
      this.database.dailyGoals,
      this.database.stickyNotes,
      this.database.vocabulary,
      this.database.resources,
      this.database.calendarEvents,
    ];

    let rawWorkspaces: any[] = [];
    let rawSettings: any = null;
    let rawWidgetInstances: any[] = [];
    let rawWidgetLayouts: any[] = [];
    let rawTodos: any[] = [];
    let rawNotes: any[] = [];
    let rawCollections: any[] = [];
    let rawTags: any[] = [];
    let rawBookmarkLinks: any[] = [];
    let rawBookmarks: any[] = [];
    let rawBookmarkGroups: any[] = [];
    let rawFocusSessions: any[] = [];
    let rawDailyGoals: any[] = [];
    let rawStickyNotes: any[] = [];
    let rawVocabulary: any[] = [];
    let rawResources: any[] = [];
    let rawCalendarEvents: any[] = [];

    // 1. Read all tables inside a single Dexie readonly transaction
    try {
      await this.database.transaction('r', tables, async () => {
        rawWorkspaces = await this.database.workspaces.toArray();
        rawSettings = options.includeSettings !== false ? (await this.database.settings.get('current_settings')) || null : null;
        rawWidgetInstances = await this.database.widgetInstances.toArray();
        rawWidgetLayouts = await this.database.widgetLayouts.toArray();
        rawTodos = await this.database.todos.toArray();
        rawNotes = await this.database.notes.toArray();
        rawCollections = await this.database.noteCollections.toArray();
        rawTags = await this.database.noteTags.toArray();
        rawBookmarkLinks = await this.database.noteBookmarkLinks.toArray();
        rawBookmarks = await this.database.bookmarks.toArray();
        rawBookmarkGroups = await this.database.bookmarkGroups.toArray();
        rawFocusSessions = await this.database.focusSessions.toArray();
        rawDailyGoals = await this.database.dailyGoals.toArray();
        rawStickyNotes = await this.database.stickyNotes.toArray();
        rawVocabulary = await this.database.vocabulary.toArray();
        rawResources = await this.database.resources.toArray();
        rawCalendarEvents = await this.database.calendarEvents.toArray();
      });
    } catch (err) {
      throw new BackupExportError(`Failed to read database records in readonly transaction: ${err instanceof Error ? err.message : String(err)}`, err);
    }

    // 2. Check for legacy layouts table in separate readonly read if present
    try {
      const legacyLayoutsCount = await this.database.layouts.count();
      if (legacyLayoutsCount > 0) {
        warnings.push({
          code: 'LEGACY_LAYOUTS_DETECTED',
          message: `Detected ${legacyLayoutsCount} legacy layouts in deprecated v1 table; responsive widgetLayouts were exported instead.`,
          details: { legacyLayoutsCount },
        });
      }
    } catch {
      // Non-blocking if table is unavailable
    }

    // 3. Inspect bookmark URLs for security warnings (without mutating records)
    for (const bm of rawBookmarks) {
      if (bm.url && !isSafeBookmarkUrl(bm.url)) {
        warnings.push({
          code: 'UNSAFE_BOOKMARK_URL_DETECTED',
          message: `Bookmark "${bm.title}" (${bm.id}) has a suspicious or unsafe URL scheme: ${bm.url}`,
          details: { id: bm.id, url: bm.url },
        });
      }
    }

    // 4. Deterministically sort exported copies
    const sortedWorkspaces = [...rawWorkspaces].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
    const sortedWidgetInstances = [...rawWidgetInstances].sort(
      (a, b) => (a.workspaceId || '').localeCompare(b.workspaceId || '') || a.order - b.order || a.id.localeCompare(b.id)
    );
    const sortedWidgetLayouts = [...rawWidgetLayouts].sort(
      (a, b) =>
        (a.workspaceId || '').localeCompare(b.workspaceId || '') ||
        (a.widgetInstanceId || '').localeCompare(b.widgetInstanceId || '') ||
        (a.breakpoint || '').localeCompare(b.breakpoint || '')
    );
    const sortedTodos = [...rawTodos].sort(
      (a, b) => (a.workspaceId || '').localeCompare(b.workspaceId || '') || a.order - b.order || a.id.localeCompare(b.id)
    );
    const sortedNotes = [...rawNotes].sort(
      (a, b) => (a.workspaceId || '').localeCompare(b.workspaceId || '') || a.order - b.order || a.id.localeCompare(b.id)
    );
    const sortedCollections = [...rawCollections].sort(
      (a, b) => (a.workspaceId || '').localeCompare(b.workspaceId || '') || a.order - b.order || a.id.localeCompare(b.id)
    );
    const sortedTags = [...rawTags].sort(
      (a, b) => (a.workspaceId || '').localeCompare(b.workspaceId || '') || a.name.localeCompare(b.name)
    );
    const sortedBookmarkLinks = [...rawBookmarkLinks].sort(
      (a, b) =>
        (a.workspaceId || '').localeCompare(b.workspaceId || '') ||
        a.noteId.localeCompare(b.noteId) ||
        a.bookmarkId.localeCompare(b.bookmarkId)
    );
    const sortedBookmarks = [...rawBookmarks].sort(
      (a, b) => (a.workspaceId || '').localeCompare(b.workspaceId || '') || a.order - b.order || a.id.localeCompare(b.id)
    );
    const sortedBookmarkGroups = [...rawBookmarkGroups].sort(
      (a, b) => (a.workspaceId || '').localeCompare(b.workspaceId || '') || a.order - b.order || a.id.localeCompare(b.id)
    );
    const sortedFocusSessions = [...rawFocusSessions].sort(
      (a, b) => (a.workspaceId || '').localeCompare(b.workspaceId || '') || a.startedAt - b.startedAt || a.id.localeCompare(b.id)
    );
    const sortedDailyGoals = [...rawDailyGoals].sort(
      (a, b) => (a.workspaceId || '').localeCompare(b.workspaceId || '') || a.dateString.localeCompare(b.dateString) || a.id.localeCompare(b.id)
    );
    const sortedStickyNotes = [...rawStickyNotes].sort(
      (a, b) => (a.workspaceId || '').localeCompare(b.workspaceId || '') || a.id.localeCompare(b.id)
    );
    const sortedVocabulary = [...rawVocabulary].sort(
      (a, b) => (a.workspaceId || '').localeCompare(b.workspaceId || '') || a.word.localeCompare(b.word) || a.id.localeCompare(b.id)
    );
    const sortedResources = [...rawResources].sort(
      (a, b) => (a.workspaceId || '').localeCompare(b.workspaceId || '') || a.title.localeCompare(b.title) || a.id.localeCompare(b.id)
    );
    const sortedCalendarEvents = [...rawCalendarEvents].sort(
      (a, b) => (a.workspaceId || '').localeCompare(b.workspaceId || '') || a.startDate - b.startDate || a.id.localeCompare(b.id)
    );

    const itemCounts: Record<string, number> = {
      workspaces: sortedWorkspaces.length,
      settings: rawSettings ? 1 : 0,
      widgetInstances: sortedWidgetInstances.length,
      widgetLayouts: sortedWidgetLayouts.length,
      todos: sortedTodos.length,
      notes: sortedNotes.length,
      noteCollections: sortedCollections.length,
      noteTags: sortedTags.length,
      noteBookmarkLinks: sortedBookmarkLinks.length,
      bookmarks: sortedBookmarks.length,
      bookmarkGroups: sortedBookmarkGroups.length,
      focusSessions: sortedFocusSessions.length,
      dailyGoals: sortedDailyGoals.length,
      stickyNotes: sortedStickyNotes.length,
      vocabulary: sortedVocabulary.length,
      resources: sortedResources.length,
      calendarEvents: sortedCalendarEvents.length,
    };

    // 5. Build draft envelope with placeholder checksum
    const draftBackup: NookSpaceUniversalBackupV1 = {
      format: BACKUP_FORMAT_IDENTIFIER,
      formatVersion: BACKUP_FORMAT_VERSION,
      metadata: {
        exportedAt: now,
        appVersion,
        databaseSchemaVersion: schemaVersion,
        exportType: 'full',
        itemCounts,
        integrity: {
          algorithm: 'SHA-256',
          checksum: '0000000000000000000000000000000000000000000000000000000000000000',
        },
      },
      data: {
        workspaces: sortedWorkspaces,
        settings: rawSettings,
        widgetInstances: sortedWidgetInstances,
        widgetLayouts: sortedWidgetLayouts,
        todos: sortedTodos,
        notes: sortedNotes,
        noteCollections: sortedCollections,
        noteTags: sortedTags,
        noteBookmarkLinks: sortedBookmarkLinks,
        bookmarks: sortedBookmarks,
        bookmarkGroups: sortedBookmarkGroups,
        focusSessions: sortedFocusSessions,
        dailyGoals: sortedDailyGoals,
        stickyNotes: sortedStickyNotes,
        vocabulary: sortedVocabulary,
        resources: sortedResources,
        calendarEvents: sortedCalendarEvents,
      },
    };

    // 6. Compute canonical SHA-256 integrity hash
    let checksum: string;
    try {
      checksum = await calculateBackupChecksum(draftBackup);
    } catch (err) {
      throw new BackupExportError(`Failed to compute backup integrity checksum: ${err instanceof Error ? err.message : String(err)}`, err);
    }

    // 7. Inject verified checksum into final envelope
    const finalBackup: NookSpaceUniversalBackupV1 = {
      ...draftBackup,
      metadata: {
        ...draftBackup.metadata,
        integrity: {
          algorithm: 'SHA-256',
          checksum,
        },
      },
    };

    // 8. Validate envelope structure with Zod schema
    const parseResult = NookSpaceUniversalBackupV1Schema.safeParse(finalBackup);
    if (!parseResult.success) {
      throw new BackupExportError(
        `Exported backup failed structural Zod validation: ${parseResult.error.message}`,
        parseResult.error
      );
    }

    // 9. Serialize safely to JSON
    const jsonString = serializeBackupToJson(finalBackup);
    const sizeBytes = new TextEncoder().encode(jsonString).length;

    if (sizeBytes > BACKUP_LARGE_SIZE_WARNING_BYTES) {
      warnings.push({
        code: 'LARGE_BACKUP_SIZE',
        message: `Backup size (${(sizeBytes / (1024 * 1024)).toFixed(2)} MB) exceeds standard threshold of 25 MB.`,
        details: { sizeBytes, thresholdBytes: BACKUP_LARGE_SIZE_WARNING_BYTES },
      });
    }

    // 10. Construct downloadable Blob
    const blob = new Blob([jsonString], { type: 'application/json' });
    const filename = formatBackupFilename(new Date(now));

    return {
      backup: finalBackup,
      filename,
      jsonString,
      blob,
      sizeBytes,
      itemCounts,
      checksum,
      warnings,
    };
  }
}

export const backupExportService = new BackupExportService();
