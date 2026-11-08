import { NookSpaceDB, db } from '../../../services/database/db';
import { NookSpaceRecoveryDB, recoveryDb } from '../../backup/recovery/recoveryDatabase';
import {
  MigrationEngineResult,
  MigrationJournalRecord,
} from '../types/migrationTypes';
import { MigrationRegistry, migrationRegistry } from '../registry/migrationRegistry';
import {
  MigrationJournalService,
  migrationJournalService,
} from '../journal/migrationJournalService';
import { registerDefaultMigrations } from '../definitions/defaultMigrations';

export class MigrationEngine {
  private registry: MigrationRegistry;
  private journal: MigrationJournalService;
  private rDb: NookSpaceRecoveryDB;

  constructor(options?: {
    registry?: MigrationRegistry;
    journalService?: MigrationJournalService;
    recoveryDatabase?: NookSpaceRecoveryDB;
    autoRegisterDefaults?: boolean;
  }) {
    this.registry = options?.registry ?? migrationRegistry;
    this.journal = options?.journalService ?? migrationJournalService;
    this.rDb = options?.recoveryDatabase ?? recoveryDb;

    const shouldRegisterDefaults =
      options?.autoRegisterDefaults ?? !options?.registry;

    if (shouldRegisterDefaults && this.registry.count === 0) {
      registerDefaultMigrations(this.registry);
    }
  }

  /**
   * Executes all pending registered migrations in topological order.
   * Ensures exclusive cross-tab lock and persists journal records.
   */
  async runMigrations(
    database: NookSpaceDB = db,
    options?: { dryRun?: boolean; forceAll?: boolean }
  ): Promise<MigrationEngineResult> {
    const startTime = Date.now();
    const operationId = `mig-${startTime}-${Math.random().toString(36).slice(2, 7)}`;

    // 1. Acquire cross-tab lock
    const lockResult = await this.rDb.acquireLock(operationId, 'migration-engine', 60000);
    if (!lockResult.acquired) {
      return {
        status: 'locked',
        totalMigrations: 0,
        executedCount: 0,
        skippedCount: 0,
        failedCount: 0,
        totalRecordsProcessed: 0,
        totalRecordsModified: 0,
        durationMs: 0,
        executedRecords: [],
        error: `Migration lock held by operation "${lockResult.currentOwner || 'unknown'}". Concurrent migration aborted.`,
      };
    }

    // Set up heartbeat timer to renew lock for long-running migrations
    const heartbeatTimer = setInterval(async () => {
      try {
        await this.rDb.renewLock(operationId, 60000);
      } catch (err) {
        console.warn('[MigrationEngine] Lock renewal failed:', err);
      }
    }, 15000);

    const executedRecords: MigrationJournalRecord[] = [];
    let totalProcessed = 0;
    let totalModified = 0;
    let executedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;

    try {
      // 2. Get topologically ordered execution plan
      const plan = this.registry.getExecutionPlan();

      for (const migration of plan) {
        // Check if already completed
        const isDone = await this.journal.isCompleted(migration.id);
        if (isDone && !options?.forceAll) {
          skippedCount++;
          continue;
        }

        // Record start in journal
        await this.journal.recordStart({
          migrationId: migration.id,
          name: migration.name,
          type: migration.type,
          version: migration.version,
        });

        const migrationStart = Date.now();
        try {
          // Execute migration
          const stepResult = await migration.execute(database, {
            database,
            dryRun: options?.dryRun,
          });

          if (!stepResult.success) {
            throw new Error(
              stepResult.error || `Migration "${migration.id}" returned failure status.`
            );
          }

          // Verification pass
          if (migration.verify) {
            const verification = await migration.verify(database);
            if (!verification.valid) {
              throw new Error(
                `Post-migration verification failed for "${migration.id}": ${verification.error}`
              );
            }
          }

          // Record success
          const successRecord = await this.journal.recordSuccess({
            migrationId: migration.id,
            recordsProcessed: stepResult.recordsProcessed,
            recordsModified: stepResult.recordsModified,
          });

          executedRecords.push(successRecord);
          totalProcessed += stepResult.recordsProcessed;
          totalModified += stepResult.recordsModified;
          executedCount++;
        } catch (err) {
          failedCount++;
          const errorMessage = err instanceof Error ? err.message : String(err);

          // Attempt rollback if defined
          if (migration.rollback) {
            try {
              await migration.rollback(database, { database, dryRun: options?.dryRun });
            } catch (rollbackErr) {
              console.error(
                `[MigrationEngine] Rollback failed for migration "${migration.id}":`,
                rollbackErr
              );
            }
          }

          const failureRecord = await this.journal.recordFailure({
            migrationId: migration.id,
            error: errorMessage,
            status: migration.rollback ? 'failed' : 'recovery_required',
          });

          executedRecords.push(failureRecord);

          return {
            status: 'failed',
            totalMigrations: plan.length,
            executedCount,
            skippedCount,
            failedCount,
            totalRecordsProcessed: totalProcessed,
            totalRecordsModified: totalModified,
            durationMs: Date.now() - startTime,
            executedRecords,
            error: `Migration "${migration.id}" failed: ${errorMessage}`,
          };
        }
      }

      return {
        status: executedCount > 0 ? 'completed' : 'no_op',
        totalMigrations: plan.length,
        executedCount,
        skippedCount,
        failedCount: 0,
        totalRecordsProcessed: totalProcessed,
        totalRecordsModified: totalModified,
        durationMs: Date.now() - startTime,
        executedRecords,
      };
    } finally {
      clearInterval(heartbeatTimer);
      await this.rDb.releaseLock(operationId);
    }
  }

  /**
   * Returns current registry instance.
   */
  getRegistry(): MigrationRegistry {
    return this.registry;
  }

  /**
   * Returns journal service instance.
   */
  getJournalService(): MigrationJournalService {
    return this.journal;
  }
}

export const migrationEngine = new MigrationEngine();
