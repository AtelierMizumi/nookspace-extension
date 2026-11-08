import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NookSpaceDB } from '../../../src/services/database/db';
import {
  parseImportFile,
  computePreviewStats,
  executeImportTransaction,
} from '../../../src/features/bookmarks/services/bookmarkImportCoordinator';
import { BookmarkEntity, BookmarkGroupEntity } from '../../../src/types/bookmarks';
import { ImportPreview } from '../../../src/features/bookmarks/types/bookmarkImportExport';

describe('bookmarkImportCoordinator — Milestone 6.7 Import Transaction & Integrity', () => {
  let db: NookSpaceDB;

  beforeEach(async () => {
    db = new NookSpaceDB();
    await db.open();
    await db.bookmarks.clear();
    await db.bookmarkGroups.clear();
  });

  describe('File Parsing & Format Detection', () => {
    it('1. correctly identifies and parses JSON backup files', () => {
      const jsonContent = JSON.stringify({
        format: 'nookspace-bookmarks',
        version: 1,
        exportedAt: 1000,
        data: {
          workspaceId: 'ws-old',
          groups: [{ id: 'g1', title: 'Work', order: 0, createdAt: 1, updatedAt: 1 }],
          bookmarks: [
            {
              id: 'b1',
              groupId: 'g1',
              title: 'Slack',
              url: 'https://slack.com',
              order: 0,
              createdAt: 1,
              updatedAt: 1,
            },
          ],
        },
      });

      const preview = parseImportFile(jsonContent, 'backup.json');

      expect(preview.format).toBe('json');
      expect(preview.totalFolders).toBe(1);
      expect(preview.totalBookmarks).toBe(1);
      expect(preview.validBookmarks).toBe(1);
      expect(preview.candidateBookmarks[0].title).toBe('Slack');
    });

    it('2. correctly identifies and parses Netscape Bookmark HTML files', () => {
      const htmlContent = `
        <!DOCTYPE NETSCAPE-Bookmark-file-1>
        <DL><p>
          <DT><H3>Reading</H3>
          <DL><p>
            <DT><A HREF="https://news.ycombinator.com">Hacker News</A>
          </DL><p>
        </DL><p>
      `;

      const preview = parseImportFile(htmlContent, 'bookmarks.html');

      expect(preview.format).toBe('html');
      expect(preview.totalFolders).toBe(1);
      expect(preview.totalBookmarks).toBe(1);
      expect(preview.candidateBookmarks[0].title).toBe('Hacker News');
    });

    it('3. throws error when file content is empty', () => {
      expect(() => parseImportFile('   ', 'empty.html')).toThrow(/file is empty/i);
    });
  });

  describe('Preview Statistics Computation', () => {
    const preview: ImportPreview = {
      format: 'html',
      sourceFilename: 'test.html',
      totalFolders: 1,
      totalBookmarks: 2,
      validBookmarks: 2,
      invalidBookmarks: 0,
      rejectedUnsafeUrls: 0,
      duplicateBookmarksInFile: 0,
      candidateGroups: [{ tempId: 'g1', title: 'Work', order: 0 }],
      candidateBookmarks: [
        {
          tempId: 'b1',
          tempGroupId: 'g1',
          title: 'GitHub',
          url: 'https://github.com',
          isFavorite: false,
          order: 0,
          isValid: true,
        },
        {
          tempId: 'b2',
          tempGroupId: null,
          title: 'Notion',
          url: 'https://notion.so',
          isFavorite: false,
          order: 1,
          isValid: true,
        },
      ],
      invalidEntries: [],
    };

    const existingBookmarks: BookmarkEntity[] = [
      {
        id: 'exist-1',
        workspaceId: 'ws-1',
        groupId: null,
        title: 'GitHub Old',
        url: 'https://github.com', // Duplicate URL
        isFavorite: true,
        order: 0,
        createdAt: 100,
        updatedAt: 100,
      },
    ];

    const existingGroups: BookmarkGroupEntity[] = [
      {
        id: 'grp-exist-1',
        workspaceId: 'ws-1',
        title: 'Work', // Duplicate folder title
        order: 0,
        createdAt: 100,
        updatedAt: 100,
      },
    ];

    it('4. computes expectedAdded, expectedSkipped, and expectedUpdated for duplicate policies', () => {
      // Policy: skip
      const statsSkip = computePreviewStats(preview, existingBookmarks, existingGroups, 'skip', 'merge');
      expect(statsSkip.expectedAdded).toBe(1); // Notion
      expect(statsSkip.expectedSkipped).toBe(1); // GitHub
      expect(statsSkip.expectedUpdated).toBe(0);
      expect(statsSkip.expectedGroupsCreated).toBe(0); // Work already exists

      // Policy: update
      const statsUpdate = computePreviewStats(preview, existingBookmarks, existingGroups, 'update', 'merge');
      expect(statsUpdate.expectedAdded).toBe(1); // Notion
      expect(statsUpdate.expectedSkipped).toBe(0);
      expect(statsUpdate.expectedUpdated).toBe(1); // GitHub updated

      // Policy: import (allow duplicates)
      const statsImport = computePreviewStats(preview, existingBookmarks, existingGroups, 'import', 'merge');
      expect(statsImport.expectedAdded).toBe(2);
      expect(statsImport.expectedSkipped).toBe(0);
      expect(statsImport.expectedUpdated).toBe(0);
    });

    it('5. computes replace mode statistics where all candidate bookmarks are added', () => {
      const statsReplace = computePreviewStats(preview, existingBookmarks, existingGroups, 'skip', 'replace');
      expect(statsReplace.expectedAdded).toBe(2);
      expect(statsReplace.expectedGroupsCreated).toBe(1);
    });
  });

  describe('Database Transaction Execution & Atomicity', () => {
    const preview: ImportPreview = {
      format: 'json',
      sourceFilename: 'backup.json',
      totalFolders: 1,
      totalBookmarks: 2,
      validBookmarks: 2,
      invalidBookmarks: 0,
      rejectedUnsafeUrls: 0,
      duplicateBookmarksInFile: 0,
      candidateGroups: [{ tempId: 'temp-grp-1', title: 'Tech', order: 0 }],
      candidateBookmarks: [
        {
          tempId: 'temp-bm-1',
          tempGroupId: 'temp-grp-1',
          title: 'GitHub',
          url: 'https://github.com',
          isFavorite: true,
          order: 0,
          isValid: true,
        },
        {
          tempId: 'temp-bm-2',
          tempGroupId: null,
          title: 'Vite',
          url: 'https://vite.dev',
          isFavorite: false,
          order: 1,
          isValid: true,
        },
      ],
      invalidEntries: [],
    };

    it('6. executes Merge import with skip duplicate policy', async () => {
      // Existing bookmark with URL https://github.com in ws-1
      await db.bookmarks.put({
        id: 'existing-bm-1',
        workspaceId: 'ws-1',
        groupId: null,
        title: 'GitHub Existing',
        url: 'https://github.com',
        isFavorite: false,
        order: 0,
        createdAt: 100,
        updatedAt: 100,
      });

      const result = await executeImportTransaction(
        {
          workspaceId: 'ws-1',
          mode: 'merge',
          duplicatePolicy: 'skip',
        },
        preview,
        db
      );

      expect(result.success).toBe(true);
      expect(result.bookmarksCreated).toBe(1); // Vite created
      expect(result.bookmarksSkipped).toBe(1); // GitHub skipped
      expect(result.groupsCreated).toBe(1); // Tech folder created

      const inDb = await db.bookmarks.where('workspaceId').equals('ws-1').toArray();
      expect(inDb).toHaveLength(2); // 1 existing + 1 new
      const existing = inDb.find((b) => b.url === 'https://github.com');
      expect(existing?.title).toBe('GitHub Existing'); // title untouched
    });

    it('7. executes Merge import with update duplicate policy', async () => {
      await db.bookmarks.put({
        id: 'existing-bm-1',
        workspaceId: 'ws-1',
        groupId: null,
        title: 'GitHub Existing',
        url: 'https://github.com',
        isFavorite: false,
        order: 0,
        createdAt: 100,
        updatedAt: 100,
      });

      const result = await executeImportTransaction(
        {
          workspaceId: 'ws-1',
          mode: 'merge',
          duplicatePolicy: 'update',
        },
        preview,
        db
      );

      expect(result.success).toBe(true);
      expect(result.bookmarksCreated).toBe(1); // Vite
      expect(result.bookmarksUpdated).toBe(1); // GitHub updated

      const inDb = await db.bookmarks.where('workspaceId').equals('ws-1').toArray();
      const updated = inDb.find((b) => b.url === 'https://github.com');
      expect(updated?.title).toBe('GitHub'); // updated title from import
      expect(updated?.isFavorite).toBe(true); // updated favorite status
    });

    it('8. executes Replace import: replaces current workspace bookmarks and leaves other workspaces untouched', async () => {
      // Existing data in ws-1
      await db.bookmarks.put({
        id: 'ws1-old',
        workspaceId: 'ws-1',
        groupId: null,
        title: 'Old WS1',
        url: 'https://old1.com',
        isFavorite: false,
        order: 0,
        createdAt: 100,
        updatedAt: 100,
      });
      await db.bookmarkGroups.put({
        id: 'ws1-old-grp',
        workspaceId: 'ws-1',
        title: 'Old Group',
        order: 0,
        createdAt: 100,
        updatedAt: 100,
      });

      // Existing data in foreign workspace ws-2
      await db.bookmarks.put({
        id: 'ws2-bookmark',
        workspaceId: 'ws-2',
        groupId: null,
        title: 'Foreign WS2',
        url: 'https://foreign.com',
        isFavorite: false,
        order: 0,
        createdAt: 100,
        updatedAt: 100,
      });

      const result = await executeImportTransaction(
        {
          workspaceId: 'ws-1',
          mode: 'replace',
          duplicatePolicy: 'skip',
        },
        preview,
        db
      );

      expect(result.success).toBe(true);
      expect(result.mode).toBe('replace');
      expect(result.bookmarksCreated).toBe(2);

      // Verify ws-1 data replaced
      const ws1Bookmarks = await db.bookmarks.where('workspaceId').equals('ws-1').toArray();
      expect(ws1Bookmarks).toHaveLength(2);
      expect(ws1Bookmarks.find((b) => b.url === 'https://old1.com')).toBeUndefined();

      // Verify ws-2 data preserved 100%
      const ws2Bookmarks = await db.bookmarks.where('workspaceId').equals('ws-2').toArray();
      expect(ws2Bookmarks).toHaveLength(1);
      expect(ws2Bookmarks[0].title).toBe('Foreign WS2');
    });

    it('9. verifies complete transaction rollback on failure (zero partial writes)', async () => {
      // Seed initial data in ws-1
      await db.bookmarks.put({
        id: 'initial-bm',
        workspaceId: 'ws-1',
        groupId: null,
        title: 'Initial Bookmark',
        url: 'https://initial.com',
        isFavorite: false,
        order: 0,
        createdAt: 100,
        updatedAt: 100,
      });

      // Spy on bookmarks.put to simulate a storage failure during the transaction
      const originalPut = db.bookmarks.put.bind(db.bookmarks);
      let callCount = 0;
      vi.spyOn(db.bookmarks, 'put').mockImplementation((async (record: BookmarkEntity) => {
        callCount++;
        if (callCount === 2) {
          throw new Error('Simulated IndexedDB I/O Failure');
        }
        return originalPut(record);
      }) as any);

      await expect(
        executeImportTransaction(
          {
            workspaceId: 'ws-1',
            mode: 'replace',
            duplicatePolicy: 'skip',
          },
          preview,
          db
        )
      ).rejects.toThrow('Simulated IndexedDB I/O Failure');

      // Verify rollback: initial bookmark in ws-1 survived
      const ws1Bookmarks = await db.bookmarks.where('workspaceId').equals('ws-1').toArray();
      expect(ws1Bookmarks).toHaveLength(1);
      expect(ws1Bookmarks[0].title).toBe('Initial Bookmark');

      vi.restoreAllMocks();
    });
  });
});
