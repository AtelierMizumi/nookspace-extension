import { migrateLegacyTodos, MigrationResult } from './legacyTodoMigration';
import { NookSpaceDB, db } from '../db';

let inFlightMigrationPromise: Promise<MigrationResult> | null = null;
let isMigrationDone = false;

/**
 * Ensures legacy tasks from SimpleTodoWidget instances are migrated to Dexie `todos` table.
 *
 * Guarantees:
 * - Thread-safe / Concurrency-safe: Multiple concurrent callers share a single in-flight promise.
 * - Idempotent: Skips execution if already verified as done in current session.
 * - Non-blocking: If migration fails or is partial, it logs errors and returns the result
 *   without throwing an unhandled exception that could crash the Dashboard.
 */
export async function ensureTodoMigration(database: NookSpaceDB = db): Promise<MigrationResult> {
  if (isMigrationDone) {
    return {
      instancesProcessed: 0,
      tasksMigrated: 0,
      tasksSkipped: 0,
      alreadyMigratedInstances: 0,
      status: 'completed',
      instanceStatuses: [],
      errors: [],
    };
  }

  if (inFlightMigrationPromise) {
    return inFlightMigrationPromise;
  }

  inFlightMigrationPromise = (async () => {
    try {
      const result = await migrateLegacyTodos(database);
      if (result.status === 'completed') {
        isMigrationDone = true;
      }
      return result;
    } catch (err) {
      console.error('[migrationCoordinator] Unexpected error during legacy todo migration:', err);
      return {
        instancesProcessed: 0,
        tasksMigrated: 0,
        tasksSkipped: 0,
        alreadyMigratedInstances: 0,
        status: 'failed',
        instanceStatuses: [],
        errors: [err instanceof Error ? err.message : String(err)],
      };
    } finally {
      inFlightMigrationPromise = null;
    }
  })();

  return inFlightMigrationPromise;
}

/**
 * Testing helper to reset coordinator state between unit test runs.
 */
export function _resetMigrationCoordinatorForTesting(): void {
  inFlightMigrationPromise = null;
  isMigrationDone = false;
}
