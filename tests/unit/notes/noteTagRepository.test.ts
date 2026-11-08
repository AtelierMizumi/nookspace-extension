import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NookSpaceDB } from '../../../src/services/database/db';
import {
  NoteTagRepository,
  NoteTagDuplicateError,
} from '../../../src/features/notes/repositories/noteTagRepository';

describe('NoteTagRepository Suite', () => {
  let db: NookSpaceDB;
  let repo: NoteTagRepository;
  const ws1 = 'ws-test-1';
  const ws2 = 'ws-test-2';

  beforeEach(async () => {
    db = new NookSpaceDB(`test-note-tag-repo-${Date.now()}-${Math.random()}`);
    await db.open();
    repo = new NoteTagRepository(db);
  });

  afterEach(async () => {
    await db.delete();
  });

  it('1. creates note tag with lowercase normalization and prevents duplicates within workspace', async () => {
    const tag = await repo.create({
      workspaceId: ws1,
      name: '  TypeScript  ',
      color: '#3b82f6',
    });

    expect(tag.name).toBe('typescript');
    expect(tag.color).toBe('#3b82f6');

    // Duplicate in same workspace throws
    await expect(
      repo.create({
        workspaceId: ws1,
        name: 'TYPESCRIPT',
      })
    ).rejects.toThrow(NoteTagDuplicateError);

    // Same tag name in different workspace succeeds
    const tagWs2 = await repo.create({
      workspaceId: ws2,
      name: 'typescript',
    });
    expect(tagWs2.workspaceId).toBe(ws2);
  });

  it('2. retrieves tag by ID strictly enforcing workspace isolation', async () => {
    const tag = await repo.create({
      workspaceId: ws1,
      name: 'javascript',
    });

    const found = await repo.getById(tag.id, ws1);
    expect(found?.name).toBe('javascript');

    const wrongWs = await repo.getById(tag.id, ws2);
    expect(wrongWs).toBeUndefined();
  });

  it('3. retrieves all tags for workspace sorted alphabetically', async () => {
    await repo.create({ workspaceId: ws1, name: 'zebra' });
    await repo.create({ workspaceId: ws1, name: 'alpha' });
    await repo.create({ workspaceId: ws1, name: 'beta' });
    await repo.create({ workspaceId: ws2, name: 'gamma' });

    const tags = await repo.getByWorkspace(ws1);
    expect(tags.map((t) => t.name)).toEqual(['alpha', 'beta', 'zebra']);
  });

  it('4. cascades tag rename to all notes in the workspace on update', async () => {
    const tag = await repo.create({
      workspaceId: ws1,
      name: 'react',
    });

    // Add note with tag 'react'
    await db.notes.add({
      id: 'note-1',
      workspaceId: ws1,
      collectionId: null,
      title: 'React Guide',
      content: '',
      excerpt: '',
      isPinned: false,
      isFavorite: false,
      isArchived: false,
      tags: ['react', 'frontend'],
      order: 0,
      createdAt: 1000,
      updatedAt: 1000,
    });

    // Rename tag
    await repo.update(tag.id, ws1, { name: 'reactjs' });

    const updatedNote = await db.notes.get('note-1');
    expect(updatedNote?.tags).toEqual(['reactjs', 'frontend']);
  });

  it('5. safely removes tag from notes when deleting a tag', async () => {
    const tag = await repo.create({
      workspaceId: ws1,
      name: 'deprecated',
    });

    await db.notes.add({
      id: 'note-2',
      workspaceId: ws1,
      collectionId: null,
      title: 'Old Note',
      content: '',
      excerpt: '',
      isPinned: false,
      isFavorite: false,
      isArchived: false,
      tags: ['deprecated', 'archived'],
      order: 0,
      createdAt: 1000,
      updatedAt: 1000,
    });

    const deleted = await repo.delete(tag.id, ws1);
    expect(deleted).toBe(true);

    const note = await db.notes.get('note-2');
    expect(note?.tags).toEqual(['archived']);
  });

  it('6. counts notes currently using the tag', async () => {
    const tag = await repo.create({ workspaceId: ws1, name: 'active' });

    await db.notes.add({
      id: 'n1',
      workspaceId: ws1,
      collectionId: null,
      title: 'N1',
      content: '',
      excerpt: '',
      isPinned: false,
      isFavorite: false,
      isArchived: false,
      tags: ['active'],
      order: 0,
      createdAt: 1000,
      updatedAt: 1000,
    });

    const count = await repo.getNoteCount(tag.id, ws1);
    expect(count).toBe(1);
  });
});
