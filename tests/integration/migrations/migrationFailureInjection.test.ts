import { describe, it, expect, beforeEach } from 'vitest';
import { NookSpaceDB } from '../../../src/services/database/db';
import { NookSpaceRecoveryDB } from '../../../src/features/backup/recovery/recoveryDatabase';
import { MigrationRegistry } from '../../../src/features/migrations/registry/migrationRegistry';
import { MigrationJournalService } from '../../../src/features/migrations/journal/migrationJournalService';
import { MigrationEngine } from '../../../src/features/migrations/services/migrationEngine';
import { MigrationDefinition } from '../../../src/features/migrations/types/migrationTypes';
import { StartupRecoveryCoordinator } from '../../../src/features/backup/recovery/startupRecoveryCoordinator';

describe('Migration Failure Injection & Recovery Integration Suite — Milestone 9.5', () => {
  let db: NookSpaceDB;
  let recoveryDb: NookSpaceRecoveryDB;
  let registry: MigrationRegistry;
  let journalService: MigrationJournalService;
  let engine: MigrationEngine;
  let dbCounter = 0;

  beforeEach(async () => {
    const dbName = `test-fail-inj-db-${Date.now()}-${++dbCounter}`;
    const rDbName = `test-fail-inj-rdb-${Date.now()}-${++dbCounter}`;

    db = new NookSpaceDB(dbName);
    await db.open();

    recoveryDb = new NookSpaceRecoveryDB(rDbName);
    await recoveryDb.open();

    registry = new MigrationRegistry();
    journalService = new MigrationJournalService(recoveryDb);

    engine = new MigrationEngine({
      registry,
      journalService,
      recoveryDatabase: recoveryDb,
    });
  });

  it('1. triggers rollback handler and marks journal when migration step fails', async () => {
    let rollbackCalled = false;
    let step2Called = false;

    const failingMig: MigrationDefinition = {
      id: 'step-with-failure',
      name: 'Step With Failure',
      description: 'Throws simulated IO exception',
      type: 'entity',
      dependencies: [],
      execute: async () => {
        throw new Error('Simulated IO error: IndexedDB quota exceeded');
      },
      rollback: async () => {
        rollbackCalled = true;
        return { success: true, recordsProcessed: 0, recordsModified: 0 };
      },
    };

    const nextMig: MigrationDefinition = {
      id: 'step-dependent',
      name: 'Dependent Step',
      description: 'Must not execute after failure',
      type: 'entity',
      dependencies: ['step-with-failure'],
      execute: async () => {
        step2Called = true;
        return { success: true, recordsProcessed: 0, recordsModified: 0 };
      },
    };

    registry.register(failingMig);
    registry.register(nextMig);

    const result = await engine.runMigrations(db);

    expect(result.status).toBe('failed');
    expect(result.error).toContain('Simulated IO error: IndexedDB quota exceeded');
    expect(rollbackCalled).toBe(true);
    expect(step2Called).toBe(false);

    // Journal status should be 'failed'
    const record = await journalService.getRecord('step-with-failure');
    expect(record?.status).toBe('failed');
    expect(record?.error).toContain('Simulated IO error');
  });

  it('2. recovers idempotently on next invocation once failure condition is resolved', async () => {
    let shouldFail = true;

    const flakyMig: MigrationDefinition = {
      id: 'flaky-mig',
      name: 'Flaky Migration',
      description: 'Fails first, succeeds second',
      type: 'entity',
      dependencies: [],
      execute: async () => {
        if (shouldFail) {
          throw new Error('Transient network/storage glitch');
        }
        return { success: true, recordsProcessed: 5, recordsModified: 5 };
      },
      verify: async () => ({ valid: true }),
    };

    registry.register(flakyMig);

    // 1st run fails
    const result1 = await engine.runMigrations(db);
    expect(result1.status).toBe('failed');

    // Resolve glitch
    shouldFail = false;

    // 2nd run recovers
    const result2 = await engine.runMigrations(db);
    expect(result2.status).toBe('completed');
    expect(result2.executedCount).toBe(1);

    const record = await journalService.getRecord('flaky-mig');
    expect(record?.status).toBe('completed');
    expect(record?.recordsProcessed).toBe(5);
  });

  it('3. recovers safely from crash during migration writes, ensuring data integrity on reboot', async () => {
    // 1. Setup initial state: a widget with unmigrated items
    await db.widgetInstances.put({
      id: 'wi-interrupted-todo',
      workspaceId: 'ws-default-personal',
      widgetType: 'simple-todo',
      title: 'Interrupted Todo',
      config: {
        tasks: [
          { id: 'task-1', title: 'Task One', completed: false },
          { id: 'task-2', title: 'Task Two', completed: true },
        ],
      },
      isEnabled: true,
      order: 0,
      createdAt: 1000,
      updatedAt: 1000,
    });

    // 2. Simulate crashed run: migration wrote task-1 to DB but process crashed before finishing
    await db.todos.put({
      id: 'todo-migrated-task-1',
      workspaceId: 'ws-default-personal',
      title: 'Task One',
      completed: false,
      priority: 'medium',
      order: 0,
      createdAt: 1000,
      updatedAt: 1000,
    });

    // Process crashed: journal was left in 'running', lock left active
    await recoveryDb.saveMigrationJournalRecord({
      migrationId: 'crash-recovery-todo-mig',
      name: 'Crash Recovery Todo Migration',
      type: 'entity',
      status: 'running',
      startedAt: Date.now() - 50000,
      durationMs: 0,
      recordsProcessed: 1,
      recordsModified: 1,
    });
    await recoveryDb.acquireLock('crash-recovery-todo-mig', 'tab-crashed', 60000);

    // 3. Browser restarts: StartupRecoveryCoordinator evaluates recovery journal
    const startupCoordinator = new StartupRecoveryCoordinator(db, recoveryDb);
    const recoveryResult = await startupCoordinator.checkAndHandleStartupRecovery();

    expect(recoveryResult.status).toBe('abandoned_clean');
    expect(recoveryResult.message).toContain('Cleaned up 1 interrupted migration operations');

    // Verify journal status is now 'failed' (interrupted)
    const journalAfterReboot = await journalService.getRecord('crash-recovery-todo-mig');
    expect(journalAfterReboot?.status).toBe('failed');
    expect(journalAfterReboot?.error).toContain('MIGRATION_INTERRUPTED');

    // 4. Register idempotent migration step that checks existing todos before inserting
    let executionCount = 0;
    const idempotentMig: MigrationDefinition = {
      id: 'crash-recovery-todo-mig',
      name: 'Crash Recovery Todo Migration',
      description: 'Idempotently finishes migration without duplicating data',
      type: 'entity',
      dependencies: [],
      execute: async (targetDb) => {
        executionCount++;
        const widget = await targetDb.widgetInstances.get('wi-interrupted-todo');
        const tasks = (widget?.config as { tasks?: Array<{ id: string; title: string; completed: boolean }> })?.tasks || [];
        
        let modified = 0;
        for (const t of tasks) {
          const targetId = `todo-migrated-${t.id}`;
          const existing = await targetDb.todos.get(targetId);
          if (!existing) {
            await targetDb.todos.put({
              id: targetId,
              workspaceId: 'ws-default-personal',
              title: t.title,
              completed: t.completed,
              priority: 'medium',
              order: 1,
              createdAt: 2000,
              updatedAt: 2000,
            });
            modified++;
          }
        }
        return { success: true, recordsProcessed: tasks.length, recordsModified: modified };
      },
      verify: async (targetDb) => {
        const count = await targetDb.todos.where('workspaceId').equals('ws-default-personal').count();
        return { valid: count === 2 };
      },
    };
    registry.register(idempotentMig);

    // 5. Run migration engine after recovery
    const runResult = await engine.runMigrations(db);

    expect(runResult.status).toBe('completed');
    expect(runResult.executedCount).toBe(1);
    expect(executionCount).toBe(1);

    // 6. Verify data integrity: exactly 2 todos exist, no duplicates, task-1 not overwritten, task-2 inserted
    const allTodos = await db.todos.where('workspaceId').equals('ws-default-personal').toArray();
    expect(allTodos.length).toBe(2);
    expect(allTodos.find((t) => t.id === 'todo-migrated-task-1')?.completed).toBe(false);
    expect(allTodos.find((t) => t.id === 'todo-migrated-task-2')?.completed).toBe(true);

    // Journal status is now 'completed'
    const finalJournal = await journalService.getRecord('crash-recovery-todo-mig');
    expect(finalJournal?.status).toBe('completed');
  });
});
