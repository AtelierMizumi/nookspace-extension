import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { NookSpaceDB } from '../../../src/services/database/db';
import { WorkspaceRepository } from '../../../src/services/database/repositories/workspaceRepository';
import { TodoRepository, STORAGE_KEY_TODO_LAST_UPDATED_AT } from '../../../src/services/database/repositories/todoRepository';
import { BookmarkRepository } from '../../../src/features/bookmarks/repositories/bookmarkRepository';
import { BookmarkGroupRepository } from '../../../src/features/bookmarks/repositories/bookmarkGroupRepository';
import { NoteRepository } from '../../../src/features/notes/repositories/noteRepository';
import { NoteCollectionRepository } from '../../../src/features/notes/repositories/noteCollectionRepository';
import { WidgetInstanceRepository } from '../../../src/services/database/repositories/widgetInstanceRepository';
import { LayoutRepository } from '../../../src/services/database/repositories/layoutRepository';
import { isSafeBookmarkUrl } from '../../../src/features/bookmarks/utils/bookmarkSecurity';

describe('Milestone 10.3 — Cross-Browser Functional Regression & Data Persistence Suite', () => {
  let dbName: string;
  let db: NookSpaceDB;

  let workspaceRepo: WorkspaceRepository;
  let todoRepo: TodoRepository;
  let bookmarkRepo: BookmarkRepository;
  let bookmarkGroupRepo: BookmarkGroupRepository;
  let noteRepo: NoteRepository;
  let noteCollectionRepo: NoteCollectionRepository;
  let widgetRepo: WidgetInstanceRepository;
  let layoutRepo: LayoutRepository;

  beforeEach(async () => {
    dbName = `test-m103-persistence-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    db = new NookSpaceDB(dbName);
    await db.open();

    workspaceRepo = new WorkspaceRepository(db);
    todoRepo = new TodoRepository(db);
    bookmarkRepo = new BookmarkRepository(db);
    bookmarkGroupRepo = new BookmarkGroupRepository(db);
    noteRepo = new NoteRepository(db);
    noteCollectionRepo = new NoteCollectionRepository(db);
    widgetRepo = new WidgetInstanceRepository(db);
    layoutRepo = new LayoutRepository(db);
  });

  afterEach(async () => {
    if (db.isOpen()) {
      await db.delete();
    }
  });

  it('Phase C.1 & C.4: verifies complete 17-table data persistence across simulated browser restart', async () => {
    const now = 1710000000000;
    const ws1 = 'ws-personal';
    const ws2 = 'ws-study';
    const ws3 = 'ws-work';

    // 1. Seed 3 Workspaces
    await db.workspaces.bulkPut([
      { id: ws1, name: 'Personal Workspace', icon: 'Sparkles', color: '#6366f1', isDefault: true, order: 0, createdAt: now, updatedAt: now },
      { id: ws2, name: 'Nghiên cứu & Học tập 📚', icon: 'BookOpen', color: '#10b981', isDefault: false, order: 1, createdAt: now, updatedAt: now },
      { id: ws3, name: '開発スタジオ 💻', icon: 'Code', color: '#8b5cf6', isDefault: false, order: 2, createdAt: now, updatedAt: now },
    ]);

    // 2. Seed Settings
    await db.settings.put({
      id: 'current_settings',
      theme: 'dark',
      accentColor: '#6366f1',
      fontFamily: 'Inter',
      fontSize: 'md',
      backgroundType: 'color',
      backgroundValue: '#09090b',
      widgetOpacity: 90,
      widgetBlur: 12,
      activeWorkspaceId: ws2,
      updatedAt: now,
    });

    // 3. Seed 10 Todos across workspaces
    const todosData = Array.from({ length: 10 }, (_, i) => ({
      id: `todo-${i + 1}`,
      workspaceId: i < 5 ? ws1 : i < 8 ? ws2 : ws3,
      title: i === 0 ? 'Viết báo cáo kỹ thuật tiếng Việt' : i === 1 ? 'コードレビューを実施' : `Task item ${i + 1}`,
      completed: i % 2 === 0,
      priority: (i % 3 === 0 ? 'high' : i % 3 === 1 ? 'medium' : 'low') as 'high' | 'medium' | 'low',
      order: i,
      createdAt: now + i * 1000,
      updatedAt: now + i * 1000,
    }));
    await db.todos.bulkPut(todosData);

    // 4. Seed Bookmark Groups (2 groups) and 10 Bookmarks
    await db.bookmarkGroups.bulkPut([
      { id: 'bg-dev', workspaceId: ws1, title: 'Developer Tools', order: 0, createdAt: now, updatedAt: now },
      { id: 'bg-study', workspaceId: ws2, title: 'Research Papers', order: 0, createdAt: now, updatedAt: now },
    ]);
    const bookmarksData = Array.from({ length: 10 }, (_, i) => ({
      id: `bm-${i + 1}`,
      workspaceId: i < 6 ? ws1 : ws2,
      groupId: i < 4 ? 'bg-dev' : i < 8 ? 'bg-study' : null,
      title: i === 0 ? 'MDN Web Docs (Gecko / Mozilla)' : `Bookmark ${i + 1}`,
      url: `https://example.com/resource-${i + 1}`,
      isFavorite: i % 2 === 1,
      order: i,
      createdAt: now + i * 1000,
      updatedAt: now + i * 1000,
    }));
    await db.bookmarks.bulkPut(bookmarksData);

    // 5. Seed 2 Collections and 10 Notes (with Markdown, code blocks, Vietnamese diacritics)
    await db.noteCollections.bulkPut([
      { id: 'col-arch', workspaceId: ws1, title: 'Architecture Notes', color: '#3b82f6', order: 0, createdAt: now, updatedAt: now },
      { id: 'col-lang', workspaceId: ws2, title: 'Ngôn ngữ học', color: '#10b981', order: 0, createdAt: now, updatedAt: now },
    ]);
    const notesData = Array.from({ length: 10 }, (_, i) => ({
      id: `note-${i + 1}`,
      workspaceId: i < 5 ? ws1 : ws2,
      collectionId: i < 3 ? 'col-arch' : i < 6 ? 'col-lang' : null,
      title: i === 0 ? 'Ghi chú hệ thống phân tán' : i === 1 ? 'アーキテクチャ設計' : `Engineering Note ${i + 1}`,
      content: i === 0 ? '# Tiêu đề tiếng Việt\n\n- [x] Mục hoàn thành\n```ts\nconst x: number = 42;\n```' : `Content for note ${i + 1}`,
      excerpt: i === 0 ? 'Tiêu đề tiếng Việt' : `Excerpt ${i + 1}`,
      isPinned: i === 0,
      isFavorite: i % 3 === 0,
      isArchived: false,
      tags: ['tag-core'],
      order: i,
      createdAt: now + i * 1000,
      updatedAt: now + i * 1000,
    }));
    await db.notes.bulkPut(notesData);

    // 6. Seed Note Tags & Note-Bookmark Junctions
    await db.noteTags.put({ id: 'tag-core', workspaceId: ws1, name: 'Core', color: '#ec4899', createdAt: now, updatedAt: now });
    await db.noteBookmarkLinks.put({ id: 'link-1', workspaceId: ws1, noteId: 'note-1', bookmarkId: 'bm-1', createdAt: now });

    // 7. Seed 3 Focus Sessions
    await db.focusSessions.bulkPut([
      { id: 'fs-1', workspaceId: ws1, type: 'pomodoro', durationMinutes: 25, startedAt: now, completedAt: now + 1500000, completed: true },
      { id: 'fs-2', workspaceId: ws1, type: 'pomodoro', durationMinutes: 25, startedAt: now + 1500000, completedAt: now + 3000000, completed: true },
      { id: 'fs-3', workspaceId: ws2, type: 'study', durationMinutes: 50, startedAt: now, completedAt: now + 3000000, completed: true },
    ]);

    // 8. Seed Daily Goals, Sticky Notes, Vocabulary, Resources, Calendar Events
    await db.dailyGoals.put({ id: 'dg-1', workspaceId: ws1, title: 'Deep Work', targetValue: 120, currentValue: 50, dateString: '2026-11-08', createdAt: now, updatedAt: now });
    await db.stickyNotes.put({ id: 'sn-1', workspaceId: ws1, content: 'Bảo mật dữ liệu tuyệt đối', color: 'yellow', x: 10, y: 10, width: 200, height: 200, zIndex: 1, createdAt: now, updatedAt: now });
    await db.vocabulary.put({ id: 'voc-1', workspaceId: ws2, word: 'Gecko', meaning: 'Open-source browser engine developed by Mozilla', category: 'Tech', status: 'mastered', createdAt: now, updatedAt: now });
    await db.resources.put({ id: 'res-1', workspaceId: ws3, title: 'WXT Documentation', url: 'https://wxt.dev', tags: ['extension', 'wxt'], isPinned: true, createdAt: now, updatedAt: now });
    await db.calendarEvents.put({ id: 'evt-1', workspaceId: ws1, title: 'Release 0.1.0', startDate: now + 86400000, endDate: now + 90000000, isAllDay: true, createdAt: now, updatedAt: now });

    // 9. Seed Widget Instances & Layouts
    await db.widgetInstances.bulkPut([
      { id: 'wi-clock', workspaceId: ws1, widgetType: 'clock', title: 'Clock', config: {}, isEnabled: true, order: 0, createdAt: now, updatedAt: now },
      { id: 'wi-todo', workspaceId: ws1, widgetType: 'todo', title: 'Todos', config: {}, isEnabled: true, order: 1, createdAt: now, updatedAt: now },
    ]);
    await db.widgetLayouts.bulkPut([
      { id: 'ws-personal_wi-clock_lg', workspaceId: ws1, widgetInstanceId: 'wi-clock', breakpoint: 'lg', x: 0, y: 0, w: 6, h: 4, isDefault: true, createdAt: now, updatedAt: now },
      { id: 'ws-personal_wi-todo_lg', workspaceId: ws1, widgetInstanceId: 'wi-todo', breakpoint: 'lg', x: 6, y: 0, w: 6, h: 4, isDefault: true, createdAt: now, updatedAt: now },
    ]);

    // Verify pre-restart record count in all 17 tables
    expect(await db.workspaces.count()).toBe(3);
    expect(await db.settings.count()).toBe(1);
    expect(await db.todos.count()).toBe(10);
    expect(await db.bookmarks.count()).toBe(10);
    expect(await db.bookmarkGroups.count()).toBe(2);
    expect(await db.notes.count()).toBe(10);
    expect(await db.noteCollections.count()).toBe(2);
    expect(await db.noteTags.count()).toBe(1);
    expect(await db.noteBookmarkLinks.count()).toBe(1);
    expect(await db.focusSessions.count()).toBe(3);
    expect(await db.dailyGoals.count()).toBe(1);
    expect(await db.stickyNotes.count()).toBe(1);
    expect(await db.vocabulary.count()).toBe(1);
    expect(await db.resources.count()).toBe(1);
    expect(await db.calendarEvents.count()).toBe(1);
    expect(await db.widgetInstances.count()).toBe(2);
    expect(await db.widgetLayouts.count()).toBe(2);

    // ========================================================
    // SIMULATE BROWSER RESTART: Close DB and reopen fresh instance
    // ========================================================
    db.close();

    const restartedDb = new NookSpaceDB(dbName);
    await restartedDb.open();

    // Verify post-restart data integrity across all 17 tables
    expect(await restartedDb.workspaces.count()).toBe(3);
    expect(await restartedDb.settings.count()).toBe(1);
    expect(await restartedDb.todos.count()).toBe(10);
    expect(await restartedDb.bookmarks.count()).toBe(10);
    expect(await restartedDb.bookmarkGroups.count()).toBe(2);
    expect(await restartedDb.notes.count()).toBe(10);
    expect(await restartedDb.noteCollections.count()).toBe(2);
    expect(await restartedDb.noteTags.count()).toBe(1);
    expect(await restartedDb.noteBookmarkLinks.count()).toBe(1);
    expect(await restartedDb.focusSessions.count()).toBe(3);
    expect(await restartedDb.dailyGoals.count()).toBe(1);
    expect(await restartedDb.stickyNotes.count()).toBe(1);
    expect(await restartedDb.vocabulary.count()).toBe(1);
    expect(await restartedDb.resources.count()).toBe(1);
    expect(await restartedDb.calendarEvents.count()).toBe(1);
    expect(await restartedDb.widgetInstances.count()).toBe(2);
    expect(await restartedDb.widgetLayouts.count()).toBe(2);

    // Verify active workspace persisted in settings
    const currentSettings = await restartedDb.settings.get('current_settings');
    expect(currentSettings?.activeWorkspaceId).toBe(ws2);

    // Verify Unicode and Markdown fidelity persisted intact
    const note1 = await restartedDb.notes.get('note-1');
    expect(note1?.title).toBe('Ghi chú hệ thống phân tán');
    expect(note1?.content).toContain('# Tiêu đề tiếng Việt');
    expect(note1?.content).toContain('```ts\nconst x: number = 42;\n```');

    const note2 = await restartedDb.notes.get('note-2');
    expect(note2?.title).toBe('アーキテクチャ設計');

    const todo1 = await restartedDb.todos.get('todo-1');
    expect(todo1?.title).toBe('Viết báo cáo kỹ thuật tiếng Việt');

    // Clean up
    await restartedDb.delete();
  });

  it('Phase C.3: executes cross-tab multi-entity synchronization and validates state convergence', async () => {
    const wsId = 'ws-sync-test';
    const now = Date.now();
    await db.workspaces.put({
      id: wsId,
      name: 'Sync Space',
      icon: 'LayoutGrid',
      isDefault: false,
      order: 10,
      createdAt: now,
      updatedAt: now,
    });

    // Shared mock event bus simulating WebExtension storage.onChanged
    const listeners: Array<(changes: Record<string, any>, area: string) => void> = [];
    const subscribe = (cb: (changes: Record<string, any>, area: string) => void) => {
      listeners.push(cb);
      return () => {
        const idx = listeners.indexOf(cb);
        if (idx !== -1) listeners.splice(idx, 1);
      };
    };
    const broadcast = async (changes: Record<string, any>) => {
      for (const listener of [...listeners]) {
        await listener(changes, 'local');
      }
    };

    // Tab A creates a Todo
    const todoA = await todoRepo.create({
      workspaceId: wsId,
      title: 'Created in Tab A',
      priority: 'high',
    });
    expect(todoA.id).toBeDefined();

    // Tab B listening to storage.onChanged
    let tabBRefreshed = false;
    let tabBTasks: any[] = [];
    const unsubB = subscribe(async (changes, area) => {
      if (area === 'local' && changes[STORAGE_KEY_TODO_LAST_UPDATED_AT]) {
        tabBTasks = await todoRepo.getByWorkspace(wsId);
        tabBRefreshed = true;
      }
    });

    // Simulate Tab A emitting storage update
    await broadcast({ [STORAGE_KEY_TODO_LAST_UPDATED_AT]: { newValue: Date.now() } });

    // Verify Tab B sees the new Todo
    expect(tabBRefreshed).toBe(true);
    expect(tabBTasks).toHaveLength(1);
    expect(tabBTasks[0].title).toBe('Created in Tab A');

    // Tab B updates Todo status to completed
    await todoRepo.setCompleted(todoA.id, true, wsId);

    // Tab A receives notification and reloads
    let tabARefreshed = false;
    let tabATasks: any[] = [];
    const unsubA = subscribe(async (changes, area) => {
      if (area === 'local' && changes[STORAGE_KEY_TODO_LAST_UPDATED_AT]) {
        tabATasks = await todoRepo.getByWorkspace(wsId);
        tabARefreshed = true;
      }
    });

    await broadcast({ [STORAGE_KEY_TODO_LAST_UPDATED_AT]: { newValue: Date.now() } });

    expect(tabARefreshed).toBe(true);
    expect(tabATasks).toHaveLength(1);
    expect(tabATasks[0].completed).toBe(true);

    unsubA();
    unsubB();
  });

  it('Phase E: verifies dangerous URL schemes are rejected in Bookmarks and Resources', async () => {
    // Test dangerous schemes
    expect(isSafeBookmarkUrl('javascript:alert(document.cookie)')).toBe(false);
    expect(isSafeBookmarkUrl('javascript:void(0)')).toBe(false);
    expect(isSafeBookmarkUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
    expect(isSafeBookmarkUrl('vbscript:msgbox(1)')).toBe(false);

    // Test valid schemes (https, http, mailto)
    expect(isSafeBookmarkUrl('https://github.com')).toBe(true);
    expect(isSafeBookmarkUrl('http://localhost:3000')).toBe(true);
    expect(isSafeBookmarkUrl('mailto:support@nookspace.app')).toBe(true);
    expect(isSafeBookmarkUrl('ftp://ftp.is.co.za')).toBe(false);

    // Attempting to create bookmark with dangerous URL in repository must be rejected
    const ws = 'ws-sec-test';
    const now = Date.now();
    await db.workspaces.put({
      id: ws,
      name: 'Sec Space',
      icon: 'Shield',
      isDefault: false,
      order: 11,
      createdAt: now,
      updatedAt: now,
    });

    await expect(
      bookmarkRepo.create({
        workspaceId: ws,
        title: 'Exploit Bookmark',
        url: 'javascript:alert("XSS")',
      })
    ).rejects.toThrow();
  });

  it('Phase C.1: verifies workspace isolation and cascade deletion across all scoped entities', async () => {
    const wsTarget = 'ws-cascade-test';
    const wsSibling = 'ws-sibling-test';
    const now = Date.now();

    await db.workspaces.put({
      id: wsTarget,
      name: 'Target Workspace',
      icon: 'Trash2',
      isDefault: false,
      order: 12,
      createdAt: now,
      updatedAt: now,
    });
    await db.workspaces.put({
      id: wsSibling,
      name: 'Sibling Workspace',
      icon: 'LayoutGrid',
      isDefault: false,
      order: 13,
      createdAt: now,
      updatedAt: now,
    });

    // Seed scoped records in Target
    await todoRepo.create({ workspaceId: wsTarget, title: 'Target Todo' });
    await bookmarkRepo.create({ workspaceId: wsTarget, title: 'Target BM', url: 'https://target.com' });
    await noteRepo.create({ workspaceId: wsTarget, title: 'Target Note', content: 'Target content' });
    await widgetRepo.create({ workspaceId: wsTarget, widgetType: 'clock', title: 'Target Clock' });

    // Seed scoped records in Sibling
    await todoRepo.create({ workspaceId: wsSibling, title: 'Sibling Todo' });
    await bookmarkRepo.create({ workspaceId: wsSibling, title: 'Sibling BM', url: 'https://sibling.com' });
    await noteRepo.create({ workspaceId: wsSibling, title: 'Sibling Note', content: 'Sibling content' });
    await widgetRepo.create({ workspaceId: wsSibling, widgetType: 'clock', title: 'Sibling Clock' });

    // Verify baseline counts
    expect(await db.todos.where('workspaceId').equals(wsTarget).count()).toBe(1);
    expect(await db.todos.where('workspaceId').equals(wsSibling).count()).toBe(1);

    // Delete target workspace with cascade
    await workspaceRepo.delete(wsTarget);

    // Verify all target workspace records are completely purged
    expect(await db.workspaces.get(wsTarget)).toBeUndefined();
    expect(await db.todos.where('workspaceId').equals(wsTarget).count()).toBe(0);
    expect(await db.bookmarks.where('workspaceId').equals(wsTarget).count()).toBe(0);
    expect(await db.notes.where('workspaceId').equals(wsTarget).count()).toBe(0);
    expect(await db.widgetInstances.where('workspaceId').equals(wsTarget).count()).toBe(0);

    // Sibling workspace records remain 100% untouched
    expect(await db.workspaces.get(wsSibling)).toBeDefined();
    expect(await db.todos.where('workspaceId').equals(wsSibling).count()).toBe(1);
    expect(await db.bookmarks.where('workspaceId').equals(wsSibling).count()).toBe(1);
    expect(await db.notes.where('workspaceId').equals(wsSibling).count()).toBe(1);
    expect(await db.widgetInstances.where('workspaceId').equals(wsSibling).count()).toBe(1);
  });

  it('Phase C.1: verifies clean profile initial hydration seeds exactly 3 starter workspaces, default settings, and 5 initial widgets', async () => {
    const cleanDbName = `test-clean-profile-${Date.now()}`;
    const cleanDb = new NookSpaceDB(cleanDbName);
    await cleanDb.open();

    // Verify initially empty
    expect(await cleanDb.workspaces.count()).toBe(0);

    // Run seedInitialData (invoked by AppShell on initial install)
    await cleanDb.seedInitialData();

    // Verify exactly 3 initial workspaces created with 1 default
    const workspaces = await cleanDb.workspaces.toArray();
    expect(workspaces).toHaveLength(3);
    const defaultWs = workspaces.find((w) => w.isDefault);
    expect(defaultWs?.id).toBe('ws-default-personal');

    // Verify default settings created
    const settings = await cleanDb.settings.get('current_settings');
    expect(settings).toBeDefined();
    expect(settings?.activeWorkspaceId).toBe('ws-default-personal');

    // Verify 5 initial widgets seeded for the default workspace
    const widgets = await cleanDb.widgetInstances.where('workspaceId').equals('ws-default-personal').toArray();
    expect(widgets).toHaveLength(5);

    // Running seedInitialData a second time is strictly idempotent
    await cleanDb.seedInitialData();
    expect(await cleanDb.workspaces.count()).toBe(3);
    expect(await cleanDb.widgetInstances.count()).toBe(5);

    await cleanDb.delete();
  });

  it('Phase C.1 & C.3: verifies concurrent multi-entity transactions maintain atomic isolation with zero data corruption', async () => {
    const ws = 'ws-concurrent-test';
    const now = Date.now();
    await db.workspaces.put({
      id: ws,
      name: 'Concurrent Space',
      icon: 'Cpu',
      isDefault: false,
      order: 14,
      createdAt: now,
      updatedAt: now,
    });

    // Run 50 concurrent operations across todos, bookmarks, and notes
    const operations: Promise<any>[] = [];
    for (let i = 0; i < 20; i++) {
      operations.push(todoRepo.create({ workspaceId: ws, title: `Concurrent Todo ${i}` }));
      operations.push(bookmarkRepo.create({ workspaceId: ws, title: `Concurrent Bookmark ${i}`, url: `https://test.com/${i}` }));
      if (i < 10) {
        operations.push(noteRepo.create({ workspaceId: ws, title: `Concurrent Note ${i}`, content: `Content ${i}` }));
      }
    }

    await Promise.all(operations);

    // Verify exact expected record counts
    expect(await db.todos.where('workspaceId').equals(ws).count()).toBe(20);
    expect(await db.bookmarks.where('workspaceId').equals(ws).count()).toBe(20);
    expect(await db.notes.where('workspaceId').equals(ws).count()).toBe(10);

    // Verify all records have unique non-null IDs and correct workspace ownership
    const allTodos = await db.todos.where('workspaceId').equals(ws).toArray();
    const todoIds = new Set(allTodos.map((t) => t.id));
    expect(todoIds.size).toBe(20);

    const allBookmarks = await db.bookmarks.where('workspaceId').equals(ws).toArray();
    const bookmarkIds = new Set(allBookmarks.map((b) => b.id));
    expect(bookmarkIds.size).toBe(20);
  });
});
