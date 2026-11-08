import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NookSpaceDB } from '../../../src/services/database/db';
import { NoteBookmarkLinkRepository } from '../../../src/features/notes/repositories/noteBookmarkLinkRepository';

describe('NoteBookmarkLinkRepository Suite', () => {
  let db: NookSpaceDB;
  let repo: NoteBookmarkLinkRepository;
  const ws1 = 'ws-test-1';
  const ws2 = 'ws-test-2';

  beforeEach(async () => {
    db = new NookSpaceDB(`test-note-link-repo-${Date.now()}-${Math.random()}`);
    await db.open();
    repo = new NoteBookmarkLinkRepository(db);

    // Seed note and bookmark in ws1
    await db.notes.add({
      id: 'note-1',
      workspaceId: ws1,
      collectionId: null,
      title: 'Note 1',
      content: 'Content',
      excerpt: 'Content',
      isPinned: false,
      isFavorite: false,
      isArchived: false,
      tags: [],
      order: 0,
      createdAt: 1000,
      updatedAt: 1000,
    });

    await db.bookmarks.add({
      id: 'bm-1',
      workspaceId: ws1,
      groupId: null,
      title: 'Bookmark 1',
      url: 'https://example.com',
      isFavorite: false,
      order: 0,
      createdAt: 1000,
      updatedAt: 1000,
    });
  });

  afterEach(async () => {
    await db.delete();
  });

  it('1. creates link between note and bookmark validating workspace isolation', async () => {
    const link = await repo.create({
      workspaceId: ws1,
      noteId: 'note-1',
      bookmarkId: 'bm-1',
    });

    expect(link.id).toBeDefined();
    expect(link.noteId).toBe('note-1');
    expect(link.bookmarkId).toBe('bm-1');

    // Calling again returns existing link (idempotent)
    const duplicate = await repo.create({
      workspaceId: ws1,
      noteId: 'note-1',
      bookmarkId: 'bm-1',
    });
    expect(duplicate.id).toBe(link.id);
  });

  it('2. rejects link creation when note or bookmark does not exist in workspace', async () => {
    await expect(
      repo.create({
        workspaceId: ws1,
        noteId: 'non-existent',
        bookmarkId: 'bm-1',
      })
    ).rejects.toThrow(/Note with id.*not found/);

    await expect(
      repo.create({
        workspaceId: ws1,
        noteId: 'note-1',
        bookmarkId: 'non-existent',
      })
    ).rejects.toThrow(/Bookmark with id.*not found/);

    // Cross-workspace mismatch
    await expect(
      repo.create({
        workspaceId: ws2,
        noteId: 'note-1',
        bookmarkId: 'bm-1',
      })
    ).rejects.toThrow();
  });

  it('3. retrieves bidirectional linked entities', async () => {
    await repo.create({
      workspaceId: ws1,
      noteId: 'note-1',
      bookmarkId: 'bm-1',
    });

    const bookmarks = await repo.getLinkedBookmarksForNote(ws1, 'note-1');
    expect(bookmarks.length).toBe(1);
    expect(bookmarks[0].title).toBe('Bookmark 1');

    const notes = await repo.getLinkedNotesForBookmark(ws1, 'bm-1');
    expect(notes.length).toBe(1);
    expect(notes[0].title).toBe('Note 1');
  });

  it('4. deletes link between note and bookmark', async () => {
    await repo.create({
      workspaceId: ws1,
      noteId: 'note-1',
      bookmarkId: 'bm-1',
    });

    const deleted = await repo.delete(ws1, 'note-1', 'bm-1');
    expect(deleted).toBe(true);

    const remaining = await repo.getByNote(ws1, 'note-1');
    expect(remaining.length).toBe(0);
  });
});
