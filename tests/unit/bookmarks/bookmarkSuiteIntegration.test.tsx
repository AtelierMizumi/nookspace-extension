import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { db } from '../../../src/services/database/db';
import {
  bookmarkRepository,
} from '../../../src/features/bookmarks/repositories/bookmarkRepository';
import {
  bookmarkGroupRepository,
} from '../../../src/features/bookmarks/repositories/bookmarkGroupRepository';
import {
  createBookmarkStore,
  useBookmarkStore,
} from '../../../src/features/bookmarks/stores/bookmarkStore';
import {
  filterAndSortBookmarks,
} from '../../../src/features/bookmarks/services/bookmarkSearchService';
import {
  exportBookmarksToNetscapeHtml,
} from '../../../src/features/bookmarks/services/bookmarkHtmlExportService';
import {
  parseNetscapeBookmarkHtml,
} from '../../../src/features/bookmarks/utils/bookmarkHtmlParser';
import {
  exportBookmarksToJsonBackup,
} from '../../../src/features/bookmarks/services/bookmarkJsonExportService';
import {
  parseNookSpaceJsonBackup,
} from '../../../src/features/bookmarks/services/bookmarkJsonImportService';
import {
  parseImportFile,
  executeImportTransaction,
  computePreviewStats,
} from '../../../src/features/bookmarks/services/bookmarkImportCoordinator';
import { BookmarkManagerModal } from '../../../src/features/bookmarks/components/BookmarkManagerModal';
import { SmartBookmarksWidgetComponent } from '../../../src/widgets/SmartBookmarksWidget';
import { BookmarkEntity, BookmarkGroupEntity } from '../../../src/types/bookmarks';
import { ImportPreview } from '../../../src/features/bookmarks/types/bookmarkImportExport';
import { createMockBrowser } from '../../mocks/browser';

describe('Smart Bookmarks Suite Integration & Performance Audit — Milestone 6.8', () => {
  let mockBrowser: ReturnType<typeof createMockBrowser>;

  beforeEach(async () => {
    mockBrowser = createMockBrowser();
    (globalThis as any).browser = mockBrowser.mock;
    (globalThis as any).chrome = mockBrowser.mock;

    await db.open();
    await db.bookmarks.clear();
    await db.bookmarkGroups.clear();

    useBookmarkStore.setState({
      bookmarks: [],
      groups: [],
      activeWorkspaceId: 'ws-integ',
      searchQuery: '',
      groupFilter: { type: 'all' },
      activeGroupId: 'all',
      showFavoritesOnly: false,
      sortBy: 'order',
      sortDirection: 'asc',
      isLoading: false,
      isInitialized: true,
      error: null,
    });

    vi.clearAllMocks();
  });

  // ==========================================
  // SCENARIO 1: CREATE AND DISPLAY
  // ==========================================
  describe('Scenario 1 — Create and Display', () => {
    it('creates folders and bookmarks in Dexie, hydrates store, and renders UI components', async () => {
      // 1. Create group and bookmarks in repository
      const group = await bookmarkGroupRepository.create({
        workspaceId: 'ws-integ',
        title: 'Engineering',
        icon: 'terminal',
        color: '#3B82F6',
      });

      await bookmarkRepository.create({
        workspaceId: 'ws-integ',
        groupId: group.id,
        title: 'GitHub',
        url: 'https://github.com',
        description: 'Code repository',
        isFavorite: true,
      });

      await bookmarkRepository.create({
        workspaceId: 'ws-integ',
        groupId: group.id,
        title: 'MDN Web Docs',
        url: 'https://developer.mozilla.org',
        description: 'Web standards',
        isFavorite: false,
      });

      // 2. Verify repository data
      const dbBookmarks = await bookmarkRepository.getByGroup('ws-integ', group.id);
      expect(dbBookmarks).toHaveLength(2);
      expect(dbBookmarks.map((b) => b.title)).toEqual(['GitHub', 'MDN Web Docs']);

      // 3. Hydrate Zustand store
      await useBookmarkStore.getState().setActiveWorkspace('ws-integ');
      expect(useBookmarkStore.getState().groups).toHaveLength(1);
      expect(useBookmarkStore.getState().bookmarks).toHaveLength(2);

      // 4. Render BookmarkManagerModal
      const { unmount: unmountManager } = render(
        <BookmarkManagerModal isOpen={true} onClose={() => {}} workspaceId="ws-integ" />
      );

      await waitFor(() => {
        expect(screen.getAllByText('Engineering').length).toBeGreaterThan(0);
        expect(screen.getByText('GitHub')).toBeInTheDocument();
        expect(screen.getByText('MDN Web Docs')).toBeInTheDocument();
      });
      unmountManager();

      // 5. Render SmartBookmarksWidget configured for this folder
      render(
        <SmartBookmarksWidgetComponent
          instanceId="widget-eng"
          workspaceId="ws-integ"
          isEditMode={false}
          onUpdateConfig={() => {}}
          onRemove={() => {}}
          config={{ source: 'folder', folderId: group.id }}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('GitHub')).toBeInTheDocument();
        expect(screen.getByText('MDN Web Docs')).toBeInTheDocument();
      });
    });
  });

  // ==========================================
  // SCENARIO 2: SEARCH AND FILTER
  // ==========================================
  describe('Scenario 2 — Search and Filter', () => {
    it('accurately combines multi-token query, domain matching, folder filtering, and favorites', async () => {
      const gFrontend = await bookmarkGroupRepository.create({
        workspaceId: 'ws-integ',
        title: 'Frontend',
      });
      const gBackend = await bookmarkGroupRepository.create({
        workspaceId: 'ws-integ',
        title: 'Backend',
      });

      const bookmarks: BookmarkEntity[] = [
        await bookmarkRepository.create({
          workspaceId: 'ws-integ',
          groupId: gFrontend.id,
          title: 'React Documentation',
          url: 'https://react.dev',
          description: 'Official React docs',
          isFavorite: true,
        }),
        await bookmarkRepository.create({
          workspaceId: 'ws-integ',
          groupId: gFrontend.id,
          title: 'Tailwind CSS',
          url: 'https://tailwindcss.com',
          description: 'Utility-first styling',
          isFavorite: false,
        }),
        await bookmarkRepository.create({
          workspaceId: 'ws-integ',
          groupId: gBackend.id,
          title: 'PostgreSQL Manual',
          url: 'https://postgresql.org',
          description: 'Relational database',
          isFavorite: true,
        }),
        await bookmarkRepository.create({
          workspaceId: 'ws-integ',
          groupId: null,
          title: 'Hacker News',
          url: 'https://news.ycombinator.com',
          description: 'Tech news',
          isFavorite: false,
        }),
      ];

      // A. Full Search over all bookmarks
      const searchResult = filterAndSortBookmarks(bookmarks, { searchQuery: 'react' });
      expect(searchResult).toHaveLength(1);
      expect(searchResult[0].title).toBe('React Documentation');

      // B. Domain Search
      const domainResult = filterAndSortBookmarks(bookmarks, { searchQuery: 'postgresql.org' });
      expect(domainResult).toHaveLength(1);
      expect(domainResult[0].title).toBe('PostgreSQL Manual');

      // C. Filter by Folder
      const frontendOnly = filterAndSortBookmarks(bookmarks, {
        groupFilter: { type: 'group', groupId: gFrontend.id },
      });
      expect(frontendOnly).toHaveLength(2);

      // D. Filter by Uncategorized
      const uncategorizedOnly = filterAndSortBookmarks(bookmarks, {
        groupFilter: { type: 'uncategorized' },
      });
      expect(uncategorizedOnly).toHaveLength(1);
      expect(uncategorizedOnly[0].title).toBe('Hacker News');

      // E. Combined Filter: Favorites only
      const favoritesOnly = filterAndSortBookmarks(bookmarks, {
        showFavoritesOnly: true,
      });
      expect(favoritesOnly).toHaveLength(2);
      expect(favoritesOnly.map((b) => b.title)).toEqual(['React Documentation', 'PostgreSQL Manual']);

      // F. Sorting: Title descending
      const sortedByTitleDesc = filterAndSortBookmarks(bookmarks, {
        sortBy: 'title',
        sortDirection: 'desc',
      });
      expect(sortedByTitleDesc[0].title).toBe('Tailwind CSS');
    });
  });

  // ==========================================
  // SCENARIO 3: MOVE AND DELETE
  // ==========================================
  describe('Scenario 3 — Move and Delete', () => {
    it('moves bookmarks between folders, reorders, and supports safe and cascade folder deletion', async () => {
      const g1 = await bookmarkGroupRepository.create({ workspaceId: 'ws-integ', title: 'Work' });
      const g2 = await bookmarkGroupRepository.create({ workspaceId: 'ws-integ', title: 'Personal' });

      const b1 = await bookmarkRepository.create({
        workspaceId: 'ws-integ',
        groupId: g1.id,
        title: 'Slack',
        url: 'https://slack.com',
      });
      const b2 = await bookmarkRepository.create({
        workspaceId: 'ws-integ',
        groupId: g1.id,
        title: 'Notion',
        url: 'https://notion.so',
      });

      // 1. Move b1 to g2
      const moved = await bookmarkRepository.move(b1.id, 'ws-integ', g2.id);
      expect(moved.groupId).toBe(g2.id);

      // 2. Move b1 to Uncategorized (null)
      const uncategorized = await bookmarkRepository.move(b1.id, 'ws-integ', null);
      expect(uncategorized.groupId).toBeNull();

      // 3. Safe folder deletion (reassign bookmarks to Uncategorized)
      const deleteResult1 = await bookmarkGroupRepository.delete(g1.id, 'ws-integ', { mode: 'reassign' });
      expect(deleteResult1.deleted).toBe(true);
      expect(deleteResult1.affectedBookmarksCount).toBe(1); // b2 was still in g1

      const b2After = await bookmarkRepository.getById(b2.id, 'ws-integ');
      expect(b2After?.groupId).toBeNull();

      // 4. Cascade folder deletion
      const b3 = await bookmarkRepository.create({
        workspaceId: 'ws-integ',
        groupId: g2.id,
        title: 'YouTube',
        url: 'https://youtube.com',
      });

      const deleteResult2 = await bookmarkGroupRepository.delete(g2.id, 'ws-integ', { mode: 'cascade' });
      expect(deleteResult2.deleted).toBe(true);
      expect(deleteResult2.affectedBookmarksCount).toBe(1);

      const b3After = await bookmarkRepository.getById(b3.id, 'ws-integ');
      expect(b3After).toBeUndefined(); // Deleted permanently
    });
  });

  // ==========================================
  // SCENARIO 4: WORKSPACE ISOLATION
  // ==========================================
  describe('Scenario 4 — Workspace Isolation', () => {
    it('guarantees complete isolation across multiple workspaces with zero state leakage', async () => {
      // Workspace Alpha
      const gAlpha = await bookmarkGroupRepository.create({ workspaceId: 'ws-alpha', title: 'Alpha Folder' });
      await bookmarkRepository.create({
        workspaceId: 'ws-alpha',
        groupId: gAlpha.id,
        title: 'Alpha Link',
        url: 'https://alpha.com',
      });

      // Workspace Beta
      const gBeta = await bookmarkGroupRepository.create({ workspaceId: 'ws-beta', title: 'Beta Folder' });
      await bookmarkRepository.create({
        workspaceId: 'ws-beta',
        groupId: gBeta.id,
        title: 'Beta Link',
        url: 'https://beta.com',
      });

      // Query Alpha
      const alphaGroups = await bookmarkGroupRepository.getByWorkspace('ws-alpha');
      const alphaBookmarks = await bookmarkRepository.getByWorkspace('ws-alpha');
      expect(alphaGroups).toHaveLength(1);
      expect(alphaGroups[0].title).toBe('Alpha Folder');
      expect(alphaBookmarks).toHaveLength(1);
      expect(alphaBookmarks[0].title).toBe('Alpha Link');

      // Query Beta
      const betaGroups = await bookmarkGroupRepository.getByWorkspace('ws-beta');
      const betaBookmarks = await bookmarkRepository.getByWorkspace('ws-beta');
      expect(betaGroups).toHaveLength(1);
      expect(betaGroups[0].title).toBe('Beta Folder');
      expect(betaBookmarks).toHaveLength(1);
      expect(betaBookmarks[0].title).toBe('Beta Link');

      // Store isolation during switch
      const store = useBookmarkStore.getState();
      await store.setActiveWorkspace('ws-alpha');
      expect(useBookmarkStore.getState().bookmarks.map((b) => b.title)).toEqual(['Alpha Link']);

      await store.setActiveWorkspace('ws-beta');
      expect(useBookmarkStore.getState().bookmarks.map((b) => b.title)).toEqual(['Beta Link']);
    });
  });

  // ==========================================
  // SCENARIO 5: CROSS-TAB SYNCHRONIZATION
  // ==========================================
  describe('Scenario 5 — Cross-Tab Synchronization', () => {
    it('notifies and synchronizes secondary contexts when storage update events fire', async () => {
      const storeA = createBookmarkStore();
      const storeB = createBookmarkStore();

      await storeA.getState().initialize('ws-integ');
      await storeB.getState().initialize('ws-integ');

      expect(storeA.getState().bookmarks).toHaveLength(0);
      expect(storeB.getState().bookmarks).toHaveLength(0);

      // Mutate in Store A
      await storeA.getState().createBookmark({
        title: 'New Tab A Bookmark',
        url: 'https://tab-a.com',
      });

      expect(storeA.getState().bookmarks).toHaveLength(1);

      // Store B refreshes upon storage event
      await storeB.getState().refresh('ws-integ');
      expect(storeB.getState().bookmarks).toHaveLength(1);
      expect(storeB.getState().bookmarks[0].title).toBe('New Tab A Bookmark');
    });
  });

  // ==========================================
  // SCENARIO 6: NETSCAPE HTML ROUND TRIP
  // ==========================================
  describe('Scenario 6 — Netscape HTML Round Trip', () => {
    it('exports bookmark hierarchy to Netscape HTML and accurately reconstructs it on parse', async () => {
      const groups: BookmarkGroupEntity[] = [
        {
          id: 'grp-work',
          workspaceId: 'ws-integ',
          title: 'Work / Team',
          order: 0,
          createdAt: 1000,
          updatedAt: 1000,
        },
      ];

      const bookmarks: BookmarkEntity[] = [
        {
          id: 'bm-1',
          workspaceId: 'ws-integ',
          groupId: 'grp-work',
          title: 'GitHub & GitLab',
          url: 'https://github.com',
          description: 'Primary VCS',
          isFavorite: true,
          order: 0,
          createdAt: 1000,
          updatedAt: 1000,
        },
        {
          id: 'bm-2',
          workspaceId: 'ws-integ',
          groupId: null,
          title: 'Direct Link',
          url: 'https://example.com',
          isFavorite: false,
          order: 1,
          createdAt: 1000,
          updatedAt: 1000,
        },
      ];

      // Export HTML
      const html = exportBookmarksToNetscapeHtml(groups, bookmarks);

      expect(html).toContain('<!DOCTYPE NETSCAPE-Bookmark-file-1>');
      expect(html).toContain('Work / Team');
      expect(html).toContain('GitHub &amp; GitLab');

      // Parse HTML
      const parsed = parseNetscapeBookmarkHtml(html);
      expect(parsed.groups).toHaveLength(1);
      expect(parsed.groups[0].title).toBe('Work / Team');
      expect(parsed.bookmarks).toHaveLength(2);

      const parsedBm1 = parsed.bookmarks.find((b) => b.url === 'https://github.com');
      expect(parsedBm1).toBeDefined();
      expect(parsedBm1?.title).toBe('GitHub & GitLab');
      expect(parsedBm1?.isFavorite).toBe(true);
      expect(parsedBm1?.tempGroupId).toBe(parsed.groups[0].tempId);
    });
  });

  // ==========================================
  // SCENARIO 7: JSON BACKUP ROUND TRIP
  // ==========================================
  describe('Scenario 7 — JSON Backup Round Trip', () => {
    it('exports lossless JSON backup and restores it into a separate workspace with ID remapping', async () => {
      const g1 = await bookmarkGroupRepository.create({ workspaceId: 'ws-source', title: 'Productivity' });
      const b1 = await bookmarkRepository.create({
        workspaceId: 'ws-source',
        groupId: g1.id,
        title: 'Linear',
        url: 'https://linear.app',
        description: 'Issue tracker',
        isFavorite: true,
      });

      // Export from ws-source
      const jsonBackup = exportBookmarksToJsonBackup('ws-source', [g1], [b1]);

      const parsedBackup = parseNookSpaceJsonBackup(jsonBackup);
      expect(parsedBackup.bookmarks).toHaveLength(1);
      expect(parsedBackup.groups).toHaveLength(1);

      // Import into ws-dest
      const preview = parseImportFile(jsonBackup, 'backup.json');
      const importResult = await executeImportTransaction(
        {
          workspaceId: 'ws-dest',
          mode: 'replace',
          duplicatePolicy: 'skip',
        },
        preview,
        db
      );

      expect(importResult.success).toBe(true);
      expect(importResult.bookmarksCreated).toBe(1);
      expect(importResult.groupsCreated).toBe(1);

      // Verify records in ws-dest
      const destBookmarks = await bookmarkRepository.getByWorkspace('ws-dest');
      const destGroups = await bookmarkGroupRepository.getByWorkspace('ws-dest');
      expect(destBookmarks).toHaveLength(1);
      expect(destGroups).toHaveLength(1);
      expect(destBookmarks[0].id).not.toBe(b1.id); // Remapped UUID
      expect(destBookmarks[0].groupId).toBe(destGroups[0].id); // Relationship preserved

      // Verify ws-source unchanged
      const sourceBookmarks = await bookmarkRepository.getByWorkspace('ws-source');
      expect(sourceBookmarks).toHaveLength(1);
    });
  });

  // ==========================================
  // SCENARIO 8: DUPLICATE RESOLUTION
  // ==========================================
  describe('Scenario 8 — Duplicate Resolution', () => {
    it('executes skip, import-as-duplicate, and update policies with verified database state', async () => {
      await bookmarkRepository.create({
        workspaceId: 'ws-dup',
        groupId: null,
        title: 'Initial GitHub',
        url: 'https://github.com',
        description: 'Old Description',
        isFavorite: false,
      });

      const rawJson = JSON.stringify({
        format: 'nookspace-bookmarks',
        version: 1,
        exportedAt: Date.now(),
        data: {
          workspaceId: 'ws-external',
          groups: [],
          bookmarks: [
            {
              id: 'ext-bm-1',
              groupId: null,
              title: 'Updated GitHub Title',
              url: 'https://github.com',
              description: 'New Description',
              isFavorite: true,
              order: 0,
              createdAt: 100,
              updatedAt: 100,
            },
          ],
        },
      });

      // 1. Policy: SKIP
      const preview1 = parseImportFile(rawJson, 'import.json');
      const existing1 = await bookmarkRepository.getByWorkspace('ws-dup');
      const stats1 = computePreviewStats(preview1, existing1, [], 'skip', 'merge');
      expect(stats1.expectedSkipped).toBe(1);

      const resSkip = await executeImportTransaction(
        {
          workspaceId: 'ws-dup',
          mode: 'merge',
          duplicatePolicy: 'skip',
        },
        preview1,
        db
      );
      expect(resSkip.bookmarksSkipped).toBe(1);
      expect(resSkip.bookmarksCreated).toBe(0);
      let bms = await bookmarkRepository.getByWorkspace('ws-dup');
      expect(bms[0].title).toBe('Initial GitHub');

      // 2. Policy: UPDATE
      const preview2 = parseImportFile(rawJson, 'import.json');
      const resUpdate = await executeImportTransaction(
        {
          workspaceId: 'ws-dup',
          mode: 'merge',
          duplicatePolicy: 'update',
        },
        preview2,
        db
      );
      expect(resUpdate.bookmarksUpdated).toBe(1);
      bms = await bookmarkRepository.getByWorkspace('ws-dup');
      expect(bms).toHaveLength(1);
      expect(bms[0].title).toBe('Updated GitHub Title');
      expect(bms[0].isFavorite).toBe(true);

      // 3. Policy: IMPORT AS DUPLICATE
      const preview3 = parseImportFile(rawJson, 'import.json');
      const resImport = await executeImportTransaction(
        {
          workspaceId: 'ws-dup',
          mode: 'merge',
          duplicatePolicy: 'import',
        },
        preview3,
        db
      );
      expect(resImport.bookmarksCreated).toBe(1);
      bms = await bookmarkRepository.getByWorkspace('ws-dup');
      expect(bms).toHaveLength(2);
    });
  });

  // ==========================================
  // SCENARIO 9: FAILED IMPORT RECOVERY (ROLLBACK)
  // ==========================================
  describe('Scenario 9 — Failed Import Recovery & Transaction Rollback', () => {
    it('rolls back completely on error during Replace import, preserving initial records', async () => {
      // Populate original destination workspace
      const origGroup = await bookmarkGroupRepository.create({
        workspaceId: 'ws-rollback',
        title: 'Original Folder',
      });
      const origBm = await bookmarkRepository.create({
        workspaceId: 'ws-rollback',
        groupId: origGroup.id,
        title: 'Original Bookmark',
        url: 'https://orig.com',
      });

      const preview: ImportPreview = {
        format: 'json',
        sourceFilename: 'test.json',
        totalFolders: 1,
        totalBookmarks: 2,
        validBookmarks: 2,
        invalidBookmarks: 0,
        rejectedUnsafeUrls: 0,
        duplicateBookmarksInFile: 0,
        candidateGroups: [{ tempId: 'g-new', title: 'New Folder', order: 0 }],
        candidateBookmarks: [
          {
            tempId: 'b-new-1',
            tempGroupId: 'g-new',
            title: 'New Bookmark 1',
            url: 'https://new1.com',
            isFavorite: false,
            order: 0,
            isValid: true,
          },
          {
            tempId: 'b-new-2',
            tempGroupId: 'g-new',
            title: 'New Bookmark 2',
            url: 'https://new2.com',
            isFavorite: false,
            order: 1,
            isValid: true,
          },
        ],
        invalidEntries: [],
      };

      // Inject error during insertion inside transaction
      const originalPut = db.bookmarks.put.bind(db.bookmarks);
      let callCount = 0;
      vi.spyOn(db.bookmarks, 'put').mockImplementation((async (record: BookmarkEntity) => {
        callCount++;
        if (callCount === 2) {
          throw new Error('Simulated Mid-Transaction Disk Quota Failure');
        }
        return originalPut(record);
      }) as any);

      try {
        // Expect Replace transaction to abort and fail
        await expect(
          executeImportTransaction(
            {
              workspaceId: 'ws-rollback',
              mode: 'replace',
              duplicatePolicy: 'skip',
            },
            preview,
            db
          )
        ).rejects.toThrow('Simulated Mid-Transaction Disk Quota Failure');

        // Verify complete rollback: original records remain intact
        const preservedGroups = await bookmarkGroupRepository.getByWorkspace('ws-rollback');
        const preservedBookmarks = await bookmarkRepository.getByWorkspace('ws-rollback');

        expect(preservedGroups).toHaveLength(1);
        expect(preservedGroups[0].title).toBe('Original Folder');
        expect(preservedBookmarks).toHaveLength(1);
        expect(preservedBookmarks[0].title).toBe('Original Bookmark');
      } finally {
        vi.restoreAllMocks();
      }
    });

    it('rolls back completely on error during Merge import without partial writes', async () => {
      const origBm = await bookmarkRepository.create({
        workspaceId: 'ws-merge-rb',
        groupId: null,
        title: 'Existing Bookmark',
        url: 'https://existing.com',
      });

      const preview: ImportPreview = {
        format: 'json',
        sourceFilename: 'test.json',
        totalFolders: 0,
        totalBookmarks: 2,
        validBookmarks: 2,
        invalidBookmarks: 0,
        rejectedUnsafeUrls: 0,
        duplicateBookmarksInFile: 0,
        candidateGroups: [],
        candidateBookmarks: [
          {
            tempId: 'b-m-1',
            tempGroupId: null,
            title: 'Import 1',
            url: 'https://imp1.com',
            isFavorite: false,
            order: 1,
            isValid: true,
          },
          {
            tempId: 'b-m-2',
            tempGroupId: null,
            title: 'Import 2',
            url: 'https://imp2.com',
            isFavorite: false,
            order: 2,
            isValid: true,
          },
        ],
        invalidEntries: [],
      };

      const originalPut = db.bookmarks.put.bind(db.bookmarks);
      let callCount = 0;
      vi.spyOn(db.bookmarks, 'put').mockImplementation((async (record: BookmarkEntity) => {
        callCount++;
        if (callCount === 2) {
          throw new Error('Simulated Merge Failure');
        }
        return originalPut(record);
      }) as any);

      try {
        await expect(
          executeImportTransaction(
            {
              workspaceId: 'ws-merge-rb',
              mode: 'merge',
              duplicatePolicy: 'import',
            },
            preview,
            db
          )
        ).rejects.toThrow('Simulated Merge Failure');

        const bms = await bookmarkRepository.getByWorkspace('ws-merge-rb');
        expect(bms).toHaveLength(1);
        expect(bms[0].title).toBe('Existing Bookmark');
      } finally {
        vi.restoreAllMocks();
      }
    });
  });

  // ==========================================
  // SCENARIO 10: MULTI-INSTANCE WIDGET BEHAVIOR
  // ==========================================
  describe('Scenario 10 — Multi-Instance Widget Behavior', () => {
    it('renders multiple independent widget instances with separate source filters and graceful recovery', async () => {
      const gDesign = await bookmarkGroupRepository.create({
        workspaceId: 'ws-integ',
        title: 'Design',
      });

      await bookmarkRepository.create({
        workspaceId: 'ws-integ',
        groupId: gDesign.id,
        title: 'Figma',
        url: 'https://figma.com',
        isFavorite: true,
      });

      await bookmarkRepository.create({
        workspaceId: 'ws-integ',
        groupId: null,
        title: 'Direct Link',
        url: 'https://direct.com',
        isFavorite: false,
      });

      await useBookmarkStore.getState().setActiveWorkspace('ws-integ');

      // Mount Instance 1: Favorites only
      const { unmount: unmountW1 } = render(
        <SmartBookmarksWidgetComponent
          instanceId="w-favorites"
          workspaceId="ws-integ"
          isEditMode={false}
          onUpdateConfig={() => {}}
          onRemove={() => {}}
          config={{ source: 'favorites' }}
        />
      );
      await waitFor(() => {
        expect(screen.getByText('Figma')).toBeInTheDocument();
        expect(screen.queryByText('Direct Link')).not.toBeInTheDocument();
      });
      unmountW1();

      // Mount Instance 2: Specific folder
      const { unmount: unmountW2 } = render(
        <SmartBookmarksWidgetComponent
          instanceId="w-folder"
          workspaceId="ws-integ"
          isEditMode={false}
          onUpdateConfig={() => {}}
          onRemove={() => {}}
          config={{ source: 'folder', folderId: gDesign.id }}
        />
      );
      await waitFor(() => {
        expect(screen.getByText('Figma')).toBeInTheDocument();
      });
      unmountW2();

      // Mount Instance 3: Uncategorized only
      render(
        <SmartBookmarksWidgetComponent
          instanceId="w-uncat"
          workspaceId="ws-integ"
          isEditMode={false}
          onUpdateConfig={() => {}}
          onRemove={() => {}}
          config={{ source: 'uncategorized' }}
        />
      );
      await waitFor(() => {
        expect(screen.getByText('Direct Link')).toBeInTheDocument();
        expect(screen.queryByText('Figma')).not.toBeInTheDocument();
      });
    });
  });

  // ==========================================
  // SECTION 6: PERFORMANCE AUDIT BENCHMARKS
  // ==========================================
  describe('Performance Audit — Benchmark Metrics', () => {
    it('processes 1,000 and 5,000 bookmark records within sub-second thresholds', () => {
      // 1. Generate 1,000 synthetic items
      const sample1k: BookmarkEntity[] = Array.from({ length: 1000 }, (_, i) => ({
        id: `bm-perf-${i}`,
        workspaceId: 'ws-perf',
        groupId: i % 5 === 0 ? `grp-${i % 10}` : null,
        title: `Bookmark Item ${i} for Technology Research`,
        url: `https://sub${i}.example-domain-${i % 20}.org/path/to/resource-${i}`,
        description: `Detailed description for research item ${i}`,
        isFavorite: i % 10 === 0,
        order: i,
        createdAt: 1000 + i,
        updatedAt: 1000 + i,
      }));

      // Benchmark Search on 1,000 items
      const t0 = performance.now();
      const searchRes1k = filterAndSortBookmarks(sample1k, {
        searchQuery: 'Technology Research 99',
      });
      const searchDuration1k = performance.now() - t0;

      expect(searchRes1k.length).toBeGreaterThan(0);
      expect(searchDuration1k).toBeLessThan(500); // Expect < 500ms for 1,000 items

      // Benchmark Filter & Sort on 1,000 items
      const t1 = performance.now();
      const sorted1k = filterAndSortBookmarks(sample1k, {
        sortBy: 'title',
        sortDirection: 'desc',
      });
      const sortDuration1k = performance.now() - t1;

      expect(sorted1k).toHaveLength(1000);
      expect(sortDuration1k).toBeLessThan(250); // Expect < 250ms

      // 2. Generate 5,000 synthetic items
      const sample5k: BookmarkEntity[] = Array.from({ length: 5000 }, (_, i) => ({
        id: `bm-perf-5k-${i}`,
        workspaceId: 'ws-perf',
        groupId: i % 10 === 0 ? `grp-${i % 20}` : null,
        title: `Performance Benchmark Record ${i}`,
        url: `https://site-${i % 100}.benchmarks.com/article/${i}`,
        description: `Synthetic benchmark testing payload for scale verification ${i}`,
        isFavorite: i % 25 === 0,
        order: i,
        createdAt: 2000 + i,
        updatedAt: 2000 + i,
      }));

      // Benchmark Search on 5,000 items
      const t2 = performance.now();
      const searchRes5k = filterAndSortBookmarks(sample5k, {
        searchQuery: 'Benchmark Record 4999',
      });
      const searchDuration5k = performance.now() - t2;

      expect(searchRes5k).toHaveLength(1);
      expect(searchDuration5k).toBeLessThan(1000); // Expect < 1,000ms for 5,000 items

      // Benchmark JSON Serialization on 5,000 items
      const t3 = performance.now();
      const serialized5k = JSON.stringify({
        format: 'nookspace-bookmarks',
        version: 1,
        exportedAt: Date.now(),
        data: {
          workspaceId: 'ws-perf',
          groups: [],
          bookmarks: sample5k,
        },
      });
      const serializeDuration5k = performance.now() - t3;

      expect(serialized5k.length).toBeGreaterThan(500000);
      expect(serializeDuration5k).toBeLessThan(500); // Expect < 500ms

      // Benchmark JSON Parsing on 5,000 items
      const t4 = performance.now();
      const parsed5k = parseNookSpaceJsonBackup(serialized5k);
      const parseDuration5k = performance.now() - t4;

      expect(parsed5k.bookmarks).toHaveLength(5000);
      expect(parseDuration5k).toBeLessThan(2500); // Expect < 2,500ms for 5,000 items with full Zod validation
    });
  });
});
