import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import 'fake-indexeddb/auto';
import { NookSpaceDB } from '../../../src/services/database/db';
import { BackupExportService } from '../../../src/features/backup/services/backupExportService';
import { validateBackup } from '../../../src/features/backup/services/backupValidationService';
import type { WorkspaceEntity, BookmarkEntity, BookmarkGroupEntity, TodoEntity } from '../../../src/types/database';
import type { NoteEntity, NoteCollectionEntity } from '../../../src/types/notes';

describe('Milestone 9.2 — Backup Validation Pipeline & Benchmarks', () => {
  let db: NookSpaceDB;
  const dbName = 'pipeline-benchmark-db';

  beforeEach(() => {
    db = new NookSpaceDB(dbName);
  });

  afterEach(async () => {
    await db.delete();
  });

  async function seedRealisticDataset(
    targetDb: NookSpaceDB,
    counts: {
      workspaces: number;
      bookmarksPerWorkspace: number;
      notesPerWorkspace: number;
      todosPerWorkspace: number;
    }
  ): Promise<void> {
    const now = 1731000000000;

    for (let w = 0; w < counts.workspaces; w++) {
      const wsId = `ws-bench-${w}`;
      const ws: WorkspaceEntity = {
        id: wsId,
        name: `Workspace ${w}`,
        icon: 'LayoutGrid',
        isDefault: w === 0,
        order: w,
        createdAt: now,
        updatedAt: now,
      };
      await targetDb.workspaces.add(ws);

      const grpId = `grp-bench-${w}`;
      const group: BookmarkGroupEntity = {
        id: grpId,
        workspaceId: wsId,
        title: `Group ${w}`,
        order: 0,
        createdAt: now,
        updatedAt: now,
      };
      await targetDb.bookmarkGroups.add(group);

      const colId = `col-bench-${w}`;
      const collection: NoteCollectionEntity = {
        id: colId,
        workspaceId: wsId,
        title: `Collection ${w}`,
        order: 0,
        createdAt: now,
        updatedAt: now,
      };
      await targetDb.noteCollections.add(collection);

      const bookmarks: BookmarkEntity[] = [];
      for (let b = 0; b < counts.bookmarksPerWorkspace; b++) {
        bookmarks.push({
          id: `bm-${w}-${b}`,
          workspaceId: wsId,
          groupId: grpId,
          title: `Bookmark ${w}-${b}`,
          url: `https://example.com/site/${w}/${b}`,
          isFavorite: b % 5 === 0,
          order: b,
          createdAt: now + b,
          updatedAt: now + b,
        });
      }
      if (bookmarks.length > 0) {
        await targetDb.bookmarks.bulkAdd(bookmarks);
      }

      const notes: NoteEntity[] = [];
      for (let n = 0; n < counts.notesPerWorkspace; n++) {
        notes.push({
          id: `note-${w}-${n}`,
          workspaceId: wsId,
          collectionId: colId,
          title: `Note Title ${w}-${n}`,
          content: `Content for note ${w}-${n} testing payload scale.`,
          excerpt: `Excerpt for ${w}-${n}`,
          tags: ['benchmark', `w${w}`],
          isPinned: n === 0,
          isFavorite: false,
          isArchived: false,
          order: n,
          createdAt: now + n,
          updatedAt: now + n,
        });
      }
      if (notes.length > 0) {
        await targetDb.notes.bulkAdd(notes);
      }

      const todos: TodoEntity[] = [];
      for (let t = 0; t < counts.todosPerWorkspace; t++) {
        todos.push({
          id: `todo-${w}-${t}`,
          workspaceId: wsId,
          title: `Task item ${w}-${t}`,
          completed: t % 2 === 0,
          priority: 'medium',
          order: t,
          createdAt: now + t,
          updatedAt: now + t,
        });
      }
      if (todos.length > 0) {
        await targetDb.todos.bulkAdd(todos);
      }
    }

    await targetDb.settings.put({
      id: 'current_settings',
      theme: 'dark',
      accentColor: '#3b82f6',
      fontFamily: 'Inter',
      fontSize: 'md',
      backgroundType: 'color',
      backgroundValue: '#0f172a',
      widgetOpacity: 90,
      widgetBlur: 10,
      activeWorkspaceId: 'ws-bench-0',
      updatedAt: now,
    });
  }

  describe('Full Roundtrip Pipeline', () => {
    it('successfully validates fresh export from database', async () => {
      await seedRealisticDataset(db, {
        workspaces: 2,
        bookmarksPerWorkspace: 10,
        notesPerWorkspace: 5,
        todosPerWorkspace: 5,
      });

      const exportService = new BackupExportService(db);
      const { backup, jsonString } = await exportService.createFullBackup();

      expect(backup).toBeDefined();
      expect(jsonString).toBeDefined();

      // Test validation on in-memory object
      const objectReport = await validateBackup(backup!);
      expect(objectReport.status).toBe('valid');
      expect(objectReport.isValid).toBe(true);
      expect(objectReport.isSupported).toBe(true);
      expect(objectReport.errors).toHaveLength(0);
      expect(objectReport.checksumVerified).toBe(true);
      expect(objectReport.canonicalBackup).toBeDefined();

      // Test validation on JSON string
      const stringReport = await validateBackup(jsonString!);
      expect(stringReport.status).toBe('valid');
      expect(stringReport.isValid).toBe(true);
      expect(stringReport.fileSizeBytes).toBeGreaterThan(0);
    });

    it('successfully validates and upgrades legacy Phase 6 bookmarks backup', async () => {
      const legacyBackup = {
        format: 'nookspace-bookmarks',
        version: 1,
        exportedAt: 1710000000000,
        data: {
          workspaceId: 'ws-imported',
          groups: [
            {
              id: 'grp-legacy-1',
              title: 'Study Links',
              icon: 'BookOpen',
              color: '#10b981',
              order: 0,
              createdAt: 1710000000000,
              updatedAt: 1710000000000,
            },
          ],
          bookmarks: [
            {
              id: 'bm-legacy-1',
              groupId: 'grp-legacy-1',
              title: 'Khan Academy',
              url: 'https://khanacademy.org',
              order: 0,
              createdAt: 1710000000000,
              updatedAt: 1710000000000,
            },
          ],
        },
      };

      const report = await validateBackup(legacyBackup);
      expect(report.status).toBe('valid');
      expect(report.isValid).toBe(true);
      expect(report.isPartialBackup).toBe(true);
      expect(report.requiresUpgrade).toBe(true);
      expect(report.upgradeApplied).toBe(true);
      expect(report.canonicalBackup).toBeDefined();
      expect(report.canonicalBackup?.format).toBe('nookspace-backup');
      expect(report.canonicalBackup?.formatVersion).toBe(1);
      expect(report.canonicalBackup?.data.workspaces[0].name).toBe('Imported Bookmarks');
    });
  });

  describe('Tamper Detection Pipeline', () => {
    it('detects single-character payload tampering and flags CHECKSUM_MISMATCH', async () => {
      await seedRealisticDataset(db, {
        workspaces: 1,
        bookmarksPerWorkspace: 5,
        notesPerWorkspace: 2,
        todosPerWorkspace: 2,
      });

      const exportService = new BackupExportService(db);
      const { backup } = await exportService.createFullBackup();
      expect(backup).toBeDefined();

      const tampered = JSON.parse(JSON.stringify(backup!));
      tampered.data.bookmarks[0].title += ' [Tampered]';

      const report = await validateBackup(tampered);
      expect(report.status).toBe('invalid');
      expect(report.isValid).toBe(false);
      expect(report.checksumVerified).toBe(false);
      expect(report.errors.some((e) => e.code === 'CHECKSUM_MISMATCH')).toBe(true);
    });
  });

  describe('Validation Performance Benchmarks', () => {
    it('benchmarks small, medium, and large dataset validation speed', async () => {
      // 1. SMALL DATASET (~20 entities)
      await seedRealisticDataset(db, {
        workspaces: 1,
        bookmarksPerWorkspace: 10,
        notesPerWorkspace: 5,
        todosPerWorkspace: 5,
      });
      const exportService = new BackupExportService(db);
      const smallExport = await exportService.createFullBackup();

      const startSmall = performance.now();
      const reportSmall = await validateBackup(smallExport.backup!);
      const durationSmall = performance.now() - startSmall;

      expect(reportSmall.status).toBe('valid');
      expect(durationSmall).toBeLessThan(200); // Target < 200ms

      // Clean DB for medium dataset
      await db.delete();
      db = new NookSpaceDB(dbName);

      // 2. MEDIUM DATASET (~150 entities)
      await seedRealisticDataset(db, {
        workspaces: 3,
        bookmarksPerWorkspace: 30,
        notesPerWorkspace: 10,
        todosPerWorkspace: 10,
      });
      const mediumExport = await new BackupExportService(db).createFullBackup();

      const startMedium = performance.now();
      const reportMedium = await validateBackup(mediumExport.backup!);
      const durationMedium = performance.now() - startMedium;

      expect(reportMedium.status).toBe('valid');
      expect(durationMedium).toBeLessThan(350); // Target < 350ms

      // Clean DB for large dataset
      await db.delete();
      db = new NookSpaceDB(dbName);

      // 3. LARGE DATASET (~600 entities)
      await seedRealisticDataset(db, {
        workspaces: 5,
        bookmarksPerWorkspace: 60,
        notesPerWorkspace: 30,
        todosPerWorkspace: 30,
      });
      const largeExport = await new BackupExportService(db).createFullBackup();

      const startLarge = performance.now();
      const reportLarge = await validateBackup(largeExport.backup!);
      const durationLarge = performance.now() - startLarge;

      expect(reportLarge.status).toBe('valid');
      expect(durationLarge).toBeLessThan(600); // Target < 600ms
    });
  });
});
