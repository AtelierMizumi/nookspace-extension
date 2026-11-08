import { NookSpaceDB, db as defaultDb } from '../../../services/database/db';
import { validateBackup } from './backupValidationService';
import {
  RestorePreflightResult,
  RestorePreflightOptions,
  CurrentDatabaseStats,
} from '../types/restoreTypes';
import { NookSpaceRecoveryDB, recoveryDb as defaultRecoveryDb } from '../recovery/recoveryDatabase';

export class RestorePreflightService {
  constructor(
    private database: NookSpaceDB = defaultDb,
    private recoveryStore: NookSpaceRecoveryDB = defaultRecoveryDb
  ) {}

  /**
   * Performs comprehensive pre-flight verification on the untrusted backup input
   * and inspects the current database state before any snapshot or restore begins.
   */
  async prepareRestore(
    backupInput: unknown,
    options: RestorePreflightOptions = {}
  ): Promise<RestorePreflightResult> {
    const operationId = `op-restore-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const warnings: string[] = [];

    // 1. Check if another restore operation is actively holding the lock
    const isLockActive = await this.recoveryStore.isLockActive();
    if (isLockActive) {
      return {
        success: false,
        operationId,
        validationReport: null as any,
        canonicalBackup: null,
        currentStats: null as any,
        backupStats: null as any,
        warnings: [],
        error: {
          code: 'RESTORE_ALREADY_RUNNING',
          message: 'Another restore operation is currently active. Please wait for it to complete.',
          operationId,
          isRecoverable: false,
          suggestedAction: 'Wait 60 seconds for the current operation or lease to clear, then retry.',
        },
      };
    }

    // 2. Validate backup with M9.2 Validation Engine
    const validationReport = await validateBackup(backupInput, {
      skipChecksumVerification: options.skipChecksumVerification,
      customHardMaxBytes: options.customHardMaxBytes,
    });

    // 3. Reject partial backups
    if (validationReport.isPartialBackup) {
      return {
        success: false,
        operationId,
        validationReport,
        canonicalBackup: null,
        currentStats: null as any,
        backupStats: null as any,
        warnings: [],
        error: {
          code: 'PARTIAL_BACKUP_RESTORE_NOT_SUPPORTED',
          message:
            'Partial backup restore is not supported in NookSpace. Use Universal Merge/Import for partial datasets.',
          operationId,
          isRecoverable: false,
          suggestedAction:
            'Please select a full NookSpace Universal Backup file (format: nookspace-backup v1).',
        },
      };
    }

    // 4. Reject invalid or unsupported format
    if (!validationReport.isValid || !validationReport.isSupported) {
      const topError = validationReport.errors[0];
      return {
        success: false,
        operationId,
        validationReport,
        canonicalBackup: null,
        currentStats: null as any,
        backupStats: null as any,
        warnings: [],
        error: {
          code: 'BACKUP_VALIDATION_FAILED',
          message: topError?.description || 'Backup file failed validation integrity checks.',
          technicalDetails: JSON.stringify(validationReport.errors.slice(0, 5)),
          operationId,
          isRecoverable: false,
          suggestedAction: 'Please inspect the validation report and provide a valid backup file.',
        },
      };
    }

    const canonicalBackup = validationReport.canonicalBackup;
    if (!canonicalBackup) {
      return {
        success: false,
        operationId,
        validationReport,
        canonicalBackup: null,
        currentStats: null as any,
        backupStats: null as any,
        warnings: [],
        error: {
          code: 'BACKUP_VALIDATION_FAILED',
          message: 'Failed to extract canonical backup representation from input.',
          operationId,
          isRecoverable: false,
        },
      };
    }

    // 5. Invariant Checks on Canonical Data
    // 5a. Workspace Invariants
    const workspaces = canonicalBackup.data.workspaces || [];
    if (workspaces.length === 0) {
      return {
        success: false,
        operationId,
        validationReport,
        canonicalBackup: null,
        currentStats: null as any,
        backupStats: null as any,
        warnings: [],
        error: {
          code: 'RESTORE_PREFLIGHT_FAILED',
          message: 'Backup must contain at least one workspace.',
          operationId,
          isRecoverable: false,
        },
      };
    }

    const hasDefaultWs = workspaces.some((w) => w.isDefault);
    if (!hasDefaultWs) {
      warnings.push(
        'None of the backup workspaces is marked as default. The first workspace will be promoted to default.'
      );
    }

    // 5b. Settings Invariant
    if (canonicalBackup.data.settings) {
      const activeWsId = canonicalBackup.data.settings.activeWorkspaceId;
      const workspaceExists = workspaces.some((w) => w.id === activeWsId);
      if (!workspaceExists) {
        return {
          success: false,
          operationId,
          validationReport,
          canonicalBackup: null,
          currentStats: null as any,
          backupStats: null as any,
          warnings: [],
          error: {
            code: 'RESTORE_SETTINGS_INVARIANT_FAILED',
            message: `Settings activeWorkspaceId "${activeWsId}" does not exist in backup workspaces.`,
            operationId,
            isRecoverable: false,
          },
        };
      }
    }

    // 6. Inspect Current Database State
    const currentStats = await this.readCurrentDatabaseStats();

    // 7. Check Deprecated Layouts Table in Current DB
    try {
      const deprecatedLayoutsCount = await this.database.layouts.count();
      if (deprecatedLayoutsCount > 0) {
        warnings.push(
          `Current database contains ${deprecatedLayoutsCount} legacy v1 layout records in deprecated table.`
        );
      }
    } catch {
      // Ignore if table check fails in test mocks
    }

    // 8. Compute Backup Statistics
    const backupTableCounts: Record<string, number> = {};
    let backupTotalRecords = 0;

    for (const [table, items] of Object.entries(canonicalBackup.data)) {
      if (Array.isArray(items)) {
        backupTableCounts[table] = items.length;
        backupTotalRecords += items.length;
      } else if (items !== null && typeof items === 'object') {
        backupTableCounts[table] = 1;
        backupTotalRecords += 1;
      } else {
        backupTableCounts[table] = 0;
      }
    }

    const backupStats = {
      workspaceCount: workspaces.length,
      totalRecords: backupTotalRecords,
      tableCounts: backupTableCounts,
    };

    return {
      success: true,
      operationId,
      validationReport,
      canonicalBackup,
      currentStats,
      backupStats,
      warnings,
    };
  }

  /**
   * Reads statistics and record counts across all 17 tables of the current database.
   */
  private async readCurrentDatabaseStats(): Promise<CurrentDatabaseStats> {
    const tables: Array<{ name: string; count: () => Promise<number> }> = [
      { name: 'workspaces', count: () => this.database.workspaces.count() },
      { name: 'settings', count: () => this.database.settings.count() },
      { name: 'widgetInstances', count: () => this.database.widgetInstances.count() },
      { name: 'widgetLayouts', count: () => this.database.widgetLayouts.count() },
      { name: 'todos', count: () => this.database.todos.count() },
      { name: 'notes', count: () => this.database.notes.count() },
      { name: 'noteCollections', count: () => this.database.noteCollections.count() },
      { name: 'noteTags', count: () => this.database.noteTags.count() },
      { name: 'noteBookmarkLinks', count: () => this.database.noteBookmarkLinks.count() },
      { name: 'bookmarks', count: () => this.database.bookmarks.count() },
      { name: 'bookmarkGroups', count: () => this.database.bookmarkGroups.count() },
      { name: 'focusSessions', count: () => this.database.focusSessions.count() },
      { name: 'dailyGoals', count: () => this.database.dailyGoals.count() },
      { name: 'stickyNotes', count: () => this.database.stickyNotes.count() },
      { name: 'vocabulary', count: () => this.database.vocabulary.count() },
      { name: 'resources', count: () => this.database.resources.count() },
      { name: 'calendarEvents', count: () => this.database.calendarEvents.count() },
    ];

    const tableCounts: Record<string, number> = {};
    let totalRecords = 0;

    for (const t of tables) {
      try {
        const c = await t.count();
        tableCounts[t.name] = c;
        totalRecords += c;
      } catch {
        tableCounts[t.name] = 0;
      }
    }

    const workspaceCount = tableCounts.workspaces || 0;
    // Estimate ~500 bytes per record on average for snapshot sizing
    const estimatedSnapshotSizeBytes = totalRecords * 500;

    return {
      workspaceCount,
      totalRecords,
      tableCounts,
      estimatedSnapshotSizeBytes,
    };
  }
}

export const restorePreflightService = new RestorePreflightService();
export const prepareRestore = (
  backupInput: unknown,
  options?: RestorePreflightOptions
): Promise<RestorePreflightResult> => restorePreflightService.prepareRestore(backupInput, options);
