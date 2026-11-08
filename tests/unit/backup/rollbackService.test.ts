import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import 'fake-indexeddb/auto';
import { NookSpaceDB } from '../../../src/services/database/db';
import { NookSpaceRecoveryDB } from '../../../src/features/backup/recovery/recoveryDatabase';
import { RollbackService } from '../../../src/features/backup/recovery/rollbackService';
import { calculatePayloadChecksum } from '../../../src/features/backup/services/backupIntegrityService';
import type { BackupDataV1 } from '../../../src/features/backup/types/backupTypes';

function createOriginalPayload(): BackupDataV1 {
  return {
    workspaces: [
      {
        id: 'ws-orig-1',
        name: 'Original Space',
        icon: 'LayoutGrid',
        isDefault: true,
        order: 0,
        createdAt: 1000,
        updatedAt: 1000,
      },
    ],
    settings: {
      id: 'current_settings',
      theme: 'dark',
      accentColor: '#10b981',
      fontFamily: 'Inter',
      fontSize: 'md',
      backgroundType: 'color',
      backgroundValue: '#000000',
      widgetOpacity: 95,
      widgetBlur: 5,
      activeWorkspaceId: 'ws-orig-1',
      updatedAt: 1000,
    },
    widgetInstances: [
      {
        id: 'inst-orig-1',
        workspaceId: 'ws-orig-1',
        widgetType: 'clock',
        title: 'Clock',
        config: {},
        isEnabled: true,
        order: 0,
        createdAt: 1000,
        updatedAt: 1000,
      },
    ],
    widgetLayouts: [
      {
        id: 'ws-orig-1_inst-orig-1_lg',
        workspaceId: 'ws-orig-1',
        widgetInstanceId: 'inst-orig-1',
        breakpoint: 'lg',
        x: 0,
        y: 0,
        w: 4,
        h: 4,
        isDefault: true,
        createdAt: 1000,
        updatedAt: 1000,
      },
    ],
    todos: [
      {
        id: 'todo-orig-1',
        workspaceId: 'ws-orig-1',
        title: 'Original Task',
        completed: false,
        priority: 'high',
        order: 0,
        createdAt: 1000,
        updatedAt: 1000,
      },
    ],
    notes: [
      {
        id: 'note-orig-1',
        workspaceId: 'ws-orig-1',
        collectionId: null,
        title: 'Original Note',
        content: 'Original Content',
        excerpt: 'Original Content',
        tags: ['orig'],
        isPinned: false,
        isFavorite: false,
        isArchived: false,
        order: 0,
        createdAt: 1000,
        updatedAt: 1000,
      },
    ],
    noteCollections: [],
    noteTags: [],
    noteBookmarkLinks: [],
    bookmarks: [
      {
        id: 'bm-orig-1',
        workspaceId: 'ws-orig-1',
        groupId: null,
        title: 'Original Link',
        url: 'https://original.site',
        isFavorite: true,
        order: 0,
        createdAt: 1000,
        updatedAt: 1000,
      },
    ],
    bookmarkGroups: [],
    focusSessions: [],
    dailyGoals: [],
    stickyNotes: [],
    vocabulary: [],
    resources: [],
    calendarEvents: [],
  };
}

describe('RollbackService', () => {
  let db: NookSpaceDB;
  let recoveryDb: NookSpaceRecoveryDB;
  let rollbackService: RollbackService;

  beforeEach(() => {
    db = new NookSpaceDB('test-rollback-db');
    recoveryDb = new NookSpaceRecoveryDB('test-rollback-recovery-db');
    rollbackService = new RollbackService(db, recoveryDb);
  });

  afterEach(async () => {
    await db.delete();
    await recoveryDb.delete();
  });

  it('rolls back database from snapshot to exact original state', async () => {
    const payload = createOriginalPayload();
    const checksum = await calculatePayloadChecksum(payload);
    const snapshotId = 'snap-orig-1';
    const operationId = 'op-rb-1';

    // 1. Save durable snapshot
    await recoveryDb.saveSnapshot({
      snapshotId,
      operationId,
      payload,
      itemCounts: {
        workspaces: 1,
        settings: 1,
        widgetInstances: 1,
        widgetLayouts: 1,
        todos: 1,
        notes: 1,
        noteCollections: 0,
        noteTags: 0,
        noteBookmarkLinks: 0,
        bookmarks: 1,
        bookmarkGroups: 0,
        focusSessions: 0,
        dailyGoals: 0,
        stickyNotes: 0,
        vocabulary: 0,
        resources: 0,
        calendarEvents: 0,
      },
      databaseSchemaVersion: 4,
      checksum,
    });

    await recoveryDb.saveJournal({
      operationId,
      snapshotId,
      state: 'restore_started',
      backupMetadata: {} as any,
    });

    // 2. Put corrupted / different data in database simulating failed restore
    await db.workspaces.put({
      id: 'ws-corrupted',
      name: 'Corrupted Space',
      icon: 'Trash',
      isDefault: true,
      order: 0,
      createdAt: 2000,
      updatedAt: 2000,
    });

    // 3. Execute rollback
    const result = await rollbackService.rollbackFromSnapshot({
      snapshotId,
      operationId,
    });

    expect(result.success).toBe(true);
    expect(result.snapshotId).toBe(snapshotId);

    // Verify database returned to original state
    const workspaces = await db.workspaces.toArray();
    expect(workspaces).toHaveLength(1);
    expect(workspaces[0].id).toBe('ws-orig-1');
    expect(workspaces[0].name).toBe('Original Space');

    const todos = await db.todos.toArray();
    expect(todos).toHaveLength(1);
    expect(todos[0].title).toBe('Original Task');

    const journal = await recoveryDb.getJournal(operationId);
    expect(journal?.state).toBe('rollback_completed');
  });

  it('fails with RECOVERY_SNAPSHOT_MISSING and sets journal to recovery_required if snapshot missing', async () => {
    const operationId = 'op-missing';
    await recoveryDb.saveJournal({
      operationId,
      snapshotId: 'snap-ghost',
      state: 'restore_started',
      backupMetadata: {} as any,
    });

    await expect(
      rollbackService.rollbackFromSnapshot({
        snapshotId: 'snap-ghost',
        operationId,
      })
    ).rejects.toMatchObject({
      code: 'RECOVERY_SNAPSHOT_MISSING',
    });

    const journal = await recoveryDb.getJournal(operationId);
    expect(journal?.state).toBe('recovery_required');
  });

  it('fails with RECOVERY_SNAPSHOT_CORRUPTED and sets journal to recovery_required if snapshot corrupted', async () => {
    const payload = createOriginalPayload();
    const snapshotId = 'snap-tampered';
    const operationId = 'op-tampered';

    await recoveryDb.saveSnapshot({
      snapshotId,
      operationId,
      payload,
      itemCounts: { workspaces: 1 },
      databaseSchemaVersion: 4,
      checksum: 'bad-checksum-hash',
    });

    await recoveryDb.saveJournal({
      operationId,
      snapshotId,
      state: 'restore_started',
      backupMetadata: {} as any,
    });

    await expect(
      rollbackService.rollbackFromSnapshot({
        snapshotId,
        operationId,
      })
    ).rejects.toMatchObject({
      code: 'RECOVERY_SNAPSHOT_CORRUPTED',
    });

    const journal = await recoveryDb.getJournal(operationId);
    expect(journal?.state).toBe('recovery_required');
  });

  it('is idempotent: executing rollback multiple times yields identical clean database state', async () => {
    const payload = createOriginalPayload();
    const checksum = await calculatePayloadChecksum(payload);
    const snapshotId = 'snap-idempotent';
    const operationId = 'op-idempotent';

    await recoveryDb.saveSnapshot({
      snapshotId,
      operationId,
      payload,
      itemCounts: {
        workspaces: 1,
        settings: 1,
        widgetInstances: 1,
        widgetLayouts: 1,
        todos: 1,
        notes: 1,
        noteCollections: 0,
        noteTags: 0,
        noteBookmarkLinks: 0,
        bookmarks: 1,
        bookmarkGroups: 0,
        focusSessions: 0,
        dailyGoals: 0,
        stickyNotes: 0,
        vocabulary: 0,
        resources: 0,
        calendarEvents: 0,
      },
      databaseSchemaVersion: 4,
      checksum,
    });

    await recoveryDb.saveJournal({
      operationId,
      snapshotId,
      state: 'restore_started',
      backupMetadata: {} as any,
    });

    // Run rollback twice
    await rollbackService.rollbackFromSnapshot({ snapshotId, operationId });
    const result2 = await rollbackService.rollbackFromSnapshot({ snapshotId, operationId });

    expect(result2.success).toBe(true);

    const workspaces = await db.workspaces.toArray();
    expect(workspaces).toHaveLength(1);
    expect(workspaces[0].id).toBe('ws-orig-1');
  });
});
