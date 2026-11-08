import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import 'fake-indexeddb/auto';
import { NookSpaceDB } from '../../../src/services/database/db';
import { NookSpaceRecoveryDB } from '../../../src/features/backup/recovery/recoveryDatabase';
import { StartupRecoveryCoordinator } from '../../../src/features/backup/recovery/startupRecoveryCoordinator';
import { calculatePayloadChecksum } from '../../../src/features/backup/services/backupIntegrityService';
import type { BackupDataV1 } from '../../../src/features/backup/types/backupTypes';

function createSamplePayload(): BackupDataV1 {
  return {
    workspaces: [
      {
        id: 'ws-baseline-1',
        name: 'Baseline Space',
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
      accentColor: '#3b82f6',
      fontFamily: 'Inter',
      fontSize: 'md',
      backgroundType: 'color',
      backgroundValue: '#0f172a',
      widgetOpacity: 90,
      widgetBlur: 10,
      activeWorkspaceId: 'ws-baseline-1',
      updatedAt: 1000,
    },
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
}

describe('StartupRecoveryCoordinator', () => {
  let db: NookSpaceDB;
  let recoveryDb: NookSpaceRecoveryDB;
  let coordinator: StartupRecoveryCoordinator;

  beforeEach(() => {
    db = new NookSpaceDB('test-startup-db');
    recoveryDb = new NookSpaceRecoveryDB('test-startup-recovery-db');
    coordinator = new StartupRecoveryCoordinator(db, recoveryDb);
  });

  afterEach(async () => {
    await db.delete();
    await recoveryDb.delete();
  });

  it('returns clean status when no incomplete journal exists', async () => {
    const result = await coordinator.checkAndHandleStartupRecovery();
    expect(result.status).toBe('clean');
  });

  it('safely cleans up operation interrupted in preparing state without touching database', async () => {
    const operationId = 'op-crashed-prep';
    await recoveryDb.saveJournal({
      operationId,
      snapshotId: 'snap-none',
      state: 'preparing',
      backupMetadata: {} as any,
    });

    const result = await coordinator.checkAndHandleStartupRecovery();
    expect(result.status).toBe('abandoned_clean');
    expect(result.operationId).toBe(operationId);

    const journal = await recoveryDb.getJournal(operationId);
    expect(journal?.state).toBe('failed');
  });

  it('safely cleans up operation interrupted in snapshot_verified state', async () => {
    const operationId = 'op-crashed-snap';
    await recoveryDb.saveJournal({
      operationId,
      snapshotId: 'snap-verified',
      state: 'snapshot_verified',
      backupMetadata: {} as any,
    });

    const result = await coordinator.checkAndHandleStartupRecovery();
    expect(result.status).toBe('abandoned_clean');
    expect(result.operationId).toBe(operationId);
  });

  it('automatically rolls back database when crash happened during restore_started', async () => {
    const operationId = 'op-crashed-restore';
    const snapshotId = 'snap-auto-rb';
    const payload = createSamplePayload();
    const checksum = await calculatePayloadChecksum(payload);

    await recoveryDb.saveSnapshot({
      snapshotId,
      operationId,
      payload,
      itemCounts: { workspaces: 1, settings: 1 },
      databaseSchemaVersion: 4,
      checksum,
    });

    await recoveryDb.saveJournal({
      operationId,
      snapshotId,
      state: 'restore_started', // crashed in middle of restore
      backupMetadata: {} as any,
    });

    // Main database was corrupted mid-restore
    await db.workspaces.put({
      id: 'ws-dirty-mid-restore',
      name: 'Dirty Space',
      icon: 'Trash',
      isDefault: true,
      order: 0,
      createdAt: 2000,
      updatedAt: 2000,
    });

    const result = await coordinator.checkAndHandleStartupRecovery();
    expect(result.status).toBe('recovered_from_snapshot');
    expect(result.operationId).toBe(operationId);

    // Verify main database restored to baseline
    const workspaces = await db.workspaces.toArray();
    expect(workspaces).toHaveLength(1);
    expect(workspaces[0].id).toBe('ws-baseline-1');

    const journal = await recoveryDb.getJournal(operationId);
    expect(journal?.state).toBe('rollback_completed');
  });

  it('recognizes and blocks with recovery_required if previous rollback had failed', async () => {
    const operationId = 'op-failed-rb';
    await recoveryDb.saveJournal({
      operationId,
      snapshotId: 'snap-fatal',
      state: 'recovery_required',
      backupMetadata: {} as any,
    });

    const result = await coordinator.checkAndHandleStartupRecovery();
    expect(result.status).toBe('recovery_required');
    expect(result.error?.code).toBe('RECOVERY_REQUIRED');
  });
});
