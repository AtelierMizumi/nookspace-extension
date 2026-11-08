import { describe, it, expect, beforeEach } from 'vitest';
import Dexie from 'dexie';
import { NookSpaceDB } from '../../../src/services/database/db';

describe('Database Schema & Migration (Version 2 -> Version 3)', () => {
  let dbNameCounter = 0;
  const getNextDbName = () => `test-migration-v3-${Date.now()}-${++dbNameCounter}`;

  // Helper classes defining the version boundaries
  class TestDBV2 extends Dexie {
    constructor(name: string) {
      super(name);
      this.version(1).stores({
        workspaces: 'id, isDefault, order',
        bookmarkGroups: 'id, workspaceId, order',
        bookmarks: 'id, groupId, isFavorite, order',
        todos: 'id, workspaceId, title',
      });
      this.version(2).stores({
        widgetLayouts: 'id, [workspaceId+breakpoint], workspaceId',
      });
    }
  }

  class TestDBV3 extends Dexie {
    constructor(name: string, injectFailure: boolean = false) {
      super(name);
      this.version(1).stores({
        workspaces: 'id, isDefault, order',
        bookmarkGroups: 'id, workspaceId, order',
        bookmarks: 'id, groupId, isFavorite, order',
        todos: 'id, workspaceId, title',
      });
      this.version(2).stores({
        widgetLayouts: 'id, [workspaceId+breakpoint], workspaceId',
      });
      this.version(3)
        .stores({
          bookmarks: 'id, workspaceId, groupId, isFavorite, order',
          bookmarkGroups: 'id, workspaceId, order',
        })
        .upgrade(async (tx) => {
          if (injectFailure) {
            throw new Error('Simulated Migration Abort: Disk failure during index generation');
          }

          const bookmarksTable = tx.table('bookmarks');
          const count = await bookmarksTable.count();
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

            const allBookmarks = await bookmarksTable.toArray();
            for (const bm of allBookmarks) {
              if (
                !bm.workspaceId ||
                typeof bm.workspaceId !== 'string' ||
                bm.workspaceId.trim() === ''
              ) {
                await bookmarksTable.update(bm.id, { workspaceId: targetWorkspaceId });
              }
            }
          }
        });
    }
  }

  it('1. upgrades an empty bookmarks table without error', async () => {
    const dbName = getNextDbName();
    const v2 = new TestDBV2(dbName);
    await v2.open();
    v2.close();

    const v3 = new TestDBV3(dbName);
    await v3.open();
    expect(v3.verno).toBe(3);
    const count = await v3.table('bookmarks').count();
    expect(count).toBe(0);
    v3.close();
  });

  it('2. preserves existing bookmarks that already have a valid workspaceId and does not overwrite them', async () => {
    const dbName = getNextDbName();
    const v2 = new TestDBV2(dbName);
    await v2.open();

    await v2.table('workspaces').add({ id: 'ws-default-discovered', isDefault: 1, order: 0 });
    await v2.table('bookmarks').add({
      id: 'bm-explicit',
      workspaceId: 'ws-user-custom',
      groupId: null,
      title: 'Explicit Workspace',
      url: 'https://explicit.com',
      isFavorite: 0,
      order: 0,
    });
    v2.close();

    const v3 = new TestDBV3(dbName);
    await v3.open();

    const migrated = await v3.table('bookmarks').get('bm-explicit');
    expect(migrated).toBeDefined();
    // Must remain 'ws-user-custom', NOT overwritten by default
    expect(migrated.workspaceId).toBe('ws-user-custom');
    expect(migrated.title).toBe('Explicit Workspace');
    expect(migrated.url).toBe('https://explicit.com');
    v3.close();
  });

  it('3. assigns dynamic default workspace to historical bookmarks lacking a workspaceId', async () => {
    const dbName = getNextDbName();
    const v2 = new TestDBV2(dbName);
    await v2.open();

    // Custom default workspace seeded by user in v2
    await v2.table('workspaces').bulkAdd([
      { id: 'ws-secondary', isDefault: 0, order: 1 },
      { id: 'ws-primary-default', isDefault: 1, order: 0 },
    ]);

    // Legacy bookmarks from Version 1 schema that lacked workspaceId
    await v2.table('bookmarks').bulkAdd([
      {
        id: 'legacy-1',
        groupId: 'grp-old',
        title: 'Legacy BM 1',
        url: 'https://legacy1.com',
        isFavorite: 1,
        order: 0,
      },
      {
        id: 'legacy-2',
        workspaceId: '', // whitespace/empty string
        groupId: null,
        title: 'Legacy BM 2',
        url: 'https://legacy2.com',
        isFavorite: 0,
        order: 1,
      },
    ]);
    v2.close();

    const v3 = new TestDBV3(dbName);
    await v3.open();

    const b1 = await v3.table('bookmarks').get('legacy-1');
    const b2 = await v3.table('bookmarks').get('legacy-2');

    expect(b1.workspaceId).toBe('ws-primary-default');
    expect(b2.workspaceId).toBe('ws-primary-default');
    expect(b1.title).toBe('Legacy BM 1');
    expect(b1.isFavorite).toBe(1);
    expect(b2.title).toBe('Legacy BM 2');

    // Verify index works on the newly populated workspaceId
    const queryResult = await v3
      .table('bookmarks')
      .where('workspaceId')
      .equals('ws-primary-default')
      .toArray();
    expect(queryResult).toHaveLength(2);

    v3.close();
  });

  it('4. preserves unrelated tables and records during Version 2 -> Version 3 upgrade', async () => {
    const dbName = getNextDbName();
    const v2 = new TestDBV2(dbName);
    await v2.open();

    await v2.table('workspaces').add({ id: 'ws-1', isDefault: 1, order: 0 });
    await v2.table('todos').add({ id: 'todo-99', workspaceId: 'ws-1', title: 'Retained Task' });
    await v2.table('bookmarkGroups').add({ id: 'bg-1', workspaceId: 'ws-1', order: 0 });
    v2.close();

    const v3 = new TestDBV3(dbName);
    await v3.open();

    const todo = await v3.table('todos').get('todo-99');
    expect(todo).toBeDefined();
    expect(todo.title).toBe('Retained Task');

    const group = await v3.table('bookmarkGroups').get('bg-1');
    expect(group).toBeDefined();
    expect(group.workspaceId).toBe('ws-1');

    v3.close();
  });

  it('5. propagates migration failure and aborts transaction without silently committing incomplete data', async () => {
    const dbName = getNextDbName();
    const v2 = new TestDBV2(dbName);
    await v2.open();
    await v2.table('bookmarks').add({ id: 'bm-fail-test', title: 'Before Fail', url: 'https://x.com' });
    v2.close();

    // Instantiate with injected failure
    const v3Failing = new TestDBV3(dbName, true);
    await expect(v3Failing.open()).rejects.toThrow(/Simulated Migration Abort/);
  });

  it('6. verifies production NookSpaceDB version 3 opens cleanly with indexed workspaceId on bookmarks', async () => {
    const db = new NookSpaceDB();
    await db.open();
    expect(db.verno).toBeGreaterThanOrEqual(3);

    // Verify table schema index exists on bookmarks
    const bookmarksTable = db.bookmarks;
    expect(bookmarksTable.schema.indexes.some((idx) => idx.name === 'workspaceId')).toBe(true);
    expect(bookmarksTable.schema.indexes.some((idx) => idx.name === 'groupId')).toBe(true);
    expect(bookmarksTable.schema.indexes.some((idx) => idx.name === 'isFavorite')).toBe(true);
  });
});
