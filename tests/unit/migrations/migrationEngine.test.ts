import { describe, it, expect, beforeEach } from 'vitest';
import { NookSpaceDB } from '../../../src/services/database/db';
import { NookSpaceRecoveryDB } from '../../../src/features/backup/recovery/recoveryDatabase';
import { MigrationRegistry } from '../../../src/features/migrations/registry/migrationRegistry';
import { MigrationJournalService } from '../../../src/features/migrations/journal/migrationJournalService';
import { MigrationEngine } from '../../../src/features/migrations/services/migrationEngine';
import { MigrationDefinition } from '../../../src/features/migrations/types/migrationTypes';

describe('MigrationEngine Suite — Milestone 9.5', () => {
  let db: NookSpaceDB;
  let recoveryDb: NookSpaceRecoveryDB;
  let registry: MigrationRegistry;
  let journalService: MigrationJournalService;
  let engine: MigrationEngine;
  let dbCounter = 0;

  beforeEach(async () => {
    const dbName = `test-engine-db-${Date.now()}-${++dbCounter}`;
    const rDbName = `test-engine-rdb-${Date.now()}-${++dbCounter}`;

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

  it('1. executes registered migrations in topological order and records journal entries', async () => {
    const executionOrder: string[] = [];

    const migA: MigrationDefinition = {
      id: 'step-a',
      name: 'Step A',
      description: 'First step',
      type: 'schema',
      dependencies: [],
      execute: async () => {
        executionOrder.push('step-a');
        return { success: true, recordsProcessed: 10, recordsModified: 5 };
      },
      verify: async () => ({ valid: true }),
    };

    const migB: MigrationDefinition = {
      id: 'step-b',
      name: 'Step B',
      description: 'Second step',
      type: 'entity',
      dependencies: ['step-a'],
      execute: async () => {
        executionOrder.push('step-b');
        return { success: true, recordsProcessed: 20, recordsModified: 15 };
      },
    };

    registry.register(migB);
    registry.register(migA);

    const result = await engine.runMigrations(db);

    expect(result.status).toBe('completed');
    expect(result.executedCount).toBe(2);
    expect(result.totalRecordsProcessed).toBe(30);
    expect(result.totalRecordsModified).toBe(20);
    expect(executionOrder).toEqual(['step-a', 'step-b']);

    // Check journal entries
    const journalEntries = await journalService.getJournalRecords();
    expect(journalEntries).toHaveLength(2);
    expect(journalEntries[0]?.status).toBe('completed');
    expect(journalEntries[1]?.status).toBe('completed');
    expect(journalEntries[0]?.migrationId).toBe('step-a');
    expect(journalEntries[1]?.migrationId).toBe('step-b');
  });

  it('2. satisfies idempotency: second invocation skips already completed migrations', async () => {
    let callCount = 0;

    const mig: MigrationDefinition = {
      id: 'mig-idempotent',
      name: 'Idempotent Test',
      description: 'Runs once',
      type: 'entity',
      execute: async () => {
        callCount++;
        return { success: true, recordsProcessed: 1, recordsModified: 1 };
      },
    };

    registry.register(mig);

    // First run
    const result1 = await engine.runMigrations(db);
    expect(result1.status).toBe('completed');
    expect(result1.executedCount).toBe(1);
    expect(callCount).toBe(1);

    // Second run
    const result2 = await engine.runMigrations(db);
    expect(result2.status).toBe('no_op');
    expect(result2.executedCount).toBe(0);
    expect(result2.skippedCount).toBe(1);
    expect(callCount).toBe(1); // not called again
  });

  it('3. rejects execution if cross-tab lock is held by another operation', async () => {
    // Acquire lock from an external simulated tab
    await recoveryDb.acquireLock('external-op-123', 'tab-other', 60000);

    registry.register({
      id: 'blocked-migration',
      name: 'Blocked Step',
      description: 'Should not run',
      type: 'schema',
      execute: async () => ({ success: true, recordsProcessed: 0, recordsModified: 0 }),
    });

    const result = await engine.runMigrations(db);

    expect(result.status).toBe('locked');
    expect(result.error).toMatch(/Migration lock held by operation "external-op-123"/);
    expect(result.executedCount).toBe(0);
  });

  it('4. halts execution and records failure when verification fails', async () => {
    const failingMig: MigrationDefinition = {
      id: 'failing-verify',
      name: 'Failing Verification Step',
      description: 'Fails verify pass',
      type: 'schema',
      execute: async () => ({ success: true, recordsProcessed: 1, recordsModified: 1 }),
      verify: async () => ({ valid: false, error: 'Database constraint violation' }),
    };

    const nextMig: MigrationDefinition = {
      id: 'unreachable-mig',
      name: 'Unreachable Step',
      description: 'Should not be executed',
      type: 'entity',
      dependencies: ['failing-verify'],
      execute: async () => ({ success: true, recordsProcessed: 0, recordsModified: 0 }),
    };

    registry.register(failingMig);
    registry.register(nextMig);

    const result = await engine.runMigrations(db);

    expect(result.status).toBe('failed');
    expect(result.error).toMatch(/Post-migration verification failed/);
    expect(result.executedCount).toBe(0);
    expect(result.failedCount).toBe(1);

    const journal = await journalService.getRecord('failing-verify');
    expect(journal?.status).toMatch(/failed|recovery_required/);
  });
});
