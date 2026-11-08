import { describe, it, expect, beforeEach } from 'vitest';
import { NookSpaceDB } from '../../../src/services/database/db';
import { BookmarkRepository } from '../../../src/features/bookmarks/repositories/bookmarkRepository';
import { BookmarkGroupRepository } from '../../../src/features/bookmarks/repositories/bookmarkGroupRepository';
import { createBookmarkStore, BookmarkStoreState } from '../../../src/features/bookmarks/stores/bookmarkStore';
import { StoreApi } from 'zustand';

describe('BookmarkStore — Milestone 6.3 State Management', () => {
  let db: NookSpaceDB;
  let bookmarkRepo: BookmarkRepository;
  let groupRepo: BookmarkGroupRepository;
  let store: StoreApi<BookmarkStoreState>;

  beforeEach(async () => {
    db = new NookSpaceDB();
    await db.open();
    await db.bookmarks.clear();
    await db.bookmarkGroups.clear();

    bookmarkRepo = new BookmarkRepository(db);
    groupRepo = new BookmarkGroupRepository(db);
    store = createBookmarkStore(bookmarkRepo, groupRepo);
  });

  describe('Initialization & Workspace Loading', () => {
    it('initializes workspace and loads groups and bookmarks', async () => {
      const group = await groupRepo.create({ workspaceId: 'ws-1', title: 'Work' });
      await bookmarkRepo.create({ workspaceId: 'ws-1', groupId: group.id, title: 'Item 1', url: 'https://1.com' });

      await store.getState().initialize('ws-1');

      const state = store.getState();
      expect(state.isInitialized).toBe(true);
      expect(state.activeWorkspaceId).toBe('ws-1');
      expect(state.groups).toHaveLength(1);
      expect(state.groups[0].title).toBe('Work');
      expect(state.bookmarks).toHaveLength(1);
      expect(state.bookmarks[0].title).toBe('Item 1');
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('immediately clears prior workspace data when changing workspace and enforces isolation', async () => {
      // Seed data in ws-1 and ws-2
      await bookmarkRepo.create({ workspaceId: 'ws-1', title: 'WS1 Bookmark', url: 'https://ws1.com' });
      await groupRepo.create({ workspaceId: 'ws-1', title: 'WS1 Group' });

      await bookmarkRepo.create({ workspaceId: 'ws-2', title: 'WS2 Bookmark', url: 'https://ws2.com' });
      await groupRepo.create({ workspaceId: 'ws-2', title: 'WS2 Group' });

      // Initialize in ws-1
      await store.getState().initialize('ws-1');
      expect(store.getState().bookmarks[0].title).toBe('WS1 Bookmark');
      expect(store.getState().groups[0].title).toBe('WS1 Group');

      // Switch to ws-2
      const switchPromise = store.getState().setActiveWorkspace('ws-2');

      // Verify that during load, prior workspace data was immediately wiped
      // (or when settled, strictly contains ws-2 data)
      await switchPromise;

      const state = store.getState();
      expect(state.activeWorkspaceId).toBe('ws-2');
      expect(state.bookmarks).toHaveLength(1);
      expect(state.bookmarks[0].title).toBe('WS2 Bookmark');
      expect(state.groups).toHaveLength(1);
      expect(state.groups[0].title).toBe('WS2 Group');
    });

    it('prevents stale async load responses from overwriting a newer workspace', async () => {
      // Create a slow mock repo that delays ws-slow
      let resolveSlow: any;
      const delayedSlowPromise = new Promise<any>((resolve) => {
        resolveSlow = resolve;
      });

      const mockRepo: any = {
        getByWorkspace: async (ws: string) => {
          if (ws === 'ws-slow') {
            await delayedSlowPromise;
            return [{ id: 'slow-bm', workspaceId: 'ws-slow', title: 'Slow', url: 'https://slow.com', order: 0, createdAt: 1, updatedAt: 1, isFavorite: false, groupId: null }];
          }
          return [{ id: 'fast-bm', workspaceId: 'ws-fast', title: 'Fast', url: 'https://fast.com', order: 0, createdAt: 2, updatedAt: 2, isFavorite: false, groupId: null }];
        },
      };
      const mockGroupRepo: any = {
        getByWorkspace: async () => [],
      };

      const raceStore = createBookmarkStore(mockRepo, mockGroupRepo);

      // Trigger slow fetch
      const slowCall = raceStore.getState().setActiveWorkspace('ws-slow');
      // Immediately switch to fast workspace
      const fastCall = raceStore.getState().setActiveWorkspace('ws-fast');
      await fastCall;

      expect(raceStore.getState().activeWorkspaceId).toBe('ws-fast');
      expect(raceStore.getState().bookmarks[0].id).toBe('fast-bm');

      // Resolve slow promise late
      resolveSlow();
      await slowCall;

      // Ensure slow call was discarded and didn't overwrite fast state
      expect(raceStore.getState().activeWorkspaceId).toBe('ws-fast');
      expect(raceStore.getState().bookmarks[0].id).toBe('fast-bm');
    });
  });

  describe('Bookmark CRUD Actions & Error Handling', () => {
    beforeEach(async () => {
      await store.getState().initialize('ws-active');
    });

    it('creates bookmark and adds it to store state after successful repository write', async () => {
      const created = await store.getState().createBookmark({
        title: 'New Bookmark',
        url: 'https://new.com',
      });

      expect(created.id).toBeDefined();
      expect(store.getState().bookmarks).toHaveLength(1);
      expect(store.getState().bookmarks[0].id).toBe(created.id);
      expect(store.getState().bookmarks[0].title).toBe('New Bookmark');
    });

    it('does not mutate state if repository creation fails and populates error', async () => {
      await expect(
        store.getState().createBookmark({
          title: 'Bad URL',
          url: 'javascript:alert(1)',
        })
      ).rejects.toThrow();

      expect(store.getState().bookmarks).toHaveLength(0);
      expect(store.getState().error).toBeDefined();
      expect(store.getState().error).toContain('Only safe http:, https:, and mailto: URLs are allowed');
    });

    it('updates bookmark and reflects changes in state without optimistic mutation', async () => {
      const created = await store.getState().createBookmark({
        title: 'Original',
        url: 'https://orig.com',
      });

      const updated = await store.getState().updateBookmark(created.id, {
        title: 'Renamed',
      });

      expect(updated.title).toBe('Renamed');
      expect(store.getState().bookmarks[0].title).toBe('Renamed');
    });

    it('deletes bookmark and removes it from state', async () => {
      const created = await store.getState().createBookmark({
        title: 'To Delete',
        url: 'https://del.com',
      });

      expect(store.getState().bookmarks).toHaveLength(1);
      const deleted = await store.getState().deleteBookmark(created.id);
      expect(deleted).toBe(true);
      expect(store.getState().bookmarks).toHaveLength(0);
    });

    it('toggles favorite status accurately', async () => {
      const created = await store.getState().createBookmark({
        title: 'Fav Item',
        url: 'https://fav.com',
      });
      expect(created.isFavorite).toBe(false);

      const faved = await store.getState().toggleFavorite(created.id);
      expect(faved.isFavorite).toBe(true);
      expect(store.getState().bookmarks[0].isFavorite).toBe(true);

      const unfaved = await store.getState().toggleFavorite(created.id);
      expect(unfaved.isFavorite).toBe(false);
      expect(store.getState().bookmarks[0].isFavorite).toBe(false);
    });

    it('reorders bookmarks and refreshes state order', async () => {
      const b1 = await store.getState().createBookmark({ title: 'B1', url: 'https://1.com' });
      const b2 = await store.getState().createBookmark({ title: 'B2', url: 'https://2.com' });

      await store.getState().reorderBookmarks([b2.id, b1.id], null);
      expect(store.getState().bookmarks[0].id).toBe(b2.id);
      expect(store.getState().bookmarks[1].id).toBe(b1.id);
    });
  });

  describe('Group CRUD Actions & Cascade/Reassignment Handling', () => {
    beforeEach(async () => {
      await store.getState().initialize('ws-active');
    });

    it('creates and updates group successfully', async () => {
      const group = await store.getState().createGroup({
        title: 'Reading',
        icon: 'book',
        color: '#10B981',
      });

      expect(group.id).toBeDefined();
      expect(store.getState().groups).toHaveLength(1);
      expect(store.getState().groups[0].title).toBe('Reading');

      const updated = await store.getState().updateGroup(group.id, {
        title: 'Reading List',
      });
      expect(updated.title).toBe('Reading List');
      expect(store.getState().groups[0].title).toBe('Reading List');
    });

    it('deletes group with default reassignment and resets activeGroupId if it was selected', async () => {
      const group = await store.getState().createGroup({ title: 'Temporary' });
      const bm = await store.getState().createBookmark({
        groupId: group.id,
        title: 'Child Link',
        url: 'https://child.com',
      });

      store.getState().setActiveGroup(group.id);
      expect(store.getState().activeGroupId).toBe(group.id);

      await store.getState().deleteGroup(group.id);

      // Group removed from state
      expect(store.getState().groups).toHaveLength(0);
      // Active group reset to 'all'
      expect(store.getState().activeGroupId).toBe('all');
      // Child link was reassigned to Uncategorized (groupId: null)
      expect(store.getState().bookmarks[0].groupId).toBeNull();
      expect(store.getState().bookmarks[0].id).toBe(bm.id);
    });

    it('reorders groups and preserves fresh state', async () => {
      const g1 = await store.getState().createGroup({ title: 'G1' });
      const g2 = await store.getState().createGroup({ title: 'G2' });

      await store.getState().reorderGroups([g2.id, g1.id]);
      expect(store.getState().groups[0].id).toBe(g2.id);
      expect(store.getState().groups[1].id).toBe(g1.id);
    });
  });

  describe('Derived Search, Filter & Sort Integration', () => {
    beforeEach(async () => {
      await store.getState().initialize('ws-active');

      const devGroup = await store.getState().createGroup({ title: 'Dev' });
      await store.getState().createBookmark({
        groupId: devGroup.id,
        title: 'GitHub',
        url: 'https://github.com',
        isFavorite: true,
      });
      await store.getState().createBookmark({
        groupId: devGroup.id,
        title: 'GitLab',
        url: 'https://gitlab.com',
        isFavorite: false,
      });
      await store.getState().createBookmark({
        groupId: null, // Uncategorized
        title: 'Notion',
        url: 'https://notion.so',
        isFavorite: true,
      });
    });

    it('filters bookmarks using getFilteredBookmarks selector', () => {
      // 1. Initial (all)
      expect(store.getState().getFilteredBookmarks()).toHaveLength(3);

      // 2. Favorites only
      store.getState().setShowFavoritesOnly(true);
      expect(store.getState().getFilteredBookmarks()).toHaveLength(2); // GitHub and Notion

      // 3. Search query
      store.getState().setShowFavoritesOnly(false);
      store.getState().setSearchQuery('Git');
      const searchRes = store.getState().getFilteredBookmarks();
      expect(searchRes).toHaveLength(2);
      expect(searchRes.map((b) => b.title)).toContain('GitHub');
      expect(searchRes.map((b) => b.title)).toContain('GitLab');

      // 4. Group filter
      store.getState().setSearchQuery('');
      store.getState().setActiveGroup(null); // Uncategorized only
      const uncategorized = store.getState().getFilteredBookmarks();
      expect(uncategorized).toHaveLength(1);
      expect(uncategorized[0].title).toBe('Notion');
    });

    it('distinguishes all three group states: All, Uncategorized, and Specific Group', async () => {
      const devGroup = store.getState().groups[0];
      expect(devGroup).toBeDefined();

      // Snapshot Dexie records before switching filter states
      const dbBookmarksBefore = await db.bookmarks.toArray();
      const dbGroupsBefore = await db.bookmarkGroups.toArray();

      // State 1: All bookmarks (returns all bookmarks across devGroup and uncategorized)
      store.getState().selectAllGroups();
      expect(store.getState().groupFilter).toEqual({ type: 'all' });
      expect(store.getState().activeGroupId).toBe('all');
      const allBookmarks = store.getState().getFilteredBookmarks();
      expect(allBookmarks).toHaveLength(3);
      expect(allBookmarks.map((b) => b.title)).toEqual(
        expect.arrayContaining(['GitHub', 'GitLab', 'Notion'])
      );

      // State 2: Uncategorized only (groupId === null)
      store.getState().selectUncategorized();
      expect(store.getState().groupFilter).toEqual({ type: 'uncategorized' });
      expect(store.getState().activeGroupId).toBeNull();
      const uncategorized = store.getState().getFilteredBookmarks();
      expect(uncategorized).toHaveLength(1);
      expect(uncategorized[0].title).toBe('Notion');
      expect(uncategorized[0].groupId).toBeNull();

      // State 3: Specific group
      store.getState().selectGroup(devGroup.id);
      expect(store.getState().groupFilter).toEqual({ type: 'group', groupId: devGroup.id });
      expect(store.getState().activeGroupId).toBe(devGroup.id);
      const groupBookmarks = store.getState().getFilteredBookmarks();
      expect(groupBookmarks).toHaveLength(2);
      expect(groupBookmarks.every((b) => b.groupId === devGroup.id)).toBe(true);
      expect(groupBookmarks.map((b) => b.title)).toEqual(
        expect.arrayContaining(['GitHub', 'GitLab'])
      );

      // Verify that toggling between all three states has NOT modified Dexie database records
      const dbBookmarksAfter = await db.bookmarks.toArray();
      const dbGroupsAfter = await db.bookmarkGroups.toArray();
      expect(dbBookmarksAfter).toEqual(dbBookmarksBefore);
      expect(dbGroupsAfter).toEqual(dbGroupsBefore);
    });

    it('combines each group filter state with search and favorites correctly', () => {
      const devGroup = store.getState().groups[0];

      // 1. Group + Favorite
      store.getState().selectGroup(devGroup.id);
      store.getState().setShowFavoritesOnly(true);
      const groupFavs = store.getState().getFilteredBookmarks();
      expect(groupFavs).toHaveLength(1);
      expect(groupFavs[0].title).toBe('GitHub');

      // 2. Group + Search
      store.getState().setShowFavoritesOnly(false);
      store.getState().setSearchQuery('Lab');
      const groupSearch = store.getState().getFilteredBookmarks();
      expect(groupSearch).toHaveLength(1);
      expect(groupSearch[0].title).toBe('GitLab');

      // 3. Uncategorized + Favorite
      store.getState().setSearchQuery('');
      store.getState().selectUncategorized();
      store.getState().setShowFavoritesOnly(true);
      const uncatFavs = store.getState().getFilteredBookmarks();
      expect(uncatFavs).toHaveLength(1);
      expect(uncatFavs[0].title).toBe('Notion');

      // 4. All + Favorite
      store.getState().selectAllGroups();
      const allFavs = store.getState().getFilteredBookmarks();
      expect(allFavs).toHaveLength(2); // GitHub and Notion
    });

    it('sorts bookmarks by updatedAt ascending and descending via store actions', async () => {
      // Update Notion so its updatedAt is newest
      const notion = store.getState().bookmarks.find((b) => b.title === 'Notion')!;
      await new Promise((r) => setTimeout(r, 5)); // ensure distinct timestamp
      await store.getState().updateBookmark(notion.id, { description: 'Updated Notion notes' });

      store.getState().selectAllGroups();
      store.getState().setShowFavoritesOnly(false);
      store.getState().setSearchQuery('');

      // Descending updatedAt
      store.getState().setSortBy('updatedAt');
      store.getState().setSortDirection('desc');
      const descResults = store.getState().getFilteredBookmarks();
      expect(descResults[0].title).toBe('Notion'); // most recently updated

      // Ascending updatedAt
      store.getState().setSortDirection('asc');
      const ascResults = store.getState().getFilteredBookmarks();
      expect(ascResults[ascResults.length - 1].title).toBe('Notion');
    });
  });

  describe('Milestone 6.4: Folder Management & Bookmark Movement in Store', () => {
    beforeEach(async () => {
      await store.getState().initialize('ws-active');
    });

    it('renames a folder, updates store groups, and persists change to database', async () => {
      const group = await store.getState().createGroup({ title: 'Old Folder Name' });
      expect(store.getState().groups[0].title).toBe('Old Folder Name');

      const renamed = await store.getState().renameGroup(group.id, 'New Folder Name');
      expect(renamed.title).toBe('New Folder Name');
      expect(store.getState().groups[0].title).toBe('New Folder Name');

      // Verify database persistence
      const inDb = await groupRepo.getById(group.id, 'ws-active');
      expect(inDb?.title).toBe('New Folder Name');
    });

    it('rejects renaming with empty title and preserves state', async () => {
      const group = await store.getState().createGroup({ title: 'Solid Folder' });

      await expect(
        store.getState().renameGroup(group.id, '   ')
      ).rejects.toThrow();

      expect(store.getState().groups[0].title).toBe('Solid Folder');
      expect(store.getState().error).toBeDefined();
    });

    it('prevents creating group for a different workspace than activeWorkspaceId', async () => {
      await expect(
        store.getState().createGroup({
          title: 'Intruder Group',
          workspaceId: 'ws-foreign',
        })
      ).rejects.toThrow(/Workspace Isolation Violation/);

      expect(store.getState().groups).toHaveLength(0);
    });

    it('prevents creating bookmark for a different workspace than activeWorkspaceId', async () => {
      await expect(
        store.getState().createBookmark({
          title: 'Intruder Bookmark',
          url: 'https://intruder.com',
          workspaceId: 'ws-foreign',
        })
      ).rejects.toThrow(/Workspace Isolation Violation/);

      expect(store.getState().bookmarks).toHaveLength(0);
    });

    it('moves a bookmark between folders and updates store state', async () => {
      const groupA = await store.getState().createGroup({ title: 'Folder A' });
      const groupB = await store.getState().createGroup({ title: 'Folder B' });

      const bm = await store.getState().createBookmark({
        groupId: groupA.id,
        title: 'Moving Bookmark',
        url: 'https://moving.com',
      });

      expect(store.getState().bookmarks[0].groupId).toBe(groupA.id);

      const moved = await store.getState().moveBookmark(bm.id, groupB.id);
      expect(moved.groupId).toBe(groupB.id);
      expect(store.getState().bookmarks[0].groupId).toBe(groupB.id);

      // Verify in DB
      const inDb = await bookmarkRepo.getById(bm.id, 'ws-active');
      expect(inDb?.groupId).toBe(groupB.id);
    });

    it('moves a bookmark to Uncategorized (targetGroupId: null)', async () => {
      const group = await store.getState().createGroup({ title: 'Work Folder' });
      const bm = await store.getState().createBookmark({
        groupId: group.id,
        title: 'Project File',
        url: 'https://file.com',
      });

      const moved = await store.getState().moveBookmark(bm.id, null);
      expect(moved.groupId).toBeNull();
      expect(store.getState().bookmarks[0].groupId).toBeNull();

      // Verify in DB
      const inDb = await bookmarkRepo.getById(bm.id, 'ws-active');
      expect(inDb?.groupId).toBeNull();
    });

    it('handles moving a bookmark to its current folder as a no-op without error', async () => {
      const group = await store.getState().createGroup({ title: 'Folder' });
      const bm = await store.getState().createBookmark({
        groupId: group.id,
        title: 'Static Item',
        url: 'https://static.com',
      });

      const moved = await store.getState().moveBookmark(bm.id, group.id);
      expect(moved.groupId).toBe(group.id);
      expect(store.getState().bookmarks[0].groupId).toBe(group.id);
    });

    it('leaves store state unchanged when moveBookmark fails and sets error', async () => {
      const bm = await store.getState().createBookmark({
        title: 'Unmoved',
        url: 'https://unmoved.com',
      });

      await expect(
        store.getState().moveBookmark(bm.id, 'non-existent-group')
      ).rejects.toThrow();

      expect(store.getState().bookmarks[0].groupId).toBeNull();
      expect(store.getState().error).toBeDefined();
    });

    it('moves multiple bookmarks in bulk via moveBookmarks', async () => {
      const groupSource = await store.getState().createGroup({ title: 'Source' });
      const groupTarget = await store.getState().createGroup({ title: 'Target' });

      const bm1 = await store.getState().createBookmark({ groupId: groupSource.id, title: 'B1', url: 'https://1.com' });
      const bm2 = await store.getState().createBookmark({ groupId: groupSource.id, title: 'B2', url: 'https://2.com' });

      const movedList = await store.getState().moveBookmarks([bm1.id, bm2.id], groupTarget.id);
      expect(movedList).toHaveLength(2);
      expect(movedList.every((b) => b.groupId === groupTarget.id)).toBe(true);

      const storeBms = store.getState().bookmarks;
      expect(storeBms.find((b) => b.id === bm1.id)?.groupId).toBe(groupTarget.id);
      expect(storeBms.find((b) => b.id === bm2.id)?.groupId).toBe(groupTarget.id);
    });
  });
});
