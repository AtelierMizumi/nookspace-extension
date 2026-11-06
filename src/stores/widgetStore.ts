import { create } from 'zustand';
import { widgetInstanceRepo } from '../services/database/repositories/widgetInstanceRepository';
import { widgetRegistry } from '../features/widget-system/WidgetRegistry';
import { WidgetInstanceEntity } from '../types/database';

interface WidgetState {
  instances: WidgetInstanceEntity[];
  isLoading: boolean;
  loadWidgets: (workspaceId: string) => Promise<void>;
  addWidget: (workspaceId: string, widgetType: string, title?: string) => Promise<WidgetInstanceEntity>;
  removeWidget: (id: string, workspaceId: string) => Promise<void>;
  toggleWidget: (id: string, isEnabled: boolean, workspaceId: string) => Promise<void>;
  updateConfig: (id: string, config: Record<string, unknown>, workspaceId: string) => Promise<void>;
}

export const useWidgetStore = create<WidgetState>((set) => ({
  instances: [],
  isLoading: false,

  loadWidgets: async (workspaceId: string) => {
    set({ isLoading: true });
    try {
      const items = await widgetInstanceRepo.getByWorkspace(workspaceId);
      set({ instances: items, isLoading: false });
    } catch (err) {
      console.error('[widgetStore] Failed to load widgets:', err);
      set({ instances: [], isLoading: false });
    }
  },

  addWidget: async (workspaceId: string, widgetType: string, title?: string) => {
    const definition = widgetRegistry.get(widgetType);
    const initialConfig = definition ? { ...definition.defaultConfig } : {};
    const created = await widgetInstanceRepo.create({
      workspaceId,
      widgetType,
      title: title || definition?.name,
      config: initialConfig,
    });
    const items = await widgetInstanceRepo.getByWorkspace(workspaceId);
    set({ instances: items });
    return created;
  },

  removeWidget: async (id: string, workspaceId: string) => {
    await widgetInstanceRepo.delete(id);
    const items = await widgetInstanceRepo.getByWorkspace(workspaceId);
    set({ instances: items });
  },

  toggleWidget: async (id: string, isEnabled: boolean, workspaceId: string) => {
    await widgetInstanceRepo.toggleEnabled(id, isEnabled);
    const items = await widgetInstanceRepo.getByWorkspace(workspaceId);
    set({ instances: items });
  },

  updateConfig: async (id: string, config: Record<string, unknown>, workspaceId: string) => {
    await widgetInstanceRepo.updateConfig(id, config);
    // Fast optimistic in-memory update
    set((state) => ({
      instances: state.instances.map((item) =>
        item.id === id ? { ...item, config: { ...item.config, ...config } } : item
      ),
    }));
  },
}));
