import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NookSpaceDB } from '../../../src/services/database/db';
import { NookSpaceRecoveryDB } from '../../../src/features/backup/recovery/recoveryDatabase';
import { StartupRecoveryCoordinator } from '../../../src/features/backup/recovery/startupRecoveryCoordinator';
import { BackupDataV1Schema } from '../../../src/features/backup/schemas/backupV1Schema';
import { calculatePayloadChecksum } from '../../../src/features/backup/services/backupIntegrityService';
import { AppSettingsEntity } from '../../../src/types/database';

describe('Milestone 9.3 Targeted Verification Gate — Regression Suite', () => {
  let db: NookSpaceDB;
  let recoveryDb: NookSpaceRecoveryDB;

  beforeEach(async () => {
    db = new NookSpaceDB('TestTargetedGateDB_' + Date.now());
    await db.open();
    recoveryDb = new NookSpaceRecoveryDB('TestTargetedGateRecoveryDB_' + Date.now());
    await recoveryDb.open();
  });

  afterEach(async () => {
    await db.delete();
    await recoveryDb.delete();
  });

  describe('3.1 Settings Data Shape Invariants', () => {
    const validSettings: AppSettingsEntity = {
      id: 'current_settings',
      theme: 'dark',
      accentColor: '#6366f1',
      fontFamily: 'Inter',
      fontSize: 'md',
      backgroundType: 'color',
      backgroundValue: '#0f172a',
      widgetOpacity: 90,
      widgetBlur: 10,
      activeWorkspaceId: 'ws-default',
      updatedAt: Date.now(),
    };

    it('validates settings as an object in BackupDataV1Schema', () => {
      const parsed = BackupDataV1Schema.parse({
        workspaces: [],
        settings: validSettings,
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
      });

      expect(parsed.settings).not.toBeNull();
      expect(parsed.settings?.id).toBe('current_settings');
      expect(parsed.settings?.activeWorkspaceId).toBe('ws-default');
    });

    it('gracefully transforms settings array into a single object', () => {
      const parsed = BackupDataV1Schema.parse({
        workspaces: [],
        settings: [validSettings],
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
      });

      expect(parsed.settings).not.toBeNull();
      expect(parsed.settings?.id).toBe('current_settings');
      expect(parsed.settings?.activeWorkspaceId).toBe('ws-default');
    });

    it('accepts null settings in BackupDataV1Schema', () => {
      const parsed = BackupDataV1Schema.parse({
        workspaces: [],
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
      });

      expect(parsed.settings).toBeNull();
    });
  });

  describe('3.2 Recovery Journal State Machine & rollback_in_progress', () => {
    it('handles rollback_in_progress in StartupRecoveryCoordinator', async () => {
      const opId = 'op-interrupted-rollback';
      const snapId = 'snap-test-1';

      const payload = {
        workspaces: [
          {
            id: 'ws-recovered',
            name: 'Recovered Workspace',
            icon: 'Home',
            color: '#6366f1',
            order: 0,
            isDefault: true,
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
      };

      const checksum = await calculatePayloadChecksum(payload);

      // Seed a snapshot so coordinator can rollback
      await recoveryDb.snapshots.put({
        snapshotId: snapId,
        operationId: opId,
        createdAt: Date.now(),
        databaseSchemaVersion: 4,
        itemCounts: { workspaces: 1 },
        checksum,
        payload,
        status: 'verified',
      });

      // Seed journal in rollback_in_progress state
      await recoveryDb.journal.put({
        operationId: opId,
        snapshotId: snapId,
        state: 'rollback_in_progress',
        startedAt: Date.now() - 5000,
        updatedAt: Date.now() - 5000,
        backupMetadata: {
          exportedAt: 1700000000000,
          appVersion: '0.1.0',
          databaseSchemaVersion: 4,
          exportType: 'full',
          itemCounts: { workspaces: 1 },
          integrity: {
            algorithm: 'SHA-256',
            checksum: 'a'.repeat(64),
          },
        },
        recoveryAttemptCount: 0,
      });

      const coordinator = new StartupRecoveryCoordinator(db, recoveryDb);
      const result = await coordinator.checkAndHandleStartupRecovery();

      expect(result.status).toBe('recovered_from_snapshot');
      expect(result.previousState).toBe('rollback_in_progress');

      // Verify data was restored
      const wsCount = await db.workspaces.count();
      expect(wsCount).toBe(1);
    });
  });

  describe('3.3 Recovery Lock Lease Renewal & Heartbeat', () => {
    it('renews lock lease for current owner', async () => {
      const opId = 'op-lock-holder';
      const acquireResult = await recoveryDb.acquireLock(opId, 'tab-1', 5000);
      expect(acquireResult.acquired).toBe(true);

      const renewed = await recoveryDb.renewLock(opId, 10000);
      expect(renewed).toBe(true);

      const lock = await recoveryDb.locks.get('current_restore_lock');
      expect(lock?.leaseExpiresAt).toBeGreaterThan(Date.now() + 5000);
    });

    it('rejects lock renewal from non-owner or after expiration', async () => {
      const opId = 'op-owner';
      await recoveryDb.acquireLock(opId, 'tab-1', 1000);

      // Other operation cannot renew
      const fakeRenew = await recoveryDb.renewLock('op-impostor', 5000);
      expect(fakeRenew).toBe(false);

      // Advance clock past expiration
      await recoveryDb.locks.update('current_restore_lock', {
        leaseExpiresAt: Date.now() - 1000,
      });

      const expiredRenew = await recoveryDb.renewLock(opId, 5000);
      expect(expiredRenew).toBe(false);
    });

    it('allows new operation to claim expired lock', async () => {
      await recoveryDb.acquireLock('op-old', 'tab-1', -100); // Expired immediately
      const newAcquire = await recoveryDb.acquireLock('op-new', 'tab-2', 5000);
      expect(newAcquire.acquired).toBe(true);
    });
  });
});
