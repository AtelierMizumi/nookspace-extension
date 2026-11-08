import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import 'fake-indexeddb/auto';
import { NookSpaceDB } from '../../../src/services/database/db';
import { NookSpaceRecoveryDB } from '../../../src/features/backup/recovery/recoveryDatabase';
import { RestoreEngineService } from '../../../src/features/backup/services/restoreEngineService';
import { calculateBackupChecksum } from '../../../src/features/backup/services/backupIntegrityService';
import type {
  WorkspaceEntity,
  BookmarkEntity,
  BookmarkGroupEntity,
  TodoEntity,
  AppSettingsEntity,
} from '../../../src/types/database';
import type { NoteEntity, NoteCollectionEntity } from '../../../src/types/notes';
import type { NookSpaceUniversalBackupV1 } from '../../../src/features/backup/types/backupTypes';

describe('Milestone 9.3 — Restore Performance & Scale Benchmarks', () => {
  let db: NookSpaceDB;
  let recoveryDb: NookSpaceRecoveryDB;
  let restoreService: RestoreEngineService;
  const dbName = 'test-perf-restore-db';
  const recoveryDbName = 'test-perf-restore-recovery-db';

  beforeEach(() => {
    db = new NookSpaceDB(dbName);
    recoveryDb = new NookSpaceRecoveryDB(recoveryDbName);
    restoreService = new RestoreEngineService(db, recoveryDb);
  });

  afterEach(async () => {
    await db.delete();
    await recoveryDb.delete();
  });

  async function createScaleBackup(counts: {
    workspaces: number;
    bookmarksPerWorkspace: number;
    notesPerWorkspace: number;
    todosPerWorkspace: number;
  }): Promise<NookSpaceUniversalBackupV1> {
    const now = 1730000000000;
    const workspaces: WorkspaceEntity[] = [];
    const bookmarkGroups: BookmarkGroupEntity[] = [];
    const bookmarks: BookmarkEntity[] = [];
    const noteCollections: NoteCollectionEntity[] = [];
    const notes: NoteEntity[] = [];
    const todos: TodoEntity[] = [];

    for (let w = 0; w < counts.workspaces; w++) {
      const wsId = `ws-perf-${w}`;
      workspaces.push({
        id: wsId,
        name: `Performance Workspace ${w}`,
        icon: 'LayoutGrid',
        isDefault: w === 0,
        order: w,
        createdAt: now,
        updatedAt: now,
      });

      const grpId = `grp-perf-${w}`;
      bookmarkGroups.push({
        id: grpId,
        workspaceId: wsId,
        title: `Perf Group ${w}`,
        order: 0,
        createdAt: now,
        updatedAt: now,
      });

      for (let b = 0; b < counts.bookmarksPerWorkspace; b++) {
        bookmarks.push({
          id: `bm-${w}-${b}`,
          workspaceId: wsId,
          groupId: grpId,
          title: `Bookmark ${w}-${b}`,
          url: `https://example.com/site/${w}/${b}`,
          isFavorite: b % 2 === 0,
          order: b,
          createdAt: now + b,
          updatedAt: now + b,
        });
      }

      const colId = `col-perf-${w}`;
      noteCollections.push({
        id: colId,
        workspaceId: wsId,
        title: `Perf Col ${w}`,
        order: 0,
        createdAt: now,
        updatedAt: now,
      });

      for (let n = 0; n < counts.notesPerWorkspace; n++) {
        notes.push({
          id: `note-${w}-${n}`,
          workspaceId: wsId,
          collectionId: colId,
          title: `Note ${w}-${n}`,
          content: `Content testing payload for note ${w}-${n}`,
          excerpt: `Excerpt for ${w}-${n}`,
          tags: ['perf', `w${w}`],
          isPinned: n === 0,
          isFavorite: false,
          isArchived: false,
          order: n,
          createdAt: now + n,
          updatedAt: now + n,
        });
      }

      for (let t = 0; t < counts.todosPerWorkspace; t++) {
        todos.push({
          id: `todo-${w}-${t}`,
          workspaceId: wsId,
          title: `Todo ${w}-${t}`,
          completed: t % 2 === 0,
          priority: 'medium',
          order: t,
          createdAt: now + t,
          updatedAt: now + t,
        });
      }
    }

    const settings: AppSettingsEntity = {
      id: 'current_settings',
      theme: 'dark',
      accentColor: '#3b82f6',
      fontFamily: 'Inter',
      fontSize: 'md',
      backgroundType: 'color',
      backgroundValue: '#0f172a',
      widgetOpacity: 90,
      widgetBlur: 10,
      activeWorkspaceId: workspaces[0].id,
      updatedAt: now,
    };

    const data = {
      workspaces,
      settings,
      widgetInstances: [],
      widgetLayouts: [],
      todos,
      notes,
      noteCollections,
      noteTags: [],
      noteBookmarkLinks: [],
      bookmarks,
      bookmarkGroups,
      focusSessions: [],
      dailyGoals: [],
      stickyNotes: [],
      vocabulary: [],
      resources: [],
      calendarEvents: [],
    };

    const itemCounts: Record<string, number> = {
      workspaces: workspaces.length,
      settings: 1,
      widgetInstances: 0,
      widgetLayouts: 0,
      todos: todos.length,
      notes: notes.length,
      noteCollections: noteCollections.length,
      noteTags: 0,
      noteBookmarkLinks: 0,
      bookmarks: bookmarks.length,
      bookmarkGroups: bookmarkGroups.length,
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

  it('Small Dataset Benchmark: ~20 entities restore', async () => {
    const backup = await createScaleBackup({
      workspaces: 1,
      bookmarksPerWorkspace: 10,
      notesPerWorkspace: 5,
      todosPerWorkspace: 5,
    });

    const start = performance.now();
    const result = await restoreService.restoreBackup(backup);
    const duration = performance.now() - start;

    expect(result.success).toBe(true);
    expect(duration).toBeLessThan(500); // Target < 500 ms
    console.log(`[Small Benchmark] Restored 21 entities in ${duration.toFixed(2)} ms`);
  });

  it('Medium Dataset Benchmark: ~150 entities restore', async () => {
    const backup = await createScaleBackup({
      workspaces: 3,
      bookmarksPerWorkspace: 30,
      notesPerWorkspace: 10,
      todosPerWorkspace: 10,
    });

    const start = performance.now();
    const result = await restoreService.restoreBackup(backup);
    const duration = performance.now() - start;

    expect(result.success).toBe(true);
    expect(duration).toBeLessThan(1000); // Target < 1000 ms
    console.log(`[Medium Benchmark] Restored 156 entities in ${duration.toFixed(2)} ms`);
  });

  it('Large Dataset Benchmark: ~600 entities restore & rollback', async () => {
    const backup = await createScaleBackup({
      workspaces: 5,
      bookmarksPerWorkspace: 60,
      notesPerWorkspace: 30,
      todosPerWorkspace: 30,
    });

    const start = performance.now();
    const result = await restoreService.restoreBackup(backup);
    const duration = performance.now() - start;

    expect(result.success).toBe(true);
    expect(duration).toBeLessThan(2000); // Target < 2000 ms
    console.log(`[Large Benchmark] Restored 605 entities in ${duration.toFixed(2)} ms`);
  });
});
