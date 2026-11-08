import { NookSpaceRecoveryDB, recoveryDb } from '../../backup/recovery/recoveryDatabase';
import {
  MigrationJournalRecord,
  MigrationStatus,
  MigrationType,
} from '../types/migrationTypes';

export class MigrationJournalService {
  private rDb: NookSpaceRecoveryDB;

  constructor(database: NookSpaceRecoveryDB = recoveryDb) {
    this.rDb = database;
  }

  /**
   * Sets custom recovery database (e.g. for testing).
   */
  setRecoveryDatabase(database: NookSpaceRecoveryDB): void {
    this.rDb = database;
  }

  /**
   * Records the start of a migration.
   */
  async recordStart(params: {
    migrationId: string;
    name: string;
    type: MigrationType;
    version?: number;
  }): Promise<MigrationJournalRecord> {
    const existing = await this.rDb.getMigrationJournalRecord(params.migrationId);
    const now = Date.now();

    const record: MigrationJournalRecord = {
      migrationId: params.migrationId,
      name: params.name,
      type: params.type,
      version: params.version,
      status: 'running',
      startedAt: now,
      completedAt: undefined,
      durationMs: 0,
      recordsProcessed: existing ? existing.recordsProcessed : 0,
      recordsModified: existing ? existing.recordsModified : 0,
      error: undefined,
    };

    await this.rDb.saveMigrationJournalRecord(record);
    return record;
  }

  /**
   * Records the successful completion of a migration.
   */
  async recordSuccess(params: {
    migrationId: string;
    recordsProcessed: number;
    recordsModified: number;
    checksum?: string;
  }): Promise<MigrationJournalRecord> {
    const existing = await this.rDb.getMigrationJournalRecord(params.migrationId);
    const now = Date.now();
    const startedAt = existing?.startedAt ?? now;

    const record: MigrationJournalRecord = {
      migrationId: params.migrationId,
      name: existing?.name ?? params.migrationId,
      type: existing?.type ?? 'entity',
      version: existing?.version,
      status: 'completed',
      startedAt,
      completedAt: now,
      durationMs: Math.max(0, now - startedAt),
      recordsProcessed: params.recordsProcessed,
      recordsModified: params.recordsModified,
      checksum: params.checksum,
      error: undefined,
    };

    await this.rDb.saveMigrationJournalRecord(record);
    return record;
  }

  /**
   * Records failure during a migration.
   */
  async recordFailure(params: {
    migrationId: string;
    error: string;
    recordsProcessed?: number;
    recordsModified?: number;
    status?: 'failed' | 'recovery_required';
  }): Promise<MigrationJournalRecord> {
    const existing = await this.rDb.getMigrationJournalRecord(params.migrationId);
    const now = Date.now();
    const startedAt = existing?.startedAt ?? now;

    const record: MigrationJournalRecord = {
      migrationId: params.migrationId,
      name: existing?.name ?? params.migrationId,
      type: existing?.type ?? 'entity',
      version: existing?.version,
      status: params.status || 'failed',
      startedAt,
      completedAt: now,
      durationMs: Math.max(0, now - startedAt),
      recordsProcessed: params.recordsProcessed ?? existing?.recordsProcessed ?? 0,
      recordsModified: params.recordsModified ?? existing?.recordsModified ?? 0,
      error: params.error,
    };

    await this.rDb.saveMigrationJournalRecord(record);
    return record;
  }

  /**
   * Retrieves all journal records.
   */
  async getJournalRecords(): Promise<MigrationJournalRecord[]> {
    return this.rDb.getAllMigrationJournalRecords();
  }

  /**
   * Retrieves single record by ID.
   */
  async getRecord(migrationId: string): Promise<MigrationJournalRecord | undefined> {
    return this.rDb.getMigrationJournalRecord(migrationId);
  }

  /**
   * Checks if migration is already recorded as 'completed'.
   */
  async isCompleted(migrationId: string): Promise<boolean> {
    const rec = await this.getRecord(migrationId);
    return rec?.status === 'completed';
  }

  /**
   * Resets journal records.
   */
  async resetJournal(): Promise<void> {
    await this.rDb.clearMigrationJournal();
  }
}

export const migrationJournalService = new MigrationJournalService();
