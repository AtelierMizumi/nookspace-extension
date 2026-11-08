import { create } from 'zustand';
import {
  layoutRepo as defaultLayoutRepo,
  LayoutRepository,
} from '../services/database/repositories/layoutRepository';
import {
  widgetInstanceRepo as defaultWidgetInstanceRepo,
  WidgetInstanceRepository,
} from '../services/database/repositories/widgetInstanceRepository';
import { Breakpoint, WidgetLayoutEntity } from '../types/database';
import { synchronizeLayout } from '../features/layout-editor/layoutUtils';

export interface LayoutState {
  currentBreakpoint: Breakpoint;
  activeWorkspaceId: string | null;
  layouts: WidgetLayoutEntity[];
  isLoading: boolean;
  isSaving: boolean;
  saveError: string | null;
  setCurrentBreakpoint: (bp: Breakpoint) => void;
  loadLayouts: (workspaceId: string, breakpoint?: Breakpoint) => Promise<void>;
  updateLayoutsInMemory: (items: WidgetLayoutEntity[]) => void;
  saveLayoutsToDb: (workspaceId: string, breakpoint?: Breakpoint) => Promise<void>;
  debouncedSaveLayouts: (workspaceId: string, breakpoint?: Breakpoint) => void;
  clearPendingDebounce: () => void;
  clearLayouts: () => void;
}

export interface LayoutStoreDependencies {
  layoutRepo?: LayoutRepository;
  widgetInstanceRepo?: WidgetInstanceRepository;
}

export function createLayoutStore(deps: LayoutStoreDependencies = {}) {
  const lRepo = deps.layoutRepo ?? defaultLayoutRepo;
  const wRepo = deps.widgetInstanceRepo ?? defaultWidgetInstanceRepo;

  let latestRequestId = 0;
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let pendingDebounceWorkspaceId: string | null = null;
  let pendingDebounceBreakpoint: Breakpoint | null = null;
  let pendingDebounceSnapshot: WidgetLayoutEntity[] = [];

  return create<LayoutState>((set, get) => ({
    currentBreakpoint: 'lg',
    activeWorkspaceId: null,
    layouts: [],
    isLoading: false,
    isSaving: false,
    saveError: null,

    setCurrentBreakpoint: (bp: Breakpoint) => {
      set({ currentBreakpoint: bp });
    },

    loadLayouts: async (workspaceId: string, breakpoint = get().currentBreakpoint) => {
      // If there is a pending debounce from another workspace, cancel it immediately
      if (pendingDebounceWorkspaceId && pendingDebounceWorkspaceId !== workspaceId) {
        if (debounceTimer) {
          clearTimeout(debounceTimer);
          debounceTimer = null;
        }
        pendingDebounceWorkspaceId = null;
        pendingDebounceBreakpoint = null;
        pendingDebounceSnapshot = [];
      }

      const requestId = ++latestRequestId;
      const isDifferentWorkspace = get().activeWorkspaceId !== workspaceId;

      // Immediately isolate and clear previous layouts if switching workspace
      set({
        isLoading: true,
        saveError: null,
        activeWorkspaceId: workspaceId,
        currentBreakpoint: breakpoint,
        ...(isDifferentWorkspace ? { layouts: [] } : {}),
      });

      try {
        const instances = await wRepo.getByWorkspace(workspaceId);
        const existing = await lRepo.getLayoutsByWorkspace(workspaceId, breakpoint);
        const synchronized = synchronizeLayout(workspaceId, breakpoint, instances, existing);

        // Discard stale responses if workspace switched during fetch
        if (requestId !== latestRequestId || get().activeWorkspaceId !== workspaceId) {
          return;
        }

        // Save if new default positions were generated (only when instances exist)
        if (instances.length > 0 && synchronized.length !== existing.length) {
          await lRepo.saveLayouts(workspaceId, breakpoint, synchronized);
        }

        if (requestId === latestRequestId && get().activeWorkspaceId === workspaceId) {
          set({ layouts: synchronized, isLoading: false, currentBreakpoint: breakpoint });
        }
      } catch (err: any) {
        if (requestId === latestRequestId && get().activeWorkspaceId === workspaceId) {
          console.error('[layoutStore] Failed to load layouts:', err);
          set({ layouts: [], isLoading: false, saveError: err?.message || 'Failed to load layouts' });
        }
      }
    },

    updateLayoutsInMemory: (items: WidgetLayoutEntity[]) => {
      set({ layouts: items });
    },

    saveLayoutsToDb: async (workspaceId: string, breakpoint = get().currentBreakpoint) => {
      const { layouts } = get();
      if (!workspaceId || layouts.length === 0) return;

      // Security/isolation safeguard: ensure all layout items match target workspace
      if (layouts.some((item) => item.workspaceId !== workspaceId)) {
        console.warn('[layoutStore] Save rejected: layout item does not match workspaceId', workspaceId);
        return;
      }

      set({ isSaving: true, saveError: null });
      try {
        await lRepo.saveLayouts(workspaceId, breakpoint, layouts);
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
        debounceTimer = null;
      }

      const currentLayouts = get().layouts;
      // Security/isolation check: reject if layout belongs to another workspace
      if (currentLayouts.some((item) => item.workspaceId !== workspaceId)) {
        return;
      }

      pendingDebounceWorkspaceId = workspaceId;
      pendingDebounceBreakpoint = breakpoint;
      pendingDebounceSnapshot = JSON.parse(JSON.stringify(currentLayouts));

      debounceTimer = setTimeout(async () => {
        const targetWs = pendingDebounceWorkspaceId;
        const targetBp = pendingDebounceBreakpoint || breakpoint;
        const snapshot = pendingDebounceSnapshot;

        debounceTimer = null;
        pendingDebounceWorkspaceId = null;
        pendingDebounceBreakpoint = null;
        pendingDebounceSnapshot = [];

        if (!targetWs || snapshot.length === 0) return;
        if (snapshot.every((item) => item.workspaceId === targetWs)) {
          try {
            await lRepo.saveLayouts(targetWs, targetBp, snapshot);
          } catch (err: any) {
            console.error('[layoutStore] Debounced save failed:', err);
          }
        }
      }, 400); // 400ms debounce
    },

    clearPendingDebounce: () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
        debounceTimer = null;
      }
      pendingDebounceWorkspaceId = null;
      pendingDebounceBreakpoint = null;
      pendingDebounceSnapshot = [];
    },

    clearLayouts: () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
        debounceTimer = null;
      }
      set({ layouts: [], activeWorkspaceId: null, isLoading: false, saveError: null });
    },
  }));
}

export const useLayoutStore = createLayoutStore();
