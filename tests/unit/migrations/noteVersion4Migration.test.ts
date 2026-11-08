import { describe, it, expect } from 'vitest';
import Dexie from 'dexie';
import { NookSpaceDB } from '../../../src/services/database/db';

describe('Database Schema & Migration (Version 3 -> Version 4)', () => {
  let dbNameCounter = 0;
  const getNextDbName = () => `test-migration-v4-${Date.now()}-${++dbNameCounter}`;

  // Helper test DB classes
  class TestDBV3 extends Dexie {
    constructor(name: string) {
      super(name);
      this.version(1).stores({
        workspaces: 'id, isDefault, order',
        bookmarkGroups: 'id, workspaceId, order',
        bookmarks: 'id, groupId, isFavorite, order',
        todos: 'id, workspaceId, title',
        notes: 'id, workspaceId, isPinned, *tags, updatedAt',
      });
      this.version(2).stores({
        widgetLayouts: 'id, [workspaceId+breakpoint], workspaceId',
      });
      this.version(3).stores({
        bookmarks: 'id, workspaceId, groupId, isFavorite, order',
        bookmarkGroups: 'id, workspaceId, order',
      });
    }
  }

  class TestDBV4 extends Dexie {
    constructor(name: string) {
      super(name);
      this.version(1).stores({
        workspaces: 'id, isDefault, order',
        bookmarkGroups: 'id, workspaceId, order',
        bookmarks: 'id, groupId, isFavorite, order',
        todos: 'id, workspaceId, title',
        notes: 'id, workspaceId, isPinned, *tags, updatedAt',
      });
      this.version(2).stores({
        widgetLayouts: 'id, [workspaceId+breakpoint], workspaceId',
      });
      this.version(3).stores({
        bookmarks: 'id, workspaceId, groupId, isFavorite, order',
        bookmarkGroups: 'id, workspaceId, order',
      });
      this.version(4)
        .stores({
          notes: 'id, workspaceId, collectionId, isPinned, isFavorite, isArchived, *tags, order, updatedAt',
          noteCollections: 'id, workspaceId, order',
          noteTags: 'id, workspaceId, name',
          noteBookmarkLinks: 'id, workspaceId, noteId, bookmarkId, [noteId+bookmarkId]',
        })
        .upgrade(async (tx) => {
          const notesTable = tx.table('notes');
          const count = await notesTable.count();
          if (count > 0) {
            let targetWorkspaceId = 'ws-default-personal';
            const workspacesTable = tx.table('workspaces');
            const defaultWs =
              (await workspacesTable.where('isDefault').equals(1 as any).first()) ||
              (await workspacesTable.where('isDefault').equals(true as any).first()) ||
              (await workspacesTable.orderBy('order').first());

            if (defaultWs && defaultWs.id) {
              targetWorkspaceId = defaultWs.id;
            }

            const allNotes = await notesTable.toArray();
            for (const note of allNotes) {
              const updates: Record<string, unknown> = {};
              if (!note.workspaceId || typeof note.workspaceId !== 'string' || note.workspaceId.trim() === '') {
                updates.workspaceId = targetWorkspaceId;
              }
              if (note.collectionId === undefined) {
                updates.collectionId = null;
              }
              if (note.isPinned === undefined) {
                updates.isPinned = false;
              }
              if (note.isFavorite === undefined) {
                updates.isFavorite = false;
              }
              if (note.isArchived === undefined) {
                updates.isArchived = false;
              }
              if (!Array.isArray(note.tags)) {
                updates.tags = [];
              }
              if (typeof note.order !== 'number') {
                updates.order = 0;
              }
              if (note.excerpt === undefined) {
                const content = note.content || '';
                const plain = content.replace(/[#*`_~>[\]!]/g, ' ').replace(/\s+/g, ' ').trim();
                updates.excerpt = plain.slice(0, 300);
              }

              if (Object.keys(updates).length > 0) {
                await notesTable.update(note.id, updates);
              }
            }
          }
        });
    }
  }

  it('1. upgrades an empty notes table to v4 without error', async () => {
    const dbName = getNextDbName();
    const v3 = new TestDBV3(dbName);
    await v3.open();
    v3.close();

    const v4 = new TestDBV4(dbName);
    await v4.open();
    expect(v4.verno).toBe(4);
    const count = await v4.table('notes').count();
    expect(count).toBe(0);
    expect(await v4.table('noteCollections').count()).toBe(0);
    expect(await v4.table('noteTags').count()).toBe(0);
    expect(await v4.table('noteBookmarkLinks').count()).toBe(0);
    v4.close();
  });

  it('2. backfills legacy notes missing workspaceId and new metadata fields', async () => {
    const dbName = getNextDbName();
    const v3 = new TestDBV3(dbName);
    await v3.open();

    await v3.table('workspaces').add({ id: 'ws-custom-default', isDefault: 1, order: 0 });
    await v3.table('notes').add({
      id: 'legacy-note-1',
      title: 'Legacy Note Without Workspace',
      content: '# Heading\nThis is **bold** text and `inline code`.',
      updatedAt: 1000,
    });
    await v3.table('notes').add({
      id: 'legacy-note-2',
      workspaceId: 'ws-explicit',
      title: 'Explicit Note',
      content: 'Already has workspace',
      isPinned: true,
      tags: ['test'],
      updatedAt: 2000,
    });
    v3.close();

    const v4 = new TestDBV4(dbName);
    await v4.open();
    expect(v4.verno).toBe(4);

    const note1 = await v4.table('notes').get('legacy-note-1');
    expect(note1).toBeDefined();
    expect(note1.workspaceId).toBe('ws-custom-default');
    expect(note1.collectionId).toBeNull();
    expect(note1.isPinned).toBe(false);
    expect(note1.isFavorite).toBe(false);
    expect(note1.isArchived).toBe(false);
    expect(note1.tags).toEqual([]);
    expect(note1.order).toBe(0);
    expect(note1.excerpt).toBe('Heading This is bold text and inline code .');

    const note2 = await v4.table('notes').get('legacy-note-2');
    expect(note2.workspaceId).toBe('ws-explicit');
    expect(note2.isPinned).toBe(true);
    expect(note2.tags).toEqual(['test']);
    v4.close();
  });

  it('3. verifies production NookSpaceDB instance initializes schema v4 correctly', async () => {
    const dbName = getNextDbName();
    const db = new NookSpaceDB(dbName);
    await db.open();

    expect(db.verno).toBe(4);
    expect(db.notes).toBeDefined();
    expect(db.noteCollections).toBeDefined();
    expect(db.noteTags).toBeDefined();
    expect(db.noteBookmarkLinks).toBeDefined();

    // Verify inserting and reading from new tables
    await db.noteCollections.add({
      id: 'col-1',
      workspaceId: 'ws-default-personal',
      title: 'Ideas',
      order: 0,
      createdAt: 1000,
      updatedAt: 1000,
    });
    const col = await db.noteCollections.get('col-1');
    expect(col?.title).toBe('Ideas');

    await db.noteTags.add({
      id: 'tag-1',
      workspaceId: 'ws-default-personal',
      name: 'productivity',
      createdAt: 1000,
      updatedAt: 1000,
    });
    const tag = await db.noteTags.get('tag-1');
    expect(tag?.name).toBe('productivity');

    await db.noteBookmarkLinks.add({
      id: 'link-1',
      workspaceId: 'ws-default-personal',
      noteId: 'note-1',
      bookmarkId: 'bm-1',
      createdAt: 1000,
    });
    const link = await db.noteBookmarkLinks.get('link-1');
    expect(link?.bookmarkId).toBe('bm-1');

    db.close();
  });
});
