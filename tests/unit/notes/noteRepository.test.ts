import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NookSpaceDB } from '../../../src/services/database/db';
import {
  NoteRepository,
  NoteNotFoundError,
} from '../../../src/features/notes/repositories/noteRepository';
import { NoteCollectionNotFoundError } from '../../../src/features/notes/repositories/noteCollectionRepository';

describe('NoteRepository Suite', () => {
  let db: NookSpaceDB;
  let repo: NoteRepository;
  const ws1 = 'ws-test-1';
  const ws2 = 'ws-test-2';

  beforeEach(async () => {
    db = new NookSpaceDB(`test-note-repo-${Date.now()}-${Math.random()}`);
    await db.open();
    repo = new NoteRepository(db);

    // Seed a collection in ws1
    await db.noteCollections.add({
      id: 'col-1',
      workspaceId: ws1,
      title: 'Projects',
      order: 0,
      createdAt: 1000,
      updatedAt: 1000,
    });
  });

  afterEach(async () => {
    await db.delete();
  });

  it('1. creates note with auto sequential order and generated plain-text excerpt', async () => {
    const note1 = await repo.create({
      workspaceId: ws1,
      title: 'First Note',
      content: '# Heading\nThis is a **great** note.',
    });

    expect(note1.id).toBeDefined();
    expect(note1.order).toBe(0);
    expect(note1.collectionId).toBeNull();
    expect(note1.excerpt).toBe('Heading This is a great note.');
    expect(note1.isPinned).toBe(false);

    const note2 = await repo.create({
      workspaceId: ws1,
      title: 'Second Note',
      content: 'Second note content',
    });
    expect(note2.order).toBe(1);
  });

  it('2. creates note in a specific collection and verifies collection workspace matching', async () => {
    const note = await repo.create({
      workspaceId: ws1,
      collectionId: 'col-1',
      title: 'Collection Note',
      tags: ['Idea', 'PROJECTS'],
    });

    expect(note.collectionId).toBe('col-1');
    expect(note.tags).toEqual(['idea', 'projects']);

    // Attempting to use col-1 with ws2 throws
    await expect(
      repo.create({
        workspaceId: ws2,
        collectionId: 'col-1',
        title: 'Cross Workspace Note',
      })
    ).rejects.toThrow(NoteCollectionNotFoundError);
  });

  it('3. retrieves by ID strictly enforcing workspace isolation', async () => {
    const note = await repo.create({
      workspaceId: ws1,
      title: 'Secret Note',
    });

    const found = await repo.getById(note.id, ws1);
    expect(found?.title).toBe('Secret Note');

    const wrongWs = await repo.getById(note.id, ws2);
    expect(wrongWs).toBeUndefined();
  });

  it('4. retrieves notes sorted by pinned first, then order, then updatedAt descending', async () => {
    const n1 = await repo.create({ workspaceId: ws1, title: 'Normal 1', order: 0 });
    const n2 = await repo.create({ workspaceId: ws1, title: 'Normal 2', order: 1 });
    const n3 = await repo.create({ workspaceId: ws1, title: 'Pinned Note', isPinned: true, order: 5 });

    const notes = await repo.getByWorkspace(ws1);
    expect(notes.map((n) => n.id)).toEqual([n3.id, n1.id, n2.id]);
  });

  it('5. filters notes by collection, pinned, favorites, archive, and tags', async () => {
    const nCol = await repo.create({ workspaceId: ws1, collectionId: 'col-1', title: 'In Col' });
    const nUncat = await repo.create({ workspaceId: ws1, collectionId: null, title: 'Uncategorized' });
    const nPin = await repo.create({ workspaceId: ws1, title: 'Pinned', isPinned: true });
    const nFav = await repo.create({ workspaceId: ws1, title: 'Fav', isFavorite: true });
    const nArch = await repo.create({ workspaceId: ws1, title: 'Arch', isArchived: true });
    const nTag = await repo.create({ workspaceId: ws1, title: 'Tag Note', tags: ['important'] });

    expect((await repo.getByCollection(ws1, 'col-1')).map((n) => n.id)).toEqual([nCol.id]);
    expect((await repo.getByCollection(ws1, null)).map((n) => n.id)).toContain(nUncat.id);
    expect((await repo.getPinned(ws1)).map((n) => n.id)).toEqual([nPin.id]);
    expect((await repo.getFavorites(ws1)).map((n) => n.id)).toEqual([nFav.id]);
    expect((await repo.getArchived(ws1)).map((n) => n.id)).toEqual([nArch.id]);
    expect((await repo.getByTag(ws1, 'IMPORTANT')).map((n) => n.id)).toEqual([nTag.id]);
  });

  it('6. updates note and automatically regenerates excerpt when content changes', async () => {
    const note = await repo.create({
      workspaceId: ws1,
      title: 'Old Title',
      content: 'Original content',
    });

    const updated = await repo.update(note.id, ws1, {
      title: 'New Title',
      content: '# New Heading\nUpdated body',
    });

    expect(updated.title).toBe('New Title');
    expect(updated.excerpt).toBe('New Heading Updated body');

    await expect(repo.update('non-existent', ws1, { title: 'X' })).rejects.toThrow(
      NoteNotFoundError
    );
  });

  it('7. deletes note and cascade deletes its junction links', async () => {
    const note = await repo.create({
      workspaceId: ws1,
      title: 'To Delete',
    });

    await db.noteBookmarkLinks.add({
      id: 'link-1',
      workspaceId: ws1,
      noteId: note.id,
      bookmarkId: 'bm-1',
      createdAt: 1000,
    });

    const deleted = await repo.delete(note.id, ws1);
    expect(deleted).toBe(true);
    expect(await repo.getById(note.id, ws1)).toBeUndefined();
    expect(await db.noteBookmarkLinks.get('link-1')).toBeUndefined();
  });

  it('8. reorders notes sequentially within workspace', async () => {
    const n1 = await repo.create({ workspaceId: ws1, title: 'N1' });
    const n2 = await repo.create({ workspaceId: ws1, title: 'N2' });
    const n3 = await repo.create({ workspaceId: ws1, title: 'N3' });

    await repo.reorder([n3.id, n1.id, n2.id], ws1);

    const reordered = await repo.getByIds([n3.id, n1.id, n2.id], ws1);
    expect(reordered.map((n) => n.id)).toEqual([n3.id, n1.id, n2.id]);
    expect(reordered.map((n) => n.order)).toEqual([0, 1, 2]);
  });

  it('9. toggles pin, favorite, and archive states', async () => {
    const note = await repo.create({ workspaceId: ws1, title: 'Toggles' });
    expect(note.isPinned).toBe(false);

    const pinned = await repo.togglePin(note.id, ws1);
    expect(pinned.isPinned).toBe(true);

    const unpinned = await repo.togglePin(note.id, ws1);
    expect(unpinned.isPinned).toBe(false);

    const favorited = await repo.toggleFavorite(note.id, ws1);
    expect(favorited.isFavorite).toBe(true);

    const archived = await repo.toggleArchive(note.id, ws1);
    expect(archived.isArchived).toBe(true);
  });
});
