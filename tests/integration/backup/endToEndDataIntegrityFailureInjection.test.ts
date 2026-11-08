import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import 'fake-indexeddb/auto';
import { NookSpaceDB } from '../../../src/services/database/db';
import { NookSpaceRecoveryDB } from '../../../src/features/backup/recovery/recoveryDatabase';
import { RestoreEngineService } from '../../../src/features/backup/services/restoreEngineService';
import { MergeEngineService } from '../../../src/features/backup/services/mergeEngineService';
import { MergePlannerService } from '../../../src/features/backup/services/mergePlannerService';
import { BackupValidationService } from '../../../src/features/backup/services/backupValidationService';
import { StartupRecoveryCoordinator } from '../../../src/features/backup/recovery/startupRecoveryCoordinator';
import { MigrationEngine } from '../../../src/features/migrations/services/migrationEngine';
import { MigrationRegistry } from '../../../src/features/migrations/registry/migrationRegistry';
import { MigrationJournalService } from '../../../src/features/migrations/journal/migrationJournalService';
import { calculateBackupChecksum } from '../../../src/features/backup/services/backupIntegrityService';

describe('End-to-End Data Integrity Failure Injection Quality Gate — Milestone 9.6', () => {
  let db: NookSpaceDB;
  let recoveryDb: NookSpaceRecoveryDB;
  let restoreSvc: RestoreEngineService;
  let mergeSvc: MergeEngineService;
  let mergePlanner: MergePlannerService;
  let validator: BackupValidationService;
  let startupCoordinator: StartupRecoveryCoordinator;

  let dbCounter = 0;
  const getNextName = (prefix: string) => `test-e2e-fail-${prefix}-${Date.now()}-${++dbCounter}`;

  beforeEach(async () => {
    const mainDbName = getNextName('main');
    const recDbName = getNextName('rec');

    db = new NookSpaceDB(mainDbName);
    recoveryDb = new NookSpaceRecoveryDB(recDbName);
    await db.open();
    await recoveryDb.open();

    restoreSvc = new RestoreEngineService(db, recoveryDb);
    mergeSvc = new MergeEngineService(db, recoveryDb);
    mergePlanner = new MergePlannerService(db);
    validator = new BackupValidationService();
    startupCoordinator = new StartupRecoveryCoordinator(db, recoveryDb);

    // Seed baseline workspace & note
    await db.workspaces.put({
      id: 'ws-baseline',
      name: 'Baseline Workspace',
      icon: 'Shield',
      color: '#6366f1',
      isDefault: true,
      order: 0,
      createdAt: 1000,
      updatedAt: 1000,
    });
    await db.notes.put({
      id: 'note-baseline',
      workspaceId: 'ws-baseline',
      collectionId: null,
      title: 'Original Pristine Note',
      content: 'Critical user knowledge',
      excerpt: 'Critical user knowledge',
      isPinned: false,
      isFavorite: false,
      isArchived: false,
      tags: [],
      order: 0,
      createdAt: 1000,
      updatedAt: 1000,
    });
  });

  afterEach(async () => {
    await db.delete();
    await recoveryDb.delete();
  });

  it('1. rejects invalid backup with corrupted checksum without modifying database', async () => {
    const corruptedBackup = {
      format: 'nookspace-backup',
      formatVersion: 1,
      metadata: {
        backupId: 'corrupt-1',
        createdAt: Date.now(),
        exportedAt: new Date().toISOString(),
        appVersion: '0.1.0',
        databaseSchemaVersion: 4,
        exportType: 'full',
        itemCounts: { workspaces: 1 },
        integrity: {
          algorithm: 'SHA-256',
          checksum: 'invalid-tampered-sha256-checksum-1234567890abcdef',
          payloadLength: 100,
        },
      },
      data: {
        workspaces: [
          {
            id: 'ws-tampered',
            name: 'Tampered Workspace',
            icon: 'Alert',
            color: '#ef4444',
            isDefault: true,
            order: 0,
            createdAt: 2000,
            updatedAt: 2000,
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
    };

    // Validation must fail
    const report = await validator.validateBackup(corruptedBackup);
    expect(report.isValid).toBe(false);
    expect(report.errors.some((e) => e.code.includes('CHECKSUM'))).toBe(true);

    // Attempting restore must fail
    const restoreRes = await restoreSvc.restoreBackup(corruptedBackup as any);
    expect(restoreRes.success).toBe(false);
    expect(restoreRes.error?.code).toBe('BACKUP_VALIDATION_FAILED');

    // Database must remain 100% unchanged
    const pristineNote = await db.notes.get('note-baseline');
    expect(pristineNote?.title).toBe('Original Pristine Note');
    expect(await db.workspaces.get('ws-tampered')).toBeUndefined();
  });

  it('2. aborts restore and preserves data when recovery snapshot creation fails', async () => {
    const validData = {
      workspaces: [
        {
          id: 'ws-incoming',
          name: 'Incoming Workspace',
          icon: 'Sparkles',
          color: '#10b981',
          isDefault: true,
          order: 0,
          createdAt: 2000,
          updatedAt: 2000,
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
    };

    const validBackup = {
      format: 'nookspace-backup' as const,
      formatVersion: 1 as const,
      metadata: {
        backupId: 'backup-valid',
        createdAt: Date.now(),
        exportedAt: Date.now(),
        appVersion: '0.1.0',
        databaseSchemaVersion: 4,
        exportType: 'full' as const,
        itemCounts: { workspaces: 1 },
        integrity: {
          algorithm: 'SHA-256' as const,
          checksum: '',
          payloadLength: 0,
        },
      },
      data: validData,
    };

    validBackup.metadata.integrity.checksum = await calculateBackupChecksum(validBackup);

    // Inject failure at snapshot creation stage
    const snapResult = await restoreSvc.restoreBackup(validBackup, {
      failureInjection: {
        stage: 'during_snapshot',
        customMessage: 'Simulated Disk Quota Exceeded on Recovery DB',
      },
    });

    expect(snapResult.success).toBe(false);
    expect(snapResult.error?.message).toContain('Simulated Disk Quota Exceeded');

    // Verify pristine baseline note and workspace are intact
    expect(await db.notes.get('note-baseline')).toBeDefined();
    expect(await db.workspaces.get('ws-incoming')).toBeUndefined();
  });

  it('3. triggers automatic rollback from snapshot when restore transaction fails', async () => {
    const validData = {
      workspaces: [
        {
          id: 'ws-incoming',
          name: 'Incoming Workspace',
          icon: 'Sparkles',
          color: '#10b981',
          isDefault: true,
          order: 0,
          createdAt: 2000,
          updatedAt: 2000,
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
    };

    const validBackup = {
      format: 'nookspace-backup' as const,
      formatVersion: 1 as const,
      metadata: {
        backupId: 'b-tx-fail',
        createdAt: Date.now(),
        exportedAt: Date.now(),
        appVersion: '0.1.0',
        databaseSchemaVersion: 4,
        exportType: 'full' as const,
        itemCounts: { workspaces: 1 },
        integrity: {
          algorithm: 'SHA-256' as const,
          checksum: '',
          payloadLength: 0,
        },
      },
      data: validData,
    };
    validBackup.metadata.integrity.checksum = await calculateBackupChecksum(validBackup);

    // Inject failure inside restore transaction
    const txResult = await restoreSvc.restoreBackup(validBackup, {
      failureInjection: {
        stage: 'during_restore_tx',
        customMessage: 'Simulated IO Error mid-transaction',
      },
    });

    expect(txResult.success).toBe(false);
    expect(txResult.rollbackOccurred).toBe(true);

    // Rollback must have restored pristine baseline note
    const note = await db.notes.get('note-baseline');
    expect(note).toBeDefined();
    expect(note?.title).toBe('Original Pristine Note');
  });

  it('4. detects stale merge plan when database is modified in-place and aborts merge safely', async () => {
    const backupForMerge = {
      format: 'nookspace-backup' as const,
      formatVersion: 1 as const,
      metadata: {
        backupId: 'b-merge',
        createdAt: Date.now(),
        exportedAt: Date.now(),
        appVersion: '0.1.0',
        databaseSchemaVersion: 4,
        exportType: 'full' as const,
        itemCounts: { todos: 1, workspaces: 1 },
        integrity: { algorithm: 'SHA-256' as const, checksum: '', payloadLength: 0 },
      },
      data: {
        workspaces: [
          {
            id: 'ws-src',
            name: 'Source Space',
            icon: 'Sparkles',
            color: '#6366f1',
            isDefault: true,
            order: 0,
            createdAt: 1000,
            updatedAt: 1000,
          },
        ],
        settings: null,
        widgetInstances: [],
        widgetLayouts: [],
        todos: [
          {
            id: 'todo-incoming',
            workspaceId: 'ws-src',
            title: 'Incoming Task',
            completed: false,
            priority: 'high' as const,
            order: 0,
            createdAt: 2000,
            updatedAt: 2000,
          },
        ],
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
    };
    backupForMerge.metadata.integrity.checksum = await calculateBackupChecksum(backupForMerge);

    const options = {
      selectedGroups: ['tasks' as const, 'notes' as const],
      skipChecksumVerification: true,
      targetWorkspaceId: 'ws-baseline',
    };

    // Generate preview & plan
    const preview = await mergePlanner.generatePreview(backupForMerge, options);
    const plan = await mergePlanner.buildMergePlan(preview, backupForMerge, options);

    // Modify existing note in-place (updating updatedAt) without changing table count
    await db.notes.update('note-baseline', {
      content: 'Modified content while merge dialog was open',
      updatedAt: Date.now() + 5000,
    });

    // Attempt to apply merge plan
    const result = await mergeSvc.executeMerge(plan, options);

    // Merge must detect stale plan and abort without applying incoming todo!
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('MERGE_STALE_PLAN');
    expect(await db.todos.get('todo-incoming')).toBeUndefined();
  });

  it('5. startup recovery coordinator recovers interrupted migration on startup', async () => {
    // Simulate process crash during migration: record was left in 'running' state
    await recoveryDb.saveMigrationJournalRecord({
      migrationId: 'crashed-migration-step',
      name: 'Crashed Step',
      type: 'entity',
      status: 'running',
      startedAt: Date.now() - 50000,
      durationMs: 0,
      recordsProcessed: 5,
      recordsModified: 0,
    });

    // Lock was also left expired in database
    await recoveryDb.locks.put({
      id: 'current_restore_lock',
      operationId: 'crashed-migration-step',
      acquiredAt: Date.now() - 70000,
      leaseExpiresAt: Date.now() - 10000,
      tabId: 'crashed-tab',
    });

    // Run startup recovery
    const recoveryResult = await startupCoordinator.checkAndHandleStartupRecovery();

    expect(recoveryResult.status).toBe('abandoned_clean');
    expect(recoveryResult.message).toContain('Cleaned up 1 interrupted migration operations');

    // Migration journal must now be updated to 'failed' with descriptive crash error
    const migRecord = await recoveryDb.getMigrationJournalRecord('crashed-migration-step');
    expect(migRecord?.status).toBe('failed');
    expect(migRecord?.error).toContain('MIGRATION_INTERRUPTED');

    // Stale lock must be cleanly released
    const lock = await recoveryDb.locks.get('current_restore_lock');
    expect(lock).toBeUndefined();
  });
});
