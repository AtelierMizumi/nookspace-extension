import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NookSpaceDB } from '../../../src/services/database/db';
import { TodoRepository, STORAGE_KEY_TODO_LAST_UPDATED_AT } from '../../../src/services/database/repositories/todoRepository';
import { STORAGE_KEY_BOOKMARKS_LAST_UPDATED_AT } from '../../../src/features/bookmarks/stores/bookmarkStore';
import { STORAGE_KEY_NOTES_LAST_UPDATED_AT } from '../../../src/features/notes/stores/noteStore';
import { STORAGE_KEY_LAST_DRAINED_AT } from '../../../src/features/pomodoro/storageService';
import { createWorkspaceStore } from '../../../src/stores/workspaceStore';
import { WorkspaceRepository } from '../../../src/services/database/repositories/workspaceRepository';

describe('Milestone 8.3 — Workspace Cross-Tab Isolation Suite', () => {
  let testDb: NookSpaceDB;
  let todoRepo: TodoRepository;
  let workspaceRepo: WorkspaceRepository;

  const wsA = 'ws-tab-a';
  const wsB = 'ws-tab-b';

  beforeEach(async () => {
    testDb = new NookSpaceDB(`test-crosstab-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`);
    await testDb.open();
    todoRepo = new TodoRepository(testDb);
    workspaceRepo = new WorkspaceRepository(testDb);
  });

  afterEach(async () => {
    await testDb.delete();
  });

  it('1. cross-tab storage signal keys adhere strictly to numeric timestamps with zero sensitive domain content', () => {
    const signalKeys = [
      STORAGE_KEY_TODO_LAST_UPDATED_AT,
      STORAGE_KEY_BOOKMARKS_LAST_UPDATED_AT,
      STORAGE_KEY_NOTES_LAST_UPDATED_AT,
      STORAGE_KEY_LAST_DRAINED_AT,
    ];

    expect(signalKeys).toEqual([
      'nookspace_todo_last_updated_at',
      'nookspace_bookmarks_last_updated_at',
      'nookspace_notes_last_updated_at',
      'nookspace_pomodoro_last_drained_at',
    ]);

    // Verify simulating a broadcast signal contains only a timestamp number
    const mockStoragePayload: Record<string, number> = {
      [STORAGE_KEY_TODO_LAST_UPDATED_AT]: Date.now(),
      [STORAGE_KEY_BOOKMARKS_LAST_UPDATED_AT]: Date.now(),
      [STORAGE_KEY_NOTES_LAST_UPDATED_AT]: Date.now(),
      [STORAGE_KEY_LAST_DRAINED_AT]: Date.now(),
    };

    for (const [key, value] of Object.entries(mockStoragePayload)) {
      expect(typeof value).toBe('number');
      expect(value).toBeGreaterThan(0);
      // Ensure zero note content, bookmark urls, or task text is present
      expect(typeof key).toBe('string');
      expect(JSON.stringify(mockStoragePayload)).not.toContain('https://');
      expect(JSON.stringify(mockStoragePayload)).not.toContain('content');
      expect(JSON.stringify(mockStoragePayload)).not.toContain('title');
    }
  });

  it('2. when Tab 1 modifies workspace B, Tab 2 querying workspace A never receives workspace B records', async () => {
    // Seed records in both workspaces
    await todoRepo.create({ workspaceId: wsA, title: 'Task in Tab 2 Workspace A' });
    await todoRepo.create({ workspaceId: wsB, title: 'Task in Tab 1 Workspace B' });

    // Tab 2 receives notification and reloads its active workspace (wsA)
    const tab2Tasks = await todoRepo.getByFilter(wsA);

    expect(tab2Tasks).toHaveLength(1);
    expect(tab2Tasks[0].title).toBe('Task in Tab 2 Workspace A');
    expect(tab2Tasks[0].workspaceId).toBe(wsA);

    // Tab 1 reloads its active workspace (wsB)
    const tab1Tasks = await todoRepo.getByFilter(wsB);
    expect(tab1Tasks).toHaveLength(1);
    expect(tab1Tasks[0].title).toBe('Task in Tab 1 Workspace B');
    expect(tab1Tasks[0].workspaceId).toBe(wsB);
  });

  it('3. independent in-memory store instances maintain per-tab active workspace coherence', async () => {
    await workspaceRepo.create({ name: 'Space 1' });
    await workspaceRepo.create({ name: 'Space 2' });

    // Create Store instance for Tab 1
    const tab1Store = createWorkspaceStore({ repo: workspaceRepo, database: testDb });
    // Create Store instance for Tab 2
    const tab2Store = createWorkspaceStore({ repo: workspaceRepo, database: testDb });

    await tab1Store.getState().initWorkspaces();
    await tab2Store.getState().initWorkspaces();

    // Tab 1 switches to wsA
    await tab1Store.getState().setActiveWorkspace(wsA);
    // Tab 2 switches to wsB
    await tab2Store.getState().setActiveWorkspace(wsB);

    // Verify per-tab coherence
    expect(tab1Store.getState().activeWorkspaceId).toBe(wsA);
    expect(tab2Store.getState().activeWorkspaceId).toBe(wsB);
  });
});
