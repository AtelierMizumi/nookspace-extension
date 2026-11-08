import { describe, it, expect } from 'vitest';
import Dexie from 'dexie';
import { NookSpaceDB } from '../../../src/services/database/db';

describe('Historical Schema Upgrade Integration Suite — Milestone 9.5', () => {
  let dbCounter = 0;
  const getNextDbName = () => `test-hist-upgrade-${Date.now()}-${++dbCounter}`;

  // Helper classes defining schema historical versions
  class HistoricalDBV1 extends Dexie {
    constructor(name: string) {
      super(name);
      this.version(1).stores({
        workspaces: 'id, isDefault, order',
        layouts: 'id, workspaceId, isDefault',
        widgetInstances: 'id, workspaceId, widgetType, isEnabled, order',
        todos: 'id, workspaceId, completed, priority, dueDate, category, order',
        notes: 'id, workspaceId, isPinned, *tags, updatedAt',
        bookmarkGroups: 'id, workspaceId, order',
        bookmarks: 'id, groupId, isFavorite, order',
      });
    }
  }

  it('1. upgrades from Schema v1 to current Schema v4 with 100% data preservation', async () => {
    const dbName = getNextDbName();

    // 1. Initialize v1 database and seed legacy v1 records
    const v1 = new HistoricalDBV1(dbName);
    await v1.open();

    await v1.table('workspaces').put({
      id: 'ws-legacy',
      name: 'Legacy Space',
      icon: 'Folder',
      color: '#6366f1',
      isDefault: 1,
      order: 0,
      createdAt: 1000,
      updatedAt: 1000,
    });

    await v1.table('layouts').put({
      id: 'layout-v1-old',
      workspaceId: 'ws-legacy',
      isDefault: 1,
      items: [
        {
          widgetInstanceId: 'widget-clock-1',
          x: 0,
          y: 0,
          w: 4,
          h: 2,
        },
        {
          widgetInstanceId: 'widget-todo-1',
          x: 4,
          y: 0,
          w: 4,
          h: 4,
        },
      ],
      createdAt: 1000,
      updatedAt: 1000,
    });

    await v1.table('bookmarks').put({
      id: 'bm-v1',
      groupId: 'grp-1',
      title: 'GitHub',
      url: 'https://github.com',
      isFavorite: 1,
      order: 0,
      // NOTE: workspaceId is completely absent in v1
    });

    await v1.table('notes').put({
      id: 'note-v1',
      workspaceId: 'ws-legacy',
      title: 'Initial Note',
      content: '# Note Heading\nParagraph with **markdown** formatting.',
      isPinned: 1,
      tags: ['history', 'tech'],
      updatedAt: 1000,
      // NOTE: collectionId, excerpt, isFavorite, isArchived absent in v1
    });

    v1.close();

    // 2. Open with current production NookSpaceDB (Schema v4)
    const upgradedDb = new NookSpaceDB(dbName);
    await upgradedDb.open();

    expect(upgradedDb.verno).toBe(4);

    // Verify v1 -> v2 layout conversion
    const widgetLayouts = await upgradedDb.widgetLayouts.toArray();
    expect(widgetLayouts.length).toBe(2);
    expect(widgetLayouts.some((wl) => wl.widgetInstanceId === 'widget-clock-1')).toBe(true);
    expect(widgetLayouts.some((wl) => wl.widgetInstanceId === 'widget-todo-1')).toBe(true);
    expect(widgetLayouts[0]?.breakpoint).toBe('lg');

    // Verify v2 -> v3 bookmark workspaceId population
    const bm = await upgradedDb.bookmarks.get('bm-v1');
    expect(bm).toBeDefined();
    expect(bm?.workspaceId).toBe('ws-legacy');
    expect(bm?.title).toBe('GitHub');
    expect(bm?.url).toBe('https://github.com');

    // Verify v3 -> v4 notes schema enrichment
    const note = await upgradedDb.notes.get('note-v1');
    expect(note).toBeDefined();
    expect(note?.collectionId).toBeNull();
    expect(note?.isFavorite).toBe(false);
    expect(note?.isArchived).toBe(false);
    expect(note?.tags).toEqual(['history', 'tech']);
    expect(note?.content).toBe('# Note Heading\nParagraph with **markdown** formatting.');
    expect(note?.excerpt).toContain('Note Heading');

    upgradedDb.close();
  });

  it('2. upgrades from Schema v2 to Schema v4 smoothly', async () => {
    const dbName = getNextDbName();

    class HistoricalDBV2 extends Dexie {
      constructor(name: string) {
        super(name);
        this.version(1).stores({
          workspaces: 'id, isDefault, order',
          layouts: 'id, workspaceId, isDefault',
          bookmarks: 'id, groupId, isFavorite, order',
          notes: 'id, workspaceId, isPinned, *tags, updatedAt',
        });
        this.version(2).stores({
          widgetLayouts: 'id, [workspaceId+breakpoint], workspaceId, widgetInstanceId, breakpoint',
        });
      }
    }

    const v2 = new HistoricalDBV2(dbName);
    await v2.open();

    await v2.table('workspaces').put({
      id: 'ws-dev',
      name: 'Dev Space',
      icon: 'Code',
      color: '#8b5cf6',
      isDefault: true,
      order: 0,
    });

    await v2.table('bookmarks').put({
      id: 'bm-v2',
      groupId: null,
      title: 'Rust Lang',
      url: 'https://rust-lang.org',
      isFavorite: false,
      order: 0,
    });

    await v2.table('notes').put({
      id: 'note-v2',
      workspaceId: 'ws-dev',
      title: 'Dev Note',
      content: 'Dev note content',
      isPinned: false,
      tags: [],
      updatedAt: 2000,
    });

    v2.close();

    const currentDb = new NookSpaceDB(dbName);
    await currentDb.open();

    expect(currentDb.verno).toBe(4);

    const bm = await currentDb.bookmarks.get('bm-v2');
    expect(bm?.workspaceId).toBe('ws-dev');

    const note = await currentDb.notes.get('note-v2');
    expect(note?.collectionId).toBeNull();
    expect(note?.isArchived).toBe(false);

    currentDb.close();
  });
});
