import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { NookSpaceDB } from '@/services/database/db';
import { WorkspaceRepository } from '@/services/database/repositories/workspaceRepository';
import { PresetApplicationService } from '@/features/workspaces/services/presetApplicationService';
import { createWorkspaceStore } from '@/stores/workspaceStore';
import '@/widgets';

describe('useWorkspaceStore — Preset Integration Tests', () => {
  let testDb: NookSpaceDB;
  let repo: WorkspaceRepository;
  let presetService: PresetApplicationService;
  let store: ReturnType<typeof createWorkspaceStore>;

  beforeEach(async () => {
    testDb = new NookSpaceDB(`test-ws-store-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`);
    await testDb.open();
    repo = new WorkspaceRepository(testDb);
    presetService = new PresetApplicationService(testDb);
    store = createWorkspaceStore({
      database: testDb,
      repo,
      presetService,
    });
    await store.getState().initWorkspaces();
  });

  afterEach(async () => {
    if (testDb) {
      await testDb.delete();
    }
  });

  it('1. successfully creates workspace from preset and transitions active workspace', async () => {
    const initialActive = store.getState().activeWorkspaceId;
    const initialCount = store.getState().workspaces.length;

    const created = await store.getState().createWorkspaceFromPreset({
      presetId: 'minimalist',
      name: 'Store Minimalist Workspace',
    });

    expect(created).toBeDefined();
    expect(created.name).toBe('Store Minimalist Workspace');

    // State updates
    const state = store.getState();
    expect(state.workspaces.length).toBe(initialCount + 1);
    expect(state.activeWorkspaceId).toBe(created.id);
    expect(state.error).toBeNull();
    expect(state.workspaces.some((w) => w.id === created.id)).toBe(true);
  });

  it('2. failure preserves previous active workspace and stores error message', async () => {
    const initialActive = store.getState().activeWorkspaceId;
    const initialCount = store.getState().workspaces.length;

    await expect(
      store.getState().createWorkspaceFromPreset({
        presetId: 'invalid-preset-id',
        name: 'Should Fail',
      })
    ).rejects.toThrow();

    const state = store.getState();
    expect(state.activeWorkspaceId).toBe(initialActive);
    expect(state.workspaces.length).toBe(initialCount);
    expect(state.error).toMatch(/Unknown workspace preset/);

    // clearError recovers state
    state.clearError();
    expect(store.getState().error).toBeNull();
  });

  it('3. blank workspace creation still functions properly alongside preset creation', async () => {
    const blank = await store.getState().createWorkspace('Blank Workspace Demo', 'Briefcase', '#10b981');
    expect(blank.name).toBe('Blank Workspace Demo');
    expect(blank.icon).toBe('Briefcase');
    expect(blank.color).toBe('#10b981');
    expect(store.getState().activeWorkspaceId).toBe(blank.id);

    // Now create a preset workspace
    const presetWs = await store.getState().createWorkspaceFromPreset({
      presetId: 'developer',
      name: 'Developer Workspace Demo',
    });
    expect(presetWs.name).toBe('Developer Workspace Demo');
    expect(store.getState().activeWorkspaceId).toBe(presetWs.id);

    // Both workspaces exist in state
    const all = store.getState().workspaces;
    expect(all.some((w) => w.id === blank.id)).toBe(true);
    expect(all.some((w) => w.id === presetWs.id)).toBe(true);
  });
});
