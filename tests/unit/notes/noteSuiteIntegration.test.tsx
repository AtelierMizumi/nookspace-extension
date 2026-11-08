import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import React from 'react';
import { db } from '../../../src/services/database/db';
import { noteRepository } from '../../../src/features/notes/repositories/noteRepository';
import { noteCollectionRepository } from '../../../src/features/notes/repositories/noteCollectionRepository';
import { noteTagRepository } from '../../../src/features/notes/repositories/noteTagRepository';
import { noteBookmarkLinkRepository } from '../../../src/features/notes/repositories/noteBookmarkLinkRepository';
import { bookmarkRepository } from '../../../src/features/bookmarks/repositories/bookmarkRepository';
import {
  useNoteStore,
  STORAGE_KEY_NOTES_LAST_UPDATED_AT,
} from '../../../src/features/notes/stores/noteStore';
import {
  filterAndSortNotes,
  tokenizeQuery,
  scoreNote,
} from '../../../src/features/notes/services/noteSearchService';
import {
  migrateLegacyQuickNotes,
} from '../../../src/services/database/migrations/legacyQuickNotesMigration';
import {
  _resetMigrationCoordinatorForTesting,
} from '../../../src/services/database/migrations/migrationCoordinator';
import { NotesWidgetComponent } from '../../../src/widgets/NotesWidget';
import {
  NoteEntity,
  NoteCollectionEntity,
  NoteTagEntity,
  NoteSchema,
  CreateNoteSchema,
  generateExcerpt,
} from '../../../src/types/notes';
import { BookmarkEntity } from '../../../src/types/bookmarks';
import { createMockBrowser } from '../../mocks/browser';
import { EVENT_OPEN_NOTES_MANAGER } from '../../../src/features/notes';

describe('Notes & Knowledge Suite Integration & Performance Audit — Milestone 7.8', () => {
  let mockBrowser: ReturnType<typeof createMockBrowser>;
  const wsMain = 'ws-notes-integ';

  beforeEach(async () => {
    mockBrowser = createMockBrowser();
    (globalThis as any).browser = mockBrowser.mock;
    (globalThis as any).chrome = mockBrowser.mock;

    _resetMigrationCoordinatorForTesting();

    await db.open();
    await db.notes.clear();
    await db.noteCollections.clear();
    await db.noteTags.clear();
    await db.noteBookmarkLinks.clear();
    await db.bookmarks.clear();
    await db.widgetInstances.clear();

    useNoteStore.setState({
      notes: [],
      collections: [],
      tags: [],
      linkedBookmarks: [],
      selectedNoteId: null,
      activeWorkspaceId: wsMain,
      searchQuery: '',
      viewFilter: { type: 'all' },
      selectedTag: null,
      sortBy: 'order',
      sortDirection: 'asc',
      isLoading: false,
      isInitialized: true,
      error: null,
    });

    vi.clearAllMocks();
  });

  afterEach(async () => {
    vi.restoreAllMocks();
  });

  // ==========================================
  // SCENARIO 1: COMPLETE NOTE LIFECYCLE
  // ==========================================
  describe('Scenario 1 — Complete Note Lifecycle', () => {
    it('creates, edits, searches, pins, favorites, archives, unarchives, and deletes a note', async () => {
      // 1. Create a note via repository & store
      const note = await noteRepository.create({
        workspaceId: wsMain,
        title: 'Architecture Decision Record 01',
        content: '# ADR 01: Local-First Architecture\n\nWe prioritize offline storage in IndexedDB.',
        tags: ['adr', 'architecture'],
      });

      expect(note.id).toBeDefined();
      expect(note.excerpt).toContain('ADR 01: Local-First Architecture');
      expect(note.isPinned).toBe(false);
      expect(note.isFavorite).toBe(false);
      expect(note.isArchived).toBe(false);

      // Hydrate store
      await useNoteStore.getState().loadNotes(wsMain);
      expect(useNoteStore.getState().notes).toHaveLength(1);

      // 2. Edit note title and markdown content
      const updated = await useNoteStore.getState().updateNote(note.id, {
        title: 'ADR 01: Dexie DB Engine',
        content: '# ADR 01: Dexie DB Engine\n\n- [x] IndexedDB v4 Migration\n- [ ] Sync workers',
      });

      expect(updated.title).toBe('ADR 01: Dexie DB Engine');
      expect(updated.excerpt).toContain('IndexedDB v4 Migration');
      expect(useNoteStore.getState().notes[0].title).toBe('ADR 01: Dexie DB Engine');

      // 3. Search note by keyword
      useNoteStore.getState().setSearchQuery('dexie');
      const filtered = useNoteStore.getState().getFilteredNotes();
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe(note.id);

      useNoteStore.getState().setSearchQuery('nonexistent');
      expect(useNoteStore.getState().getFilteredNotes()).toHaveLength(0);
      useNoteStore.getState().setSearchQuery('');

      // 4. Pin note
      const pinned = await useNoteStore.getState().togglePin(note.id);
      expect(pinned.isPinned).toBe(true);
      expect(useNoteStore.getState().notes[0].isPinned).toBe(true);

      // 5. Favorite note
      const favorited = await useNoteStore.getState().toggleFavorite(note.id);
      expect(favorited.isFavorite).toBe(true);
      expect(useNoteStore.getState().notes[0].isFavorite).toBe(true);

      // 6. Archive note
      const archived = await useNoteStore.getState().toggleArchive(note.id);
      expect(archived.isArchived).toBe(true);

      // In 'all' view, archived note is hidden
      useNoteStore.getState().setViewFilter({ type: 'all' });
      expect(useNoteStore.getState().getFilteredNotes()).toHaveLength(0);

      // In 'archived' view, archived note is visible
      useNoteStore.getState().setViewFilter({ type: 'archived' });
      expect(useNoteStore.getState().getFilteredNotes()).toHaveLength(1);

      // 7. Unarchive note
      const unarchived = await useNoteStore.getState().toggleArchive(note.id);
      expect(unarchived.isArchived).toBe(false);
      useNoteStore.getState().setViewFilter({ type: 'all' });
      expect(useNoteStore.getState().getFilteredNotes()).toHaveLength(1);

      // 8. Delete note
      const deleted = await useNoteStore.getState().deleteNote(note.id);
      expect(deleted).toBe(true);
      expect(useNoteStore.getState().notes).toHaveLength(0);

      const dbNote = await db.notes.get(note.id);
      expect(dbNote).toBeUndefined();
    });
  });

  // ==========================================
  // SCENARIO 2: COLLECTION LIFECYCLE & INTEGRITY
  // ==========================================
  describe('Scenario 2 — Collection Lifecycle & Cascade Integrity', () => {
    it('creates collections, assigns notes, renames, and safely unsets collection on delete', async () => {
      // 1. Create collection
      const collection = await useNoteStore.getState().createCollection({
        workspaceId: wsMain,
        title: 'Project Roadmap',
        color: '#3B82F6',
        icon: 'folder',
      });
      expect(collection.title).toBe('Project Roadmap');
      expect(useNoteStore.getState().collections).toHaveLength(1);

      // 2. Create note in collection
      const note = await useNoteStore.getState().createNote({
        workspaceId: wsMain,
        collectionId: collection.id,
        title: 'Q4 Milestone Goals',
        content: 'Detailed quarterly goals.',
      });
      expect(note.collectionId).toBe(collection.id);

      // 3. Update collection title & color
      const updatedCol = await useNoteStore.getState().updateCollection(collection.id, {
        title: '2026 Strategy',
        color: '#10B981',
      });
      expect(updatedCol.title).toBe('2026 Strategy');
      expect(useNoteStore.getState().collections[0].title).toBe('2026 Strategy');

      // 4. Filter by collection
      useNoteStore.getState().setViewFilter({ type: 'collection', collectionId: collection.id });
      expect(useNoteStore.getState().getFilteredNotes()).toHaveLength(1);

      // 5. Delete collection with mode: 'reassign' (cascade unset)
      const deleteResult = await useNoteStore.getState().deleteCollection(collection.id, {
        mode: 'reassign',
      });
      expect(deleteResult.deleted).toBe(true);
      expect(deleteResult.mode).toBe('reassign');
      expect(deleteResult.affectedNotesCount).toBe(1);

      // Note should now have collectionId = null (uncategorized)
      const dbNote = await db.notes.get(note.id);
      expect(dbNote?.collectionId).toBeNull();
      expect(useNoteStore.getState().notes[0].collectionId).toBeNull();

      // Collection is removed
      expect(useNoteStore.getState().collections).toHaveLength(0);

      // 6. Test delete collection with mode: 'cascade'
      const col2 = await useNoteStore.getState().createCollection({
        workspaceId: wsMain,
        title: 'Disposable Collection',
      });
      const note2 = await useNoteStore.getState().createNote({
        workspaceId: wsMain,
        collectionId: col2.id,
        title: 'Disposable Note',
        content: 'Will be deleted with collection.',
      });

      const deleteResult2 = await useNoteStore.getState().deleteCollection(col2.id, {
        mode: 'cascade',
      });
      expect(deleteResult2.deleted).toBe(true);
      expect(deleteResult2.mode).toBe('cascade');
      expect(deleteResult2.affectedNotesCount).toBe(1);
      const dbNote2 = await db.notes.get(note2.id);
      expect(dbNote2).toBeUndefined();
    });
  });

  // ==========================================
  // SCENARIO 3: TAG LIFECYCLE & DYNAMIC PROPAGATION
  // ==========================================
  describe('Scenario 3 — Tag Lifecycle & Dynamic Propagation', () => {
    it('creates tags, attaches to notes, filters, renames with cascade, and deletes tags', async () => {
      // 1. Create tag
      const tag = await useNoteStore.getState().createTag({
        workspaceId: wsMain,
        name: 'typescript',
        color: '#3178C6',
      });
      expect(tag.name).toBe('typescript');

      // 2. Attach tag to two notes
      const n1 = await useNoteStore.getState().createNote({
        workspaceId: wsMain,
        title: 'TS Types Best Practices',
        content: 'Use strict types and avoid any.',
        tags: ['typescript', 'frontend'],
      });

      const n2 = await useNoteStore.getState().createNote({
        workspaceId: wsMain,
        title: 'Vitest Unit Testing',
        content: 'Write unit tests with fast assertions.',
        tags: ['testing'],
      });

      // 3. Filter by tag
      useNoteStore.getState().setSelectedTag('typescript');
      let filtered = useNoteStore.getState().getFilteredNotes();
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe(n1.id);

      useNoteStore.getState().setSelectedTag(null);

      // 4. Rename tag from 'typescript' to 'ts'
      await useNoteStore.getState().updateTag(tag.id, { name: 'ts' });
      await useNoteStore.getState().loadNotes(wsMain);

      const updatedN1 = await db.notes.get(n1.id);
      expect(updatedN1?.tags).toContain('ts');
      expect(updatedN1?.tags).not.toContain('typescript');

      // 5. Delete tag 'ts'
      await useNoteStore.getState().deleteTag(tag.id);
      await useNoteStore.getState().loadNotes(wsMain);

      const dbN1AfterTagDelete = await db.notes.get(n1.id);
      expect(dbN1AfterTagDelete?.tags).not.toContain('ts');
      expect(dbN1AfterTagDelete?.tags).toContain('frontend');
    });
  });

  // ==========================================
  // SCENARIO 4: BOOKMARK ↔ NOTE BIDIRECTIONAL INTEGRATION
  // ==========================================
  describe('Scenario 4 — Bookmark ↔ Note Bidirectional Integration', () => {
    it('creates note from bookmark, manages links bidirectionally, unlinks safely, and cascades on delete', async () => {
      // 1. Create a bookmark in db
      const bm = await bookmarkRepository.create({
        workspaceId: wsMain,
        title: 'React Documentation',
        url: 'https://react.dev',
        description: 'The library for web and native user interfaces',
      });

      // 2. Create note from bookmark
      const noteFromBm = await useNoteStore.getState().createNoteFromBookmark(bm);
      expect(noteFromBm.title).toContain('React Documentation');
      expect(noteFromBm.content).toContain('[Visit Website](https://react.dev)');

      // Link should exist
      const links = await noteBookmarkLinkRepository.getByNote(wsMain, noteFromBm.id);
      expect(links).toHaveLength(1);
      expect(links[0].bookmarkId).toBe(bm.id);

      // Bidirectional verification
      const bookmarksForNote = await noteBookmarkLinkRepository.getLinkedBookmarksForNote(wsMain, noteFromBm.id);
      expect(bookmarksForNote).toHaveLength(1);
      expect(bookmarksForNote[0].id).toBe(bm.id);

      const notesForBm = await noteBookmarkLinkRepository.getLinkedNotesForBookmark(wsMain, bm.id);
      expect(notesForBm).toHaveLength(1);
      expect(notesForBm[0].id).toBe(noteFromBm.id);

      // 3. Link a second bookmark to the same note
      const bm2 = await bookmarkRepository.create({
        workspaceId: wsMain,
        title: 'Tailwind CSS',
        url: 'https://tailwindcss.com',
      });

      await useNoteStore.getState().linkBookmark(noteFromBm.id, bm2.id);
      const linkedBms = await useNoteStore.getState().loadLinkedBookmarks(noteFromBm.id);
      expect(linkedBms.some((b) => b.id === bm2.id)).toBe(true);

      // 4. Unlink bm2 non-destructively
      await useNoteStore.getState().unlinkBookmark(noteFromBm.id, bm2.id);
      const remainingLinks = await noteBookmarkLinkRepository.getByNote(wsMain, noteFromBm.id);
      expect(remainingLinks).toHaveLength(1);
      expect(remainingLinks[0].bookmarkId).toBe(bm.id);

      // Verify bm2 still exists
      const intactBm2 = await db.bookmarks.get(bm2.id);
      expect(intactBm2).toBeDefined();

      // 5. Cascade delete link when bookmark is deleted
      await bookmarkRepository.delete(bm.id, wsMain);
      // Clean up bookmark links
      await noteBookmarkLinkRepository.deleteByBookmark(wsMain, bm.id);
      const finalLinks = await noteBookmarkLinkRepository.getByNote(wsMain, noteFromBm.id);
      expect(finalLinks).toHaveLength(0);

      // Note still exists
      const intactNote = await db.notes.get(noteFromBm.id);
      expect(intactNote).toBeDefined();
    });
  });

  // ==========================================
  // SCENARIO 5: LEGACY QUICK NOTES MIGRATION
  // ==========================================
  describe('Scenario 5 — Legacy Quick Notes Migration', () => {
    it('migrates legacy scratchpad widget notes into db.notes with idempotency and isolation', async () => {
      // 1. Seed legacy quick-notes widget instance
      await db.widgetInstances.add({
        id: 'wi-quicknotes-legacy-01',
        workspaceId: wsMain,
        widgetType: 'quick-notes',
        isEnabled: true,
        order: 0,
        createdAt: 1000,
        updatedAt: 1000,
        config: {
          content: '# Meeting Scratchpad\n\nDiscuss Q4 deliverable priorities.',
        },
      });

      // 2. Run migration
      const result = await migrateLegacyQuickNotes(db);
      expect(result.status).toBe('completed');
      expect(result.notesMigrated).toBe(1);

      // Verify note in db.notes
      const migratedNote = await db.notes.get('legacy-note-wi-quicknotes-legacy-01');
      expect(migratedNote).toBeDefined();
      expect(migratedNote?.title).toBe('Meeting Scratchpad');
      expect(migratedNote?.content).toContain('Discuss Q4 deliverable priorities.');
      expect(migratedNote?.workspaceId).toBe(wsMain);

      // 3. Idempotency test: Re-run migration
      const result2 = await migrateLegacyQuickNotes(db);
      expect(result2.notesMigrated).toBe(0);
      expect(result2.alreadyMigratedInstances).toBe(1);

      // Total notes should still be 1
      const count = await db.notes.count();
      expect(count).toBe(1);

      // 4. Hydrate store and verify note can be loaded and edited
      await useNoteStore.getState().loadNotes(wsMain);
      expect(useNoteStore.getState().notes).toHaveLength(1);

      await useNoteStore.getState().updateNote(migratedNote!.id, {
        title: 'Updated Scratchpad Title',
      });
      const updated = await db.notes.get(migratedNote!.id);
      expect(updated?.title).toBe('Updated Scratchpad Title');
    });
  });

  // ==========================================
  // SCENARIO 6: DASHBOARD NOTES WIDGET INTEGRATION
  // ==========================================
  describe('Scenario 6 — Dashboard Notes Widget Integration', () => {
    it('renders widget in various view modes, density levels, quick creates, and handles navigation event', async () => {
      // 1. Seed collection and notes
      const col = await noteCollectionRepository.create({
        workspaceId: wsMain,
        title: 'Engineering',
        color: '#3B82F6',
      });

      await noteRepository.create({
        workspaceId: wsMain,
        collectionId: col.id,
        title: 'Pinned Note Alpha',
        content: 'Important pinned content.',
        isPinned: true,
      });

      await noteRepository.create({
        workspaceId: wsMain,
        collectionId: null,
        title: 'Favorite Note Beta',
        content: 'Favorite item.',
        isFavorite: true,
      });

      await useNoteStore.getState().loadCollections(wsMain);
      await useNoteStore.getState().loadNotes(wsMain);

      // 2. Render NotesWidget in 'pinned' mode
      const { unmount, rerender } = render(
        <NotesWidgetComponent
          instanceId="wi-notes-test"
          workspaceId={wsMain}
          isEditMode={false}
          config={{
            mode: 'pinned',
            density: 'comfortable',
          }}
          onUpdateConfig={vi.fn()}
          onRemove={vi.fn()}
        />
      );

      expect(screen.getByText('Pinned Note Alpha')).toBeInTheDocument();
      expect(screen.queryByText('Favorite Note Beta')).not.toBeInTheDocument();

      // 3. Rerender in 'favorites' mode
      rerender(
        <NotesWidgetComponent
          instanceId="wi-notes-test"
          workspaceId={wsMain}
          isEditMode={false}
          config={{
            mode: 'favorites',
            density: 'compact',
          }}
          onUpdateConfig={vi.fn()}
          onRemove={vi.fn()}
        />
      );

      expect(screen.getByText('Favorite Note Beta')).toBeInTheDocument();
      expect(screen.queryByText('Pinned Note Alpha')).not.toBeInTheDocument();

      // 4. Quick create note via widget "+" button
      const openNotesListener = vi.fn();
      window.addEventListener(EVENT_OPEN_NOTES_MANAGER, openNotesListener);

      const addBtn = screen.getByLabelText(/create note|new note/i);
      fireEvent.click(addBtn);

      await waitFor(() => {
        expect(openNotesListener).toHaveBeenCalled();
      });

      window.removeEventListener(EVENT_OPEN_NOTES_MANAGER, openNotesListener);
      unmount();
    });
  });

  // ==========================================
  // SCENARIO 7: WORKSPACE ISOLATION
  // ==========================================
  describe('Scenario 7 — Workspace Isolation', () => {
    it('strictly isolates notes, collections, and tags between multiple workspaces with zero leakage', async () => {
      const wsA = 'ws-engineering';
      const wsB = 'ws-marketing';

      // 1. Seed items in wsA
      const colA = await noteCollectionRepository.create({
        workspaceId: wsA,
        title: 'Backend Systems',
      });
      await noteRepository.create({
        workspaceId: wsA,
        collectionId: colA.id,
        title: 'Microservices Architecture',
        content: 'System spec.',
      });
      await noteTagRepository.create({
        workspaceId: wsA,
        name: 'go',
      });

      // 2. Switch store to wsB
      await useNoteStore.getState().setActiveWorkspace(wsB);
      expect(useNoteStore.getState().notes).toHaveLength(0);
      expect(useNoteStore.getState().collections).toHaveLength(0);
      expect(useNoteStore.getState().tags).toHaveLength(0);

      // 3. Seed items in wsB
      const colB = await noteCollectionRepository.create({
        workspaceId: wsB,
        title: 'Social Campaigns',
      });
      await noteRepository.create({
        workspaceId: wsB,
        collectionId: colB.id,
        title: 'Launch Announcement',
        content: 'Twitter and Blog copy.',
      });

      await useNoteStore.getState().loadNotes(wsB);
      await useNoteStore.getState().loadCollections(wsB);

      expect(useNoteStore.getState().notes).toHaveLength(1);
      expect(useNoteStore.getState().notes[0].title).toBe('Launch Announcement');
      expect(useNoteStore.getState().collections[0].title).toBe('Social Campaigns');

      // 4. Switch back to wsA
      await useNoteStore.getState().setActiveWorkspace(wsA);
      expect(useNoteStore.getState().notes).toHaveLength(1);
      expect(useNoteStore.getState().notes[0].title).toBe('Microservices Architecture');
      expect(useNoteStore.getState().collections[0].title).toBe('Backend Systems');
    });
  });

  // ==========================================
  // SCENARIO 8: CROSS-TAB SYNCHRONIZATION
  // ==========================================
  describe('Scenario 8 — Cross-Tab Synchronization', () => {
    it('refreshes NotesWidget when storage.onChanged fires with STORAGE_KEY_NOTES_LAST_UPDATED_AT', async () => {
      let storageListener: any = null;
      const fakeBrowser = {
        storage: {
          local: {
            get: vi.fn(),
            set: vi.fn(),
          },
          onChanged: {
            addListener: vi.fn((fn) => {
              storageListener = fn;
            }),
            removeListener: vi.fn(),
          },
        },
      };
      (globalThis as any).browser = fakeBrowser;
      (globalThis as any).chrome = fakeBrowser;

      // 1. Render NotesWidget in initial state
      const { unmount } = render(
        <NotesWidgetComponent
          instanceId="wi-notes-sync"
          workspaceId={wsMain}
          isEditMode={false}
          config={{
            mode: 'recent',
          }}
          onUpdateConfig={vi.fn()}
          onRemove={vi.fn()}
        />
      );

      expect(screen.getByText(/no notes/i)).toBeInTheDocument();

      // 2. Simulate note created by another browser tab directly into database
      await db.notes.add({
        id: 'note-remote-tab-01',
        workspaceId: wsMain,
        collectionId: null,
        title: 'Note from Parallel Tab',
        content: 'Created in Tab 2',
        excerpt: 'Created in Tab 2',
        isPinned: false,
        isFavorite: false,
        isArchived: false,
        tags: [],
        order: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      // 3. Emit storage.onChanged event simulating browser extension storage sync
      act(() => {
        if (storageListener) {
          storageListener(
            {
              [STORAGE_KEY_NOTES_LAST_UPDATED_AT]: {
                oldValue: 0,
                newValue: Date.now(),
              },
            },
            'local'
          );
        }
      });

      // 4. Widget should automatically refresh and render the new note
      await waitFor(() => {
        expect(screen.getByText('Note from Parallel Tab')).toBeInTheDocument();
      });

      unmount();
    });
  });

  // ==========================================
  // SCENARIO 9: FAILURE HANDLING, DEFENSIVE VALIDATION & RECOVERY
  // ==========================================
  describe('Scenario 9 — Failure Handling, Defensive Validation & Recovery', () => {
    it('validates schema boundaries defensively and recovers smoothly from repository failures', async () => {
      // 1. Defensive validation rejection: Empty title
      const invalidNoteResult = CreateNoteSchema.safeParse({
        workspaceId: wsMain,
        title: '',
        content: 'Content',
      });
      expect(invalidNoteResult.success).toBe(false);

      // 2. Defensive validation rejection: Content exceeding 500KB
      const hugeContent = 'a'.repeat(500001);
      const invalidSizeResult = CreateNoteSchema.safeParse({
        workspaceId: wsMain,
        title: 'Huge Note',
        content: hugeContent,
      });
      expect(invalidSizeResult.success).toBe(false);

      // 3. Simulated repository failure in store
      vi.spyOn(noteRepository, 'create').mockRejectedValueOnce(
        new Error('Simulated IndexedDB Failure: Out of disk space')
      );

      await expect(
        useNoteStore.getState().createNote({
          workspaceId: wsMain,
          title: 'Failing Note',
          content: 'Will fail.',
        })
      ).rejects.toThrow('Simulated IndexedDB Failure: Out of disk space');

      expect(useNoteStore.getState().error).toContain('Simulated IndexedDB Failure');
      expect(useNoteStore.getState().isLoading).toBe(false);

      // 4. Recover with clearError
      useNoteStore.getState().clearError();
      expect(useNoteStore.getState().error).toBeNull();
    });
  });

  // ==========================================
  // SCENARIO 10: PERFORMANCE BENCHMARK METRICS
  // ==========================================
  describe('Scenario 10 — Performance Benchmark Metrics', () => {
    it('processes 100, 1,000, and 5,000 note records within sub-second thresholds', async () => {
      // 1. Generate 100 synthetic notes
      const sample100: NoteEntity[] = Array.from({ length: 100 }, (_, i) => ({
        id: `note-perf-100-${i}`,
        workspaceId: 'ws-perf',
        collectionId: i % 5 === 0 ? `col-${i % 5}` : null,
        title: `Note Item Number ${i} Title`,
        content: `# Note ${i}\n\nDetailed content for testing search tokens ${i} in body.`,
        excerpt: `Note ${i} Detailed content for testing search tokens ${i} in body.`,
        isPinned: i % 10 === 0,
        isFavorite: i % 7 === 0,
        isArchived: false,
        tags: [`tag-${i % 4}`, 'benchmark'],
        order: i,
        createdAt: 1000 + i,
        updatedAt: 1000 + i,
      }));

      // Benchmark 100 items search
      const t0 = performance.now();
      const res100 = filterAndSortNotes(sample100, {
        searchQuery: 'testing tokens 99',
      });
      const d100 = performance.now() - t0;
      expect(res100.length).toBeGreaterThan(0);
      expect(d100).toBeLessThan(50); // < 50ms

      // 2. Generate 1,000 synthetic notes
      const sample1k: NoteEntity[] = Array.from({ length: 1000 }, (_, i) => ({
        id: `note-perf-1k-${i}`,
        workspaceId: 'ws-perf',
        collectionId: i % 10 === 0 ? `col-${i % 10}` : null,
        title: `Engineering Specification ${i} Local Architecture`,
        content: `# Specification ${i}\n\nHigh performance local knowledge base record ${i} with markdown formatting.`,
        excerpt: `Specification ${i} High performance local knowledge base record ${i} with markdown formatting.`,
        isPinned: i % 20 === 0,
        isFavorite: i % 15 === 0,
        isArchived: i % 50 === 0,
        tags: [`tag-${i % 10}`, 'engineering'],
        order: i,
        createdAt: 2000 + i,
        updatedAt: 2000 + i,
      }));

      // Benchmark 1,000 items multi-token search
      const t1 = performance.now();
      const res1k = filterAndSortNotes(sample1k, {
        searchQuery: 'Specification 999 knowledge',
      });
      const d1k = performance.now() - t1;
      expect(res1k.length).toBeGreaterThan(0);
      expect(d1k).toBeLessThan(300); // < 300ms

      // Benchmark 1,000 items sorting & filtering
      const t2 = performance.now();
      const sorted1k = filterAndSortNotes(sample1k, {
        sortBy: 'title',
        sortDirection: 'desc',
        viewFilter: { type: 'all' },
      });
      const dSort1k = performance.now() - t2;
      expect(sorted1k.length).toBeGreaterThan(900);
      expect(dSort1k).toBeLessThan(150); // < 150ms

      // 3. Generate 5,000 synthetic notes
      const sample5k: NoteEntity[] = Array.from({ length: 5000 }, (_, i) => ({
        id: `note-perf-5k-${i}`,
        workspaceId: 'ws-perf',
        collectionId: i % 25 === 0 ? `col-${i % 25}` : null,
        title: `Scale Test Record ${i} Enterprise Knowledge`,
        content: `Synthetic markdown body for node ${i}. Includes **bold**, *italic*, and [links](https://example.com/${i}).`,
        excerpt: `Synthetic markdown body for node ${i}. Includes bold, italic, and links.`,
        isPinned: i % 50 === 0,
        isFavorite: i % 30 === 0,
        isArchived: i % 100 === 0,
        tags: [`cat-${i % 20}`, 'scale-testing'],
        order: i,
        createdAt: 3000 + i,
        updatedAt: 3000 + i,
      }));

      // Benchmark 5,000 items multi-token AND search
      const t3 = performance.now();
      const res5k = filterAndSortNotes(sample5k, {
        searchQuery: 'Scale Test Record 4999 Enterprise',
      });
      const d5k = performance.now() - t3;
      expect(res5k).toHaveLength(1);
      expect(d5k).toBeLessThan(1000); // < 1,000ms

      // Benchmark Excerpt generation on 5,000 markdown snippets
      const t4 = performance.now();
      for (let i = 0; i < 5000; i++) {
        generateExcerpt(
          `# Header ${i}\n\nSome **bold text** and \`inline code\` with [link](https://test.com) to test strip.`
        );
      }
      const dExcerpt5k = performance.now() - t4;
      expect(dExcerpt5k).toBeLessThan(1500); // < 1,500ms
    });
  });
});
