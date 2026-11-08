import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import 'fake-indexeddb/auto';
import { NookSpaceDB } from '../../../src/services/database/db';
import {
  BackupExportService,
  formatBackupFilename,
  DEFAULT_APP_VERSION,
} from '../../../src/features/backup/services/backupExportService';
import { verifyBackupChecksum } from '../../../src/features/backup/services/backupIntegrityService';
import {
  BACKUP_FORMAT_IDENTIFIER,
  BACKUP_FORMAT_VERSION,
} from '../../../src/features/backup/types/backupTypes';

describe('Milestone 9.1 — Universal Backup Export Service', () => {
  let testDb: NookSpaceDB;
  let exportService: BackupExportService;
  const dbName = 'test-export-db';

  beforeEach(async () => {
    testDb = new NookSpaceDB(dbName);
    exportService = new BackupExportService(testDb);
  });

  afterEach(async () => {
    await testDb.delete();
  });

  async function seedComprehensiveTestData(db: NookSpaceDB): Promise<void> {
    const now = 1731000000000;

    await db.workspaces.bulkAdd([
      {
        id: 'ws-personal',
        name: 'Personal Space',
        icon: 'Sparkles',
        color: '#6366f1',
        isDefault: true,
        order: 0,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'ws-work',
        name: 'Work Space',
        icon: 'Briefcase',
        color: '#10b981',
        isDefault: false,
        order: 1,
        createdAt: now,
        updatedAt: now,
      },
    ]);

    await db.settings.put({
      id: 'current_settings',
      theme: 'dark',
      accentColor: '#6366f1',
      fontFamily: 'Inter',
      fontSize: 'md',
      backgroundType: 'color',
      backgroundValue: '#09090b',
      widgetOpacity: 90,
      widgetBlur: 10,
      activeWorkspaceId: 'ws-personal',
      userName: 'Alice',
      updatedAt: now,
    });

    await db.widgetInstances.bulkAdd([
      {
        id: 'wi-clock',
        workspaceId: 'ws-personal',
        widgetType: 'clock',
        title: 'Time & Greeting',
        config: { showSeconds: true },
        isEnabled: true,
        order: 0,
        createdAt: now,
        updatedAt: now,
      },
    ]);

    await db.widgetLayouts.bulkAdd([
      {
        id: 'ws-personal_wi-clock_lg',
        workspaceId: 'ws-personal',
        widgetInstanceId: 'wi-clock',
        breakpoint: 'lg',
        x: 0,
        y: 0,
        w: 4,
        h: 2,
        isDefault: true,
        createdAt: now,
        updatedAt: now,
      },
    ]);

    await db.todos.bulkAdd([
      {
        id: 'todo-1',
        workspaceId: 'ws-personal',
        title: 'Complete universal export test',
        completed: false,
        priority: 'high',
        order: 0,
        createdAt: now,
        updatedAt: now,
      },
    ]);

    await db.noteCollections.bulkAdd([
      {
        id: 'col-1',
        workspaceId: 'ws-personal',
        title: 'Architecture Docs',
        order: 0,
        createdAt: now,
        updatedAt: now,
      },
    ]);

    await db.noteTags.bulkAdd([
      {
        id: 'tag-1',
        workspaceId: 'ws-personal',
        name: 'specs',
        color: '#3b82f6',
        createdAt: now,
        updatedAt: now,
      },
    ]);

    await db.notes.bulkAdd([
      {
        id: 'note-1',
        workspaceId: 'ws-personal',
        collectionId: 'col-1',
        title: 'M9.1 Specification',
        content: '# M9.1 Architecture Notes\nFull coverage verified.',
        excerpt: 'M9.1 Architecture Notes...',
        isPinned: true,
        isFavorite: false,
        isArchived: false,
        tags: ['specs'],
        order: 0,
        createdAt: now,
        updatedAt: now,
      },
    ]);

    await db.bookmarkGroups.bulkAdd([
      {
        id: 'grp-1',
        workspaceId: 'ws-personal',
        title: 'Dev Resources',
        order: 0,
        createdAt: now,
        updatedAt: now,
      },
    ]);

    await db.bookmarks.bulkAdd([
      {
        id: 'bm-1',
        workspaceId: 'ws-personal',
        groupId: 'grp-1',
        title: 'MDN Web Docs',
        url: 'https://developer.mozilla.org',
        isFavorite: true,
        order: 0,
        createdAt: now,
        updatedAt: now,
      },
    ]);

    await db.noteBookmarkLinks.bulkAdd([
      {
        id: 'link-1',
        workspaceId: 'ws-personal',
        noteId: 'note-1',
        bookmarkId: 'bm-1',
        createdAt: now,
      },
    ]);

    await db.focusSessions.bulkAdd([
      {
        id: 'fs-1',
        workspaceId: 'ws-personal',
        type: 'pomodoro',
        durationMinutes: 25,
        startedAt: now - 1500000,
        completedAt: now,
        completed: true,
      },
    ]);

    await db.dailyGoals.bulkAdd([
      {
        id: 'goal-1',
        workspaceId: 'ws-personal',
        title: 'Study 50 minutes',
        targetValue: 50,
        currentValue: 25,
        unit: 'min',
        dateString: '2026-11-07',
        createdAt: now,
        updatedAt: now,
      },
    ]);

    await db.stickyNotes.bulkAdd([
      {
        id: 'sn-1',
        workspaceId: 'ws-personal',
        content: 'Review export checksum',
        color: '#fbbf24',
        x: 100,
        y: 100,
        width: 180,
        height: 120,
        zIndex: 1,
        createdAt: now,
        updatedAt: now,
      },
    ]);

    await db.vocabulary.bulkAdd([
      {
        id: 'voc-1',
        workspaceId: 'ws-personal',
        word: 'Komorebi',
        meaning: 'Sunlight filtering through trees',
        category: 'Japanese',
        status: 'learning',
        createdAt: now,
        updatedAt: now,
      },
    ]);

    await db.resources.bulkAdd([
      {
        id: 'res-1',
        workspaceId: 'ws-personal',
        title: 'TypeScript Handbook',
        url: 'https://www.typescriptlang.org/docs',
        tags: ['ts', 'docs'],
        isPinned: false,
        createdAt: now,
        updatedAt: now,
      },
    ]);

    await db.calendarEvents.bulkAdd([
      {
        id: 'evt-1',
        workspaceId: 'ws-personal',
        title: 'Team Sync',
        startDate: now,
        endDate: now + 3600000,
        isAllDay: false,
        createdAt: now,
        updatedAt: now,
      },
    ]);
  }

  describe('formatBackupFilename', () => {
    it('produces formatted filename matching nookspace-backup-YYYY-MM-DD-HHMMSS.json', () => {
      const fixedDate = new Date(2026, 10, 7, 23, 15, 30); // Nov 7, 2026, 23:15:30
      const filename = formatBackupFilename(fixedDate);
      expect(filename).toBe('nookspace-backup-2026-11-07-231530.json');
    });
  });

  describe('createFullBackup', () => {
    it('exports all 17 tables with full fidelity, correct counts, and valid SHA-256 checksum', async () => {
      await seedComprehensiveTestData(testDb);

      const result = await exportService.createFullBackup();

      expect(result.backup.format).toBe(BACKUP_FORMAT_IDENTIFIER);
      expect(result.backup.formatVersion).toBe(BACKUP_FORMAT_VERSION);
      expect(result.backup.metadata.exportType).toBe('full');
      expect(result.backup.metadata.appVersion).toBe(DEFAULT_APP_VERSION);
      expect(result.backup.metadata.databaseSchemaVersion).toBe(4);

      // Verify item counts
      expect(result.itemCounts.workspaces).toBe(2);
      expect(result.itemCounts.settings).toBe(1);
      expect(result.itemCounts.widgetInstances).toBe(1);
      expect(result.itemCounts.widgetLayouts).toBe(1);
      expect(result.itemCounts.todos).toBe(1);
      expect(result.itemCounts.notes).toBe(1);
      expect(result.itemCounts.noteCollections).toBe(1);
      expect(result.itemCounts.noteTags).toBe(1);
      expect(result.itemCounts.noteBookmarkLinks).toBe(1);
      expect(result.itemCounts.bookmarks).toBe(1);
      expect(result.itemCounts.bookmarkGroups).toBe(1);
      expect(result.itemCounts.focusSessions).toBe(1);
      expect(result.itemCounts.dailyGoals).toBe(1);
      expect(result.itemCounts.stickyNotes).toBe(1);
      expect(result.itemCounts.vocabulary).toBe(1);
      expect(result.itemCounts.resources).toBe(1);
      expect(result.itemCounts.calendarEvents).toBe(1);

      // Verify relationship preservation
      expect(result.backup.data.notes[0].collectionId).toBe('col-1');
      expect(result.backup.data.notes[0].tags).toEqual(['specs']);
      expect(result.backup.data.bookmarks[0].groupId).toBe('grp-1');
      expect(result.backup.data.noteBookmarkLinks[0].noteId).toBe('note-1');
      expect(result.backup.data.noteBookmarkLinks[0].bookmarkId).toBe('bm-1');
      expect(result.backup.data.widgetLayouts[0].widgetInstanceId).toBe('wi-clock');

      // Verify checksum integrity
      expect(result.checksum).toMatch(/^[0-9a-f]{64}$/);
      const isChecksumValid = await verifyBackupChecksum(result.backup);
      expect(isChecksumValid).toBe(true);

      // Verify Blob
      expect(result.blob).toBeInstanceOf(Blob);
      expect(result.blob.type).toBe('application/json');
      expect(result.sizeBytes).toBeGreaterThan(500);
      expect(result.filename).toMatch(/^nookspace-backup-\d{4}-\d{2}-\d{2}-\d{6}\.json$/);
    });

    it('READ-ONLY GUARANTEE: strictly leaves database records and counts unchanged', async () => {
      await seedComprehensiveTestData(testDb);

      // Capture exact table states before export
      const beforeWorkspaces = await testDb.workspaces.toArray();
      const beforeTodos = await testDb.todos.toArray();
      const beforeNotes = await testDb.notes.toArray();
      const beforeBookmarks = await testDb.bookmarks.toArray();
      const beforeSettings = await testDb.settings.get('current_settings');
      const beforeLayouts = await testDb.widgetLayouts.toArray();

      // Execute export
      await exportService.createFullBackup();

      // Capture exact table states after export
      const afterWorkspaces = await testDb.workspaces.toArray();
      const afterTodos = await testDb.todos.toArray();
      const afterNotes = await testDb.notes.toArray();
      const afterBookmarks = await testDb.bookmarks.toArray();
      const afterSettings = await testDb.settings.get('current_settings');
      const afterLayouts = await testDb.widgetLayouts.toArray();

      expect(afterWorkspaces).toEqual(beforeWorkspaces);
      expect(afterTodos).toEqual(beforeTodos);
      expect(afterNotes).toEqual(beforeNotes);
      expect(afterBookmarks).toEqual(beforeBookmarks);
      expect(afterSettings).toEqual(beforeSettings);
      expect(afterLayouts).toEqual(beforeLayouts);
    });

    it('handles empty database and empty tables cleanly with 0 records', async () => {
      // Empty database (0 workspaces, 0 settings)
      const result = await exportService.createFullBackup();

      expect(result.backup.format).toBe(BACKUP_FORMAT_IDENTIFIER);
      expect(result.backup.data.workspaces).toEqual([]);
      expect(result.backup.data.settings).toBeNull();
      expect(result.itemCounts.workspaces).toBe(0);
      expect(result.itemCounts.notes).toBe(0);
      expect(result.warnings.length).toBe(0);

      const isValid = await verifyBackupChecksum(result.backup);
      expect(isValid).toBe(true);
    });

    it('detects legacy v1 layouts and emits an informational warning without failing export', async () => {
      // Seed a record in deprecated layouts table
      await testDb.layouts.put({
        id: 'legacy-layout-1',
        workspaceId: 'ws-test',
        name: 'Old Layout',
        isDefault: true,
        items: [],
        createdAt: 1000,
        updatedAt: 1000,
      });

      const result = await exportService.createFullBackup();
      const legacyWarning = result.warnings.find((w) => w.code === 'LEGACY_LAYOUTS_DETECTED');

      expect(legacyWarning).toBeDefined();
      expect(legacyWarning?.message).toContain('Detected 1 legacy layouts in deprecated v1 table');
    });

    it('detects unsafe bookmark URLs and records a warning while faithfully preserving original persisted data', async () => {
      await testDb.workspaces.put({
        id: 'ws-sec',
        name: 'Sec Space',
        icon: 'Globe',
        isDefault: true,
        order: 0,
        createdAt: 1000,
        updatedAt: 1000,
      });

      await testDb.bookmarks.put({
        id: 'bm-unsafe',
        workspaceId: 'ws-sec',
        groupId: null,
        title: 'Suspicious Bookmark',
        url: 'javascript:alert(document.cookie)',
        isFavorite: false,
        order: 0,
        createdAt: 1000,
        updatedAt: 1000,
      });

      const result = await exportService.createFullBackup();
      const urlWarning = result.warnings.find((w) => w.code === 'UNSAFE_BOOKMARK_URL_DETECTED');

      expect(urlWarning).toBeDefined();
      expect(urlWarning?.details).toEqual({
        id: 'bm-unsafe',
        url: 'javascript:alert(document.cookie)',
      });

      // Data preservation check: original bookmark is kept in export payload
      expect(result.backup.data.bookmarks[0].url).toBe('javascript:alert(document.cookie)');
    });

    it('supports appVersionOverride option', async () => {
      const result = await exportService.createFullBackup({
        appVersionOverride: '1.2.3-custom',
      });

      expect(result.backup.metadata.appVersion).toBe('1.2.3-custom');
    });
  });
});
