import { NookSpaceDB, db as defaultDb } from '../../../services/database/db';
import { NookSpaceRecoveryDB, recoveryDb as defaultRecoveryDb } from '../recovery/recoveryDatabase';
import { RestorePreflightService } from './restorePreflightService';
import { verifyRestoredDatabase } from '../validation/restorePostVerification';
import { RollbackService } from '../recovery/rollbackService';
import { syncRuntimeStoresAfterRestore } from '../utils/restoreRuntimeSync';
import { calculatePayloadChecksum } from './backupIntegrityService';
import { BackupDataV1 } from '../types/backupTypes';
import {
  RestoreOptions,
  RestoreResult,
  RestoreError,
  RestoreProgress,
} from '../types/restoreTypes';

export class RestoreEngineService {
  private preflightSvc: RestorePreflightService;
  private rollbackSvc: RollbackService;

  constructor(
    private database: NookSpaceDB = defaultDb,
    private recoveryStore: NookSpaceRecoveryDB = defaultRecoveryDb
  ) {
    this.preflightSvc = new RestorePreflightService(this.database, this.recoveryStore);
    this.rollbackSvc = new RollbackService(this.database, this.recoveryStore);
  }

  /**
   * Executes transactional restoration of a verified Universal JSON backup into Dexie,
   * preceded by persistent durable snapshot creation and followed by post-restore verification.
   */
  async restoreBackup(
    backupInput: unknown,
    options: RestoreOptions = {}
  ): Promise<RestoreResult> {
    const startTime = performance.now();
    let operationId = `op-restore-${Date.now()}`;
    let snapshotId = `snap-${Date.now()}`;
    let lockAcquired = false;

    const reportProgress = (stage: RestoreProgress['stage'], message: string) => {
      if (options.onProgress) {
        options.onProgress({
          stage,
          message,
          timestamp: Date.now(),
          operationId,
        });
      }
    };

    try {
      // ==========================================
      // STAGE 1: PREFLIGHT VERIFICATION
      // ==========================================
      reportProgress('preparing', 'Validating backup format, version, and integrity...');

      if (options.failureInjection?.stage === 'before_snapshot') {
        throw new Error(options.failureInjection.customMessage || 'Simulated failure before snapshot.');
      }

      const preflight = await this.preflightSvc.prepareRestore(backupInput, {
        skipChecksumVerification: options.skipChecksumVerification,
      });

      operationId = preflight.operationId;
      snapshotId = `snap-${operationId}`;

      if (!preflight.success || !preflight.canonicalBackup) {
        return {
          success: false,
          operationId,
          finalState: 'failed',
          restoredCounts: {},
          durationMs: Math.round((performance.now() - startTime) * 100) / 100,
          error: preflight.error,
        };
      }

      const canonicalBackup = preflight.canonicalBackup;

      // ==========================================
      // STAGE 2: LOCK ACQUISITION
      // ==========================================
      const lockResult = await this.recoveryStore.acquireLock(operationId, options.tabId);
      if (!lockResult.acquired) {
        const error: RestoreError = {
          code: 'RESTORE_LOCK_CONFLICT',
          message: `Restore lock conflict: operation "${lockResult.currentOwner}" is currently running in another tab.`,
          operationId,
          isRecoverable: false,
        };
        return {
          success: false,
          operationId,
          finalState: 'failed',
          restoredCounts: {},
          durationMs: Math.round((performance.now() - startTime) * 100) / 100,
          error,
        };
      }
      lockAcquired = true;

      // ==========================================
      // STAGE 3: PERSISTENT RECOVERY SNAPSHOT CREATION
      // ==========================================
      reportProgress('snapshot_creating', 'Creating persistent recovery snapshot of current database...');

      if (options.failureInjection?.stage === 'during_snapshot') {
        throw new Error(options.failureInjection.customMessage || 'Simulated failure during snapshot.');
      }

      const currentPayload = await this.extractCurrentDatabasePayload();
      const currentItemCounts = this.computeItemCounts(currentPayload);
      const snapshotChecksum = await calculatePayloadChecksum(currentPayload);

      await this.recoveryStore.saveSnapshot({
        snapshotId,
        operationId,
        payload: currentPayload,
        itemCounts: currentItemCounts,
        databaseSchemaVersion: this.database.verno,
        checksum: snapshotChecksum,
      });

      if (options.failureInjection?.stage === 'after_snapshot_before_verify') {
        throw new Error(options.failureInjection.customMessage || 'Simulated crash after snapshot write.');
      }

      // ==========================================
      // STAGE 4: SNAPSHOT VERIFICATION
      // ==========================================
      if (options.failureInjection?.stage === 'during_snapshot_verify') {
        throw new Error(options.failureInjection.customMessage || 'Simulated failure during snapshot verify.');
      }

      const snapshotVerify = await this.recoveryStore.verifySnapshot(snapshotId);
      if (!snapshotVerify.isValid) {
        throw {
          code: 'RECOVERY_SNAPSHOT_VERIFICATION_FAILED',
          message: `Durable snapshot verification failed: ${snapshotVerify.error}`,
          operationId,
          isRecoverable: false,
        } as RestoreError;
      }

      // ==========================================
      // STAGE 5: JOURNAL REGISTRATION
      // ==========================================
      await this.recoveryStore.saveJournal({
        operationId,
        snapshotId,
        state: 'snapshot_verified',
        backupMetadata: canonicalBackup.metadata,
      });
      reportProgress('snapshot_verified', 'Recovery snapshot verified and durable.');

      // ==========================================
      // STAGE 6: RESTORE TRANSACTION INITIATION
      // ==========================================
      await this.recoveryStore.updateJournal({
        operationId,
        state: 'restore_started',
      });
      reportProgress('restore_started', 'Writing backup entities into database transaction...');

      const backupData = canonicalBackup.data;
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

      // Execute atomic replacement transaction
      await this.database.transaction('rw', tables, async () => {
        // Clear all active tables
        await Promise.all(tables.map((t) => t.clear()));

        // Insert backup items in strict relational dependency order
        if (backupData.workspaces?.length > 0) {
          await this.database.workspaces.bulkAdd(backupData.workspaces);
        }
        if (backupData.settings) {
          await this.database.settings.put(backupData.settings);
        }
        if (backupData.widgetInstances?.length > 0) {
          await this.database.widgetInstances.bulkAdd(backupData.widgetInstances);
        }
        if (backupData.widgetLayouts?.length > 0) {
          await this.database.widgetLayouts.bulkAdd(backupData.widgetLayouts);
        }
        if (backupData.noteCollections?.length > 0) {
          await this.database.noteCollections.bulkAdd(backupData.noteCollections);
        }
        if (backupData.noteTags?.length > 0) {
          await this.database.noteTags.bulkAdd(backupData.noteTags);
        }
        if (backupData.notes?.length > 0) {
          await this.database.notes.bulkAdd(backupData.notes);
        }
        if (backupData.noteBookmarkLinks?.length > 0) {
          await this.database.noteBookmarkLinks.bulkAdd(backupData.noteBookmarkLinks);
        }
        if (backupData.bookmarkGroups?.length > 0) {
          await this.database.bookmarkGroups.bulkAdd(backupData.bookmarkGroups);
        }
        if (backupData.bookmarks?.length > 0) {
          await this.database.bookmarks.bulkAdd(backupData.bookmarks);
        }
        if (backupData.todos?.length > 0) {
          await this.database.todos.bulkAdd(backupData.todos);
        }
        if (backupData.focusSessions?.length > 0) {
          await this.database.focusSessions.bulkAdd(backupData.focusSessions);
        }
        if (backupData.dailyGoals?.length > 0) {
          await this.database.dailyGoals.bulkAdd(backupData.dailyGoals);
        }
        if (backupData.stickyNotes?.length > 0) {
          await this.database.stickyNotes.bulkAdd(backupData.stickyNotes);
        }
        if (backupData.vocabulary?.length > 0) {
          await this.database.vocabulary.bulkAdd(backupData.vocabulary);
        }
        if (backupData.resources?.length > 0) {
          await this.database.resources.bulkAdd(backupData.resources);
        }
        if (backupData.calendarEvents?.length > 0) {
          await this.database.calendarEvents.bulkAdd(backupData.calendarEvents);
        }

        // Failure injection inside transaction
        if (options.failureInjection?.stage === 'during_restore_tx') {
          throw new Error(
            options.failureInjection.customMessage || 'Simulated failure during restore transaction.'
          );
        }
      });

      await this.recoveryStore.updateJournal({
        operationId,
        state: 'restore_applied',
      });
      reportProgress('restore_applied', 'Database transaction committed successfully.');

      if (options.failureInjection?.stage === 'after_restore_commit_before_verify') {
        throw new Error(
          options.failureInjection.customMessage || 'Simulated crash after restore commit.'
        );
      }

      if (options.failureInjection?.stage === 'simulate_process_kill_after_commit') {
        throw new Error('SIMULATED_PROCESS_KILL_AFTER_COMMIT');
      }

      // ==========================================
      // STAGE 7: POST-RESTORE VERIFICATION
      // ==========================================
      await this.recoveryStore.updateJournal({
        operationId,
        state: 'verification_started',
      });
      reportProgress('verification_started', 'Verifying restored database invariants...');

      if (options.failureInjection?.stage === 'during_post_verification') {
        throw {
          code: 'RESTORE_POST_VERIFICATION_FAILED',
          message: options.failureInjection.customMessage || 'Simulated post-verification failure.',
          operationId,
          isRecoverable: true,
        } as RestoreError;
      }

      const postVerify = await verifyRestoredDatabase(canonicalBackup, this.database);
      if (!postVerify.isValid) {
        throw {
          code: 'RESTORE_POST_VERIFICATION_FAILED',
          message: `Post-restore verification failed: ${postVerify.errors.join('; ')}`,
          operationId,
          isRecoverable: true,
        } as RestoreError;
      }

      await this.recoveryStore.updateJournal({
        operationId,
        state: 'restore_verified',
      });
      reportProgress('restore_verified', 'Database verification passed.');

      // ==========================================
      // STAGE 8: RUNTIME STORE SYNCHRONIZATION
      // ==========================================
      await syncRuntimeStoresAfterRestore();

      // ==========================================
      // STAGE 9: FINALIZATION & CLEANUP
      // ==========================================
      if (options.failureInjection?.stage === 'during_cleanup') {
        throw new Error(options.failureInjection.customMessage || 'Simulated failure during cleanup.');
      }

      await this.recoveryStore.updateJournal({
        operationId,
        state: 'completed',
      });
      await this.recoveryStore.deleteSnapshot(snapshotId);
      await this.recoveryStore.releaseLock(operationId);
      lockAcquired = false;

      reportProgress('completed', 'Restore completed successfully.');

      const durationMs = Math.round((performance.now() - startTime) * 100) / 100;
      return {
        success: true,
        operationId,
        finalState: 'completed',
        restoredCounts: postVerify.restoredCounts,
        durationMs,
      };
    } catch (err: any) {
      if (options.failureInjection?.stage === 'simulate_process_kill_after_commit') {
        if (lockAcquired) {
          try {
            await this.recoveryStore.releaseLock(operationId);
          } catch {
            // ignore
          }
        }
        return {
          success: false,
          operationId,
          finalState: 'restore_applied',
          restoredCounts: {},
          snapshotId,
          durationMs: Math.round((performance.now() - startTime) * 100) / 100,
          error: {
            code: 'RESTORE_INTERRUPTED',
            message: 'Process killed after commit before verification.',
            operationId,
            isRecoverable: true,
          },
        };
      }

      // ==========================================
      // CATCH & ROLLBACK ORCHESTRATION
      // ==========================================
      const rawError = err as RestoreError | Error;
      const restoreErr: RestoreError = {
        code: (rawError as RestoreError).code || 'RESTORE_TRANSACTION_FAILED',
        message: rawError.message || String(rawError),
        operationId,
        isRecoverable: true,
      };

      reportProgress('rollback_started', `Restore error encountered: ${restoreErr.message}. Initiating rollback...`);

      let rollbackOccurred = false;
      let rollbackSucceeded = false;
      let finalState: RestoreResult['finalState'] = 'failed';

      // Only attempt rollback if snapshot was created
      const snapshotRecord = await this.recoveryStore.getSnapshot(snapshotId);
      if (snapshotRecord) {
        rollbackOccurred = true;
        try {
          await this.rollbackSvc.rollbackFromSnapshot({
            snapshotId,
            operationId,
            failureInjection: options.failureInjection,
          });
          rollbackSucceeded = true;
          finalState = 'rollback_completed';
          reportProgress('rollback_completed', 'Database safely restored to pre-restore snapshot.');
        } catch (rbErr: any) {
          rollbackSucceeded = false;
          finalState = 'recovery_required';
          restoreErr.code = 'RECOVERY_REQUIRED';
          restoreErr.message = `Rollback failed: ${rbErr.message || String(rbErr)}. Snapshot "${snapshotId}" preserved.`;
          restoreErr.isRecoverable = false;
          reportProgress('recovery_required', 'Critical recovery required: persistent snapshot preserved.');
        }
      }

      if (lockAcquired) {
        try {
          await this.recoveryStore.releaseLock(operationId);
        } catch {
          // ignore
        }
      }

      const durationMs = Math.round((performance.now() - startTime) * 100) / 100;
      return {
        success: false,
        operationId,
        finalState,
        restoredCounts: {},
        snapshotId,
        durationMs,
        rollbackOccurred,
        rollbackSucceeded,
        error: restoreErr,
      };
    }
  }

  /**
   * Reads all records from current database tables into a BackupDataV1 payload.
   */
  private async extractCurrentDatabasePayload(): Promise<BackupDataV1> {
    const [
      workspaces,
      settings,
      widgetInstances,
      widgetLayouts,
      todos,
      notes,
      noteCollections,
      noteTags,
      noteBookmarkLinks,
      bookmarks,
      bookmarkGroups,
      focusSessions,
      dailyGoals,
      stickyNotes,
      vocabulary,
      resources,
      calendarEvents,
    ] = await Promise.all([
      this.database.workspaces.toArray(),
      this.database.settings.get('current_settings'),
      this.database.widgetInstances.toArray(),
      this.database.widgetLayouts.toArray(),
      this.database.todos.toArray(),
      this.database.notes.toArray(),
      this.database.noteCollections.toArray(),
      this.database.noteTags.toArray(),
      this.database.noteBookmarkLinks.toArray(),
      this.database.bookmarks.toArray(),
      this.database.bookmarkGroups.toArray(),
      this.database.focusSessions.toArray(),
      this.database.dailyGoals.toArray(),
      this.database.stickyNotes.toArray(),
      this.database.vocabulary.toArray(),
      this.database.resources.toArray(),
      this.database.calendarEvents.toArray(),
    ]);

    return {
      workspaces,
      settings: settings || null,
      widgetInstances,
      widgetLayouts,
      todos,
      notes,
      noteCollections,
      noteTags,
      noteBookmarkLinks,
      bookmarks,
      bookmarkGroups,
      focusSessions,
      dailyGoals,
      stickyNotes,
      vocabulary,
      resources,
      calendarEvents,
    };
  }

  private computeItemCounts(data: BackupDataV1): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const [key, value] of Object.entries(data)) {
      if (Array.isArray(value)) {
        counts[key] = value.length;
      } else if (value !== null && typeof value === 'object') {
        counts[key] = 1;
      } else {
        counts[key] = 0;
      }
    }
    return counts;
  }
}

export const restoreEngineService = new RestoreEngineService();
export const restoreBackup = (
  backupInput: unknown,
  options?: RestoreOptions
): Promise<RestoreResult> => restoreEngineService.restoreBackup(backupInput, options);
