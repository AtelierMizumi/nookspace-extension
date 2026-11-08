import { migrateLegacyTodos, MigrationResult } from './legacyTodoMigration';
import {
  migrateLegacyQuickNotes,
  QuickNotesMigrationResult,
} from './legacyQuickNotesMigration';
import { NookSpaceDB, db } from '../db';
import { migrationEngine } from '../../../features/migrations/services/migrationEngine';
import { MigrationEngineResult } from '../../../features/migrations/types/migrationTypes';

let inFlightMigrationPromise: Promise<MigrationResult> | null = null;
let isMigrationDone = false;

let inFlightQuickNotesPromise: Promise<QuickNotesMigrationResult> | null = null;
let isQuickNotesMigrationDone = false;

/**
 * Runs the complete Migration Engine across all registered schema, entity,
 * relationship, and data normalization migrations with lock acquisition and journal logging.
 */
export async function runAllDatabaseMigrations(
  database: NookSpaceDB = db
): Promise<MigrationEngineResult> {
  return migrationEngine.runMigrations(database);
}

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
 * Ensures legacy scratchpad content from QuickNotesWidget instances is migrated to Dexie `notes` table.
 */
export async function ensureQuickNotesMigration(
  database: NookSpaceDB = db
): Promise<QuickNotesMigrationResult> {
  if (isQuickNotesMigrationDone) {
    return {
      instancesProcessed: 0,
      notesMigrated: 0,
      notesSkipped: 0,
      alreadyMigratedInstances: 0,
      status: 'completed',
      errors: [],
    };
  }

  if (inFlightQuickNotesPromise) {
    return inFlightQuickNotesPromise;
  }

  inFlightQuickNotesPromise = (async () => {
    try {
      const result = await migrateLegacyQuickNotes(database);
      if (result.status === 'completed') {
        isQuickNotesMigrationDone = true;
      }
      return result;
    } catch (err) {
      console.error('[migrationCoordinator] Unexpected error during quick notes migration:', err);
      return {
        instancesProcessed: 0,
        notesMigrated: 0,
        notesSkipped: 0,
        alreadyMigratedInstances: 0,
        status: 'failed',
        errors: [err instanceof Error ? err.message : String(err)],
      };
    } finally {
      inFlightQuickNotesPromise = null;
    }
  })();

  return inFlightQuickNotesPromise;
}

/**
 * Testing helper to reset coordinator state between unit test runs.
 */
export function _resetMigrationCoordinatorForTesting(): void {
  inFlightMigrationPromise = null;
  isMigrationDone = false;
  inFlightQuickNotesPromise = null;
  isQuickNotesMigrationDone = false;
}
