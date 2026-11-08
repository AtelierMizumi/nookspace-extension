import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { NookSpaceDB } from '../../../src/services/database/db';
import { NoteBookmarkLinkRepository } from '../../../src/features/notes/repositories/noteBookmarkLinkRepository';
import { NoteRepository } from '../../../src/features/notes/repositories/noteRepository';
import { BookmarkRepository } from '../../../src/features/bookmarks/repositories/bookmarkRepository';
import { createNoteStore } from '../../../src/features/notes/stores/noteStore';
import { LinkBookmarkModal } from '../../../src/features/notes/components/LinkBookmarkModal';
import { LinkedBookmarksSection } from '../../../src/features/notes/components/LinkedBookmarksSection';
import { NoteEditor } from '../../../src/features/notes/components/NoteEditor';
import { BookmarkItem } from '../../../src/features/bookmarks/components/BookmarkItem';
import { BookmarkEntity } from '../../../src/types/bookmarks';
import { NoteEntity } from '../../../src/types/notes';

describe('Milestone 7.6 — Bookmark ↔ Note Linking UI & Integration Suite', () => {
  const ws1 = 'ws-link-test-1';

  const mockBookmark1: BookmarkEntity = {
    id: 'bm-1',
    workspaceId: ws1,
    groupId: null,
    title: 'GitHub Portal',
    url: 'https://github.com',
    description: 'Code repositories and version control',
    isFavorite: true,
    order: 0,
    createdAt: 1000,
    updatedAt: 1000,
  };

  const mockBookmark2: BookmarkEntity = {
    id: 'bm-2',
    workspaceId: ws1,
    groupId: null,
    title: 'MDN Web Docs',
    url: 'https://developer.mozilla.org',
    description: 'Web development reference documentation',
    isFavorite: false,
    order: 1,
    createdAt: 1000,
    updatedAt: 1000,
  };

  const mockNote: NoteEntity = {
    id: 'note-1',
    workspaceId: ws1,
    collectionId: null,
    title: 'Research Notes',
    content: '# Research\nInformation goes here.',
    excerpt: 'Research Information goes here.',
    isPinned: false,
    isFavorite: false,
    isArchived: false,
    tags: ['dev'],
    order: 0,
    createdAt: 1000,
    updatedAt: 1000,
  };

  describe('1. LinkBookmarkModal Component', () => {
    let db: NookSpaceDB;

    beforeEach(async () => {
      db = new NookSpaceDB(`test-link-modal-${Date.now()}-${Math.random()}`);
      await db.open();

      await db.bookmarks.bulkAdd([mockBookmark1, mockBookmark2]);
    });

    afterEach(async () => {
      await db.delete();
    });

    it('renders search input, filter pills, and bookmarks list', async () => {
      const handleLink = vi.fn().mockResolvedValue(undefined);
      const handleUnlink = vi.fn().mockResolvedValue(undefined);

      render(
        <LinkBookmarkModal
          isOpen={true}
          onClose={vi.fn()}
          noteTitle="Research Notes"
          noteId="note-1"
          workspaceId={ws1}
          linkedBookmarkIds={['bm-1']}
          bookmarks={[mockBookmark1, mockBookmark2]}
          onLinkBookmark={handleLink}
          onUnlinkBookmark={handleUnlink}
        />
      );

      expect(screen.getByText('Link Bookmarks')).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText('Search bookmarks by title or URL...')
      ).toBeInTheDocument();

      // Should show both bookmarks once loaded
      expect(screen.getByText('GitHub Portal')).toBeInTheDocument();
      expect(screen.getByText('MDN Web Docs')).toBeInTheDocument();

      // bm-1 is linked, bm-2 is unlinked
      expect(screen.getByText('Linked')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Link' })).toBeInTheDocument();
    });

    it('filters bookmarks list based on search query', async () => {
      render(
        <LinkBookmarkModal
          isOpen={true}
          onClose={vi.fn()}
          noteTitle="Research Notes"
          noteId="note-1"
          workspaceId={ws1}
          linkedBookmarkIds={[]}
          bookmarks={[mockBookmark1, mockBookmark2]}
          onLinkBookmark={vi.fn().mockResolvedValue(undefined)}
          onUnlinkBookmark={vi.fn().mockResolvedValue(undefined)}
        />
      );

      expect(screen.getByText('GitHub Portal')).toBeInTheDocument();
      expect(screen.getByText('MDN Web Docs')).toBeInTheDocument();

      const searchInput = screen.getByPlaceholderText('Search bookmarks by title or URL...');
      fireEvent.change(searchInput, { target: { value: 'Mozilla' } });

      expect(screen.queryByText('GitHub Portal')).not.toBeInTheDocument();
      expect(screen.getByText('MDN Web Docs')).toBeInTheDocument();
    });

    it('triggers onLinkBookmark and onUnlinkBookmark callbacks', async () => {
      const handleLink = vi.fn().mockResolvedValue(undefined);
      const handleUnlink = vi.fn().mockResolvedValue(undefined);

      render(
        <LinkBookmarkModal
          isOpen={true}
          onClose={vi.fn()}
          noteTitle="Research Notes"
          noteId="note-1"
          workspaceId={ws1}
          linkedBookmarkIds={['bm-1']}
          bookmarks={[mockBookmark1, mockBookmark2]}
          onLinkBookmark={handleLink}
          onUnlinkBookmark={handleUnlink}
        />
      );

      expect(screen.getByText('GitHub Portal')).toBeInTheDocument();

      // Click Unlink on bm-1
      const unlinkBtn = screen.getByLabelText('Unlink bookmark');
      await act(async () => {
        fireEvent.click(unlinkBtn);
      });
      expect(handleUnlink).toHaveBeenCalledWith('bm-1');

      // Click Link on bm-2
      const linkBtn = screen.getByRole('button', { name: 'Link' });
      await act(async () => {
        fireEvent.click(linkBtn);
      });
      expect(handleLink).toHaveBeenCalledWith('bm-2');
    });
  });

  describe('2. LinkedBookmarksSection Component', () => {
    it('renders empty state message when no bookmarks are linked', () => {
      const handleOpenModal = vi.fn();

      render(
        <LinkedBookmarksSection
          linkedBookmarks={[]}
          onOpenLinkModal={handleOpenModal}
          onUnlink={vi.fn().mockResolvedValue(undefined)}
        />
      );

      expect(screen.getByText('Linked Bookmarks')).toBeInTheDocument();
      expect(screen.getByText('No bookmarks attached to this note.')).toBeInTheDocument();

      const linkBtn = screen.getByRole('button', { name: 'Link Bookmark' });
      fireEvent.click(linkBtn);
      expect(handleOpenModal).toHaveBeenCalledTimes(1);
    });

    it('renders bookmark cards with domain, opens URL in new tab, and unlinks on click', async () => {
      const handleUnlink = vi.fn().mockResolvedValue(undefined);
      const windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

      render(
        <LinkedBookmarksSection
          linkedBookmarks={[mockBookmark1, mockBookmark2]}
          onOpenLinkModal={vi.fn()}
          onUnlink={handleUnlink}
        />
      );

      expect(screen.getByText('GitHub Portal')).toBeInTheDocument();
      expect(screen.getByText('github.com')).toBeInTheDocument();
      expect(screen.getByText('MDN Web Docs')).toBeInTheDocument();
      expect(screen.getByText('developer.mozilla.org')).toBeInTheDocument();

      // Click card to open in new tab
      const card = screen.getByText('GitHub Portal').closest('[role="button"]')!;
      fireEvent.click(card);
      expect(windowOpenSpy).toHaveBeenCalledWith(
        'https://github.com',
        '_blank',
        'noopener,noreferrer'
      );

      // Click unlink icon
      const unlinkButtons = screen.getAllByLabelText('Unlink bookmark');
      await act(async () => {
        fireEvent.click(unlinkButtons[0]);
      });
      expect(handleUnlink).toHaveBeenCalledWith('bm-1');

      windowOpenSpy.mockRestore();
    });
  });

  describe('3. NoteEditor Integration with Linked Bookmarks', () => {
    it('renders LinkedBookmarksSection and opens LinkBookmarkModal on click', async () => {
      render(
        <NoteEditor
          note={mockNote}
          collections={[]}
          tags={[]}
          linkedBookmarks={[mockBookmark1]}
          onUpdate={vi.fn().mockResolvedValue(undefined)}
          onDelete={vi.fn().mockResolvedValue(undefined)}
          onTogglePin={vi.fn().mockResolvedValue(undefined)}
          onToggleFavorite={vi.fn().mockResolvedValue(undefined)}
          onToggleArchive={vi.fn().mockResolvedValue(undefined)}
          onLinkBookmark={vi.fn().mockResolvedValue(undefined)}
          onUnlinkBookmark={vi.fn().mockResolvedValue(undefined)}
        />
      );

      expect(screen.getByText('Linked Bookmarks')).toBeInTheDocument();
      expect(screen.getByText('GitHub Portal')).toBeInTheDocument();

      // Click Link Bookmark button to open modal
      const openModalBtn = screen.getByTitle('Link a bookmark to this note');
      fireEvent.click(openModalBtn);

      expect(screen.getByText('Link Bookmarks')).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText('Search bookmarks by title or URL...')
      ).toBeInTheDocument();
    });
  });

  describe('4. BookmarkItem Integration', () => {
    it('renders "Create note from bookmark" button and calls onCreateNote', () => {
      const handleCreateNote = vi.fn();

      render(
        <BookmarkItem
          bookmark={mockBookmark1}
          onCreateNote={handleCreateNote}
          onOpen={vi.fn()}
          onToggleFavorite={vi.fn()}
          onEdit={vi.fn()}
          onMove={vi.fn()}
          onDelete={vi.fn()}
        />
      );

      const createNoteBtn = screen.getByLabelText('Create note from bookmark');
      expect(createNoteBtn).toBeInTheDocument();

      fireEvent.click(createNoteBtn);
      expect(handleCreateNote).toHaveBeenCalledWith(mockBookmark1);
    });

    it('renders linked notes count badge when linkedNotesCount > 0', () => {
      render(
        <BookmarkItem
          bookmark={mockBookmark1}
          linkedNotesCount={3}
          onOpen={vi.fn()}
          onToggleFavorite={vi.fn()}
          onEdit={vi.fn()}
          onMove={vi.fn()}
          onDelete={vi.fn()}
        />
      );

      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByTitle('3 linked notes')).toBeInTheDocument();
    });
  });

  describe('5. Full End-to-End Store & Repositories Integration', () => {
    let db: NookSpaceDB;
    let noteRepo: NoteRepository;
    let bmRepo: BookmarkRepository;
    let linkRepo: NoteBookmarkLinkRepository;
    let store: ReturnType<typeof createNoteStore>;

    beforeEach(async () => {
      db = new NookSpaceDB(`test-links-e2e-${Date.now()}-${Math.random()}`);
      await db.open();

      noteRepo = new NoteRepository(db);
      bmRepo = new BookmarkRepository(db);
      linkRepo = new NoteBookmarkLinkRepository(db);

      // Seed bookmarks
      await db.bookmarks.bulkAdd([mockBookmark1, mockBookmark2]);

      store = createNoteStore({
        notesRepo: noteRepo,
        linksRepo: linkRepo,
      });

      await store.getState().initialize(ws1);
    });

    afterEach(async () => {
      await db.delete();
    });

    it('creates note from bookmark, links them bidirectionally, and selects new note', async () => {
      const createdNote = await store.getState().createNoteFromBookmark(mockBookmark1);

      expect(createdNote.id).toBeDefined();
      expect(createdNote.title).toBe(mockBookmark1.title);
      expect(createdNote.content).toContain('https://github.com');
      expect(store.getState().selectedNoteId).toBe(createdNote.id);

      // Check linked bookmarks in store
      expect(store.getState().linkedBookmarks).toHaveLength(1);
      expect(store.getState().linkedBookmarks[0].id).toBe(mockBookmark1.id);

      // Verify repository bidirectional retrieval
      const linkedBookmarks = await linkRepo.getLinkedBookmarksForNote(ws1, createdNote.id);
      expect(linkedBookmarks).toHaveLength(1);
      expect(linkedBookmarks[0].id).toBe(mockBookmark1.id);

      const linkedNotes = await linkRepo.getLinkedNotesForBookmark(ws1, mockBookmark1.id);
      expect(linkedNotes).toHaveLength(1);
      expect(linkedNotes[0].id).toBe(createdNote.id);
    });

    it('unlinks bookmark non-destructively: deletes junction link while preserving note and bookmark', async () => {
      const note = await store.getState().createNoteFromBookmark(mockBookmark1);
      expect(store.getState().linkedBookmarks).toHaveLength(1);

      // Unlink
      await store.getState().unlinkBookmark(note.id, mockBookmark1.id);

      // Store updated
      expect(store.getState().linkedBookmarks).toHaveLength(0);

      // Link deleted from Dexie
      const link = await linkRepo.getLink(ws1, note.id, mockBookmark1.id);
      expect(link).toBeUndefined();

      // Note still exists!
      const noteInDb = await db.notes.get(note.id);
      expect(noteInDb).toBeDefined();

      // Bookmark still exists!
      const bmInDb = await db.bookmarks.get(mockBookmark1.id);
      expect(bmInDb).toBeDefined();
    });

    it('cascades link deletion when a bookmark is deleted', async () => {
      const note = await store.getState().createNoteFromBookmark(mockBookmark1);
      expect((await linkRepo.getByBookmark(ws1, mockBookmark1.id)).length).toBe(1);

      // Delete bookmark via bookmark repository
      await bmRepo.delete(mockBookmark1.id, ws1);

      // Link is cleaned up
      const linksAfter = await linkRepo.getByBookmark(ws1, mockBookmark1.id);
      expect(linksAfter).toHaveLength(0);

      // Note still exists
      const noteInDb = await db.notes.get(note.id);
      expect(noteInDb).toBeDefined();
    });

    it('cascades link deletion when a note is deleted', async () => {
      const note = await store.getState().createNoteFromBookmark(mockBookmark1);
      expect((await linkRepo.getByNote(ws1, note.id)).length).toBe(1);

      // Delete note via note repository
      await noteRepo.delete(note.id, ws1);

      // Link is cleaned up
      const linksAfter = await linkRepo.getByNote(ws1, note.id);
      expect(linksAfter).toHaveLength(0);

      // Bookmark still exists
      const bmInDb = await db.bookmarks.get(mockBookmark1.id);
      expect(bmInDb).toBeDefined();
    });
  });
});
