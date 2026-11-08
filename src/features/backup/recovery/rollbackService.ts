import { NookSpaceDB, db as defaultDb } from '../../../services/database/db';
import { NookSpaceRecoveryDB, recoveryDb as defaultRecoveryDb } from './recoveryDatabase';
import { RollbackResult, RestoreError, FailureInjectionConfig } from '../types/restoreTypes';

export class RollbackService {
  constructor(
    private database: NookSpaceDB = defaultDb,
    private recoveryStore: NookSpaceRecoveryDB = defaultRecoveryDb
  ) {}

  /**
   * Restores the complete database state from a persistent recovery snapshot.
   * Guarantees idempotency and transactional atomicity.
   */
  async rollbackFromSnapshot(params: {
    snapshotId: string;
    operationId: string;
    failureInjection?: FailureInjectionConfig;
  }): Promise<RollbackResult> {
    const startTime = performance.now();
    const { snapshotId, operationId, failureInjection } = params;

    // 1. Retrieve persistent snapshot
    const snapshot = await this.recoveryStore.getSnapshot(snapshotId);
    if (!snapshot) {
      const error: RestoreError = {
        code: 'RECOVERY_SNAPSHOT_MISSING',
        message: `Recovery snapshot "${snapshotId}" was not found in persistent store.`,
        operationId,
        isRecoverable: false,
        suggestedAction:
          'Data could not be automatically rolled back because snapshot is missing. Please do not clear extension storage.',
      };

      try {
        await this.recoveryStore.updateJournal({
          operationId,
          state: 'recovery_required',
          error: { code: error.code, message: error.message },
          incrementRecoveryAttempt: true,
        });
      } catch {
        // preserve original error
      }

      throw error;
    }

    // 2. Verify snapshot integrity before restoration
    const verifyResult = await this.recoveryStore.verifySnapshot(snapshotId);
    if (!verifyResult.isValid) {
      const error: RestoreError = {
        code: 'RECOVERY_SNAPSHOT_CORRUPTED',
        message: `Recovery snapshot "${snapshotId}" failed integrity check: ${verifyResult.error}`,
        operationId,
        isRecoverable: false,
        suggestedAction:
          'Recovery snapshot checksum or count mismatch. Manual data recovery may be required.',
      };

      try {
        await this.recoveryStore.updateJournal({
          operationId,
          state: 'recovery_required',
          error: { code: error.code, message: error.message },
          incrementRecoveryAttempt: true,
        });
      } catch {
        // preserve original error
      }

      throw error;
    }

    // 3. Update journal state to rollback_started
    await this.recoveryStore.updateJournal({
      operationId,
      state: 'rollback_started',
      incrementRecoveryAttempt: true,
    });

    // 4. Failure injection hook for rollback
    if (
      failureInjection?.stage === 'during_rollback' ||
      failureInjection?.secondaryStage === 'during_rollback'
    ) {
      const error: RestoreError = {
        code: 'ROLLBACK_FAILED',
        message: failureInjection.customMessage || 'Simulated failure during rollback operation.',
        operationId,
        isRecoverable: false,
      };

      await this.recoveryStore.updateJournal({
        operationId,
        state: 'recovery_required',
        error: { code: error.code, message: error.message },
      });

      throw error;
    }

    // 5. Execute replacement transaction across all 17 tables
    const payload = snapshot.payload;
    const restoredCounts: Record<string, number> = {};

    try {
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

      await this.database.transaction('rw', tables, async () => {
        // Clear all tables
        await Promise.all(tables.map((t) => t.clear()));

        // Insert in dependency order
        if (payload.workspaces?.length > 0) {
          await this.database.workspaces.bulkAdd(payload.workspaces);
        }
        if (payload.settings) {
          await this.database.settings.put(payload.settings);
        }
        if (payload.widgetInstances?.length > 0) {
          await this.database.widgetInstances.bulkAdd(payload.widgetInstances);
        }
        if (payload.widgetLayouts?.length > 0) {
          await this.database.widgetLayouts.bulkAdd(payload.widgetLayouts);
        }
        if (payload.noteCollections?.length > 0) {
          await this.database.noteCollections.bulkAdd(payload.noteCollections);
        }
        if (payload.noteTags?.length > 0) {
          await this.database.noteTags.bulkAdd(payload.noteTags);
        }
        if (payload.notes?.length > 0) {
          await this.database.notes.bulkAdd(payload.notes);
        }
        if (payload.noteBookmarkLinks?.length > 0) {
          await this.database.noteBookmarkLinks.bulkAdd(payload.noteBookmarkLinks);
        }
        if (payload.bookmarkGroups?.length > 0) {
          await this.database.bookmarkGroups.bulkAdd(payload.bookmarkGroups);
        }
        if (payload.bookmarks?.length > 0) {
          await this.database.bookmarks.bulkAdd(payload.bookmarks);
        }
        if (payload.todos?.length > 0) {
          await this.database.todos.bulkAdd(payload.todos);
        }
        if (payload.focusSessions?.length > 0) {
          await this.database.focusSessions.bulkAdd(payload.focusSessions);
        }
        if (payload.dailyGoals?.length > 0) {
          await this.database.dailyGoals.bulkAdd(payload.dailyGoals);
        }
        if (payload.stickyNotes?.length > 0) {
          await this.database.stickyNotes.bulkAdd(payload.stickyNotes);
        }
        if (payload.vocabulary?.length > 0) {
          await this.database.vocabulary.bulkAdd(payload.vocabulary);
        }
        if (payload.resources?.length > 0) {
          await this.database.resources.bulkAdd(payload.resources);
        }
        if (payload.calendarEvents?.length > 0) {
          await this.database.calendarEvents.bulkAdd(payload.calendarEvents);
        }
      });

      // 6. Post-rollback verification of table counts
      for (const [table, expectedCount] of Object.entries(snapshot.itemCounts)) {
        try {
          const actualCount = await (this.database as any)[table].count();
          restoredCounts[table] = actualCount;
          if (actualCount !== expectedCount) {
            throw new Error(
              `Rollback verification count discrepancy for table "${table}": expected ${expectedCount}, got ${actualCount}.`
            );
          }
        } catch (cntErr) {
          throw new Error(
            `Failed to verify count for table "${table}" during rollback: ${String(cntErr)}`
          );
        }
      }

      // 7. Update snapshot status and mark journal rollback_completed
      await this.recoveryStore.snapshots.update(snapshotId, { status: 'used_for_rollback' });
      await this.recoveryStore.updateJournal({
        operationId,
        state: 'rollback_completed',
      });

      const durationMs = Math.round((performance.now() - startTime) * 100) / 100;
      return {
        success: true,
        operationId,
        snapshotId,
        restoredCounts,
        durationMs,
      };
    } catch (txErr) {
      const error: RestoreError = {
        code: 'ROLLBACK_FAILED',
        message: `Rollback transaction failed: ${txErr instanceof Error ? txErr.message : String(txErr)}`,
        operationId,
        isRecoverable: false,
        suggestedAction:
          'Critical recovery failure: database could not be restored from snapshot. Snapshot is preserved.',
      };

      try {
        await this.recoveryStore.updateJournal({
          operationId,
          state: 'recovery_required',
          error: { code: error.code, message: error.message },
        });
      } catch {
        // preserve original error
      }

      throw error;
    }
  }
}

export const rollbackService = new RollbackService();
export const rollbackFromSnapshot = (params: {
  snapshotId: string;
  operationId: string;
  failureInjection?: FailureInjectionConfig;
}): Promise<RollbackResult> => rollbackService.rollbackFromSnapshot(params);
