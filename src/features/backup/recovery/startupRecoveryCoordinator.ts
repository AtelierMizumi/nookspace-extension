import { NookSpaceDB, db as defaultDb } from '../../../services/database/db';
import { NookSpaceRecoveryDB, recoveryDb as defaultRecoveryDb } from './recoveryDatabase';
import { RollbackService } from './rollbackService';
import { StartupRecoveryResult } from '../types/restoreTypes';

export class StartupRecoveryCoordinator {
  private rollbackSvc: RollbackService;

  constructor(
    private database: NookSpaceDB = defaultDb,
    private recoveryStore: NookSpaceRecoveryDB = defaultRecoveryDb
  ) {
    this.rollbackSvc = new RollbackService(this.database, this.recoveryStore);
  }

  /**
   * Evaluates the recovery journal upon application startup / bootstrap.
   * Detects interrupted operations and executes crash recovery protocol.
   */
  async checkAndHandleStartupRecovery(): Promise<StartupRecoveryResult> {
    // 0. Clean up any expired locks left by a terminated process
    try {
      const activeLock = await this.recoveryStore.locks.get('current_restore_lock');
      if (activeLock && activeLock.leaseExpiresAt <= Date.now()) {
        await this.recoveryStore.locks.delete('current_restore_lock');
      }
    } catch {
      // non-blocking
    }

    // 0b. Detect and clean up any interrupted migration operations in migrationJournal
    let interruptedMigrationCount = 0;
    try {
      const incompleteMigrations = await this.recoveryStore.migrationJournal
        .where('status')
        .equals('running')
        .toArray();

      if (incompleteMigrations.length > 0) {
        interruptedMigrationCount = incompleteMigrations.length;
        for (const mig of incompleteMigrations) {
          await this.recoveryStore.saveMigrationJournalRecord({
            ...mig,
            status: 'failed',
            completedAt: Date.now(),
            error: 'MIGRATION_INTERRUPTED: Process crashed before migration completion.',
          });
          // Release lock if it was held by this crashed migration operation
          await this.recoveryStore.releaseLock(mig.migrationId);
        }
      }
    } catch {
      // non-blocking
    }

    const incompleteJournal = await this.recoveryStore.getLatestIncompleteJournal();

    if (!incompleteJournal) {
      if (interruptedMigrationCount > 0) {
        return {
          status: 'abandoned_clean',
          message: `Cleaned up ${interruptedMigrationCount} interrupted migration operations.`,
        };
      }
      return { status: 'clean' };
    }

    const { operationId, snapshotId, state } = incompleteJournal;

    // Release any stale locks left by the crashed process
    await this.recoveryStore.releaseLock(operationId);

    // Scenario A: Interrupted before restore transaction touched the database
    if (state === 'preparing' || state === 'snapshot_creating') {
      await this.recoveryStore.updateJournal({
        operationId,
        state: 'failed',
        error: {
          code: 'RESTORE_INTERRUPTED',
          message: 'Restore operation was interrupted before database modification.',
        },
      });

      return {
        status: 'abandoned_clean',
        operationId,
        previousState: state,
        message: 'Interrupted pre-restore operation was cleaned up safely without modifying data.',
      };
    }

    // Scenario B: Snapshot verified, but restore transaction was not yet initiated
    if (state === 'snapshot_verified') {
      await this.recoveryStore.updateJournal({
        operationId,
        state: 'failed',
        error: {
          code: 'RESTORE_INTERRUPTED',
          message: 'Restore operation was abandoned before database transaction started.',
        },
      });

      return {
        status: 'abandoned_clean',
        operationId,
        previousState: state,
        message: 'Snapshot was preserved, but main database was untouched.',
      };
    }

    // Scenario E: Previously marked as recovery_required
    if (state === 'recovery_required') {
      return {
        status: 'recovery_required',
        operationId,
        previousState: state,
        message:
          'Critical recovery state detected. Previous rollback failed and recovery snapshot is preserved.',
        error: {
          code: 'RECOVERY_REQUIRED',
          message: 'Persistent recovery required from snapshot.',
          operationId,
          isRecoverable: false,
        },
      };
    }

    // Scenario C & D: Interrupted during/after restore transaction or during rollback
    // Automatic durable rollback from persistent recovery snapshot is MANDATORY
    if (
      state === 'restore_started' ||
      state === 'restore_applied' ||
      state === 'verification_started' ||
      state === 'restore_verified' ||
      state === 'rollback_started' ||
      state === 'rollback_in_progress'
    ) {
      try {
        await this.rollbackSvc.rollbackFromSnapshot({
          snapshotId,
          operationId,
        });

        return {
          status: 'recovered_from_snapshot',
          operationId,
          previousState: state,
          message: `Interrupted restore operation (state: ${state}) was automatically rolled back from persistent snapshot "${snapshotId}".`,
        };
      } catch (rollbackErr) {
        return {
          status: 'recovery_required',
          operationId,
          previousState: state,
          message: `Startup rollback failed for operation "${operationId}". Snapshot is preserved.`,
          error: {
            code: 'RECOVERY_REQUIRED',
            message: `Automatic crash recovery rollback failed: ${rollbackErr instanceof Error ? rollbackErr.message : String(rollbackErr)}`,
            operationId,
            isRecoverable: false,
          },
        };
      }
    }

    return { status: 'clean' };
  }
}

export const startupRecoveryCoordinator = new StartupRecoveryCoordinator();
export const checkAndHandleStartupRecovery = (
  database?: NookSpaceDB,
  recoveryStore?: NookSpaceRecoveryDB
): Promise<StartupRecoveryResult> => {
  const coordinator = database || recoveryStore
    ? new StartupRecoveryCoordinator(database, recoveryStore)
    : startupRecoveryCoordinator;
  return coordinator.checkAndHandleStartupRecovery();
};
