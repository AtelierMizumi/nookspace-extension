import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NookSpaceDB } from '../../../src/services/database/db';
import { MergePlannerService } from '../../../src/features/backup/services/mergePlannerService';
import { NookSpaceUniversalBackupV1 } from '../../../src/features/backup/types/backupTypes';

describe('Milestone 9.4 — Merge Planner Service Suite', () => {
  let db: NookSpaceDB;
  let planner: MergePlannerService;

  beforeEach(async () => {
    db = new NookSpaceDB('TestMergePlannerDB_' + Date.now());
    await db.open();

    // Seed default workspace
    await db.workspaces.put({
      id: 'ws-default',
      name: 'Default Workspace',
      icon: 'Home',
      color: '#6366f1',
      order: 0,
      isDefault: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Seed an existing note
    await db.notes.put({
      id: 'note-existing-1',
      workspaceId: 'ws-default',
      collectionId: null,
      title: 'Current Notes',
      content: 'Current note body',
      excerpt: '',
      tags: [],
      isPinned: false,
      isFavorite: false,
      isArchived: false,
      order: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    planner = new MergePlannerService(db);
  });

  afterEach(async () => {
    await db.delete();
  });

  const createMockBackup = (data: Partial<NookSpaceUniversalBackupV1['data']>): NookSpaceUniversalBackupV1 => {
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

  it('generates read-only preview with 0 database writes', async () => {
    const putSpy = vi.spyOn(db.notes, 'put');
    const addSpy = vi.spyOn(db.notes, 'add');
    const clearSpy = vi.spyOn(db.notes, 'clear');

    const backup = createMockBackup({
      notes: [
        {
          id: 'note-incoming-1',
          workspaceId: 'ws-source',
          collectionId: null,
          title: 'Incoming Notes',
          content: 'Incoming body',
          excerpt: 'Incoming excerpt',
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

    const preview = await planner.generatePreview(backup, {
      selectedGroups: ['notes'],
      targetWorkspaceId: 'ws-default',
      skipChecksumVerification: true,
    });

    expect(preview.newEntitiesCount).toBe(1);
    expect(preview.incomingCounts['notes']).toBe(1);
    expect(preview.existingCounts['notes']).toBe(1);

    expect(putSpy).not.toHaveBeenCalled();
    expect(addSpy).not.toHaveBeenCalled();
    expect(clearSpy).not.toHaveBeenCalled();
  });

  it('detects duplicate content and creates conflict item', async () => {
    const backup = createMockBackup({
      notes: [
        {
          id: 'note-incoming-dup',
          workspaceId: 'ws-source',
          collectionId: null,
          title: 'Current Notes', // Exact match with seeded note
          content: 'Current note body',
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

    const preview = await planner.generatePreview(backup, {
      selectedGroups: ['notes'],
      targetWorkspaceId: 'ws-default',
      skipChecksumVerification: true,
    });

    expect(preview.duplicateCount).toBe(1);
    expect(preview.conflicts).toHaveLength(1);
    expect(preview.conflicts[0].category).toBe('duplicate_content');
    expect(preview.conflicts[0].defaultPolicy).toBe('skip');
  });

  it('detects ID collision without duplicate content and suggests import_as_new', async () => {
    const backup = createMockBackup({
      notes: [
        {
          id: 'note-existing-1', // Same ID as seeded, but different content
          workspaceId: 'ws-source',
          collectionId: null,
          title: 'Completely Different Title',
          content: 'Completely different content',
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

    const preview = await planner.generatePreview(backup, {
      selectedGroups: ['notes'],
      targetWorkspaceId: 'ws-default',
      skipChecksumVerification: true,
    });

    expect(preview.idCollisionCount).toBe(1);
    expect(preview.conflicts).toHaveLength(1);
    expect(preview.conflicts[0].category).toBe('id_collision');
    expect(preview.conflicts[0].defaultPolicy).toBe('import_as_new');
  });

  it('detects stale plan when database is modified after preview generation', async () => {
    const backup = createMockBackup({
      todos: [
        {
          id: 'todo-1',
          workspaceId: 'ws-source',
          title: 'New Todo',
          completed: false,
          priority: 'medium',
          order: 0,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ],
    });

    const options = {
      selectedGroups: ['tasks'] as any,
      targetWorkspaceId: 'ws-default',
      skipChecksumVerification: true,
    };

    const preview = await planner.generatePreview(backup, options);
    const plan = await planner.buildMergePlan(preview, backup, options);

    // Initial check: plan is fresh
    const freshCheck = await planner.validatePlanFreshness(plan, options);
    expect(freshCheck.isFresh).toBe(true);

    // Modify DB behind the scenes (add a todo)
    await db.todos.put({
      id: 'todo-external',
      workspaceId: 'ws-default',
      title: 'External Todo',
      completed: false,
      priority: 'medium',
      order: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Re-check: plan should now be flagged as stale!
    const staleCheck = await planner.validatePlanFreshness(plan, options);
    expect(staleCheck.isFresh).toBe(false);
    expect(staleCheck.reason).toContain('Database state has been modified');
  });
});
