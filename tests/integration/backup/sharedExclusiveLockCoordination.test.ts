import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import 'fake-indexeddb/auto';
import { NookSpaceDB } from '../../../src/services/database/db';
import { NookSpaceRecoveryDB } from '../../../src/features/backup/recovery/recoveryDatabase';
import { RestoreEngineService } from '../../../src/features/backup/services/restoreEngineService';
import { MergeEngineService } from '../../../src/features/backup/services/mergeEngineService';
import { MigrationEngine } from '../../../src/features/migrations/services/migrationEngine';
import { MigrationRegistry } from '../../../src/features/migrations/registry/migrationRegistry';
import { MigrationJournalService } from '../../../src/features/migrations/journal/migrationJournalService';
import type { MergeImportPlan } from '../../../src/features/backup/types/mergeTypes';

describe('Shared Exclusive Lock Coordination Integration Suite — Milestone 9.6', () => {
  let db: NookSpaceDB;
  let recoveryDb: NookSpaceRecoveryDB;
  let restoreService: RestoreEngineService;
  let mergeService: MergeEngineService;
  let migrationEngine: MigrationEngine;
  let migrationRegistry: MigrationRegistry;
  let migrationJournal: MigrationJournalService;

  let dbCounter = 0;
  const getNextName = (prefix: string) => `test-lock-${prefix}-${Date.now()}-${++dbCounter}`;

  beforeEach(async () => {
    const mainDbName = getNextName('main');
    const recDbName = getNextName('recovery');

    db = new NookSpaceDB(mainDbName);
    recoveryDb = new NookSpaceRecoveryDB(recDbName);
    await db.open();
    await recoveryDb.open();

    restoreService = new RestoreEngineService(db, recoveryDb);
    mergeService = new MergeEngineService(db, recoveryDb);

    migrationRegistry = new MigrationRegistry();
    migrationJournal = new MigrationJournalService(recoveryDb);
    migrationEngine = new MigrationEngine({
      registry: migrationRegistry,
      journalService: migrationJournal,
      recoveryDatabase: recoveryDb,
      autoRegisterDefaults: false,
    });
  });

  afterEach(async () => {
    await db.delete();
    await recoveryDb.delete();
  });

  it('1. prevents Migration Engine from running while Restore lock is active', async () => {
    // Acquire exclusive lock as Restore operation
    const restoreLock = await recoveryDb.acquireLock('op-restore-active', 'tab-restore', 60000);
    expect(restoreLock.acquired).toBe(true);

    // Register a migration
    migrationRegistry.register({
      id: 'test-mig-step',
      name: 'Test Step',
      description: 'Should not run',
      type: 'entity',
      execute: async () => ({ success: true, recordsProcessed: 1, recordsModified: 1 }),
    });

    // Attempt migration while restore lock is held
    const migResult = await migrationEngine.runMigrations(db);

    expect(migResult.status).toBe('locked');
    expect(migResult.executedCount).toBe(0);
    expect(migResult.error).toContain('op-restore-active');
  });

  it('2. prevents Restore from running while Migration lock is active', async () => {
    // Acquire exclusive lock as Migration operation
    const migLock = await recoveryDb.acquireLock('op-migration-active', 'tab-migration', 60000);
    expect(migLock.acquired).toBe(true);

    // Attempt restore while migration lock is held
    const restoreResult = await restoreService.restoreBackup({
      format: 'nookspace-backup',
      formatVersion: 1,
      metadata: {
        backupId: 'b-1',
        createdAt: Date.now(),
        exportedAt: Date.now(),
        appVersion: '0.1.0',
        databaseSchemaVersion: 4,
        exportType: 'full',
        itemCounts: { workspaces: 1 },
        integrity: { algorithm: 'SHA-256', checksum: 'dummy', payloadLength: 10 },
      },
      data: {
        workspaces: [
          {
            id: 'ws-test',
            name: 'Test Space',
            icon: 'Sparkles',
            color: '#6366f1',
            isDefault: true,
            order: 0,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
        ],
        settings: null,
        widgetInstances: [],
        widgetLayouts: [],
        todos: [],
        notes: [],
        noteCollections: [],
        noteTags: [],
        noteBookmarkLinks: [],
        bookmarks: [],
        bookmarkGroups: [],
        focusSessions: [],
        dailyGoals: [],
        stickyNotes: [],
        vocabulary: [],
        resources: [],
        calendarEvents: [],
      },
    });

    expect(restoreResult.success).toBe(false);
    expect(restoreResult.finalState).toBe('failed');
    expect(restoreResult.error?.code).toBe('RESTORE_ALREADY_RUNNING');
  });

  it('3. prevents Merge from running while Migration lock is active', async () => {
    // Acquire exclusive lock as Migration operation
    await recoveryDb.acquireLock('op-migration-123', 'tab-migration', 60000);

    const dummyPlan: MergeImportPlan = {
      planId: 'plan-1',
      createdAt: Date.now(),
      planToken: 'dummy-token',
      selectedGroups: ['workspaces' as const],
      recordsToInsert: {},
      recordsToUpdate: {},
      skippedEntityIds: [],
      idMappings: {},
      summary: {
        toInsertCount: 0,
        toUpdateCount: 0,
        skippedCount: 0,
        conflictsResolvedCount: 0,
      },
    };

    const dummyOptions = {
      selectedGroups: ['workspaces' as const],
      skipChecksumVerification: true,
    };

    const mergeResult = await mergeService.executeMerge(dummyPlan, dummyOptions);

    expect(mergeResult.success).toBe(false);
    expect(mergeResult.error?.code).toBe('MERGE_LOCK_CONFLICT');
  });

  it('3b. prevents Merge from running while Restore lock is active', async () => {
    // Acquire exclusive lock as Restore operation
    await recoveryDb.acquireLock('op-restore-456', 'tab-restore', 60000);

    const dummyPlan: MergeImportPlan = {
      planId: 'plan-2',
      createdAt: Date.now(),
      planToken: 'dummy-token-2',
      selectedGroups: ['workspaces' as const],
      recordsToInsert: {},
      recordsToUpdate: {},
      skippedEntityIds: [],
      idMappings: {},
      summary: {
        toInsertCount: 0,
        toUpdateCount: 0,
        skippedCount: 0,
        conflictsResolvedCount: 0,
      },
    };

    const dummyOptions = {
      selectedGroups: ['workspaces' as const],
      skipChecksumVerification: true,
    };

    const mergeResult = await mergeService.executeMerge(dummyPlan, dummyOptions);

    expect(mergeResult.success).toBe(false);
    expect(mergeResult.error?.code).toBe('MERGE_LOCK_CONFLICT');
  });

  it('3c. prevents Migration from running while Merge lock is active', async () => {
    // Acquire exclusive lock as Merge operation
    await recoveryDb.acquireLock('op-merge-active', 'tab-merge', 60000);

    // Register a migration
    migrationRegistry.register({
      id: 'test-mig-step-2',
      name: 'Test Step 2',
      description: 'Should not run during merge',
      type: 'entity',
      execute: async () => ({ success: true, recordsProcessed: 1, recordsModified: 1 }),
    });

    const migResult = await migrationEngine.runMigrations(db);

    expect(migResult.status).toBe('locked');
    expect(migResult.executedCount).toBe(0);
    expect(migResult.error).toContain('op-merge-active');
  });

  it('4. ensures non-owners cannot release another operation lock', async () => {
    await recoveryDb.acquireLock('legitimate-op-owner', 'tab-1', 60000);

    // Impostor operation attempts to release lock
    await recoveryDb.releaseLock('impostor-op');

    // Verify lock is STILL actively held by legitimate owner
    const lockCheck = await recoveryDb.checkLock('legitimate-op-owner');
    expect(lockCheck.isLocked).toBe(true);
    expect(lockCheck.isOwner).toBe(true);
    expect(lockCheck.currentOwner).toBe('legitimate-op-owner');

    // Impostor check reports not owner
    const impostorCheck = await recoveryDb.checkLock('impostor-op');
    expect(impostorCheck.isLocked).toBe(true);
    expect(impostorCheck.isOwner).toBe(false);

    // Legitimate owner can release
    await recoveryDb.releaseLock('legitimate-op-owner');
    const finalCheck = await recoveryDb.checkLock();
    expect(finalCheck.isLocked).toBe(false);
  });

  it('5. allows expired lock leases to be reclaimed cleanly by new operations', async () => {
    // Put an already expired lock in the DB (lease expired 10 seconds ago)
    await recoveryDb.locks.put({
      id: 'current_restore_lock',
      operationId: 'crashed-stale-op',
      acquiredAt: Date.now() - 70000,
      leaseExpiresAt: Date.now() - 10000,
      tabId: 'tab-crashed',
    });

    // Check lock
    const statusBefore = await recoveryDb.checkLock();
    expect(statusBefore.isLocked).toBe(false); // expired is not locked

    // New operation acquires lock
    const acquireResult = await recoveryDb.acquireLock('new-fresh-op', 'tab-fresh', 60000);
    expect(acquireResult.acquired).toBe(true);

    const statusAfter = await recoveryDb.checkLock('new-fresh-op');
    expect(statusAfter.isLocked).toBe(true);
    expect(statusAfter.isOwner).toBe(true);
    expect(statusAfter.currentOwner).toBe('new-fresh-op');
  });

  it('6. restricts renewLock heartbeat to current owner and extends lease duration', async () => {
    const start = Date.now();
    await recoveryDb.acquireLock('owner-heartbeat', 'tab-hb', 30000);

    // Impostor renew fails
    const impostorRenew = await recoveryDb.renewLock('wrong-op', 60000);
    expect(impostorRenew).toBe(false);

    // Owner renew succeeds
    const ownerRenew = await recoveryDb.renewLock('owner-heartbeat', 90000);
    expect(ownerRenew).toBe(true);

    const lock = await recoveryDb.locks.get('current_restore_lock');
    expect(lock?.leaseExpiresAt).toBeGreaterThan(start + 80000);
  });
});
