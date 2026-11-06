import { create } from 'zustand';
import { layoutRepo } from '../services/database/repositories/layoutRepository';
import { widgetInstanceRepo } from '../services/database/repositories/widgetInstanceRepository';
import { Breakpoint, WidgetLayoutEntity } from '../types/database';
import { synchronizeLayout } from '../features/layout-editor/layoutUtils';

interface LayoutState {
  currentBreakpoint: Breakpoint;
  layouts: WidgetLayoutEntity[];
  isLoading: boolean;
  setCurrentBreakpoint: (bp: Breakpoint) => void;
  loadLayouts: (workspaceId: string, breakpoint?: Breakpoint) => Promise<void>;
  updateLayoutsInMemory: (items: WidgetLayoutEntity[]) => void;
  saveLayoutsToDb: (workspaceId: string, breakpoint?: Breakpoint) => Promise<void>;
}

export const useLayoutStore = create<LayoutState>((set, get) => ({
  currentBreakpoint: 'lg',
  layouts: [],
  isLoading: false,

  setCurrentBreakpoint: (bp: Breakpoint) => {
    set({ currentBreakpoint: bp });
  },

  loadLayouts: async (workspaceId: string, breakpoint = get().currentBreakpoint) => {
    set({ isLoading: true });
    try {
      const instances = await widgetInstanceRepo.getByWorkspace(workspaceId);
      const existing = await layoutRepo.getLayoutsByWorkspace(workspaceId, breakpoint);
      const synchronized = synchronizeLayout(workspaceId, breakpoint, instances, existing);

      // If missing layouts were generated, save them back
      if (synchronized.length !== existing.length) {
        await layoutRepo.saveLayouts(workspaceId, breakpoint, synchronized);
      }

      set({ layouts: synchronized, isLoading: false, currentBreakpoint: breakpoint });
    } catch (err) {
      console.error('[layoutStore] Failed to load layouts:', err);
      set({ layouts: [], isLoading: false });
    }
  },

  updateLayoutsInMemory: (items: WidgetLayoutEntity[]) => {
    set({ layouts: items });
  },

  saveLayoutsToDb: async (workspaceId: string, breakpoint = get().currentBreakpoint) => {
    const { layouts } = get();
    await layoutRepo.saveLayouts(workspaceId, breakpoint, layouts);
  },
}));
