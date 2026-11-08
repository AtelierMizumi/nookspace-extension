import { create } from 'zustand';
import {
  widgetInstanceRepo as defaultWidgetInstanceRepo,
  WidgetInstanceRepository,
} from '../services/database/repositories/widgetInstanceRepository';
import { widgetRegistry } from '../features/widget-system/WidgetRegistry';
import { WidgetInstanceEntity } from '../types/database';

export interface WidgetState {
  instances: WidgetInstanceEntity[];
  isLoading: boolean;
  activeWorkspaceId: string | null;
  loadWidgets: (workspaceId: string) => Promise<void>;
  addWidget: (workspaceId: string, widgetType: string, title?: string) => Promise<WidgetInstanceEntity>;
  removeWidget: (id: string, workspaceId: string) => Promise<void>;
  toggleWidget: (id: string, isEnabled: boolean, workspaceId: string) => Promise<void>;
  updateConfig: (id: string, config: Record<string, unknown>, workspaceId: string) => Promise<void>;
  clearWidgets: () => void;
}

export interface WidgetStoreDependencies {
  repo?: WidgetInstanceRepository;
}

export function createWidgetStore(deps: WidgetStoreDependencies = {}) {
  const repo = deps.repo ?? defaultWidgetInstanceRepo;
  let latestRequestId = 0;

  return create<WidgetState>((set, get) => ({
    instances: [],
    isLoading: false,
    activeWorkspaceId: null,

    loadWidgets: async (workspaceId: string) => {
      const requestId = ++latestRequestId;
      const isDifferentWorkspace = get().activeWorkspaceId !== workspaceId;

      // Immediately isolate and clear previous instances if switching workspace to prevent UI flash
      set({
        isLoading: true,
        activeWorkspaceId: workspaceId,
        ...(isDifferentWorkspace ? { instances: [] } : {}),
      });

      try {
        const items = await repo.getByWorkspace(workspaceId);
        // Guard against stale async responses if workspace switched while fetching
        if (requestId === latestRequestId && get().activeWorkspaceId === workspaceId) {
          set({ instances: items, isLoading: false });
        }
      } catch (err) {
        console.error('[widgetStore] Failed to load widgets:', err);
        if (requestId === latestRequestId && get().activeWorkspaceId === workspaceId) {
          set({ instances: [], isLoading: false });
        }
      }
    },

    addWidget: async (workspaceId: string, widgetType: string, title?: string) => {
      const definition = widgetRegistry.get(widgetType);
      const initialConfig = definition ? { ...definition.defaultConfig } : {};
      const created = await repo.create({
        workspaceId,
        widgetType,
        title: title || definition?.name,
        config: initialConfig,
      });

      if (get().activeWorkspaceId === workspaceId) {
        const items = await repo.getByWorkspace(workspaceId);
        if (get().activeWorkspaceId === workspaceId) {
          set({ instances: items });
        }
      }
      return created;
    },

    removeWidget: async (id: string, workspaceId: string) => {
      await repo.delete(id, workspaceId);
      if (get().activeWorkspaceId === workspaceId) {
        const items = await repo.getByWorkspace(workspaceId);
        if (get().activeWorkspaceId === workspaceId) {
          set({ instances: items });
        }
      }
    },

    toggleWidget: async (id: string, isEnabled: boolean, workspaceId: string) => {
      await repo.toggleEnabled(id, isEnabled, workspaceId);
      if (get().activeWorkspaceId === workspaceId) {
        const items = await repo.getByWorkspace(workspaceId);
        if (get().activeWorkspaceId === workspaceId) {
          set({ instances: items });
        }
      }
    },

    updateConfig: async (id: string, config: Record<string, unknown>, workspaceId: string) => {
      await repo.updateConfig(id, config, workspaceId);
      if (get().activeWorkspaceId === workspaceId) {
        // Fast optimistic in-memory update
        set((state) => ({
          instances: state.instances.map((item) =>
            item.id === id ? { ...item, config: { ...item.config, ...config } } : item
          ),
        }));
      }
    },

    clearWidgets: () => {
      set({ instances: [], activeWorkspaceId: null, isLoading: false });
    },
  }));
}

export const useWidgetStore = createWidgetStore();
