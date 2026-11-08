import { create } from 'zustand';
import {
  NoteEntity,
  NoteCollectionEntity,
  NoteTagEntity,
  CreateNoteInput,
  UpdateNoteInput,
  CreateNoteCollectionInput,
  UpdateNoteCollectionInput,
  CreateNoteTagInput,
  UpdateNoteTagInput,
} from '../../../types/notes';
import {
  noteRepository,
  NoteRepository,
} from '../repositories/noteRepository';
import {
  noteCollectionRepository,
  NoteCollectionRepository,
  DeleteNoteCollectionOptions,
  DeleteNoteCollectionResult,
} from '../repositories/noteCollectionRepository';
import {
  noteTagRepository,
  NoteTagRepository,
} from '../repositories/noteTagRepository';
import {
  noteBookmarkLinkRepository,
  NoteBookmarkLinkRepository,
} from '../repositories/noteBookmarkLinkRepository';
import { BookmarkEntity } from '../../../types/bookmarks';
import {
  filterAndSortNotes,
  NoteSortField,
  SortDirection,
  NoteViewFilter,
  normalizeNoteViewFilter,
} from '../services/noteSearchService';
import { browserApi } from '../../../services/browser';
import { ensureQuickNotesMigration } from '../../../services/database/migrations/migrationCoordinator';

export const STORAGE_KEY_NOTES_LAST_UPDATED_AT = 'nookspace_notes_last_updated_at';

async function notifyNotesUpdated(): Promise<void> {
  try {
    await browserApi.storage.local.set({
      [STORAGE_KEY_NOTES_LAST_UPDATED_AT]: Date.now(),
    });
  } catch {
    // Non-blocking in headless/test environments
  }
}

export type { NoteViewFilter };
export { normalizeNoteViewFilter };

export interface NoteStoreState {
  notes: NoteEntity[];
  collections: NoteCollectionEntity[];
  tags: NoteTagEntity[];
  selectedNoteId: string | null;
  activeWorkspaceId: string | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;

  // Filter & Search State
  searchQuery: string;
  viewFilter: NoteViewFilter;
  selectedTag: string | null;
  sortBy: NoteSortField;
  sortDirection: SortDirection;

  // Actions
  initialize: (workspaceId: string) => Promise<void>;
  loadNotes: (workspaceId: string) => Promise<void>;
  loadCollections: (workspaceId: string) => Promise<void>;
  loadTags: (workspaceId: string) => Promise<void>;
  refresh: (workspaceId?: string) => Promise<void>;
  setActiveWorkspace: (workspaceId: string) => Promise<void>;
  setSearchQuery: (query: string) => void;
  setViewFilter: (filter: NoteViewFilter) => void;
  selectNote: (id: string | null) => void;
  setSelectedTag: (tag: string | null) => void;
  setSortBy: (sortBy: NoteSortField) => void;
  setSortDirection: (direction: SortDirection) => void;

  // Note Mutations
  createNote: (
    input: Omit<CreateNoteInput, 'workspaceId'> & { workspaceId?: string }
  ) => Promise<NoteEntity>;
  updateNote: (id: string, changes: UpdateNoteInput) => Promise<NoteEntity>;
  deleteNote: (id: string) => Promise<boolean>;
  togglePin: (id: string) => Promise<NoteEntity>;
  toggleFavorite: (id: string) => Promise<NoteEntity>;
  toggleArchive: (id: string) => Promise<NoteEntity>;
  reorderNotes: (noteIds: string[]) => Promise<void>;
  moveNote: (noteId: string, targetCollectionId: string | null) => Promise<NoteEntity>;

  // Collection Mutations
  createCollection: (
    input: Omit<CreateNoteCollectionInput, 'workspaceId'> & { workspaceId?: string }
  ) => Promise<NoteCollectionEntity>;
  updateCollection: (id: string, changes: UpdateNoteCollectionInput) => Promise<NoteCollectionEntity>;
  deleteCollection: (
    id: string,
    options?: DeleteNoteCollectionOptions
  ) => Promise<DeleteNoteCollectionResult>;
  reorderCollections: (collectionIds: string[]) => Promise<void>;

  // Tag Mutations
  createTag: (
    input: Omit<CreateNoteTagInput, 'workspaceId'> & { workspaceId?: string }
  ) => Promise<NoteTagEntity>;
  updateTag: (id: string, changes: UpdateNoteTagInput) => Promise<NoteTagEntity>;
  deleteTag: (id: string) => Promise<boolean>;

  // Bookmark Link State & Mutations
  linkedBookmarks: BookmarkEntity[];
  loadLinkedBookmarks: (noteId: string) => Promise<BookmarkEntity[]>;
  linkBookmark: (noteId: string, bookmarkId: string) => Promise<void>;
  unlinkBookmark: (noteId: string, bookmarkId: string) => Promise<void>;
  createNoteFromBookmark: (bookmark: BookmarkEntity) => Promise<NoteEntity>;

  clearError: () => void;
  getFilteredNotes: () => NoteEntity[];
}

export interface NoteStoreDependencies {
  notesRepo?: NoteRepository;
  collectionsRepo?: NoteCollectionRepository;
  tagsRepo?: NoteTagRepository;
  linksRepo?: NoteBookmarkLinkRepository;
}

export function createNoteStore(deps: NoteStoreDependencies = {}) {
  const nRepo = deps.notesRepo ?? noteRepository;
  const cRepo = deps.collectionsRepo ?? noteCollectionRepository;
  const tRepo = deps.tagsRepo ?? noteTagRepository;
  const lRepo = deps.linksRepo ?? noteBookmarkLinkRepository;

  let latestRequestId = 0;

  return create<NoteStoreState>((set, get) => ({
    notes: [],
    collections: [],
    tags: [],
    linkedBookmarks: [],
    selectedNoteId: null,
    activeWorkspaceId: null,
    isLoading: false,
    isInitialized: false,
    error: null,

    searchQuery: '',
    viewFilter: { type: 'all' },
    selectedTag: null,
    sortBy: 'updatedAt',
    sortDirection: 'desc',

    initialize: async (workspaceId: string) => {
      if (!workspaceId) return;
      const currentWs = get().activeWorkspaceId;
      if (currentWs === workspaceId && get().isInitialized) {
        return;
      }

      set({ activeWorkspaceId: workspaceId, isLoading: true, error: null });
      const requestId = ++latestRequestId;

      try {
        await ensureQuickNotesMigration();
        const [loadedNotes, loadedCols, loadedTags] = await Promise.all([
          nRepo.getByWorkspace(workspaceId),
          cRepo.getByWorkspace(workspaceId),
          tRepo.getByWorkspace(workspaceId),
        ]);

        if (requestId !== latestRequestId) return;

        const initialSelectedId = loadedNotes.length > 0 ? loadedNotes[0].id : null;
        set({
          notes: loadedNotes,
          collections: loadedCols,
          tags: loadedTags,
          selectedNoteId: initialSelectedId,
          isLoading: false,
          isInitialized: true,
        });

        if (initialSelectedId) {
          get().loadLinkedBookmarks(initialSelectedId);
        } else {
          set({ linkedBookmarks: [] });
        }
      } catch (err: unknown) {
        if (requestId !== latestRequestId) return;
        set({
          isLoading: false,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    },

    loadNotes: async (workspaceId: string) => {
      const requestId = ++latestRequestId;
      try {
        const notes = await nRepo.getByWorkspace(workspaceId);
        if (requestId !== latestRequestId) return;
        set({ notes });
      } catch (err: unknown) {
        if (requestId !== latestRequestId) return;
        set({ error: err instanceof Error ? err.message : String(err) });
      }
    },

    loadCollections: async (workspaceId: string) => {
      try {
        const collections = await cRepo.getByWorkspace(workspaceId);
        set({ collections });
      } catch (err: unknown) {
        set({ error: err instanceof Error ? err.message : String(err) });
      }
    },

    loadTags: async (workspaceId: string) => {
      try {
        const tags = await tRepo.getByWorkspace(workspaceId);
        set({ tags });
      } catch (err: unknown) {
        set({ error: err instanceof Error ? err.message : String(err) });
      }
    },

    refresh: async (workspaceId?: string) => {
      const targetWs = workspaceId || get().activeWorkspaceId;
      if (!targetWs) return;

      const requestId = ++latestRequestId;
      try {
        const [notes, collections, tags] = await Promise.all([
          nRepo.getByWorkspace(targetWs),
          cRepo.getByWorkspace(targetWs),
          tRepo.getByWorkspace(targetWs),
        ]);

        if (requestId !== latestRequestId) return;

        // Ensure selected note remains valid
        let nextSelectedId = get().selectedNoteId;
        if (nextSelectedId && !notes.some((n) => n.id === nextSelectedId)) {
          nextSelectedId = notes.length > 0 ? notes[0].id : null;
        } else if (!nextSelectedId && notes.length > 0) {
          nextSelectedId = notes[0].id;
        }

        set({
          notes,
          collections,
          tags,
          selectedNoteId: nextSelectedId,
          error: null,
        });
      } catch (err: unknown) {
        if (requestId !== latestRequestId) return;
        set({ error: err instanceof Error ? err.message : String(err) });
      }
    },

    setActiveWorkspace: async (workspaceId: string) => {
      if (workspaceId === get().activeWorkspaceId) return;
      set({
        activeWorkspaceId: workspaceId,
        isInitialized: false,
        selectedNoteId: null,
        searchQuery: '',
        viewFilter: { type: 'all' },
        selectedTag: null,
      });
      await get().initialize(workspaceId);
    },

    setSearchQuery: (searchQuery: string) => set({ searchQuery }),
    setViewFilter: (viewFilter: NoteViewFilter) => set({ viewFilter }),
    selectNote: (selectedNoteId: string | null) => {
      set({ selectedNoteId });
      if (selectedNoteId) {
        get().loadLinkedBookmarks(selectedNoteId);
      } else {
        set({ linkedBookmarks: [] });
      }
    },
    setSelectedTag: (selectedTag: string | null) => set({ selectedTag }),
    setSortBy: (sortBy: NoteSortField) => set({ sortBy }),
    setSortDirection: (sortDirection: SortDirection) => set({ sortDirection }),

    // Note Mutations
    createNote: async (input) => {
      const ws = input.workspaceId || get().activeWorkspaceId;
      if (!ws) throw new Error('Cannot create note: activeWorkspaceId is not set');

      try {
        const entity = await nRepo.create({
          ...input,
          workspaceId: ws,
        });

        set((state) => ({
          notes: [entity, ...state.notes],
          selectedNoteId: entity.id,
        }));

        await notifyNotesUpdated();
        return entity;
      } catch (err: unknown) {
        set({ error: err instanceof Error ? err.message : String(err) });
        throw err;
      }
    },

    updateNote: async (id: string, changes: UpdateNoteInput) => {
      const ws = get().activeWorkspaceId;
      if (!ws) throw new Error('Cannot update note: activeWorkspaceId is not set');

      try {
        const updated = await nRepo.update(id, ws, changes);

        set((state) => ({
          notes: state.notes.map((n) => (n.id === id ? updated : n)),
        }));

        await notifyNotesUpdated();
        return updated;
      } catch (err: unknown) {
        set({ error: err instanceof Error ? err.message : String(err) });
        throw err;
      }
    },

    deleteNote: async (id: string) => {
      const ws = get().activeWorkspaceId;
      if (!ws) throw new Error('Cannot delete note: activeWorkspaceId is not set');

      try {
        const deleted = await nRepo.delete(id, ws);
        if (deleted) {
          set((state) => {
            const nextNotes = state.notes.filter((n) => n.id !== id);
            const nextSelected =
              state.selectedNoteId === id
                ? nextNotes.length > 0
                  ? nextNotes[0].id
                  : null
                : state.selectedNoteId;

            return {
              notes: nextNotes,
              selectedNoteId: nextSelected,
            };
          });
          await notifyNotesUpdated();
        }
        return deleted;
      } catch (err: unknown) {
        set({ error: err instanceof Error ? err.message : String(err) });
        throw err;
      }
    },

    togglePin: async (id: string) => {
      const ws = get().activeWorkspaceId;
      if (!ws) throw new Error('Cannot toggle pin: activeWorkspaceId is not set');

      try {
        const updated = await nRepo.togglePin(id, ws);
        set((state) => ({
          notes: state.notes.map((n) => (n.id === id ? updated : n)),
        }));
        await notifyNotesUpdated();
        return updated;
      } catch (err: unknown) {
        set({ error: err instanceof Error ? err.message : String(err) });
        throw err;
      }
    },

    toggleFavorite: async (id: string) => {
      const ws = get().activeWorkspaceId;
      if (!ws) throw new Error('Cannot toggle favorite: activeWorkspaceId is not set');

      try {
        const updated = await nRepo.toggleFavorite(id, ws);
        set((state) => ({
          notes: state.notes.map((n) => (n.id === id ? updated : n)),
        }));
        await notifyNotesUpdated();
        return updated;
      } catch (err: unknown) {
        set({ error: err instanceof Error ? err.message : String(err) });
        throw err;
      }
    },

    toggleArchive: async (id: string) => {
      const ws = get().activeWorkspaceId;
      if (!ws) throw new Error('Cannot toggle archive: activeWorkspaceId is not set');

      try {
        const updated = await nRepo.toggleArchive(id, ws);
        set((state) => ({
          notes: state.notes.map((n) => (n.id === id ? updated : n)),
        }));
        await notifyNotesUpdated();
        return updated;
      } catch (err: unknown) {
        set({ error: err instanceof Error ? err.message : String(err) });
        throw err;
      }
    },

    reorderNotes: async (noteIds: string[]) => {
      const ws = get().activeWorkspaceId;
      if (!ws) throw new Error('Cannot reorder notes: activeWorkspaceId is not set');

      try {
        await nRepo.reorder(noteIds, ws);
        await get().refresh();
        await notifyNotesUpdated();
      } catch (err: unknown) {
        set({ error: err instanceof Error ? err.message : String(err) });
        throw err;
      }
    },

    moveNote: async (noteId: string, targetCollectionId: string | null) => {
      const ws = get().activeWorkspaceId;
      if (!ws) throw new Error('Cannot move note: activeWorkspaceId is not set');

      try {
        const updated = await nRepo.moveToCollection(noteId, ws, targetCollectionId);
        set((state) => ({
          notes: state.notes.map((n) => (n.id === noteId ? updated : n)),
        }));
        await notifyNotesUpdated();
        return updated;
      } catch (err: unknown) {
        set({ error: err instanceof Error ? err.message : String(err) });
        throw err;
      }
    },

    // Collection Mutations
    createCollection: async (input) => {
      const ws = input.workspaceId || get().activeWorkspaceId;
      if (!ws) throw new Error('Cannot create collection: activeWorkspaceId is not set');

      try {
        const entity = await cRepo.create({
          ...input,
          workspaceId: ws,
        });

        set((state) => ({
          collections: [...state.collections, entity].sort((a, b) => a.order - b.order),
        }));

        await notifyNotesUpdated();
        return entity;
      } catch (err: unknown) {
        set({ error: err instanceof Error ? err.message : String(err) });
        throw err;
      }
    },

    updateCollection: async (id: string, changes: UpdateNoteCollectionInput) => {
      const ws = get().activeWorkspaceId;
      if (!ws) throw new Error('Cannot update collection: activeWorkspaceId is not set');

      try {
        const updated = await cRepo.update(id, ws, changes);

        set((state) => ({
          collections: state.collections.map((c) => (c.id === id ? updated : c)),
        }));

        await notifyNotesUpdated();
        return updated;
      } catch (err: unknown) {
        set({ error: err instanceof Error ? err.message : String(err) });
        throw err;
      }
    },

    deleteCollection: async (id: string, options?: DeleteNoteCollectionOptions) => {
      const ws = get().activeWorkspaceId;
      if (!ws) throw new Error('Cannot delete collection: activeWorkspaceId is not set');

      try {
        const result = await cRepo.delete(id, ws, options);
        if (result.deleted) {
          // Refresh store data to account for cascade or reassign
          await get().refresh();
          await notifyNotesUpdated();
        }
        return result;
      } catch (err: unknown) {
        set({ error: err instanceof Error ? err.message : String(err) });
        throw err;
      }
    },

    reorderCollections: async (collectionIds: string[]) => {
      const ws = get().activeWorkspaceId;
      if (!ws) throw new Error('Cannot reorder collections: activeWorkspaceId is not set');

      try {
        await cRepo.reorder(collectionIds, ws);
        await get().refresh();
        await notifyNotesUpdated();
      } catch (err: unknown) {
        set({ error: err instanceof Error ? err.message : String(err) });
        throw err;
      }
    },

    // Tag Mutations
    createTag: async (input) => {
      const ws = input.workspaceId || get().activeWorkspaceId;
      if (!ws) throw new Error('Cannot create tag: activeWorkspaceId is not set');

      try {
        const entity = await tRepo.create({
          ...input,
          workspaceId: ws,
        });

        set((state) => ({
          tags: [...state.tags, entity].sort((a, b) => a.name.localeCompare(b.name)),
        }));

        await notifyNotesUpdated();
        return entity;
      } catch (err: unknown) {
        set({ error: err instanceof Error ? err.message : String(err) });
        throw err;
      }
    },

    updateTag: async (id: string, changes: UpdateNoteTagInput) => {
      const ws = get().activeWorkspaceId;
      if (!ws) throw new Error('Cannot update tag: activeWorkspaceId is not set');

      try {
        const updated = await tRepo.update(id, ws, changes);

        // If tag was renamed, notes might have been updated too
        await get().refresh();
        await notifyNotesUpdated();
        return updated;
      } catch (err: unknown) {
        set({ error: err instanceof Error ? err.message : String(err) });
        throw err;
      }
    },

    deleteTag: async (id: string) => {
      const ws = get().activeWorkspaceId;
      if (!ws) throw new Error('Cannot delete tag: activeWorkspaceId is not set');

      try {
        const deleted = await tRepo.delete(id, ws);
        if (deleted) {
          await get().refresh();
          await notifyNotesUpdated();
        }
        return deleted;
      } catch (err: unknown) {
        set({ error: err instanceof Error ? err.message : String(err) });
        throw err;
      }
    },

    // Bookmark Link Actions
    loadLinkedBookmarks: async (noteId: string) => {
      const ws = get().activeWorkspaceId;
      if (!ws || !noteId) {
        set({ linkedBookmarks: [] });
        return [];
      }
      try {
        const bookmarks = await lRepo.getLinkedBookmarksForNote(ws, noteId);
        if (get().selectedNoteId === noteId) {
          set({ linkedBookmarks: bookmarks });
        }
        return bookmarks;
      } catch (err: unknown) {
        console.error('Failed to load linked bookmarks for note:', err);
        return [];
      }
    },

    linkBookmark: async (noteId: string, bookmarkId: string) => {
      const ws = get().activeWorkspaceId;
      if (!ws) throw new Error('Cannot link bookmark: activeWorkspaceId is not set');

      try {
        await lRepo.create({
          workspaceId: ws,
          noteId,
          bookmarkId,
        });

        if (get().selectedNoteId === noteId) {
          await get().loadLinkedBookmarks(noteId);
        }
        await notifyNotesUpdated();
      } catch (err: unknown) {
        set({ error: err instanceof Error ? err.message : String(err) });
        throw err;
      }
    },

    unlinkBookmark: async (noteId: string, bookmarkId: string) => {
      const ws = get().activeWorkspaceId;
      if (!ws) throw new Error('Cannot unlink bookmark: activeWorkspaceId is not set');

      try {
        await lRepo.delete(ws, noteId, bookmarkId);

        if (get().selectedNoteId === noteId) {
          await get().loadLinkedBookmarks(noteId);
        }
        await notifyNotesUpdated();
      } catch (err: unknown) {
        set({ error: err instanceof Error ? err.message : String(err) });
        throw err;
      }
    },

    createNoteFromBookmark: async (bookmark: BookmarkEntity) => {
      const ws = get().activeWorkspaceId;
      if (!ws) throw new Error('Cannot create note: activeWorkspaceId is not set');

      try {
        const content = `# ${bookmark.title}\n\n[Visit Website](${bookmark.url})${
          bookmark.description ? `\n\n${bookmark.description}` : ''
        }`;

        // 1. Create note
        const note = await get().createNote({
          title: bookmark.title,
          content,
          workspaceId: ws,
        });

        // 2. Link bookmark to note
        await lRepo.create({
          workspaceId: ws,
          noteId: note.id,
          bookmarkId: bookmark.id,
        });

        // 3. Select note and load its linked bookmarks
        get().selectNote(note.id);
        await get().loadLinkedBookmarks(note.id);
        await notifyNotesUpdated();

        return note;
      } catch (err: unknown) {
        set({ error: err instanceof Error ? err.message : String(err) });
        throw err;
      }
    },

    clearError: () => set({ error: null }),

    getFilteredNotes: () => {
      const { notes, searchQuery, viewFilter, selectedTag, sortBy, sortDirection } = get();
      return filterAndSortNotes(notes, {
        searchQuery,
        viewFilter,
        selectedTag: selectedTag ?? undefined,
        sortBy,
        sortDirection,
      });
    },
  }));
}

export const useNoteStore = createNoteStore();
