import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import 'fake-indexeddb/auto';
import { NookSpaceDB } from '../../../src/services/database/db';
import { NookSpaceRecoveryDB } from '../../../src/features/backup/recovery/recoveryDatabase';
import { RestorePreflightService } from '../../../src/features/backup/services/restorePreflightService';
import { calculateBackupChecksum } from '../../../src/features/backup/services/backupIntegrityService';
import type { NookSpaceUniversalBackupV1 } from '../../../src/features/backup/types/backupTypes';

async function createValidCanonicalBackup(): Promise<NookSpaceUniversalBackupV1> {
  const data = {
    workspaces: [
      {
        id: 'ws-preflight-1',
        name: 'Preflight Space',
        icon: 'LayoutGrid',
        isDefault: true,
        order: 0,
        createdAt: 1000,
        updatedAt: 1000,
      },
    ],
    settings: {
      id: 'current_settings' as const,
      theme: 'dark' as const,
      accentColor: '#3b82f6',
      fontFamily: 'Inter',
      fontSize: 'md' as const,
      backgroundType: 'color' as const,
      backgroundValue: '#0f172a',
      widgetOpacity: 90,
      widgetBlur: 10,
      activeWorkspaceId: 'ws-preflight-1',
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

  const itemCounts = {
    workspaces: 1,
    settings: 1,
    widgetInstances: 0,
    widgetLayouts: 0,
    todos: 0,
    notes: 0,
    noteCollections: 0,
    noteTags: 0,
    noteBookmarkLinks: 0,
    bookmarks: 0,
    bookmarkGroups: 0,
    focusSessions: 0,
    dailyGoals: 0,
    stickyNotes: 0,
    vocabulary: 0,
    resources: 0,
    calendarEvents: 0,
  };

  const draft: NookSpaceUniversalBackupV1 = {
    format: 'nookspace-backup',
    formatVersion: 1,
    metadata: {
      exportedAt: 1700000000000,
      appVersion: '0.1.0',
      databaseSchemaVersion: 4,
      exportType: 'full',
      itemCounts,
      integrity: {
        algorithm: 'SHA-256',
        checksum: '0000000000000000000000000000000000000000000000000000000000000000',
      },
    },
    data,
  };

  draft.metadata.integrity.checksum = await calculateBackupChecksum(draft);
  return draft;
}

describe('RestorePreflightService', () => {
  let db: NookSpaceDB;
  let recoveryDb: NookSpaceRecoveryDB;
  let preflightService: RestorePreflightService;

  beforeEach(() => {
    db = new NookSpaceDB('test-preflight-db');
    recoveryDb = new NookSpaceRecoveryDB('test-preflight-recovery-db');
    preflightService = new RestorePreflightService(db, recoveryDb);
  });

  afterEach(async () => {
    await db.delete();
    await recoveryDb.delete();
  });

  it('passes on clean, valid canonical backup', async () => {
    const backup = await createValidCanonicalBackup();
    const result = await preflightService.prepareRestore(backup);

    expect(result.success).toBe(true);
    expect(result.operationId).toMatch(/^op-restore-/);
    expect(result.canonicalBackup).toBeDefined();
    expect(result.backupStats.workspaceCount).toBe(1);
    expect(result.currentStats).toBeDefined();
    expect(result.error).toBeUndefined();
  });

  it('rejects partial backup with PARTIAL_BACKUP_RESTORE_NOT_SUPPORTED', async () => {
    const legacyBookmarksBackup = {
      format: 'nookspace-bookmarks',
      version: 1,
      exportedAt: 1700000000000,
      data: {
        workspaceId: 'ws-legacy-bm',
        groups: [],
        bookmarks: [],
      },
    };

    const result = await preflightService.prepareRestore(legacyBookmarksBackup);
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('PARTIAL_BACKUP_RESTORE_NOT_SUPPORTED');
  });

  it('rejects tampered or corrupt backup with BACKUP_VALIDATION_FAILED', async () => {
    const backup = await createValidCanonicalBackup();
    // Tamper with data without recomputing checksum
    backup.data.workspaces[0].name = 'Tampered Workspace';

    const result = await preflightService.prepareRestore(backup);
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('BACKUP_VALIDATION_FAILED');
  });

  it('rejects backup if settings activeWorkspaceId does not exist in workspaces', async () => {
    const backup = await createValidCanonicalBackup();
    backup.data.settings!.activeWorkspaceId = 'ws-ghost-unknown';
    backup.metadata.integrity.checksum = await calculateBackupChecksum(backup);

    const result = await preflightService.prepareRestore(backup);
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('RESTORE_SETTINGS_INVARIANT_FAILED');
  });

  it('rejects restore when lock is held by another active restore', async () => {
    // Acquire lock simulating concurrent restore
    await recoveryDb.acquireLock('op-other-active', 'tab-other', 60000);

    const backup = await createValidCanonicalBackup();
    const result = await preflightService.prepareRestore(backup);

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('RESTORE_ALREADY_RUNNING');
  });

  it('reads current database stats and warns if default workspace is missing in backup', async () => {
    const backup = await createValidCanonicalBackup();
    backup.data.workspaces[0].isDefault = false;
    backup.metadata.integrity.checksum = await calculateBackupChecksum(backup);

    const result = await preflightService.prepareRestore(backup);
    expect(result.success).toBe(true);
    expect(result.warnings.some((w) => w.includes('default'))).toBe(true);
  });
});
