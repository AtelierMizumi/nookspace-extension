import { create } from 'zustand';
import {
  BookmarkEntity,
  BookmarkGroupEntity,
  CreateBookmarkInput,
  UpdateBookmarkInput,
  CreateBookmarkGroupInput,
  UpdateBookmarkGroupInput,
} from '../../../types/bookmarks';
import {
  bookmarkRepository,
  BookmarkRepository,
} from '../repositories/bookmarkRepository';
import {
  bookmarkGroupRepository,
  BookmarkGroupRepository,
  DeleteBookmarkGroupOptions,
  DeleteBookmarkGroupResult,
} from '../repositories/bookmarkGroupRepository';
import {
  filterAndSortBookmarks,
  BookmarkSortField,
  SortDirection,
  BookmarkGroupFilter,
  normalizeGroupFilter,
} from '../services/bookmarkSearchService';
import { browserApi } from '../../../services/browser';

export const STORAGE_KEY_BOOKMARKS_LAST_UPDATED_AT = 'nookspace_bookmarks_last_updated_at';

async function notifyBookmarksUpdated(): Promise<void> {
  try {
    await browserApi.storage.local.set({
      [STORAGE_KEY_BOOKMARKS_LAST_UPDATED_AT]: Date.now(),
    });
  } catch {
    // Non-blocking in headless/test environments
  }
}

export type { BookmarkGroupFilter };
export { normalizeGroupFilter };

export interface BookmarkStoreState {
  bookmarks: BookmarkEntity[];
  groups: BookmarkGroupEntity[];
  activeWorkspaceId: string | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;

  // Filter & Search State
  searchQuery: string;
  groupFilter: BookmarkGroupFilter;
  /**
   * Helper property reflecting the active group ID, null for uncategorized, or 'all'
   */
  activeGroupId: string | null | 'all';
  showFavoritesOnly: boolean;
  sortBy: BookmarkSortField;
  sortDirection: SortDirection;

  // Actions
  initialize: (workspaceId: string) => Promise<void>;
  loadBookmarks: (workspaceId: string) => Promise<void>;
  loadGroups: (workspaceId: string) => Promise<void>;
  refresh: (workspaceId?: string) => Promise<void>;
  setActiveWorkspace: (workspaceId: string) => Promise<void>;
  setSearchQuery: (query: string) => void;
  setGroupFilter: (filter: BookmarkGroupFilter) => void;
  setActiveGroup: (groupId: string | null | 'all' | BookmarkGroupFilter) => void;
  selectAllGroups: () => void;
  selectUncategorized: () => void;
  selectGroup: (groupId: string) => void;
  setShowFavoritesOnly: (enabled: boolean) => void;
  setSortBy: (sortBy: BookmarkSortField) => void;
  setSortDirection: (direction: SortDirection) => void;

  // Bookmark Mutations
  createBookmark: (
    input: Omit<CreateBookmarkInput, 'workspaceId'> & { workspaceId?: string }
  ) => Promise<BookmarkEntity>;
  updateBookmark: (id: string, changes: UpdateBookmarkInput) => Promise<BookmarkEntity>;
  deleteBookmark: (id: string) => Promise<boolean>;
  toggleFavorite: (id: string) => Promise<BookmarkEntity>;
  reorderBookmarks: (bookmarkIds: string[], groupId: string | null) => Promise<void>;
  moveBookmark: (bookmarkId: string, targetGroupId: string | null) => Promise<BookmarkEntity>;
  moveBookmarks: (bookmarkIds: string[], targetGroupId: string | null) => Promise<BookmarkEntity[]>;

  // Group Mutations
  createGroup: (
    input: Omit<CreateBookmarkGroupInput, 'workspaceId'> & { workspaceId?: string }
  ) => Promise<BookmarkGroupEntity>;
  updateGroup: (id: string, changes: UpdateBookmarkGroupInput) => Promise<BookmarkGroupEntity>;
  renameGroup: (id: string, title: string) => Promise<BookmarkGroupEntity>;
  deleteGroup: (id: string, options?: DeleteBookmarkGroupOptions) => Promise<DeleteBookmarkGroupResult>;
  reorderGroups: (groupIds: string[]) => Promise<void>;

  clearError: () => void;
  getFilteredBookmarks: () => BookmarkEntity[];
}

export const createBookmarkStore = (
  repo: BookmarkRepository = bookmarkRepository,
  groupRepo: BookmarkGroupRepository = bookmarkGroupRepository
) => {
  let latestRequestId = 0;

  return create<BookmarkStoreState>((set, get) => ({
    bookmarks: [],
    groups: [],
    activeWorkspaceId: null,
    isLoading: false,
    isInitialized: false,
    error: null,

    searchQuery: '',
    groupFilter: { type: 'all' },
    activeGroupId: 'all',
    showFavoritesOnly: false,
    sortBy: 'order',
    sortDirection: 'asc',

    setSearchQuery: (searchQuery) => set({ searchQuery }),

    setGroupFilter: (groupFilter: BookmarkGroupFilter) => {
      const activeGroupId =
        groupFilter.type === 'all'
          ? 'all'
          : groupFilter.type === 'uncategorized'
          ? null
          : groupFilter.groupId;
      set({ groupFilter, activeGroupId });
    },

    setActiveGroup: (input: string | null | 'all' | BookmarkGroupFilter) => {
      const groupFilter = normalizeGroupFilter(input);
      const activeGroupId =
        groupFilter.type === 'all'
          ? 'all'
          : groupFilter.type === 'uncategorized'
          ? null
          : groupFilter.groupId;
      set({ groupFilter, activeGroupId });
    },

    selectAllGroups: () => {
      set({ groupFilter: { type: 'all' }, activeGroupId: 'all' });
    },

    selectUncategorized: () => {
      set({ groupFilter: { type: 'uncategorized' }, activeGroupId: null });
    },

    selectGroup: (groupId: string) => {
      set({ groupFilter: { type: 'group', groupId }, activeGroupId: groupId });
    },

    setShowFavoritesOnly: (showFavoritesOnly) => set({ showFavoritesOnly }),
    setSortBy: (sortBy) => set({ sortBy }),
    setSortDirection: (sortDirection) => set({ sortDirection }),
    clearError: () => set({ error: null }),

    initialize: async (workspaceId: string) => {
      await get().setActiveWorkspace(workspaceId);
      set({ isInitialized: true });
    },

    setActiveWorkspace: async (workspaceId: string) => {
      const requestId = ++latestRequestId;

      // Immediately isolate and clear previous workspace state while loading
      set({
        activeWorkspaceId: workspaceId,
        bookmarks: [],
        groups: [],
        isLoading: true,
        error: null,
      });

      try {
        const [bookmarks, groups] = await Promise.all([
          repo.getByWorkspace(workspaceId),
          groupRepo.getByWorkspace(workspaceId),
        ]);

        // Discard stale responses if workspace changed or newer request initiated
        if (requestId === latestRequestId && get().activeWorkspaceId === workspaceId) {
          set({
            bookmarks,
            groups,
            isLoading: false,
            error: null,
          });
        }
      } catch (err: any) {
        if (requestId === latestRequestId && get().activeWorkspaceId === workspaceId) {
          set({
            isLoading: false,
            error: err?.message || `Failed to load bookmarks for workspace "${workspaceId}"`,
          });
        }
      }
    },

    loadBookmarks: async (workspaceId: string) => {
      const requestId = ++latestRequestId;
      set({ isLoading: true, error: null });

      try {
        const bookmarks = await repo.getByWorkspace(workspaceId);
        if (requestId === latestRequestId && get().activeWorkspaceId === workspaceId) {
          set({ bookmarks, isLoading: false, error: null });
        }
      } catch (err: any) {
        if (requestId === latestRequestId) {
          set({
            isLoading: false,
            error: err?.message || 'Failed to load bookmarks',
          });
        }
      }
    },

    loadGroups: async (workspaceId: string) => {
      const requestId = ++latestRequestId;
      set({ isLoading: true, error: null });

      try {
        const groups = await groupRepo.getByWorkspace(workspaceId);
        if (requestId === latestRequestId && get().activeWorkspaceId === workspaceId) {
          set({ groups, isLoading: false, error: null });
        }
      } catch (err: any) {
        if (requestId === latestRequestId) {
          set({
            isLoading: false,
            error: err?.message || 'Failed to load bookmark groups',
          });
        }
      }
    },

    refresh: async (workspaceId?: string) => {
      const targetWorkspaceId = workspaceId || get().activeWorkspaceId;
      if (!targetWorkspaceId) return;

      const requestId = ++latestRequestId;
      try {
        const [bookmarks, groups] = await Promise.all([
          repo.getByWorkspace(targetWorkspaceId),
          groupRepo.getByWorkspace(targetWorkspaceId),
        ]);

        if (requestId === latestRequestId && get().activeWorkspaceId === targetWorkspaceId) {
          set({ bookmarks, groups, error: null });
        }
      } catch (err: any) {
        if (requestId === latestRequestId) {
          set({ error: err?.message || 'Failed to refresh bookmarks' });
        }
      }
    },

    createBookmark: async (input) => {
      const activeWorkspaceId = get().activeWorkspaceId;
      if (!activeWorkspaceId) {
        const err = new Error('No active workspace selected for bookmark creation');
        set({ error: err.message });
        throw err;
      }

      if (input.workspaceId && input.workspaceId !== activeWorkspaceId) {
        const err = new Error(
          `Workspace Isolation Violation: Cannot create bookmark for workspace "${input.workspaceId}" in active workspace context "${activeWorkspaceId}"`
        );
        set({ error: err.message });
        throw err;
      }

      const workspaceId = activeWorkspaceId;

      try {
        const created = await repo.create({
          ...input,
          workspaceId,
        });

        // Update state strictly after repository commit
        if (get().activeWorkspaceId === workspaceId) {
          const updated = [...get().bookmarks, created];
          set({ bookmarks: updated, error: null });
        }

        await notifyBookmarksUpdated();
        return created;
      } catch (err: any) {
        set({ error: err?.message || 'Failed to create bookmark' });
        throw err;
      }
    },

    updateBookmark: async (id, changes) => {
      const workspaceId = get().activeWorkspaceId;
      if (!workspaceId) {
        const err = new Error('No active workspace selected for bookmark update');
        set({ error: err.message });
        throw err;
      }

      try {
        const updated = await repo.update(id, workspaceId, changes);

        if (get().activeWorkspaceId === workspaceId) {
          const list = get().bookmarks.map((bm) => (bm.id === id ? updated : bm));
          set({ bookmarks: list, error: null });
        }

        await notifyBookmarksUpdated();
        return updated;
      } catch (err: any) {
        set({ error: err?.message || 'Failed to update bookmark' });
        throw err;
      }
    },

    deleteBookmark: async (id) => {
      const workspaceId = get().activeWorkspaceId;
      if (!workspaceId) {
        const err = new Error('No active workspace selected for bookmark deletion');
        set({ error: err.message });
        throw err;
      }

      try {
        const deleted = await repo.delete(id, workspaceId);

        if (deleted && get().activeWorkspaceId === workspaceId) {
          const list = get().bookmarks.filter((bm) => bm.id !== id);
          set({ bookmarks: list, error: null });
        }

        await notifyBookmarksUpdated();
        return deleted;
      } catch (err: any) {
        set({ error: err?.message || 'Failed to delete bookmark' });
        throw err;
      }
    },

    toggleFavorite: async (id) => {
      const workspaceId = get().activeWorkspaceId;
      if (!workspaceId) {
        const err = new Error('No active workspace selected');
        set({ error: err.message });
        throw err;
      }

      const existing = get().bookmarks.find((bm) => bm.id === id);
      const nextFavorite = existing ? !existing.isFavorite : true;

      try {
        const updated = await repo.setFavorite(id, workspaceId, nextFavorite);

        if (get().activeWorkspaceId === workspaceId) {
          const list = get().bookmarks.map((bm) => (bm.id === id ? updated : bm));
          set({ bookmarks: list, error: null });
        }

        await notifyBookmarksUpdated();
        return updated;
      } catch (err: any) {
        set({ error: err?.message || 'Failed to toggle favorite' });
        throw err;
      }
    },

    reorderBookmarks: async (bookmarkIds, groupId) => {
      const workspaceId = get().activeWorkspaceId;
      if (!workspaceId) {
        const err = new Error('No active workspace selected');
        set({ error: err.message });
        throw err;
      }

      try {
        await repo.reorder(bookmarkIds, workspaceId, groupId);
        // Reload fresh ordered list from repository
        await get().refresh();
        await notifyBookmarksUpdated();
      } catch (err: any) {
        set({ error: err?.message || 'Failed to reorder bookmarks' });
        throw err;
      }
    },

    moveBookmark: async (bookmarkId, targetGroupId) => {
      const workspaceId = get().activeWorkspaceId;
      if (!workspaceId) {
        const err = new Error('No active workspace selected');
        set({ error: err.message });
        throw err;
      }

      try {
        const updated = await repo.move(bookmarkId, workspaceId, targetGroupId);

        if (get().activeWorkspaceId === workspaceId) {
          const list = get().bookmarks.map((bm) => (bm.id === bookmarkId ? updated : bm));
          set({ bookmarks: list, error: null });
        }

        await notifyBookmarksUpdated();
        return updated;
      } catch (err: any) {
        set({ error: err?.message || 'Failed to move bookmark' });
        throw err;
      }
    },

    moveBookmarks: async (bookmarkIds, targetGroupId) => {
      const workspaceId = get().activeWorkspaceId;
      if (!workspaceId) {
        const err = new Error('No active workspace selected');
        set({ error: err.message });
        throw err;
      }

      try {
        const updatedList = await repo.moveBulk(bookmarkIds, workspaceId, targetGroupId);

        if (get().activeWorkspaceId === workspaceId) {
          const updatedMap = new Map(updatedList.map((bm) => [bm.id, bm]));
          const list = get().bookmarks.map((bm) => updatedMap.get(bm.id) || bm);
          set({ bookmarks: list, error: null });
        }

        await notifyBookmarksUpdated();
        return updatedList;
      } catch (err: any) {
        set({ error: err?.message || 'Failed to move bookmarks' });
        throw err;
      }
    },

    createGroup: async (input) => {
      const activeWorkspaceId = get().activeWorkspaceId;
      if (!activeWorkspaceId) {
        const err = new Error('No active workspace selected for group creation');
        set({ error: err.message });
        throw err;
      }

      if (input.workspaceId && input.workspaceId !== activeWorkspaceId) {
        const err = new Error(
          `Workspace Isolation Violation: Cannot create group for workspace "${input.workspaceId}" in active workspace context "${activeWorkspaceId}"`
        );
        set({ error: err.message });
        throw err;
      }

      const workspaceId = activeWorkspaceId;

      try {
        const created = await groupRepo.create({
          ...input,
          workspaceId,
        });

        if (get().activeWorkspaceId === workspaceId) {
          set({ groups: [...get().groups, created], error: null });
        }

        await notifyBookmarksUpdated();
        return created;
      } catch (err: any) {
        set({ error: err?.message || 'Failed to create bookmark group' });
        throw err;
      }
    },

    updateGroup: async (id, changes) => {
      const workspaceId = get().activeWorkspaceId;
      if (!workspaceId) {
        const err = new Error('No active workspace selected');
        set({ error: err.message });
        throw err;
      }

      try {
        const updated = await groupRepo.update(id, workspaceId, changes);

        if (get().activeWorkspaceId === workspaceId) {
          const list = get().groups.map((g) => (g.id === id ? updated : g));
          set({ groups: list, error: null });
        }

        await notifyBookmarksUpdated();
        return updated;
      } catch (err: any) {
        set({ error: err?.message || 'Failed to update bookmark group' });
        throw err;
      }
    },

    renameGroup: async (id, title) => {
      const workspaceId = get().activeWorkspaceId;
      if (!workspaceId) {
        const err = new Error('No active workspace selected');
        set({ error: err.message });
        throw err;
      }

      try {
        const updated = await groupRepo.update(id, workspaceId, { title });

        if (get().activeWorkspaceId === workspaceId) {
          const list = get().groups.map((g) => (g.id === id ? updated : g));
          set({ groups: list, error: null });
        }

        await notifyBookmarksUpdated();
        return updated;
      } catch (err: any) {
        set({ error: err?.message || 'Failed to rename bookmark group' });
        throw err;
      }
    },

    deleteGroup: async (id, options) => {
      const workspaceId = get().activeWorkspaceId;
      if (!workspaceId) {
        const err = new Error('No active workspace selected');
        set({ error: err.message });
        throw err;
      }

      try {
        const result = await groupRepo.delete(id, workspaceId, options);

        if (result.deleted && get().activeWorkspaceId === workspaceId) {
          // If active group being filtered is the deleted group, reset active filter to 'all'
          const currentFilter = get().groupFilter;
          let nextFilter = currentFilter;
          if (currentFilter.type === 'group' && currentFilter.groupId === id) {
            nextFilter = { type: 'all' };
          }
          const nextActiveGroup =
            nextFilter.type === 'all'
              ? 'all'
              : nextFilter.type === 'uncategorized'
              ? null
              : nextFilter.groupId;

          // Reload both bookmarks and groups because reassignment/cascade modifies bookmarks
          const [bookmarks, groups] = await Promise.all([
            repo.getByWorkspace(workspaceId),
            groupRepo.getByWorkspace(workspaceId),
          ]);

          set({
            bookmarks,
            groups,
            groupFilter: nextFilter,
            activeGroupId: nextActiveGroup,
            error: null,
          });
        }

        await notifyBookmarksUpdated();
        return result;
      } catch (err: any) {
        set({ error: err?.message || 'Failed to delete bookmark group' });
        throw err;
      }
    },

    reorderGroups: async (groupIds) => {
      const workspaceId = get().activeWorkspaceId;
      if (!workspaceId) {
        const err = new Error('No active workspace selected');
        set({ error: err.message });
        throw err;
      }

      try {
        await groupRepo.reorder(groupIds, workspaceId);
        await get().refresh();
        await notifyBookmarksUpdated();
      } catch (err: any) {
        set({ error: err?.message || 'Failed to reorder bookmark groups' });
        throw err;
      }
    },

    getFilteredBookmarks: () => {
      const {
        bookmarks,
        searchQuery,
        groupFilter,
        showFavoritesOnly,
        sortBy,
        sortDirection,
      } = get();

      return filterAndSortBookmarks(bookmarks, {
        searchQuery,
        groupFilter,
        showFavoritesOnly,
        sortBy,
        sortDirection,
      });
    },
  }));
};

export const useBookmarkStore = createBookmarkStore();
