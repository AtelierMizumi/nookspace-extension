import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NookSpaceDB } from '../../../src/services/database/db';
import { NookSpaceRecoveryDB } from '../../../src/features/backup/recovery/recoveryDatabase';
import { MergePlannerService } from '../../../src/features/backup/services/mergePlannerService';
import { MergeEngineService } from '../../../src/features/backup/services/mergeEngineService';
import { NookSpaceUniversalBackupV1 } from '../../../src/features/backup/types/backupTypes';
import { MergeImportOptions } from '../../../src/features/backup/types/mergeTypes';

describe('Milestone 9.4 — Merge Import Data Safety Integration Suite', () => {
  let db: NookSpaceDB;
  let recoveryDb: NookSpaceRecoveryDB;
  let planner: MergePlannerService;
  let engine: MergeEngineService;

  beforeEach(async () => {
    const dbName = 'TestMergeIntegDB_' + Date.now();
    db = new NookSpaceDB(dbName);
    await db.open();

    const recName = 'TestMergeIntegRecDB_' + Date.now();
    recoveryDb = new NookSpaceRecoveryDB(recName);
    await recoveryDb.open();

    // Seed initial state: Default Workspace, 1 Note, 1 Todo
    await db.workspaces.put({
      id: 'ws-existing',
      name: 'Existing Workspace',
      icon: 'Home',
      color: '#6366f1',
      order: 0,
      isDefault: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    await db.notes.put({
      id: 'note-existing-1',
      workspaceId: 'ws-existing',
      collectionId: null,
      title: 'Original Note',
      content: 'Original Note Content',
      excerpt: '',
      tags: [],
      isPinned: false,
      isFavorite: false,
      isArchived: false,
      order: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    await db.todos.put({
      id: 'todo-existing-1',
      workspaceId: 'ws-existing',
      title: 'Original Task',
      completed: false,
      priority: 'medium',
      order: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    await db.settings.put({
      id: 'current_settings',
      theme: 'light',
      accentColor: '#6366f1',
      fontFamily: 'Inter',
      fontSize: 'md',
      backgroundType: 'color',
      backgroundValue: '#ffffff',
      widgetOpacity: 90,
      widgetBlur: 10,
      activeWorkspaceId: 'ws-existing',
      updatedAt: Date.now(),
    });

    planner = new MergePlannerService(db);
    engine = new MergeEngineService(db, recoveryDb);
  });

  afterEach(async () => {
    await db.delete();
    await recoveryDb.delete();
  });

  const createMockBackup = (
    data: Partial<NookSpaceUniversalBackupV1['data']>
  ): NookSpaceUniversalBackupV1 => {
    const fullData = {
      workspaces: data.workspaces && data.workspaces.length > 0 ? data.workspaces : [
        {
          id: 'ws-source',
          name: 'Source Workspace',
          icon: 'Home',
          color: '#6366f1',
          order: 0,
          isDefault: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ],
      settings: null,
      widgetInstances: [],
      widgetLayouts: [],
      todos: [],
      notes: [],
      noteCollections: [],
      noteTags: [],
      noteBookmarkLinks: [],
      bookmarks: [],
      bookmarkGroups: [],
      focusSessions: [],
      dailyGoals: [],
      stickyNotes: [],
      vocabulary: [],
      resources: [],
      calendarEvents: [],
      ...data,
    };

    const itemCounts: Record<string, number> = {};
    for (const [key, val] of Object.entries(fullData)) {
      itemCounts[key] = Array.isArray(val) ? val.length : val ? 1 : 0;
    }

    return {
      format: 'nookspace-backup',
      formatVersion: 1,
      metadata: {
        exportedAt: 1700000000000,
        appVersion: '0.1.0',
        databaseSchemaVersion: 4,
        exportType: 'full',
        itemCounts,
        integrity: {
          algorithm: 'SHA-256',
          checksum: 'a'.repeat(64),
        },
      },
      data: fullData,
    };
  };

  it('Scenario 1 — Selected Group Merge (Bookmarks & Notes) preserves existing data', async () => {
    const backup = createMockBackup({
      bookmarks: [
        {
          id: 'bm-incoming-1',
          workspaceId: 'ws-source',
          groupId: null,
          title: 'Incoming Bookmark',
          url: 'https://example.com/incoming',
          isFavorite: true,
          order: 0,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ],
      notes: [
        {
          id: 'note-incoming-2',
          workspaceId: 'ws-source',
          collectionId: null,
          title: 'Incoming Note 2',
          content: 'Incoming Note Content',
          excerpt: '',
          tags: [],
          isPinned: false,
          isFavorite: false,
          isArchived: false,
          order: 0,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ],
    });

    const options: MergeImportOptions = {
      selectedGroups: ['bookmarks', 'notes'],
      targetWorkspaceId: 'ws-existing',
      skipChecksumVerification: true,
    };

    const preview = await planner.generatePreview(backup, options);
    const plan = await planner.buildMergePlan(preview, backup, options);
    const result = await engine.executeMerge(plan, options);

    expect(result.success).toBe(true);

    // Verify existing data untouched
    const origNote = await db.notes.get('note-existing-1');
    expect(origNote).toBeDefined();
    expect(origNote?.title).toBe('Original Note');

    const origTodo = await db.todos.get('todo-existing-1');
    expect(origTodo).toBeDefined();

    // Verify incoming data added
    const allNotes = await db.notes.toArray();
    expect(allNotes).toHaveLength(2);

    const allBookmarks = await db.bookmarks.toArray();
    expect(allBookmarks).toHaveLength(1);
    expect(allBookmarks[0].title).toBe('Incoming Bookmark');
    expect(allBookmarks[0].workspaceId).toBe('ws-existing');
  });

  it('Scenario 2 — Full Merge Import preserves existing workspace and default status', async () => {
    const backup = createMockBackup({
      workspaces: [
        {
          id: 'ws-incoming-other',
          name: 'Imported Workspace',
          icon: 'Folder',
          color: '#10b981',
          order: 1,
          isDefault: true, // Marked default in backup
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ],
      todos: [
        {
          id: 'todo-incoming-new',
          workspaceId: 'ws-incoming-other',
          title: 'Imported Task',
          completed: true,
          priority: 'medium',
          order: 0,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ],
    });

    const options: MergeImportOptions = {
      selectedGroups: ['workspaces', 'tasks'],
      skipChecksumVerification: true,
    };

    const preview = await planner.generatePreview(backup, options);
    const plan = await planner.buildMergePlan(preview, backup, options);
    const result = await engine.executeMerge(plan, options);

    expect(result.success).toBe(true);

    const workspaces = await db.workspaces.toArray();
    expect(workspaces).toHaveLength(2);

    // Verify existing default workspace remains the ONLY default workspace
    const defaultWorkspaces = workspaces.filter((w) => w.isDefault);
    expect(defaultWorkspaces).toHaveLength(1);
    expect(defaultWorkspaces[0].id).toBe('ws-existing');

    const importedWs = workspaces.find((w) => w.id !== 'ws-existing');
    expect(importedWs?.isDefault).toBe(false);
  });

  it('Scenario 3 — ID Collision Resolution (import_as_new) re-keys without overwriting', async () => {
    const backup = createMockBackup({
      notes: [
        {
          id: 'note-existing-1', // Same ID as existing note, but distinct content
          workspaceId: 'ws-source',
          collectionId: null,
          title: 'Incoming Colliding Note',
          content: 'Brand new incoming content',
          excerpt: '',
          tags: [],
          isPinned: false,
          isFavorite: false,
          isArchived: false,
          order: 0,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ],
    });

    const options: MergeImportOptions = {
      selectedGroups: ['notes'],
      targetWorkspaceId: 'ws-existing',
      defaultConflictPolicy: 'import_as_new',
      skipChecksumVerification: true,
    };

    const preview = await planner.generatePreview(backup, options);
    expect(preview.idCollisionCount).toBe(1);

    const plan = await planner.buildMergePlan(preview, backup, options);
    const result = await engine.executeMerge(plan, options);

    expect(result.success).toBe(true);

    // Both notes should coexist in the database!
    const allNotes = await db.notes.toArray();
    expect(allNotes).toHaveLength(2);

    const originalNote = allNotes.find((n) => n.id === 'note-existing-1');
    expect(originalNote?.title).toBe('Original Note');

    const newNote = allNotes.find((n) => n.id !== 'note-existing-1');
    expect(newNote?.title).toBe('Incoming Colliding Note');
    expect(newNote?.id).not.toBe('note-existing-1');
  });

  it('Scenario 4 — Duplicate Detection & Skip prevents redundant records', async () => {
    const backup = createMockBackup({
      notes: [
        {
          id: 'note-dup',
          workspaceId: 'ws-source',
          collectionId: null,
          title: 'Original Note', // Same title and content as existing
          content: 'Original Note Content',
          excerpt: '',
          tags: [],
          isPinned: false,
          isFavorite: false,
          isArchived: false,
          order: 0,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ],
    });

    const options: MergeImportOptions = {
      selectedGroups: ['notes'],
      targetWorkspaceId: 'ws-existing',
      defaultConflictPolicy: 'skip',
      skipChecksumVerification: true,
    };

    const preview = await planner.generatePreview(backup, options);
    expect(preview.duplicateCount).toBe(1);

    const plan = await planner.buildMergePlan(preview, backup, options);
    const result = await engine.executeMerge(plan, options);

    expect(result.success).toBe(true);
    expect(result.skippedCount).toBe(1);

    const allNotes = await db.notes.toArray();
    expect(allNotes).toHaveLength(1); // Still exactly 1
  });

  it('Scenario 5 — Deep Foreign Key Remapping preserves relationships', async () => {
    const backup = createMockBackup({
      noteCollections: [
        {
          id: 'nc-source-1',
          workspaceId: 'ws-source',
          title: 'Research Collection',
          order: 0,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ],
      notes: [
        {
          id: 'note-source-1',
          workspaceId: 'ws-source',
          collectionId: 'nc-source-1',
          title: 'Research Note',
          content: 'Deep insights',
          excerpt: '',
          tags: [],
          isPinned: false,
          isFavorite: false,
          isArchived: false,
          order: 0,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ],
      bookmarkGroups: [
        {
          id: 'bg-source-1',
          workspaceId: 'ws-source',
          title: 'Dev Tools Group',
          order: 0,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ],
      bookmarks: [
        {
          id: 'bm-source-1',
          workspaceId: 'ws-source',
          groupId: 'bg-source-1',
          title: 'Vite',
          url: 'https://vitejs.dev',
          isFavorite: true,
          order: 0,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ],
      noteBookmarkLinks: [
        {
          id: 'link-source-1',
          workspaceId: 'ws-source',
          noteId: 'note-source-1',
          bookmarkId: 'bm-source-1',
          createdAt: Date.now(),
        },
      ],
    });

    const options: MergeImportOptions = {
      selectedGroups: ['notes', 'bookmarks'],
      targetWorkspaceId: 'ws-existing',
      createNewWorkspaceForImport: false,
      skipChecksumVerification: true,
    };

    const preview = await planner.generatePreview(backup, options);
    const plan = await planner.buildMergePlan(preview, backup, options);
    const result = await engine.executeMerge(plan, options);

    expect(result.success).toBe(true);

    const insertedNote = (await db.notes.toArray()).find((n) => n.title === 'Research Note');
    const insertedCollection = (await db.noteCollections.toArray()).find(
      (c) => c.title === 'Research Collection'
    );
    expect(insertedNote?.collectionId).toBe(insertedCollection?.id);

    const insertedBookmark = (await db.bookmarks.toArray()).find((b) => b.title === 'Vite');
    const insertedGroup = (await db.bookmarkGroups.toArray()).find(
      (g) => g.title === 'Dev Tools Group'
    );
    expect(insertedBookmark?.groupId).toBe(insertedGroup?.id);

    const insertedLink = await db.noteBookmarkLinks.toCollection().first();
    expect(insertedLink?.noteId).toBe(insertedNote?.id);
    expect(insertedLink?.bookmarkId).toBe(insertedBookmark?.id);
  });

  it('Scenario 6 — Injected Failure triggers atomic rollback with 0 partial writes', async () => {
    const backup = createMockBackup({
      notes: [
        {
          id: 'note-will-fail',
          workspaceId: 'ws-source',
          collectionId: null,
          title: 'Failed Note',
          content: 'Should never persist',
          excerpt: '',
          tags: [],
          isPinned: false,
          isFavorite: false,
          isArchived: false,
          order: 0,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ],
    });

    const options: MergeImportOptions = {
      selectedGroups: ['notes'],
      targetWorkspaceId: 'ws-existing',
      skipChecksumVerification: true,
    };

    const preview = await planner.generatePreview(backup, options);
    const plan = await planner.buildMergePlan(preview, backup, options);

    // Inject simulated error during transaction
    const result = await engine.executeMerge(plan, options, undefined, {
      stage: 'during_tx',
      error: new Error('Simulated Database Write Failure'),
    });

    expect(result.success).toBe(false);
    expect(result.error?.message).toContain('Simulated Database Write Failure');

    // Database must remain completely pristine!
    const allNotes = await db.notes.toArray();
    expect(allNotes).toHaveLength(1);
    expect(allNotes[0].id).toBe('note-existing-1');
  });

  it('Scenario 7 — Stale Plan is rejected before transaction execution', async () => {
    const backup = createMockBackup({
      todos: [
        {
          id: 'todo-stale',
          workspaceId: 'ws-source',
          title: 'Stale Task',
          completed: false,
          priority: 'medium',
          order: 0,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ],
    });

    const options: MergeImportOptions = {
      selectedGroups: ['tasks'],
      targetWorkspaceId: 'ws-existing',
      skipChecksumVerification: true,
    };

    const preview = await planner.generatePreview(backup, options);
    const plan = await planner.buildMergePlan(preview, backup, options);

    // Concurrently mutate the database to invalidate plan token
    await db.todos.put({
      id: 'todo-concurrent',
      workspaceId: 'ws-existing',
      title: 'Concurrent Task',
      completed: false,
      priority: 'low',
      order: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    const result = await engine.executeMerge(plan, options);
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('MERGE_STALE_PLAN');
  });

  it('Scenario 8 — Settings preservation protects current theme and workspace', async () => {
    const backup = createMockBackup({
      settings: {
        id: 'current_settings',
        theme: 'dark', // incoming dark
        accentColor: '#10b981',
        fontFamily: 'Roboto',
        fontSize: 'lg',
        backgroundType: 'color',
        backgroundValue: '#000000',
        widgetOpacity: 50,
        widgetBlur: 5,
        activeWorkspaceId: 'ws-source',
        updatedAt: Date.now(),
      },
    });

    const options: MergeImportOptions = {
      selectedGroups: ['settings'],
      preserveSettings: true,
      skipChecksumVerification: true,
    };

    const preview = await planner.generatePreview(backup, options);
    const plan = await planner.buildMergePlan(preview, backup, options);
    const result = await engine.executeMerge(plan, options);

    expect(result.success).toBe(true);

    const settings = await db.settings.get('current_settings');
    expect(settings?.theme).toBe('light'); // Preserved!
    expect(settings?.activeWorkspaceId).toBe('ws-existing'); // Preserved!
  });
});
