import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import 'fake-indexeddb/auto';
import { NookSpaceRecoveryDB } from '../../../src/features/backup/recovery/recoveryDatabase';
import { calculatePayloadChecksum } from '../../../src/features/backup/services/backupIntegrityService';
import type { BackupDataV1 } from '../../../src/features/backup/types/backupTypes';

function createSamplePayload(): BackupDataV1 {
  return {
    workspaces: [
      {
        id: 'ws-sample-1',
        name: 'Sample Space',
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
      activeWorkspaceId: 'ws-sample-1',
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

describe('NookSpaceRecoveryDB', () => {
  let recoveryDb: NookSpaceRecoveryDB;
  const dbName = 'test-recovery-db';

  beforeEach(() => {
    recoveryDb = new NookSpaceRecoveryDB(dbName);
  });

  afterEach(async () => {
    await recoveryDb.delete();
  });

  describe('Snapshots Management & Integrity', () => {
    it('saves and retrieves a durable recovery snapshot', async () => {
      const payload = createSamplePayload();
      const checksum = await calculatePayloadChecksum(payload);
      const snapshotId = 'snap-test-1';
      const operationId = 'op-1';

      const saved = await recoveryDb.saveSnapshot({
        snapshotId,
        operationId,
        payload,
        itemCounts: { workspaces: 1, settings: 1 },
        databaseSchemaVersion: 4,
        checksum,
      });

      expect(saved.snapshotId).toBe(snapshotId);
      expect(saved.status).toBe('created');

      const retrieved = await recoveryDb.getSnapshot(snapshotId);
      expect(retrieved).toBeDefined();
      expect(retrieved?.snapshotId).toBe(snapshotId);
      expect(retrieved?.payload.workspaces).toHaveLength(1);
      expect(retrieved?.checksum).toBe(checksum);
    });

    it('verifies valid snapshot checksum and table counts', async () => {
      const payload = createSamplePayload();
      const checksum = await calculatePayloadChecksum(payload);
      const snapshotId = 'snap-valid';

      await recoveryDb.saveSnapshot({
        snapshotId,
        operationId: 'op-valid',
        payload,
        itemCounts: { workspaces: 1 },
        databaseSchemaVersion: 4,
        checksum,
      });

      const verification = await recoveryDb.verifySnapshot(snapshotId);
      expect(verification.isValid).toBe(true);
      expect(verification.computedChecksum).toBe(checksum);

      const updated = await recoveryDb.getSnapshot(snapshotId);
      expect(updated?.status).toBe('verified');
    });

    it('flags corrupted snapshot with checksum mismatch', async () => {
      const payload = createSamplePayload();
      const snapshotId = 'snap-corrupt';

      // Save with invalid/wrong checksum
      await recoveryDb.saveSnapshot({
        snapshotId,
        operationId: 'op-corrupt',
        payload,
        itemCounts: { workspaces: 1 },
        databaseSchemaVersion: 4,
        checksum: 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
      });

      const verification = await recoveryDb.verifySnapshot(snapshotId);
      expect(verification.isValid).toBe(false);
      expect(verification.error).toContain('Checksum mismatch');
    });

    it('deletes snapshot after completion', async () => {
      const payload = createSamplePayload();
      const checksum = await calculatePayloadChecksum(payload);
      const snapshotId = 'snap-to-delete';

      await recoveryDb.saveSnapshot({
        snapshotId,
        operationId: 'op-delete',
        payload,
        itemCounts: { workspaces: 1 },
        databaseSchemaVersion: 4,
        checksum,
      });

      await recoveryDb.deleteSnapshot(snapshotId);
      const retrieved = await recoveryDb.getSnapshot(snapshotId);
      expect(retrieved).toBeUndefined();
    });
  });

  describe('Journal State Machine', () => {
    it('creates and updates journal entries through restore lifecycle', async () => {
      const operationId = 'op-journal-1';
      const snapshotId = 'snap-1';

      await recoveryDb.saveJournal({
        operationId,
        snapshotId,
        state: 'preparing',
        backupMetadata: {
          exportedAt: 1000,
          appVersion: '0.1.0',
          databaseSchemaVersion: 4,
          exportType: 'full',
          itemCounts: { workspaces: 1 },
          integrity: { algorithm: 'SHA-256', checksum: 'abc' },
        },
      });

      let journal = await recoveryDb.getJournal(operationId);
      expect(journal?.state).toBe('preparing');
      expect(journal?.recoveryAttemptCount).toBe(0);

      await recoveryDb.updateJournal({
        operationId,
        state: 'restore_started',
      });

      journal = await recoveryDb.getJournal(operationId);
      expect(journal?.state).toBe('restore_started');

      await recoveryDb.updateJournal({
        operationId,
        state: 'rollback_started',
        incrementRecoveryAttempt: true,
      });

      journal = await recoveryDb.getJournal(operationId);
      expect(journal?.state).toBe('rollback_started');
      expect(journal?.recoveryAttemptCount).toBe(1);
    });

    it('finds latest incomplete journal', async () => {
      await recoveryDb.saveJournal({
        operationId: 'op-done',
        snapshotId: 'snap-done',
        state: 'completed',
        backupMetadata: {} as any,
      });

      await recoveryDb.saveJournal({
        operationId: 'op-interrupted',
        snapshotId: 'snap-interrupted',
        state: 'restore_applied',
        backupMetadata: {} as any,
      });

      const incomplete = await recoveryDb.getLatestIncompleteJournal();
      expect(incomplete).toBeDefined();
      expect(incomplete?.operationId).toBe('op-interrupted');
    });
  });

  describe('Cross-Tab Concurrency Lock', () => {
    it('acquires and releases restore lock', async () => {
      const lock1 = await recoveryDb.acquireLock('op-tab-1', 'tab-1', 5000);
      expect(lock1.acquired).toBe(true);
      expect(await recoveryDb.isLockActive()).toBe(true);

      // Second tab attempts to acquire while lock is held
      const lock2 = await recoveryDb.acquireLock('op-tab-2', 'tab-2', 5000);
      expect(lock2.acquired).toBe(false);
      expect(lock2.currentOwner).toBe('op-tab-1');

      // Release lock
      await recoveryDb.releaseLock('op-tab-1');
      expect(await recoveryDb.isLockActive()).toBe(false);

      // Second tab can now acquire
      const lock3 = await recoveryDb.acquireLock('op-tab-2', 'tab-2', 5000);
      expect(lock3.acquired).toBe(true);
    });

    it('allows acquisition if previous lock lease expired', async () => {
      // Acquire with expired lease (leaseMs: -1000)
      await recoveryDb.acquireLock('op-stale', 'tab-stale', -1000);

      const lock = await recoveryDb.acquireLock('op-fresh', 'tab-fresh', 5000);
      expect(lock.acquired).toBe(true);
    });
  });
});
