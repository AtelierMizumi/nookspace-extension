import { create } from 'zustand';
import { db } from '../services/database/db';
import { workspaceRepo } from '../services/database/repositories/workspaceRepository';
import { WorkspaceEntity } from '../types/database';

interface WorkspaceState {
  workspaces: WorkspaceEntity[];
  activeWorkspaceId: string;
  isLoading: boolean;
  initWorkspaces: () => Promise<void>;
  setActiveWorkspace: (id: string) => Promise<void>;
  createWorkspace: (name: string, icon?: string, color?: string) => Promise<WorkspaceEntity>;
  deleteWorkspace: (id: string) => Promise<void>;
  getActiveWorkspace: () => WorkspaceEntity | undefined;
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  workspaces: [],
  activeWorkspaceId: 'ws-default-personal',
  isLoading: true,

  initWorkspaces: async () => {
    set({ isLoading: true });
    try {
      await db.seedInitialData();
      const list = await workspaceRepo.getAll();
      const settings = await db.settings.get('current_settings');
      const activeId =
        settings?.activeWorkspaceId && list.some((w) => w.id === settings.activeWorkspaceId)
          ? settings.activeWorkspaceId
          : list[0]?.id || 'ws-default-personal';

      set({ workspaces: list, activeWorkspaceId: activeId, isLoading: false });
    } catch (err) {
      console.error('[workspaceStore] Failed to initialize workspaces:', err);
      set({ isLoading: false });
    }
  },

  setActiveWorkspace: async (id: string) => {
    set({ activeWorkspaceId: id });
    try {
      await db.settings.update('current_settings', {
        activeWorkspaceId: id,
        updatedAt: Date.now(),
      });
    } catch {
      // Ignore settings update errors if db is in mock
    }
  },

  createWorkspace: async (name: string, icon = 'LayoutGrid', color = '#6366f1') => {
    const created = await workspaceRepo.create({ name, icon, color });
    const list = await workspaceRepo.getAll();
    set({ workspaces: list, activeWorkspaceId: created.id });
    try {
      await db.settings.update('current_settings', {
        activeWorkspaceId: created.id,
        updatedAt: Date.now(),
      });
    } catch {}
    return created;
  },

  deleteWorkspace: async (id: string) => {
    await workspaceRepo.delete(id);
    const list = await workspaceRepo.getAll();
    const nextActive = list[0]?.id || 'ws-default-personal';
    set({ workspaces: list, activeWorkspaceId: nextActive });
  },

  getActiveWorkspace: () => {
    const { workspaces, activeWorkspaceId } = get();
    return workspaces.find((w) => w.id === activeWorkspaceId) || workspaces[0];
  },
}));
