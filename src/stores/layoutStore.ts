import { create } from 'zustand';
import { layoutRepo } from '../services/database/repositories/layoutRepository';
import { widgetInstanceRepo } from '../services/database/repositories/widgetInstanceRepository';
import { Breakpoint, WidgetLayoutEntity } from '../types/database';
import { synchronizeLayout } from '../features/layout-editor/layoutUtils';

interface LayoutState {
  currentBreakpoint: Breakpoint;
  layouts: WidgetLayoutEntity[];
  isLoading: boolean;
  isSaving: boolean;
  saveError: string | null;
  setCurrentBreakpoint: (bp: Breakpoint) => void;
  loadLayouts: (workspaceId: string, breakpoint?: Breakpoint) => Promise<void>;
  updateLayoutsInMemory: (items: WidgetLayoutEntity[]) => void;
  saveLayoutsToDb: (workspaceId: string, breakpoint?: Breakpoint) => Promise<void>;
  debouncedSaveLayouts: (workspaceId: string, breakpoint?: Breakpoint) => void;
}

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

export const useLayoutStore = create<LayoutState>((set, get) => ({
  currentBreakpoint: 'lg',
  layouts: [],
  isLoading: false,
  isSaving: false,
  saveError: null,

  setCurrentBreakpoint: (bp: Breakpoint) => {
    set({ currentBreakpoint: bp });
  },

  loadLayouts: async (workspaceId: string, breakpoint = get().currentBreakpoint) => {
    set({ isLoading: true, saveError: null });
    try {
      const instances = await widgetInstanceRepo.getByWorkspace(workspaceId);
      const existing = await layoutRepo.getLayoutsByWorkspace(workspaceId, breakpoint);
      const synchronized = synchronizeLayout(workspaceId, breakpoint, instances, existing);

      // Save if new default positions were generated
      if (synchronized.length !== existing.length) {
        await layoutRepo.saveLayouts(workspaceId, breakpoint, synchronized);
      }

      set({ layouts: synchronized, isLoading: false, currentBreakpoint: breakpoint });
    } catch (err: any) {
      console.error('[layoutStore] Failed to load layouts:', err);
      set({ layouts: [], isLoading: false, saveError: err?.message || 'Failed to load layouts' });
    }
  },

  updateLayoutsInMemory: (items: WidgetLayoutEntity[]) => {
    set({ layouts: items });
  },

  saveLayoutsToDb: async (workspaceId: string, breakpoint = get().currentBreakpoint) => {
    const { layouts } = get();
    if (!workspaceId || layouts.length === 0) return;

    set({ isSaving: true, saveError: null });
    try {
      await layoutRepo.saveLayouts(workspaceId, breakpoint, layouts);
      set({ isSaving: false });
    } catch (err: any) {
      console.error('[layoutStore] Failed to persist layouts to IndexedDB:', err);
      // Defensive: record error without crashing application
      set({ isSaving: false, saveError: err?.message || 'Failed to persist layout' });
    }
  },

  debouncedSaveLayouts: (workspaceId: string, breakpoint = get().currentBreakpoint) => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    debounceTimer = setTimeout(() => {
      get().saveLayoutsToDb(workspaceId, breakpoint);
      debounceTimer = null;
    }, 400); // 400ms debounce
  },
}));
