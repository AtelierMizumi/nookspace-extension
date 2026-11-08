import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import 'fake-indexeddb/auto';
import { NookSpaceDB } from '../../../src/services/database/db';
import { WorkspaceRepository } from '../../../src/services/database/repositories/workspaceRepository';

describe('Cross-Workspace Data Integrity & Relational Isolation Audit — Milestone 9.6', () => {
  let db: NookSpaceDB;
  let workspaceRepo: WorkspaceRepository;
  let dbCounter = 0;
  const getNextDbName = () => `test-ws-audit-${Date.now()}-${++dbCounter}`;

  beforeEach(async () => {
    const dbName = getNextDbName();
    db = new NookSpaceDB(dbName);
    await db.open();
    workspaceRepo = new WorkspaceRepository(db);
  });

  afterEach(async () => {
    await db.delete();
  });

  it('1. guarantees strict data isolation across 3 workspaces with overlapping entity names', async () => {
    const now = Date.now();

    // Create 3 workspaces
    await db.workspaces.bulkPut([
      { id: 'ws-alpha', name: 'Alpha Workspace', icon: 'Folder', color: '#6366f1', isDefault: true, order: 0, createdAt: now, updatedAt: now },
      { id: 'ws-beta', name: 'Beta Workspace', icon: 'Code', color: '#10b981', isDefault: false, order: 1, createdAt: now, updatedAt: now },
      { id: 'ws-gamma', name: 'Gamma Workspace', icon: 'Briefcase', color: '#f59e0b', isDefault: false, order: 2, createdAt: now, updatedAt: now },
    ]);

    // Seed identically-named todos in all 3 workspaces
    await db.todos.bulkPut([
      { id: 'todo-a', workspaceId: 'ws-alpha', title: 'Review Sprint Backlog', completed: false, priority: 'high', order: 0, createdAt: now, updatedAt: now },
      { id: 'todo-b', workspaceId: 'ws-beta', title: 'Review Sprint Backlog', completed: true, priority: 'low', order: 0, createdAt: now, updatedAt: now },
      { id: 'todo-c', workspaceId: 'ws-gamma', title: 'Review Sprint Backlog', completed: false, priority: 'medium', order: 0, createdAt: now, updatedAt: now },
    ]);

    // Seed bookmarks across workspaces
    await db.bookmarks.bulkPut([
      { id: 'bm-a', workspaceId: 'ws-alpha', groupId: null, title: 'Docs', url: 'https://docs.alpha.com', isFavorite: true, order: 0, createdAt: now, updatedAt: now },
      { id: 'bm-b', workspaceId: 'ws-beta', groupId: null, title: 'Docs', url: 'https://docs.beta.com', isFavorite: false, order: 0, createdAt: now, updatedAt: now },
    ]);

    // Seed notes across workspaces
    await db.notes.bulkPut([
      { id: 'note-a', workspaceId: 'ws-alpha', collectionId: null, title: 'Notes', content: 'Alpha specific note', excerpt: 'Alpha specific', isPinned: false, isFavorite: false, isArchived: false, tags: [], order: 0, createdAt: now, updatedAt: now },
      { id: 'note-b', workspaceId: 'ws-beta', collectionId: null, title: 'Notes', content: 'Beta specific note', excerpt: 'Beta specific', isPinned: false, isFavorite: false, isArchived: false, tags: [], order: 0, createdAt: now, updatedAt: now },
    ]);

    // Query Alpha todos
    const alphaTodos = await db.todos.where('workspaceId').equals('ws-alpha').toArray();
    expect(alphaTodos).toHaveLength(1);
    expect(alphaTodos[0]?.completed).toBe(false);
    expect(alphaTodos[0]?.priority).toBe('high');

    // Query Beta todos
    const betaTodos = await db.todos.where('workspaceId').equals('ws-beta').toArray();
    expect(betaTodos).toHaveLength(1);
    expect(betaTodos[0]?.completed).toBe(true);
    expect(betaTodos[0]?.priority).toBe('low');

    // Mutating Alpha note does NOT affect Beta note
    await db.notes.update('note-a', { content: 'Updated Alpha content' });
    const noteB = await db.notes.get('note-b');
    expect(noteB?.content).toBe('Beta specific note');
  });

  it('2. cascade deletion of one workspace completely prunes its data without touching others', async () => {
    const now = Date.now();

    await db.workspaces.bulkPut([
      { id: 'ws-victim', name: 'Victim Workspace', icon: 'Trash', color: '#ef4444', isDefault: false, order: 0, createdAt: now, updatedAt: now },
      { id: 'ws-survivor', name: 'Survivor Workspace', icon: 'Shield', color: '#10b981', isDefault: true, order: 1, createdAt: now, updatedAt: now },
    ]);

    // Put records in victim workspace
    await db.notes.put({ id: 'note-v', workspaceId: 'ws-victim', collectionId: null, title: 'Victim Note', content: 'content', excerpt: 'content', isPinned: false, isFavorite: false, isArchived: false, tags: [], order: 0, createdAt: now, updatedAt: now });
    await db.bookmarks.put({ id: 'bm-v', workspaceId: 'ws-victim', groupId: null, title: 'Victim Bookmark', url: 'https://victim.com', isFavorite: false, order: 0, createdAt: now, updatedAt: now });
    await db.todos.put({ id: 'todo-v', workspaceId: 'ws-victim', title: 'Victim Todo', completed: false, priority: 'low', order: 0, createdAt: now, updatedAt: now });

    // Put records in survivor workspace
    await db.notes.put({ id: 'note-s', workspaceId: 'ws-survivor', collectionId: null, title: 'Survivor Note', content: 'safe content', excerpt: 'safe', isPinned: false, isFavorite: false, isArchived: false, tags: [], order: 0, createdAt: now, updatedAt: now });
    await db.bookmarks.put({ id: 'bm-s', workspaceId: 'ws-survivor', groupId: null, title: 'Survivor Bookmark', url: 'https://survivor.com', isFavorite: true, order: 0, createdAt: now, updatedAt: now });

    // Execute cascade deletion of ws-victim
    await workspaceRepo.delete('ws-victim');

    // Verify victim workspace and its records are deleted
    expect(await db.workspaces.get('ws-victim')).toBeUndefined();
    expect(await db.notes.get('note-v')).toBeUndefined();
    expect(await db.bookmarks.get('bm-v')).toBeUndefined();
    expect(await db.todos.get('todo-v')).toBeUndefined();

    // Verify survivor workspace and all its records remain 100% intact!
    expect(await db.workspaces.get('ws-survivor')).toBeDefined();
    expect(await db.notes.get('note-s')).toBeDefined();
    expect((await db.notes.get('note-s'))?.content).toBe('safe content');
    expect(await db.bookmarks.get('bm-s')).toBeDefined();
  });
});
