import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NookSpaceDB } from '../../../src/services/database/db';
import {
  NoteCollectionRepository,
  NoteCollectionNotFoundError,
} from '../../../src/features/notes/repositories/noteCollectionRepository';

describe('NoteCollectionRepository Suite', () => {
  let db: NookSpaceDB;
  let repo: NoteCollectionRepository;
  const ws1 = 'ws-test-1';
  const ws2 = 'ws-test-2';

  beforeEach(async () => {
    db = new NookSpaceDB(`test-note-col-repo-${Date.now()}-${Math.random()}`);
    await db.open();
    repo = new NoteCollectionRepository(db);
  });

  afterEach(async () => {
    await db.delete();
  });

  it('1. creates note collections with auto-incrementing sequential order', async () => {
    const col1 = await repo.create({
      workspaceId: ws1,
      title: 'First Collection',
    });
    expect(col1.id).toBeDefined();
    expect(col1.order).toBe(0);

    const col2 = await repo.create({
      workspaceId: ws1,
      title: 'Second Collection',
    });
    expect(col2.order).toBe(1);

    // In different workspace, order starts at 0
    const colWs2 = await repo.create({
      workspaceId: ws2,
      title: 'WS2 Collection',
    });
    expect(colWs2.order).toBe(0);
  });

  it('2. retrieves by ID strictly enforcing workspace isolation', async () => {
    const col = await repo.create({
      workspaceId: ws1,
      title: 'Isolated Collection',
    });

    const found = await repo.getById(col.id, ws1);
    expect(found).toBeDefined();
    expect(found?.title).toBe('Isolated Collection');

    const wrongWs = await repo.getById(col.id, ws2);
    expect(wrongWs).toBeUndefined();

    const notFound = await repo.getById('non-existent', ws1);
    expect(notFound).toBeUndefined();
  });

  it('3. retrieves all collections sorted deterministically by order ascending', async () => {
    await repo.create({ workspaceId: ws1, title: 'B', order: 2 });
    await repo.create({ workspaceId: ws1, title: 'A', order: 0 });
    await repo.create({ workspaceId: ws1, title: 'C', order: 1 });
    await repo.create({ workspaceId: ws2, title: 'Other WS', order: 0 });

    const list = await repo.getByWorkspace(ws1);
    expect(list.length).toBe(3);
    expect(list.map((c) => c.title)).toEqual(['A', 'C', 'B']);
  });

  it('4. updates collection and protects immutable fields', async () => {
    const col = await repo.create({
      workspaceId: ws1,
      title: 'Original Title',
      icon: 'folder',
    });

    const updated = await repo.update(col.id, ws1, {
      title: 'Updated Title',
      color: '#3b82f6',
    });

    expect(updated.title).toBe('Updated Title');
    expect(updated.color).toBe('#3b82f6');
    expect(updated.icon).toBe('folder');
    expect(updated.workspaceId).toBe(ws1);

    await expect(repo.update('non-existent', ws1, { title: 'X' })).rejects.toThrow(
      NoteCollectionNotFoundError
    );
  });

  it('5. deletes collection in reassign mode (default) by setting note collectionId to null', async () => {
    const col = await repo.create({ workspaceId: ws1, title: 'To Delete' });

    // Seed notes
    await db.notes.add({
      id: 'note-1',
      workspaceId: ws1,
      collectionId: col.id,
      title: 'Note In Col',
      content: '',
      excerpt: '',
      isPinned: false,
      isFavorite: false,
      isArchived: false,
      tags: [],
      order: 0,
      createdAt: 1000,
      updatedAt: 1000,
    });

    const result = await repo.delete(col.id, ws1, { mode: 'reassign' });
    expect(result.deleted).toBe(true);
    expect(result.mode).toBe('reassign');
    expect(result.affectedNotesCount).toBe(1);

    // Collection is removed
    expect(await repo.getById(col.id, ws1)).toBeUndefined();

    // Note preserved with collectionId: null
    const note = await db.notes.get('note-1');
    expect(note).toBeDefined();
    expect(note?.collectionId).toBeNull();
  });

  it('6. deletes collection in cascade mode by deleting notes and their junction links', async () => {
    const col = await repo.create({ workspaceId: ws1, title: 'Cascade Delete' });

    await db.notes.add({
      id: 'note-cascade',
      workspaceId: ws1,
      collectionId: col.id,
      title: 'Note to be deleted',
      content: '',
      excerpt: '',
      isPinned: false,
      isFavorite: false,
      isArchived: false,
      tags: [],
      order: 0,
      createdAt: 1000,
      updatedAt: 1000,
    });

    await db.noteBookmarkLinks.add({
      id: 'link-1',
      workspaceId: ws1,
      noteId: 'note-cascade',
      bookmarkId: 'bm-1',
      createdAt: 1000,
    });

    const result = await repo.delete(col.id, ws1, { mode: 'cascade' });
    expect(result.deleted).toBe(true);
    expect(result.mode).toBe('cascade');
    expect(result.affectedNotesCount).toBe(1);

    // Note and link are gone
    expect(await db.notes.get('note-cascade')).toBeUndefined();
    expect(await db.noteBookmarkLinks.get('link-1')).toBeUndefined();
  });

  it('7. reorders collections sequentially and validates workspace isolation', async () => {
    const c1 = await repo.create({ workspaceId: ws1, title: 'C1' });
    const c2 = await repo.create({ workspaceId: ws1, title: 'C2' });
    const c3 = await repo.create({ workspaceId: ws1, title: 'C3' });

    await repo.reorder([c3.id, c1.id, c2.id], ws1);

    const reordered = await repo.getByWorkspace(ws1);
    expect(reordered.map((c) => c.id)).toEqual([c3.id, c1.id, c2.id]);
    expect(reordered.map((c) => c.order)).toEqual([0, 1, 2]);

    // Error on duplicates
    await expect(repo.reorder([c1.id, c1.id], ws1)).rejects.toThrow(/Duplicate/);

    // Error on foreign workspace
    await expect(repo.reorder([c1.id], ws2)).rejects.toThrow();
  });
});
