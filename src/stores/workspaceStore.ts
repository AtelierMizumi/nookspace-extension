import { create } from 'zustand';
import { db, NookSpaceDB } from '../services/database/db';
import { workspaceRepo, WorkspaceRepository } from '../services/database/repositories/workspaceRepository';
import {
  WorkspaceEntity,
  UpdateWorkspaceInput,
  STORAGE_KEY_ACTIVE_WORKSPACE_ID,
} from '../types/workspaces';
import {
  presetApplicationService,
  PresetApplicationService,
  CreateWorkspaceFromPresetInput,
} from '../features/workspaces/services/presetApplicationService';
import { browserApi } from '../services/browser';
import { BrowserApi } from '../services/browser/types';

export interface WorkspaceState {
  workspaces: WorkspaceEntity[];
  activeWorkspaceId: string;
  isLoading: boolean;
  error: string | null;

  initWorkspaces: () => Promise<void>;
  setActiveWorkspace: (id: string) => Promise<void>;
  syncExternalActiveWorkspace: (id: string) => void;
  createWorkspace: (name: string, icon?: string, color?: string) => Promise<WorkspaceEntity>;
  createWorkspaceFromPreset: (input: CreateWorkspaceFromPresetInput) => Promise<WorkspaceEntity>;
  updateWorkspace: (id: string, updates: UpdateWorkspaceInput) => Promise<WorkspaceEntity>;
  reorderWorkspaces: (orderedIds: string[]) => Promise<void>;
  deleteWorkspace: (id: string) => Promise<void>;
  duplicateWorkspace: (id: string) => Promise<WorkspaceEntity>;
  getActiveWorkspace: () => WorkspaceEntity | undefined;
  clearError: () => void;
}

export interface WorkspaceStoreDependencies {
  repo?: WorkspaceRepository;
  database?: NookSpaceDB;
  presetService?: PresetApplicationService;
  browser?: BrowserApi;
}

export function createWorkspaceStore(deps: WorkspaceStoreDependencies = {}) {
  const database = deps.database ?? db;
  const repo = deps.repo ?? workspaceRepo;
  const presetService = deps.presetService ?? presetApplicationService;
  const browser = deps.browser ?? browserApi;

  return create<WorkspaceState>((set, get) => ({
    workspaces: [],
    activeWorkspaceId: 'ws-default-personal',
    isLoading: true,
    error: null,

    initWorkspaces: async () => {
      set({ isLoading: true, error: null });
      try {
        await database.seedInitialData();
        const list = await repo.getAll();
        const settings = await database.settings.get('current_settings');
        const activeId =
          settings?.activeWorkspaceId && list.some((w) => w.id === settings.activeWorkspaceId)
            ? settings.activeWorkspaceId
            : list.find((w) => w.isDefault)?.id || list[0]?.id || 'ws-default-personal';

        set({ workspaces: list, activeWorkspaceId: activeId, isLoading: false });
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.error('[workspaceStore] Failed to initialize workspaces:', errorMsg);
        set({ isLoading: false, error: errorMsg });
      }
    },

    setActiveWorkspace: async (id: string) => {
      set({ activeWorkspaceId: id });
      try {
        await database.settings.update('current_settings', {
          activeWorkspaceId: id,
          updatedAt: Date.now(),
        });
      } catch {
        // Ignore settings update errors if db is in mock
      }
      try {
        await browser.storage.local.set({
          [STORAGE_KEY_ACTIVE_WORKSPACE_ID]: id,
        });
      } catch {
        // Ignore storage broadcast errors in mock/unsupported environments
      }
    },

    syncExternalActiveWorkspace: (id: string) => {
      set({ activeWorkspaceId: id });
      try {
        database.settings
          .update('current_settings', {
            activeWorkspaceId: id,
            updatedAt: Date.now(),
          })
          .catch(() => {});
      } catch {
        // Ignore settings update errors in mock environments
      }
    },

    createWorkspace: async (name: string, icon = 'LayoutGrid', color = '#6366f1') => {
      set({ error: null });
      try {
        const created = await repo.create({ name, icon, color });
        const list = await repo.getAll();
        set({ workspaces: list, activeWorkspaceId: created.id });
        try {
          await database.settings.update('current_settings', {
            activeWorkspaceId: created.id,
            updatedAt: Date.now(),
          });
        } catch {}
        try {
          await browser.storage.local.set({
            [STORAGE_KEY_ACTIVE_WORKSPACE_ID]: created.id,
          });
        } catch {}
        return created;
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        set({ error: errorMsg });
        throw err;
      }
    },

    createWorkspaceFromPreset: async (input: CreateWorkspaceFromPresetInput) => {
      set({ error: null });
      try {
        const created = await presetService.createWorkspaceFromPreset(input);
        const list = await repo.getAll();
        set({ workspaces: list, activeWorkspaceId: created.id });
        try {
          await database.settings.update('current_settings', {
            activeWorkspaceId: created.id,
            updatedAt: Date.now(),
          });
        } catch {}
        try {
          await browser.storage.local.set({
            [STORAGE_KEY_ACTIVE_WORKSPACE_ID]: created.id,
          });
        } catch {}
        return created;
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        set({ error: errorMsg });
        throw err;
      }
    },

    updateWorkspace: async (id: string, updates: UpdateWorkspaceInput) => {
      set({ error: null });
      try {
        const updated = await repo.update(id, updates);
        const list = await repo.getAll();
        set({ workspaces: list });
        return updated;
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        set({ error: errorMsg });
        throw err;
      }
    },

    reorderWorkspaces: async (orderedIds: string[]) => {
      set({ error: null });
      try {
        await repo.reorder(orderedIds);
        const list = await repo.getAll();
        set({ workspaces: list });
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        set({ error: errorMsg });
        throw err;
      }
    },

    deleteWorkspace: async (id: string) => {
      set({ error: null });
      try {
        const currentActive = get().activeWorkspaceId;
        await repo.delete(id);
        const list = await repo.getAll();

        if (currentActive === id) {
          const nextActive =
            list.find((w) => w.isDefault)?.id || list[0]?.id || 'ws-default-personal';
          set({ workspaces: list, activeWorkspaceId: nextActive });
          try {
            await database.settings.update('current_settings', {
              activeWorkspaceId: nextActive,
              updatedAt: Date.now(),
            });
          } catch {}
          try {
            await browser.storage.local.set({
              [STORAGE_KEY_ACTIVE_WORKSPACE_ID]: nextActive,
            });
          } catch {}
        } else {
          set({ workspaces: list });
        }
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        set({ error: errorMsg });
        throw err;
      }
    },

    duplicateWorkspace: async (id: string) => {
      set({ error: null });
      try {
        const created = await repo.duplicate(id);
        const list = await repo.getAll();
        set({ workspaces: list });
        return created;
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        set({ error: errorMsg });
        throw err;
      }
    },

    getActiveWorkspace: () => {
      const { workspaces, activeWorkspaceId } = get();
      return workspaces.find((w) => w.id === activeWorkspaceId) || workspaces[0];
    },

    clearError: () => {
      set({ error: null });
    },
  }));
}

export const useWorkspaceStore = createWorkspaceStore();
