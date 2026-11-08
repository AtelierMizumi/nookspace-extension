import { NookSpaceDB, db as defaultDb } from '../../../services/database/db';
import {
  NookSpaceRecoveryDB,
  recoveryDb as defaultRecoveryDb,
} from '../recovery/recoveryDatabase';
import {
  MergeImportOptions,
  MergeImportPlan,
  MergeImportResult,
  MergeImportProgress,
  DATA_GROUP_TABLE_MAP,
} from '../types/mergeTypes';
import { MergePlannerService } from './mergePlannerService';
import { syncRuntimeStoresAfterRestore } from '../utils/restoreRuntimeSync';

// Foreign-key safe insertion order
const INSERTION_ORDER = [
  'workspaces',
  'settings',
  'bookmarkGroups',
  'noteCollections',
  'noteTags',
  'widgetInstances',
  'widgetLayouts',
  'bookmarks',
  'notes',
  'noteBookmarkLinks',
  'todos',
  'focusSessions',
  'dailyGoals',
  'stickyNotes',
  'vocabulary',
  'resources',
  'calendarEvents',
];

export class MergeEngineService {
  private planner: MergePlannerService;

  constructor(
    private database: NookSpaceDB = defaultDb,
    private recoveryStore: NookSpaceRecoveryDB = defaultRecoveryDb
  ) {
    this.planner = new MergePlannerService(this.database);
  }

  /**
   * Executes atomic, non-destructive merge import inside a single Dexie read-write transaction.
   */
  async executeMerge(
    plan: MergeImportPlan,
    options: MergeImportOptions,
    onProgress?: (progress: MergeImportProgress) => void,
    failureInjection?: {
      stage?: 'before_tx' | 'during_tx' | 'after_tx_before_verify';
      error?: Error;
    }
  ): Promise<MergeImportResult> {
    const startTime = Date.now();
    const opId = `merge-op-${startTime}-${Math.random().toString(36).substring(2, 6)}`;
    const warnings: string[] = [];

    // 1. Progress: Validating & acquiring lock
    onProgress?.({
      stage: 'validating',
      message: 'Acquiring cross-tab execution lock...',
      percent: 10,
      timestamp: Date.now(),
    });

    const lockResult = await this.recoveryStore.acquireLock(opId, 'tab-merge', 45000);
    if (!lockResult.acquired) {
      return {
        success: false,
        operationId: opId,
        planId: plan.planId,
        insertedCounts: {},
        updatedCounts: {},
        skippedCount: 0,
        conflictsResolvedCount: 0,
        durationMs: Date.now() - startTime,
        warnings: [],
        error: {
          code: 'MERGE_LOCK_CONFLICT',
          message: `Another backup operation (${lockResult.currentOwner}) is currently running.`,
          isRecoverable: true,
        },
      };
    }

    // Lock heartbeat timer
    const heartbeat = setInterval(() => {
      this.recoveryStore.renewLock(opId, 45000).catch((err) => {
        console.warn('[MergeEngine] Failed to renew lock lease:', err);
      });
    }, 10000);

    try {
      // 2. Validate plan freshness against live DB state
      onProgress?.({
        stage: 'analyzing',
        message: 'Verifying database state freshness...',
        percent: 25,
        timestamp: Date.now(),
      });

      const freshness = await this.planner.validatePlanFreshness(plan, options);
      if (!freshness.isFresh) {
        throw {
          code: 'MERGE_STALE_PLAN',
          message: freshness.reason || 'Database was modified since preview was generated.',
        };
      }

      if (failureInjection?.stage === 'before_tx') {
        throw failureInjection.error || new Error('Injected failure before merge transaction');
      }

      // 3. Determine all tables in scope for the single Dexie transaction
      const tablesInTransactionSet = new Set<string>();
      for (const group of plan.selectedGroups) {
        const tables = DATA_GROUP_TABLE_MAP[group] || [];
        for (const t of tables) {
          tablesInTransactionSet.add(t);
        }
      }
      if (plan.targetWorkspaceId) {
        tablesInTransactionSet.add('workspaces');
      }

      const tableNames = Array.from(tablesInTransactionSet);
      const tablesToLock = tableNames.map((name) => (this.database as any)[name]);

      onProgress?.({
        stage: 'applying_transaction',
        message: 'Applying atomic merge transaction...',
        percent: 50,
        timestamp: Date.now(),
      });

      const insertedCounts: Record<string, number> = {};
      const updatedCounts: Record<string, number> = {};

      // 4. Single Atomic Dexie Transaction
      await this.database.transaction('rw', tablesToLock, async () => {
        for (const table of INSERTION_ORDER) {
          if (!tablesInTransactionSet.has(table)) continue;

          const toInsert = plan.recordsToInsert[table] || [];
          const toUpdate = plan.recordsToUpdate[table] || [];

          if (toInsert.length > 0) {
            await (this.database as any)[table].bulkAdd(toInsert);
            insertedCounts[table] = toInsert.length;
          }

          if (toUpdate.length > 0) {
            await (this.database as any)[table].bulkPut(toUpdate);
            updatedCounts[table] = toUpdate.length;
          }
        }

        if (failureInjection?.stage === 'during_tx') {
          throw (
            failureInjection.error ||
            new Error('Injected failure during merge transaction')
          );
        }
      });

      if (failureInjection?.stage === 'after_tx_before_verify') {
        throw (
          failureInjection.error ||
          new Error('Injected failure after merge transaction before verification')
        );
      }

      // 5. Post-Merge Verification
      onProgress?.({
        stage: 'verifying',
        message: 'Verifying post-merge data integrity...',
        percent: 85,
        timestamp: Date.now(),
      });

      await this.verifyPostMerge(plan);

      // 6. Runtime Store Sync
      try {
        await syncRuntimeStoresAfterRestore();
      } catch (err) {
        warnings.push(`Store sync warning: ${err instanceof Error ? err.message : String(err)}`);
      }

      onProgress?.({
        stage: 'completed',
        message: 'Merge import completed successfully.',
        percent: 100,
        timestamp: Date.now(),
      });

      return {
        success: true,
        operationId: opId,
        planId: plan.planId,
        insertedCounts,
        updatedCounts,
        skippedCount: plan.summary.skippedCount,
        conflictsResolvedCount: plan.summary.conflictsResolvedCount,
        durationMs: Date.now() - startTime,
        warnings,
      };
    } catch (err: any) {
      onProgress?.({
        stage: 'failed',
        message: `Merge import failed: ${err?.message || String(err)}`,
        percent: 100,
        timestamp: Date.now(),
      });

      return {
        success: false,
        operationId: opId,
        planId: plan.planId,
        insertedCounts: {},
        updatedCounts: {},
        skippedCount: 0,
        conflictsResolvedCount: 0,
        durationMs: Date.now() - startTime,
        warnings,
        error: {
          code: err?.code || 'MERGE_TRANSACTION_FAILED',
          message: err?.message || 'Merge import failed due to an unexpected error.',
          technicalDetails: err?.stack || String(err),
          isRecoverable: true,
        },
      };
    } finally {
      clearInterval(heartbeat);
      await this.recoveryStore.releaseLock(opId);
    }
  }

  /**
   * Post-merge data integrity checks.
   */
  private async verifyPostMerge(plan: MergeImportPlan): Promise<void> {
    // 1. Verify default workspace presence
    const workspaces = await this.database.workspaces.toArray();
    if (workspaces.length === 0) {
      throw new Error('Post-merge verification failed: No workspaces found in database.');
    }
    const defaultWsCount = workspaces.filter((w) => w.isDefault).length;
    if (defaultWsCount !== 1) {
      throw new Error(
        `Post-merge verification failed: Exactly 1 default workspace must exist, found ${defaultWsCount}.`
      );
    }

    // 2. Verify inserted records exist using count and boundary sample verification
    for (const [table, records] of Object.entries(plan.recordsToInsert)) {
      if (records.length === 0) continue;

      const totalCount = await (this.database as any)[table].count();
      if (totalCount < records.length) {
        throw new Error(
          `Post-merge verification failed: Table "${table}" has ${totalCount} records, expected at least ${records.length}.`
        );
      }

      // Sample verify boundary records (first, middle, last)
      const sampleIndices = Array.from(
        new Set([0, Math.floor(records.length / 2), records.length - 1])
      );

      for (const idx of sampleIndices) {
        const sample = (records as any[])[idx];
        if (sample?.id) {
          const found = await (this.database as any)[table].get(sample.id);
          if (!found) {
            throw new Error(
              `Post-merge verification failed: Record "${sample.id}" in table "${table}" was not found after merge.`
            );
          }
        }
      }
    }
  }
}
