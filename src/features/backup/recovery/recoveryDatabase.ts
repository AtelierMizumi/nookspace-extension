import Dexie, { Table } from 'dexie';
import {
  RestoreSnapshotRecord,
  RestoreJournalRecord,
  RestoreLockRecord,
  RestoreState,
} from '../types/restoreTypes';
import { calculatePayloadChecksum } from '../services/backupIntegrityService';
import { BackupDataV1, BackupMetadataV1 } from '../types/backupTypes';
import { MigrationJournalRecord } from '../../migrations/types/migrationTypes';

export class NookSpaceRecoveryDB extends Dexie {
  snapshots!: Table<RestoreSnapshotRecord, string>;
  journal!: Table<RestoreJournalRecord, string>;
  locks!: Table<RestoreLockRecord, string>;
  migrationJournal!: Table<MigrationJournalRecord, string>;

  constructor(dbName: string = 'nookspace-recovery-db') {
    super(dbName);

    this.version(1).stores({
      snapshots: 'snapshotId, operationId, createdAt, status',
      journal: 'operationId, snapshotId, state, startedAt, updatedAt',
      locks: 'id, operationId, leaseExpiresAt',
    });

    this.version(2).stores({
      snapshots: 'snapshotId, operationId, createdAt, status',
      journal: 'operationId, snapshotId, state, startedAt, updatedAt',
      locks: 'id, operationId, leaseExpiresAt',
      migrationJournal: 'migrationId, status, startedAt, completedAt',
    });
  }

  /**
   * Persists a durable recovery snapshot of the entire active database.
   */
  async saveSnapshot(params: {
    snapshotId: string;
    operationId: string;
    payload: BackupDataV1;
    itemCounts: Record<string, number>;
    databaseSchemaVersion: number;
    checksum: string;
  }): Promise<RestoreSnapshotRecord> {
    const record: RestoreSnapshotRecord = {
      snapshotId: params.snapshotId,
      operationId: params.operationId,
      createdAt: Date.now(),
      databaseSchemaVersion: params.databaseSchemaVersion,
      itemCounts: params.itemCounts,
      checksum: params.checksum,
      payload: params.payload,
      status: 'created',
    };

    await this.snapshots.put(record);
    return record;
  }

  /**
   * Retrieves a snapshot by ID.
   */
  async getSnapshot(snapshotId: string): Promise<RestoreSnapshotRecord | undefined> {
    return this.snapshots.get(snapshotId);
  }

  /**
   * Verifies snapshot integrity: re-reads from disk, calculates SHA-256 checksum,
   * and verifies that item counts match the payload arrays.
   */
  async verifySnapshot(snapshotId: string): Promise<{
    isValid: boolean;
    computedChecksum: string;
    recordedChecksum: string;
    error?: string;
  }> {
    const snapshot = await this.snapshots.get(snapshotId);
    if (!snapshot) {
      return {
        isValid: false,
        computedChecksum: '',
        recordedChecksum: '',
        error: `Snapshot "${snapshotId}" not found in recovery store.`,
      };
    }

    try {
      const computedChecksum = await calculatePayloadChecksum(snapshot.payload);
      if (computedChecksum !== snapshot.checksum) {
        return {
          isValid: false,
          computedChecksum,
          recordedChecksum: snapshot.checksum,
          error: `Checksum mismatch for snapshot "${snapshotId}". Computed ${computedChecksum}, expected ${snapshot.checksum}.`,
        };
      }

      // Verify item counts
      for (const [table, declared] of Object.entries(snapshot.itemCounts)) {
        const arr = (snapshot.payload as any)[table];
        if (Array.isArray(arr) && arr.length !== declared) {
          return {
            isValid: false,
            computedChecksum,
            recordedChecksum: snapshot.checksum,
            error: `Snapshot count mismatch for table "${table}": declared ${declared}, found ${arr.length}.`,
          };
        }
      }

      // Mark status as verified
      await this.snapshots.update(snapshotId, { status: 'verified' });

      return {
        isValid: true,
        computedChecksum,
        recordedChecksum: snapshot.checksum,
      };
    } catch (err) {
      return {
        isValid: false,
        computedChecksum: '',
        recordedChecksum: snapshot.checksum,
        error: `Verification error: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  /**
   * Deletes a snapshot after successful restore verification.
   */
  async deleteSnapshot(snapshotId: string): Promise<void> {
    await this.snapshots.delete(snapshotId);
  }

  /**
   * Creates a journal record at operation start.
   */
  async saveJournal(params: {
    operationId: string;
    snapshotId: string;
    state: RestoreState;
    backupMetadata: BackupMetadataV1;
  }): Promise<RestoreJournalRecord> {
    const now = Date.now();
    const record: RestoreJournalRecord = {
      operationId: params.operationId,
      snapshotId: params.snapshotId,
      state: params.state,
      startedAt: now,
      updatedAt: now,
      backupMetadata: params.backupMetadata,
      recoveryAttemptCount: 0,
    };

    await this.journal.put(record);
    return record;
  }

  /**
   * Updates state of an existing restore journal entry.
   */
  async updateJournal(params: {
    operationId: string;
    state: RestoreState;
    error?: { code: string; message: string; details?: string };
    incrementRecoveryAttempt?: boolean;
  }): Promise<void> {
    const entry = await this.journal.get(params.operationId);
    if (!entry) {
      throw new Error(`Cannot update non-existent journal for operation "${params.operationId}".`);
    }

    const updates: Partial<RestoreJournalRecord> = {
      state: params.state,
      updatedAt: Date.now(),
    };

    if (params.error) {
      updates.error = params.error;
    }

    if (params.incrementRecoveryAttempt) {
      updates.recoveryAttemptCount = (entry.recoveryAttemptCount || 0) + 1;
    }

    await this.journal.update(params.operationId, updates);
  }

  /**
   * Retrieves a journal record by operationId.
   */
  async getJournal(operationId: string): Promise<RestoreJournalRecord | undefined> {
    return this.journal.get(operationId);
  }

  /**
   * Discovers any incomplete or interrupted operations across application restarts.
   */
  async getLatestIncompleteJournal(): Promise<RestoreJournalRecord | undefined> {
    const all = await this.journal.orderBy('startedAt').reverse().toArray();
    return all.find(
      (j) =>
        j.state !== 'completed' &&
        j.state !== 'failed' &&
        j.state !== 'rollback_completed'
    );
  }

  /**
   * Saves or updates a migration journal record.
   */
  async saveMigrationJournalRecord(record: MigrationJournalRecord): Promise<void> {
    await this.migrationJournal.put(record);
  }

  /**
   * Retrieves a migration journal record by its migration ID.
   */
  async getMigrationJournalRecord(migrationId: string): Promise<MigrationJournalRecord | undefined> {
    return this.migrationJournal.get(migrationId);
  }

  /**
   * Retrieves all migration journal records ordered by startedAt.
   */
  async getAllMigrationJournalRecords(): Promise<MigrationJournalRecord[]> {
    return this.migrationJournal.orderBy('startedAt').toArray();
  }

  /**
   * Clears all migration journal records.
   */
  async clearMigrationJournal(): Promise<void> {
    await this.migrationJournal.clear();
  }

  /**
   * Attempts to acquire exclusive cross-tab restore lock.
   */
  async acquireLock(
    operationId: string,
    tabId: string = 'tab-default',
    leaseMs: number = 60000
  ): Promise<{ acquired: boolean; currentOwner?: string }> {
    const now = Date.now();
    const LOCK_ID = 'current_restore_lock';

    return await this.transaction('rw', [this.locks], async () => {
      const existing = await this.locks.get(LOCK_ID);

      if (existing) {
        if (existing.leaseExpiresAt > now && existing.operationId !== operationId) {
          return {
            acquired: false,
            currentOwner: existing.operationId,
          };
        }
      }

      await this.locks.put({
        id: LOCK_ID,
        operationId,
        acquiredAt: now,
        leaseExpiresAt: now + leaseMs,
        tabId,
      });

      return { acquired: true };
    });
  }

  /**
   * Renews an existing lock lease if held by the same operationId.
   */
  async renewLock(
    operationId: string,
    extensionMs: number = 60000
  ): Promise<boolean> {
    const now = Date.now();
    const LOCK_ID = 'current_restore_lock';
    return await this.transaction('rw', [this.locks], async () => {
      const existing = await this.locks.get(LOCK_ID);
      if (
        existing &&
        existing.operationId === operationId &&
        existing.leaseExpiresAt > now
      ) {
        await this.locks.put({
          ...existing,
          leaseExpiresAt: now + extensionMs,
        });
        return true;
      }
      return false;
    });
  }

  /**
   * Releases exclusive cross-tab restore lock.
   */
  async releaseLock(operationId: string): Promise<void> {
    const LOCK_ID = 'current_restore_lock';
    await this.transaction('rw', [this.locks], async () => {
      const existing = await this.locks.get(LOCK_ID);
      if (existing && existing.operationId === operationId) {
        await this.locks.delete(LOCK_ID);
      }
    });
  }

  /**
   * Releases any expired/stale lock regardless of operationId.
   */
  async releaseStaleLock(): Promise<boolean> {
    const LOCK_ID = 'current_restore_lock';
    const now = Date.now();
    return await this.transaction('rw', [this.locks], async () => {
      const existing = await this.locks.get(LOCK_ID);
      if (existing && existing.leaseExpiresAt <= now) {
        await this.locks.delete(LOCK_ID);
        return true;
      }
      return false;
    });
  }

  /**
   * Checks whether restore/exclusive lock is actively held and checks ownership.
   */
  async checkLock(operationId?: string): Promise<{
    isLocked: boolean;
    isOwner: boolean;
    currentOwner?: string;
  }> {
    const LOCK_ID = 'current_restore_lock';
    const now = Date.now();
    const existing = await this.locks.get(LOCK_ID);
    if (!existing || existing.leaseExpiresAt <= now) {
      return { isLocked: false, isOwner: false };
    }
    return {
      isLocked: true,
      isOwner: Boolean(operationId && existing.operationId === operationId),
      currentOwner: existing.operationId,
    };
  }

  /**
   * Checks whether restore lock is actively held.
   */
  async isLockActive(): Promise<boolean> {
    const LOCK_ID = 'current_restore_lock';
    const existing = await this.locks.get(LOCK_ID);
    if (!existing) return false;
    return existing.leaseExpiresAt > Date.now();
  }
}

export const recoveryDb = new NookSpaceRecoveryDB();
