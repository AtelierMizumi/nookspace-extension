import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NookSpaceDB } from '../../../src/services/database/db';
import { WorkspaceRepository } from '../../../src/services/database/repositories/workspaceRepository';
import { createWorkspaceStore } from '../../../src/stores/workspaceStore';

describe('WorkspaceStore — Milestone 8.1 State Management', () => {
  let testDb: NookSpaceDB;
  let testRepo: WorkspaceRepository;
  let store: ReturnType<typeof createWorkspaceStore>;

  beforeEach(async () => {
    testDb = new NookSpaceDB(`test-workspace-store-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`);
    await testDb.open();
    testRepo = new WorkspaceRepository(testDb);
    store = createWorkspaceStore({ repo: testRepo, database: testDb });
  });

  afterEach(async () => {
    await testDb.delete();
  });

  // ==========================================
  // 1. INITIALIZE WORKSPACES
  // ==========================================
  describe('initWorkspaces', () => {
    it('1. loads workspaces from repository and sets active workspace', async () => {
      // Seed two workspaces in testDb
      await testRepo.create({ name: 'Personal' });
      await testRepo.create({ name: 'Study' });

      await store.getState().initWorkspaces();

      const state = store.getState();
      expect(state.isLoading).toBe(false);
      expect(state.workspaces).toHaveLength(2);
      expect(state.activeWorkspaceId).toMatch(/^ws-/);
      expect(state.workspaces[0].name).toBe('Personal');
    });

    it('2. respects activeWorkspaceId from settings if present', async () => {
      const ws1 = await testRepo.create({ name: 'Personal' });
      const ws2 = await testRepo.create({ name: 'Work' });

      await testDb.settings.put({
        id: 'current_settings',
        activeWorkspaceId: ws2.id,
        theme: 'dark',
        updatedAt: 1000,
      } as any);

      await store.getState().initWorkspaces();

      expect(store.getState().activeWorkspaceId).toBe(ws2.id);
      expect(store.getState().getActiveWorkspace()?.name).toBe('Work');
    });
  });

  // ==========================================
  // 2. CREATE WORKSPACE
  // ==========================================
  describe('createWorkspace', () => {
    it('3. creates workspace, updates list, and sets it as active', async () => {
      await store.getState().initWorkspaces();
      const initialCount = store.getState().workspaces.length;

      const created = await store.getState().createWorkspace('Deep Study Custom', 'GraduationCap', '#10B981');

      expect(created.name).toBe('Deep Study Custom');
      expect(created.icon).toBe('GraduationCap');
      expect(created.color).toBe('#10B981');

      const state = store.getState();
      expect(state.workspaces).toHaveLength(initialCount + 1);
      expect(state.activeWorkspaceId).toBe(created.id);
      expect(state.getActiveWorkspace()?.name).toBe('Deep Study Custom');
    });
  });

  // ==========================================
  // 3. UPDATE WORKSPACE
  // ==========================================
  describe('updateWorkspace', () => {
    it('4. updates workspace name and icon in store state and repository', async () => {
      const created = await store.getState().createWorkspace('Original Name');

      const updated = await store.getState().updateWorkspace(created.id, {
        name: 'New Focus Space',
        icon: 'Sparkles',
        color: '#8B5CF6',
      });

      expect(updated.name).toBe('New Focus Space');
      expect(updated.icon).toBe('Sparkles');

      const state = store.getState();
      expect(state.workspaces[0].name).toBe('New Focus Space');
      expect(state.workspaces[0].icon).toBe('Sparkles');
    });
  });

  // ==========================================
  // 4. REORDER WORKSPACES
  // ==========================================
  describe('reorderWorkspaces', () => {
    it('5. reorders workspaces in store state matching new ordering', async () => {
      const w1 = await store.getState().createWorkspace('One');
      const w2 = await store.getState().createWorkspace('Two');
      const w3 = await store.getState().createWorkspace('Three');

      // Reorder to Two, Three, One
      await store.getState().reorderWorkspaces([w2.id, w3.id, w1.id]);

      const state = store.getState();
      expect(state.workspaces[0].id).toBe(w2.id);
      expect(state.workspaces[1].id).toBe(w3.id);
      expect(state.workspaces[2].id).toBe(w1.id);
    });
  });

  // ==========================================
  // 5. DUPLICATE WORKSPACE
  // ==========================================
  describe('duplicateWorkspace', () => {
    it('6. duplicates workspace structure and appends to store state', async () => {
      const original = await store.getState().createWorkspace('Developer Studio', 'Code', '#6366F1');

      const duplicated = await store.getState().duplicateWorkspace(original.id);

      expect(duplicated.name).toBe('Developer Studio (Copy)');
      expect(duplicated.id).not.toBe(original.id);

      const state = store.getState();
      expect(state.workspaces).toHaveLength(2);
      expect(state.workspaces[1].id).toBe(duplicated.id);
    });
  });

  // ==========================================
  // 6. DELETE WORKSPACE & ACTIVE FALLBACK
  // ==========================================
  describe('deleteWorkspace', () => {
    it('7. deletes non-active workspace without changing activeWorkspaceId', async () => {
      const w1 = await store.getState().createWorkspace('Primary');
      const w2 = await store.getState().createWorkspace('Secondary');

      // Make w1 active
      await store.getState().setActiveWorkspace(w1.id);

      // Delete w2
      await store.getState().deleteWorkspace(w2.id);

      const state = store.getState();
      expect(state.workspaces).toHaveLength(1);
      expect(state.activeWorkspaceId).toBe(w1.id);
    });

    it('8. falls back to default/next workspace when active workspace is deleted', async () => {
      const w1 = await store.getState().createWorkspace('Root Default'); // isDefault: true
      const w2 = await store.getState().createWorkspace('Temp Workspace');

      // Active is w2
      expect(store.getState().activeWorkspaceId).toBe(w2.id);

      // Delete active workspace w2
      await store.getState().deleteWorkspace(w2.id);

      const state = store.getState();
      expect(state.workspaces).toHaveLength(1);
      expect(state.activeWorkspaceId).toBe(w1.id);
    });
  });

  // ==========================================
  // 7. ERROR HANDLING & STATE INTEGRITY
  // ==========================================
  describe('Error Handling', () => {
    it('9. captures error without corrupting state when repository throws', async () => {
      await store.getState().createWorkspace('Keep Me');
      expect(store.getState().workspaces).toHaveLength(1);

      // Spy on repo.update to throw
      vi.spyOn(testRepo, 'update').mockRejectedValueOnce(new Error('Simulated DB Failure'));

      await expect(
        store.getState().updateWorkspace('some-id', { name: 'Will Fail' })
      ).rejects.toThrow('Simulated DB Failure');

      expect(store.getState().error).toContain('Simulated DB Failure');
      // Previous state still preserved
      expect(store.getState().workspaces).toHaveLength(1);
      expect(store.getState().workspaces[0].name).toBe('Keep Me');

      // Clear error
      store.getState().clearError();
      expect(store.getState().error).toBeNull();
    });

    it('10. handles repeated active workspace selection idempotently', async () => {
      const ws = await store.getState().createWorkspace('Solo');
      await store.getState().setActiveWorkspace(ws.id);
      await store.getState().setActiveWorkspace(ws.id);

      expect(store.getState().activeWorkspaceId).toBe(ws.id);
      expect(store.getState().workspaces).toHaveLength(1);
    });
  });
});
