import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import 'fake-indexeddb/auto';
import { NookSpaceDB } from '../../../src/services/database/db';
import { NookSpaceRecoveryDB } from '../../../src/features/backup/recovery/recoveryDatabase';
import { RestoreEngineService } from '../../../src/features/backup/services/restoreEngineService';
import { StartupRecoveryCoordinator } from '../../../src/features/backup/recovery/startupRecoveryCoordinator';
import { calculateBackupChecksum } from '../../../src/features/backup/services/backupIntegrityService';
import type {
  WorkspaceEntity,
  BookmarkEntity,
  BookmarkGroupEntity,
  TodoEntity,
  AppSettingsEntity,
  WidgetInstanceEntity,
  WidgetLayoutEntity,
} from '../../../src/types/database';
import type { NoteEntity, NoteCollectionEntity } from '../../../src/types/notes';
import type { NookSpaceUniversalBackupV1 } from '../../../src/features/backup/types/backupTypes';

describe('Milestone 9.3 — Database Non-Destruction Quality Gate', () => {
  let db: NookSpaceDB;
  let recoveryDb: NookSpaceRecoveryDB;
  let restoreService: RestoreEngineService;
  const dbName = 'test-safety-main-db';
  const recoveryDbName = 'test-safety-recovery-db';

  beforeEach(() => {
    db = new NookSpaceDB(dbName);
    recoveryDb = new NookSpaceRecoveryDB(recoveryDbName);
    restoreService = new RestoreEngineService(db, recoveryDb);
  });

  afterEach(async () => {
    await db.delete();
    await recoveryDb.delete();
  });

  async function seedBaselineDatabaseA(targetDb: NookSpaceDB): Promise<void> {
    const now = 1600000000000;
    const wsA: WorkspaceEntity = {
      id: 'ws-alpha',
      name: 'Alpha Workspace',
      icon: 'Shield',
      color: '#10b981',
      isDefault: true,
      order: 0,
      createdAt: now,
      updatedAt: now,
    };

    const settingsA: AppSettingsEntity = {
      id: 'current_settings',
      theme: 'dark',
      accentColor: '#10b981',
      fontFamily: 'Inter',
      fontSize: 'md',
      backgroundType: 'color',
      backgroundValue: '#000000',
      widgetOpacity: 95,
      widgetBlur: 5,
      activeWorkspaceId: wsA.id,
      updatedAt: now,
    };

    const instA: WidgetInstanceEntity = {
      id: 'inst-clock-a',
      workspaceId: wsA.id,
      widgetType: 'clock',
      title: 'Alpha Clock',
      config: {},
      isEnabled: true,
      order: 0,
      createdAt: now,
      updatedAt: now,
    };

    const layoutA: WidgetLayoutEntity = {
      id: `${wsA.id}_${instA.id}_lg`,
      workspaceId: wsA.id,
      widgetInstanceId: instA.id,
      breakpoint: 'lg',
      x: 0,
      y: 0,
      w: 4,
      h: 4,
      isDefault: true,
      createdAt: now,
      updatedAt: now,
    };

    const colA: NoteCollectionEntity = {
      id: 'col-a',
      workspaceId: wsA.id,
      title: 'Alpha Notes',
      color: '#6366f1',
      order: 0,
      createdAt: now,
      updatedAt: now,
    };

    const noteA: NoteEntity = {
      id: 'note-a',
      workspaceId: wsA.id,
      collectionId: colA.id,
      title: 'Alpha Safe Note',
      content: 'Critical user data in Alpha workspace.',
      excerpt: 'Critical user data...',
      tags: ['alpha'],
      isPinned: true,
      isFavorite: false,
      isArchived: false,
      order: 0,
      createdAt: now,
      updatedAt: now,
    };

    const grpA: BookmarkGroupEntity = {
      id: 'grp-a',
      workspaceId: wsA.id,
      title: 'Alpha Bookmarks',
      order: 0,
      createdAt: now,
      updatedAt: now,
    };

    const bmA: BookmarkEntity = {
      id: 'bm-a',
      workspaceId: wsA.id,
      groupId: grpA.id,
      title: 'Alpha Search',
      url: 'https://alpha.example.com',
      isFavorite: true,
      order: 0,
      createdAt: now,
      updatedAt: now,
    };

    const todoA: TodoEntity = {
      id: 'todo-a',
      workspaceId: wsA.id,
      title: 'Alpha Task',
      completed: false,
      priority: 'high',
      order: 0,
      createdAt: now,
      updatedAt: now,
    };

    await targetDb.workspaces.add(wsA);
    await targetDb.settings.put(settingsA);
    await targetDb.widgetInstances.add(instA);
    await targetDb.widgetLayouts.add(layoutA);
    await targetDb.noteCollections.add(colA);
    await targetDb.notes.add(noteA);
    await targetDb.bookmarkGroups.add(grpA);
    await targetDb.bookmarks.add(bmA);
    await targetDb.todos.add(todoA);
  }

  async function createValidBackupB(): Promise<NookSpaceUniversalBackupV1> {
    const now = 1700000000000;
    const wsB: WorkspaceEntity = {
      id: 'ws-beta',
      name: 'Beta Workspace',
      icon: 'Folder',
      color: '#3b82f6',
      isDefault: true,
      order: 0,
      createdAt: now,
      updatedAt: now,
    };

    const settingsB: AppSettingsEntity = {
      id: 'current_settings',
      theme: 'light',
      accentColor: '#3b82f6',
      fontFamily: 'Inter',
      fontSize: 'lg',
      backgroundType: 'color',
      backgroundValue: '#ffffff',
      widgetOpacity: 80,
      widgetBlur: 0,
      activeWorkspaceId: wsB.id,
      updatedAt: now,
    };

    const noteB: NoteEntity = {
      id: 'note-b',
      workspaceId: wsB.id,
      collectionId: null,
      title: 'Beta Note',
      content: 'Fresh content from Backup B.',
      excerpt: 'Fresh content...',
      tags: ['beta'],
      isPinned: false,
      isFavorite: true,
      isArchived: false,
      order: 0,
      createdAt: now,
      updatedAt: now,
    };

    const bmB: BookmarkEntity = {
      id: 'bm-b',
      workspaceId: wsB.id,
      groupId: null,
      title: 'Beta Docs',
      url: 'https://beta.example.com',
      isFavorite: false,
      order: 0,
      createdAt: now,
      updatedAt: now,
    };

    const data = {
      workspaces: [wsB],
      settings: settingsB,
      widgetInstances: [],
      widgetLayouts: [],
      todos: [],
      notes: [noteB],
      noteCollections: [],
      noteTags: [],
      noteBookmarkLinks: [],
      bookmarks: [bmB],
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
    };

    const draft: NookSpaceUniversalBackupV1 = {
      format: 'nookspace-backup',
      formatVersion: 1,
      metadata: {
        exportedAt: now,
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

  it('Scenario A: Successful Full Restore replaces database and cleans up snapshot', async () => {
    await seedBaselineDatabaseA(db);
    const backupB = await createValidBackupB();

    const result = await restoreService.restoreBackup(backupB);

    expect(result.success).toBe(true);
    expect(result.finalState).toBe('completed');

    // Database is now B
    const workspaces = await db.workspaces.toArray();
    expect(workspaces).toHaveLength(1);
    expect(workspaces[0].id).toBe('ws-beta');
    expect(workspaces[0].name).toBe('Beta Workspace');

    const notes = await db.notes.toArray();
    expect(notes).toHaveLength(1);
    expect(notes[0].id).toBe('note-b');

    const settings = await db.settings.get('current_settings');
    expect(settings?.activeWorkspaceId).toBe('ws-beta');

    // Old Alpha data was cleanly replaced
    expect(await db.todos.count()).toBe(0);
  });

  it('Scenario B: Transaction failure injection aborts and preserves baseline A', async () => {
    await seedBaselineDatabaseA(db);
    const backupB = await createValidBackupB();

    const result = await restoreService.restoreBackup(backupB, {
      failureInjection: { stage: 'during_restore_tx', customMessage: 'Simulated disk error in tx' },
    });

    expect(result.success).toBe(false);
    expect(result.rollbackOccurred).toBe(true);
    expect(result.rollbackSucceeded).toBe(true);
    expect(result.finalState).toBe('rollback_completed');

    // Database A is 100% intact
    const ws = await db.workspaces.get('ws-alpha');
    expect(ws?.name).toBe('Alpha Workspace');

    const note = await db.notes.get('note-a');
    expect(note?.content).toBe('Critical user data in Alpha workspace.');

    const todo = await db.todos.get('todo-a');
    expect(todo?.title).toBe('Alpha Task');
  });

  it('Scenario C: Post-verification failure triggers durable rollback back to baseline A', async () => {
    await seedBaselineDatabaseA(db);
    const backupB = await createValidBackupB();

    const result = await restoreService.restoreBackup(backupB, {
      failureInjection: { stage: 'during_post_verification', customMessage: 'Simulated invariant check failure' },
    });

    expect(result.success).toBe(false);
    expect(result.rollbackOccurred).toBe(true);
    expect(result.rollbackSucceeded).toBe(true);
    expect(result.finalState).toBe('rollback_completed');

    // Baseline A is restored
    const workspaces = await db.workspaces.toArray();
    expect(workspaces).toHaveLength(1);
    expect(workspaces[0].id).toBe('ws-alpha');

    const notes = await db.notes.toArray();
    expect(notes[0].id).toBe('note-a');
  });

  it('Scenario D: Crash after restore commit is recovered by StartupRecoveryCoordinator', async () => {
    await seedBaselineDatabaseA(db);
    const backupB = await createValidBackupB();

    // Simulate process termination immediately after commit before verification completes
    const result = await restoreService.restoreBackup(backupB, {
      failureInjection: { stage: 'simulate_process_kill_after_commit', customMessage: 'Simulated process kill' },
    });

    expect(result.success).toBe(false);

    // Now instantiate fresh coordinator simulating app restart
    const freshCoordinator = new StartupRecoveryCoordinator(db, recoveryDb);
    const recoveryResult = await freshCoordinator.checkAndHandleStartupRecovery();

    expect(recoveryResult.status).toBe('recovered_from_snapshot');

    // Database is safely rolled back to baseline A
    const ws = await db.workspaces.get('ws-alpha');
    expect(ws?.name).toBe('Alpha Workspace');
    const note = await db.notes.get('note-a');
    expect(note?.id).toBe('note-a');
  });

  it('Scenario E: Critical rollback failure transitions to recovery_required and PRESERVES snapshot', async () => {
    await seedBaselineDatabaseA(db);
    const backupB = await createValidBackupB();

    // Inject failure during restore AND during rollback
    const result = await restoreService.restoreBackup(backupB, {
      failureInjection: {
        stage: 'during_restore_tx',
        secondaryStage: 'during_rollback',
        customMessage: 'Fatal disk crash during rollback',
      },
    });

    expect(result.success).toBe(false);
    expect(result.finalState).toBe('recovery_required');
    expect(result.rollbackSucceeded).toBe(false);

    // Snapshot is PRESERVED on disk and journal marks recovery_required
    expect(result.snapshotId).toBeDefined();
    const snapshot = await recoveryDb.getSnapshot(result.snapshotId!);
    expect(snapshot).toBeDefined();

    const journal = await recoveryDb.getJournal(result.operationId);
    expect(journal?.state).toBe('recovery_required');

    // Startup recovery coordinator recognizes recovery_required
    const coordinator = new StartupRecoveryCoordinator(db, recoveryDb);
    const startupCheck = await coordinator.checkAndHandleStartupRecovery();
    expect(startupCheck.status).toBe('recovery_required');
  });

  it('Scenario F: Partial backup is safely rejected with zero changes to baseline A', async () => {
    await seedBaselineDatabaseA(db);

    const legacyBookmarksBackup = {
      format: 'nookspace-bookmarks',
      version: 1,
      exportedAt: 1700000000000,
      data: {
        workspaceId: 'ws-legacy',
        groups: [],
        bookmarks: [],
      },
    };

    const result = await restoreService.restoreBackup(legacyBookmarksBackup);

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('PARTIAL_BACKUP_RESTORE_NOT_SUPPORTED');

    // Database A was never touched
    const ws = await db.workspaces.get('ws-alpha');
    expect(ws?.name).toBe('Alpha Workspace');
    expect(await db.notes.count()).toBe(1);
  });
});
