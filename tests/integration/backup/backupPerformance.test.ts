import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import 'fake-indexeddb/auto';
import { NookSpaceDB } from '../../../src/services/database/db';
import { BackupExportService } from '../../../src/features/backup/services/backupExportService';
import { verifyBackupChecksum } from '../../../src/features/backup/services/backupIntegrityService';
import {
  WorkspaceEntity,
  BookmarkEntity,
  BookmarkGroupEntity,
  TodoEntity,
  FocusSessionEntity,
  DailyGoalEntity,
  WidgetInstanceEntity,
  WidgetLayoutEntity,
} from '../../../src/types/database';
import { NoteEntity, NoteCollectionEntity, NoteTagEntity } from '../../../src/types/notes';

describe('Milestone 9.1 — Backup Performance & Scale Benchmarks', () => {
  let perfDb: NookSpaceDB;
  let exportService: BackupExportService;
  const dbName = 'perf-backup-db';

  beforeEach(() => {
    perfDb = new NookSpaceDB(dbName);
    exportService = new BackupExportService(perfDb);
  });

  afterEach(async () => {
    await perfDb.delete();
  });

  async function seedScaleDataset(
    db: NookSpaceDB,
    counts: {
      workspaces: number;
      bookmarks: number;
      notes: number;
      todos: number;
      focusSessions: number;
    }
  ): Promise<void> {
    const now = 1731000000000;
    const workspaces: WorkspaceEntity[] = [];
    for (let w = 0; w < counts.workspaces; w++) {
      workspaces.push({
        id: `ws-${w}`,
        name: `Workspace ${w}`,
        icon: 'LayoutGrid',
        isDefault: w === 0,
        order: w,
        createdAt: now,
        updatedAt: now,
      });
    }
    await db.workspaces.bulkAdd(workspaces);

    const bookmarks: BookmarkEntity[] = [];
    for (let b = 0; b < counts.bookmarks; b++) {
      const wsId = `ws-${b % counts.workspaces}`;
      bookmarks.push({
        id: `bm-${b}`,
        workspaceId: wsId,
        groupId: null,
        title: `Bookmark Title ${b} — High Performance Web Reference`,
        url: `https://example.com/reference/${b}?search=query&ref=nookspace`,
        description: `Description for bookmark ${b} highlighting test search token and tags.`,
        isFavorite: b % 10 === 0,
        order: b,
        createdAt: now,
        updatedAt: now,
      });
    }
    await db.bookmarks.bulkAdd(bookmarks);

    const notes: NoteEntity[] = [];
    for (let n = 0; n < counts.notes; n++) {
      const wsId = `ws-${n % counts.workspaces}`;
      notes.push({
        id: `note-${n}`,
        workspaceId: wsId,
        collectionId: null,
        title: `Note Title ${n}: Architecture and Scale Benchmarks`,
        content: `## Note Document ${n}\n\nThis is a realistic markdown document body for testing universal export serialization.\n- [x] Task 1\n- [ ] Task 2\n\n\`\`\`ts\nconst x: number = ${n};\n\`\`\`\n\nParagraph text providing content volume for measuring export performance.`,
        excerpt: `Note Document ${n} This is a realistic markdown document body...`,
        isPinned: n % 20 === 0,
        isFavorite: n % 15 === 0,
        isArchived: false,
        tags: [`tag-${n % 10}`, 'scale-test'],
        order: n,
        createdAt: now,
        updatedAt: now,
      });
    }
    await db.notes.bulkAdd(notes);

    const todos: TodoEntity[] = [];
    for (let t = 0; t < counts.todos; t++) {
      const wsId = `ws-${t % counts.workspaces}`;
      todos.push({
        id: `todo-${t}`,
        workspaceId: wsId,
        title: `Todo Item ${t} to be validated`,
        completed: t % 2 === 0,
        priority: t % 4 === 0 ? 'urgent' : t % 3 === 0 ? 'high' : 'medium',
        order: t,
        createdAt: now,
        updatedAt: now,
      });
    }
    await db.todos.bulkAdd(todos);

    const focusSessions: FocusSessionEntity[] = [];
    for (let f = 0; f < counts.focusSessions; f++) {
      const wsId = `ws-${f % counts.workspaces}`;
      focusSessions.push({
        id: `fs-${f}`,
        workspaceId: wsId,
        type: 'pomodoro',
        durationMinutes: 25,
        startedAt: now - (f + 1) * 1800000,
        completedAt: now - f * 1800000,
        completed: true,
      });
    }
    await db.focusSessions.bulkAdd(focusSessions);
  }

  it('Small Dataset Benchmark: 2 Workspaces, 100 Bookmarks, 50 Notes, 50 Todos', async () => {
    await seedScaleDataset(perfDb, {
      workspaces: 2,
      bookmarks: 100,
      notes: 50,
      todos: 50,
      focusSessions: 20,
    });

    const start = performance.now();
    const result = await exportService.createFullBackup();
    const durationMs = performance.now() - start;

    expect(result.itemCounts.workspaces).toBe(2);
    expect(result.itemCounts.bookmarks).toBe(100);
    expect(result.itemCounts.notes).toBe(50);
    expect(result.itemCounts.todos).toBe(50);
    expect(result.sizeBytes).toBeGreaterThan(10000); // > 10 KB
    expect(await verifyBackupChecksum(result.backup)).toBe(true);

    // Sub-second expectation
    expect(durationMs).toBeLessThan(1500);
    console.log(`[Small Benchmark] Exported ${result.sizeBytes} bytes in ${durationMs.toFixed(2)} ms`);
  });

  it('Medium Dataset Benchmark: 5 Workspaces, 1,000 Bookmarks, 500 Notes, 500 Todos', async () => {
    await seedScaleDataset(perfDb, {
      workspaces: 5,
      bookmarks: 1000,
      notes: 500,
      todos: 500,
      focusSessions: 200,
    });

    const start = performance.now();
    const result = await exportService.createFullBackup();
    const durationMs = performance.now() - start;

    expect(result.itemCounts.workspaces).toBe(5);
    expect(result.itemCounts.bookmarks).toBe(1000);
    expect(result.itemCounts.notes).toBe(500);
    expect(result.itemCounts.todos).toBe(500);
    expect(result.sizeBytes).toBeGreaterThan(300000); // > 300 KB
    expect(await verifyBackupChecksum(result.backup)).toBe(true);

    expect(durationMs).toBeLessThan(3500);
    console.log(`[Medium Benchmark] Exported ${(result.sizeBytes / 1024).toFixed(2)} KB in ${durationMs.toFixed(2)} ms`);
  });

  it('Large Dataset Benchmark: 10 Workspaces, 5,000 Bookmarks, 2,000 Notes, 2,000 Todos', async () => {
    await seedScaleDataset(perfDb, {
      workspaces: 10,
      bookmarks: 5000,
      notes: 2000,
      todos: 2000,
      focusSessions: 1000,
    });

    const start = performance.now();
    const result = await exportService.createFullBackup();
    const durationMs = performance.now() - start;

    expect(result.itemCounts.workspaces).toBe(10);
    expect(result.itemCounts.bookmarks).toBe(5000);
    expect(result.itemCounts.notes).toBe(2000);
    expect(result.itemCounts.todos).toBe(2000);
    expect(result.sizeBytes).toBeGreaterThan(2000000); // > 2 MB
    expect(await verifyBackupChecksum(result.backup)).toBe(true);

    expect(durationMs).toBeLessThan(8000);
    console.log(`[Large Benchmark] Exported ${(result.sizeBytes / (1024 * 1024)).toFixed(2)} MB in ${durationMs.toFixed(2)} ms`);
  });
});
