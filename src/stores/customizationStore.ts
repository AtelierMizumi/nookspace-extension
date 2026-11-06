import { create } from 'zustand';
import { Breakpoint, WidgetLayoutEntity, WidgetInstanceEntity } from '../types/database';
import { db } from '../services/database/db';
import {
  layoutRepo,
  WidgetLayoutInputSchema,
} from '../services/database/repositories/layoutRepository';
import { widgetInstanceRepo } from '../services/database/repositories/widgetInstanceRepository';

/**
 * Deep clone utility for layout entities and records.
 */
function deepClone<T>(obj: T): T {
  if (obj === undefined || obj === null) return obj;
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Compares two lists of layout entities for structural coordinate equality.
 */
function areLayoutListsEqual(
  listA: WidgetLayoutEntity[],
  listB: WidgetLayoutEntity[]
): boolean {
  if (listA.length !== listB.length) return false;

  const mapB = new Map<string, WidgetLayoutEntity>();
  for (const item of listB) {
    mapB.set(item.widgetInstanceId, item);
  }

  for (const a of listA) {
    const b = mapB.get(a.widgetInstanceId);
    if (!b) return false;
    if (a.x !== b.x || a.y !== b.y || a.w !== b.w || a.h !== b.h) {
      return false;
    }
  }

  return true;
}

/**
 * Compares all 5 responsive breakpoints between editing state and original snapshot.
 */
function areAllBreakpointsEqual(
  state: Record<Breakpoint, WidgetLayoutEntity[]>,
  snapshot: Record<Breakpoint, WidgetLayoutEntity[]>
): boolean {
  const breakpoints: Breakpoint[] = ['lg', 'md', 'sm', 'xs', 'xxs'];
  for (const bp of breakpoints) {
    const listA = state[bp] || [];
    const listB = snapshot[bp] || [];
    if (!areLayoutListsEqual(listA, listB)) {
      return false;
    }
  }
  return true;
}

const EMPTY_BREAKPOINT_MAP: Record<Breakpoint, WidgetLayoutEntity[]> = {
  lg: [],
  md: [],
  sm: [],
  xs: [],
  xxs: [],
};

export interface CustomizationState {
  // Mode & Workspace Identifiers
  isEditMode: boolean;
  activeWorkspaceId: string | null;
  currentBreakpoint: Breakpoint;

  // Editing State (In-Memory Draft)
  currentLayouts: WidgetLayoutEntity[];
  editingLayoutsByBreakpoint: Record<Breakpoint, WidgetLayoutEntity[]>;

  // Snapshot State (Persisted Reference Snapshot)
  originalLayoutsSnapshot: Record<Breakpoint, WidgetLayoutEntity[]> | null;
  snapshotWorkspaceId: string | null;

  // Staged modifications (Staged additions & Staged deletions)
  stagedDeletedWidgetIds: string[];
  stagedAddedWidgetIds: string[];
  stagedAddedInstances: WidgetInstanceEntity[];

  // Change tracking & Persistence Status
  hasUnsavedChanges: boolean;
  isSaving: boolean;
  saveError: string | null;

  // Navigation safety prompts
  isUnsavedPromptOpen: boolean;
  pendingWorkspaceSwitchId: string | null;

  // Actions
  enterEditMode: (workspaceId: string, breakpoint?: Breakpoint) => Promise<void>;
  updateEditingLayouts: (newLayouts: WidgetLayoutEntity[]) => void;
  setBreakpoint: (bp: Breakpoint) => void;
  stageDeleteWidget: (widgetInstanceId: string) => void;
  stageAddWidget: (
    widgetInstanceId: string,
    layoutsByBreakpoint: Partial<Record<Breakpoint, WidgetLayoutEntity>>,
    instance?: WidgetInstanceEntity
  ) => void;
  resetEditingLayouts: (defaultLayouts: Record<Breakpoint, WidgetLayoutEntity[]>) => void;
  cancelEditMode: () => {
    rolledBackLayouts: Record<Breakpoint, WidgetLayoutEntity[]> | null;
    stagedAddedToRemove: string[];
    stagedDeletedToRestore: string[];
  };
  commitEditMode: (workspaceId: string) => Promise<boolean>;
  requestWorkspaceSwitch: (newWorkspaceId: string) => 'ALLOW' | 'CONFIRM_REQUIRED';
  forceDiscardAndSwitchWorkspace: (newWorkspaceId: string) => void;
  closeUnsavedPrompt: () => void;
  isWidgetStagedForDeletion: (widgetInstanceId: string) => boolean;
}

export const useCustomizationStore = create<CustomizationState>((set, get) => ({
  isEditMode: false,
  activeWorkspaceId: null,
  currentBreakpoint: 'lg',

  currentLayouts: [],
  editingLayoutsByBreakpoint: deepClone(EMPTY_BREAKPOINT_MAP),

  originalLayoutsSnapshot: null,
  snapshotWorkspaceId: null,

  stagedDeletedWidgetIds: [],
  stagedAddedWidgetIds: [],
  stagedAddedInstances: [],

  hasUnsavedChanges: false,
  isSaving: false,
  saveError: null,

  isUnsavedPromptOpen: false,
  pendingWorkspaceSwitchId: null,

  /**
   * Enters Edit Mode: takes a deep clone snapshot across all 5 breakpoints
   * and initializes the editing draft without modifying IndexedDB.
   */
  enterEditMode: async (workspaceId: string, breakpoint = get().currentBreakpoint) => {
    if (!workspaceId) return;

    // Fetch existing persisted layouts across all breakpoints
    const allPersisted =
      (await layoutRepo.getAllLayoutsGrouped(workspaceId)) || deepClone(EMPTY_BREAKPOINT_MAP);

    // Deep clone snapshot so editing modifications never mutate the snapshot
    const snapshot = deepClone(allPersisted);

    set({
      isEditMode: true,
      activeWorkspaceId: workspaceId,
      currentBreakpoint: breakpoint,
      originalLayoutsSnapshot: snapshot,
      snapshotWorkspaceId: workspaceId,
      editingLayoutsByBreakpoint: deepClone(snapshot),
      currentLayouts: deepClone(snapshot[breakpoint] || []),
      stagedDeletedWidgetIds: [],
      stagedAddedWidgetIds: [],
      stagedAddedInstances: [],
      hasUnsavedChanges: false,
      isSaving: false,
      saveError: null,
    });
  },

  /**
   * Updates editing layouts for the current active breakpoint.
   * Compares with snapshot to accurately compute hasUnsavedChanges.
   */
  updateEditingLayouts: (newLayouts: WidgetLayoutEntity[]) => {
    const {
      currentBreakpoint,
      editingLayoutsByBreakpoint,
      originalLayoutsSnapshot,
      stagedDeletedWidgetIds,
      stagedAddedWidgetIds,
    } = get();

    const updatedMap: Record<Breakpoint, WidgetLayoutEntity[]> = {
      ...editingLayoutsByBreakpoint,
      [currentBreakpoint]: newLayouts,
    };

    let hasChanges = false;

    if (stagedDeletedWidgetIds.length > 0 || stagedAddedWidgetIds.length > 0) {
      hasChanges = true;
    } else if (originalLayoutsSnapshot) {
      hasChanges = !areAllBreakpointsEqual(updatedMap, originalLayoutsSnapshot);
    } else {
      hasChanges = true;
    }

    set({
      currentLayouts: newLayouts,
      editingLayoutsByBreakpoint: updatedMap,
      hasUnsavedChanges: hasChanges,
    });
  },

  /**
   * Switches breakpoint inside Edit Mode, preserving edits made in other breakpoints.
   */
  setBreakpoint: (bp: Breakpoint) => {
    const { editingLayoutsByBreakpoint } = get();
    set({
      currentBreakpoint: bp,
      currentLayouts: deepClone(editingLayoutsByBreakpoint[bp] || []),
    });
  },

  /**
   * Staged deletion: marks widget as pending deletion instead of immediately deleting from database.
   */
  stageDeleteWidget: (widgetInstanceId: string) => {
    const {
      stagedDeletedWidgetIds,
      stagedAddedWidgetIds,
      stagedAddedInstances,
      editingLayoutsByBreakpoint,
      currentBreakpoint,
    } = get();

    // If widget was added during this edit session, remove from stagedAdded and discard layout
    const wasAddedInSession = stagedAddedWidgetIds.includes(widgetInstanceId);
    const updatedAddedIds = stagedAddedWidgetIds.filter((id) => id !== widgetInstanceId);
    const updatedAddedInstances = stagedAddedInstances.filter((inst) => inst.id !== widgetInstanceId);
    const updatedDeleted = wasAddedInSession
      ? stagedDeletedWidgetIds
      : Array.from(new Set([...stagedDeletedWidgetIds, widgetInstanceId]));

    // Remove from all breakpoints in editing draft
    const updatedMap: Record<Breakpoint, WidgetLayoutEntity[]> = {
      lg: editingLayoutsByBreakpoint.lg.filter((l) => l.widgetInstanceId !== widgetInstanceId),
      md: editingLayoutsByBreakpoint.md.filter((l) => l.widgetInstanceId !== widgetInstanceId),
      sm: editingLayoutsByBreakpoint.sm.filter((l) => l.widgetInstanceId !== widgetInstanceId),
      xs: editingLayoutsByBreakpoint.xs.filter((l) => l.widgetInstanceId !== widgetInstanceId),
      xxs: editingLayoutsByBreakpoint.xxs.filter((l) => l.widgetInstanceId !== widgetInstanceId),
    };

    set({
      stagedAddedWidgetIds: updatedAddedIds,
      stagedAddedInstances: updatedAddedInstances,
      stagedDeletedWidgetIds: updatedDeleted,
      editingLayoutsByBreakpoint: updatedMap,
      currentLayouts: updatedMap[currentBreakpoint] || [],
      hasUnsavedChanges: true,
    });
  },

  /**
   * Staged addition: stages a newly added widget with its layouts across breakpoints.
   */
  stageAddWidget: (
    widgetInstanceId: string,
    layoutsByBreakpoint: Partial<Record<Breakpoint, WidgetLayoutEntity>>,
    instance?: WidgetInstanceEntity
  ) => {
    const {
      stagedAddedWidgetIds,
      stagedAddedInstances,
      stagedDeletedWidgetIds,
      editingLayoutsByBreakpoint,
      currentBreakpoint,
    } = get();

    const updatedAddedIds = Array.from(new Set([...stagedAddedWidgetIds, widgetInstanceId]));
    const updatedAddedInstances = instance
      ? [...stagedAddedInstances.filter((inst) => inst.id !== widgetInstanceId), instance]
      : stagedAddedInstances;
    const updatedDeleted = stagedDeletedWidgetIds.filter((id) => id !== widgetInstanceId);

    const breakpoints: Breakpoint[] = ['lg', 'md', 'sm', 'xs', 'xxs'];
    const updatedMap: Record<Breakpoint, WidgetLayoutEntity[]> = { ...editingLayoutsByBreakpoint };

    for (const bp of breakpoints) {
      const layoutItem = layoutsByBreakpoint[bp];
      if (layoutItem) {
        const withoutItem = (updatedMap[bp] || []).filter(
          (l) => l.widgetInstanceId !== widgetInstanceId
        );
        updatedMap[bp] = [...withoutItem, layoutItem];
      }
    }

    set({
      stagedAddedWidgetIds: updatedAddedIds,
      stagedAddedInstances: updatedAddedInstances,
      stagedDeletedWidgetIds: updatedDeleted,
      editingLayoutsByBreakpoint: updatedMap,
      currentLayouts: updatedMap[currentBreakpoint] || [],
      hasUnsavedChanges: true,
    });
  },

  /**
   * Resets editing layouts to default packing across breakpoints.
   * Marks hasUnsavedChanges = true without saving to IndexedDB yet.
   */
  resetEditingLayouts: (defaultLayouts: Record<Breakpoint, WidgetLayoutEntity[]>) => {
    const { currentBreakpoint } = get();
    const cloned = deepClone(defaultLayouts);

    set({
      editingLayoutsByBreakpoint: cloned,
      currentLayouts: cloned[currentBreakpoint] || [],
      hasUnsavedChanges: true,
    });
  },

  /**
   * Cancels Edit Mode: rolls back editing state to original snapshot,
   * releases snapshot, and returns rollback details for cleanup.
   * Does NOT touch IndexedDB.
   */
  cancelEditMode: () => {
    const {
      originalLayoutsSnapshot,
      currentBreakpoint,
      stagedAddedWidgetIds,
      stagedDeletedWidgetIds,
    } = get();

    const rolledBack = originalLayoutsSnapshot ? deepClone(originalLayoutsSnapshot) : null;
    const addedToRemove = [...stagedAddedWidgetIds];
    const deletedToRestore = [...stagedDeletedWidgetIds];

    set({
      isEditMode: false,
      currentLayouts: rolledBack ? rolledBack[currentBreakpoint] || [] : [],
      editingLayoutsByBreakpoint: rolledBack || deepClone(EMPTY_BREAKPOINT_MAP),
      originalLayoutsSnapshot: null,
      snapshotWorkspaceId: null,
      stagedDeletedWidgetIds: [],
      stagedAddedWidgetIds: [],
      stagedAddedInstances: [],
      hasUnsavedChanges: false,
      saveError: null,
      isUnsavedPromptOpen: false,
      pendingWorkspaceSwitchId: null,
    });

    return {
      rolledBackLayouts: rolledBack,
      stagedAddedToRemove: addedToRemove,
      stagedDeletedToRestore: deletedToRestore,
    };
  },

  /**
   * Commits Edit Mode: validates all layouts against Zod schemas, saves all modified
   * breakpoints within an atomic IndexedDB transaction, permanently deletes staged items,
   * releases snapshot, and transitions to View Mode.
   */
  commitEditMode: async (workspaceId: string): Promise<boolean> => {
    const {
      editingLayoutsByBreakpoint,
      stagedDeletedWidgetIds,
      hasUnsavedChanges,
      isSaving,
    } = get();

    if (!workspaceId) {
      set({ saveError: 'Cannot save: workspace ID is required.' });
      return false;
    }

    // Prevent concurrent commit operations
    if (isSaving) return false;

    // 1. If no unsaved changes, exit cleanly to View Mode without writing to IndexedDB
    if (!hasUnsavedChanges) {
      set({
        isEditMode: false,
        originalLayoutsSnapshot: null,
        snapshotWorkspaceId: null,
        stagedDeletedWidgetIds: [],
        stagedAddedWidgetIds: [],
        hasUnsavedChanges: false,
        saveError: null,
      });
      return true;
    }

    set({ isSaving: true, saveError: null });

    try {
      const breakpoints: Breakpoint[] = ['lg', 'md', 'sm', 'xs', 'xxs'];

      // 2. Validate all layout entities against Zod schema before starting database transaction
      for (const bp of breakpoints) {
        const items = editingLayoutsByBreakpoint[bp] || [];
        for (const item of items) {
          WidgetLayoutInputSchema.parse({
            ...item,
            workspaceId,
            breakpoint: bp,
          });
        }
      }

      // 3. Execute atomic transaction spanning widget instances and widget layouts
      await db.transaction('rw', [db.widgetInstances, db.widgetLayouts], async () => {
        // 3a. Insert staged added widget instances (if any) with workspace isolation verification
        const { stagedAddedInstances } = get();
        if (stagedAddedInstances.length > 0) {
          for (const inst of stagedAddedInstances) {
            if (inst.workspaceId !== workspaceId) {
              throw new Error(
                `Security Violation: Staged widget ${inst.id} belongs to ${inst.workspaceId}, not ${workspaceId}`
              );
            }
          }
          await db.widgetInstances.bulkPut(stagedAddedInstances);
        }

        // 3b. Permanently delete staged deleted widgets from database with workspace verification
        for (const instanceId of stagedDeletedWidgetIds) {
          const existingInst = await db.widgetInstances.get(instanceId);
          if (existingInst && existingInst.workspaceId !== workspaceId) {
            throw new Error(
              `Security Violation: Cannot delete widget ${instanceId} belonging to another workspace (${existingInst.workspaceId})`
            );
          }
          await widgetInstanceRepo.delete(instanceId);
          await layoutRepo.deleteLayout(instanceId);
        }

        // 3c. Persist layouts for each of the 5 responsive breakpoints
        for (const bp of breakpoints) {
          const items = editingLayoutsByBreakpoint[bp] || [];
          await layoutRepo.saveLayouts(workspaceId, bp, items);
        }
      });

      // 4. On transaction success: clear snapshot, clear staging, and exit Edit Mode
      set({
        isEditMode: false,
        isSaving: false,
        originalLayoutsSnapshot: null,
        snapshotWorkspaceId: null,
        stagedDeletedWidgetIds: [],
        stagedAddedWidgetIds: [],
        stagedAddedInstances: [],
        hasUnsavedChanges: false,
        saveError: null,
      });

      return true;
    } catch (err: any) {
      console.error('[customizationStore] Failed to commit layout changes:', err);
      // Defensive: preserve Edit Mode, draft layouts, and snapshot; present error to user
      set({
        isSaving: false,
        saveError: err?.message || 'Failed to save changes. Please try again.',
      });
      return false;
    }
  },

  /**
   * Safeguards workspace switching: checks if unsaved edits exist in the active workspace.
   */
  requestWorkspaceSwitch: (newWorkspaceId: string) => {
    const { isEditMode, hasUnsavedChanges, activeWorkspaceId } = get();

    // If switching to the exact same workspace, allow
    if (newWorkspaceId === activeWorkspaceId) {
      return 'ALLOW';
    }

    // If not in edit mode or no unsaved changes, allow switch and discard old snapshot
    if (!isEditMode || !hasUnsavedChanges) {
      set({
        isEditMode: false,
        activeWorkspaceId: newWorkspaceId,
        originalLayoutsSnapshot: null,
        snapshotWorkspaceId: null,
        stagedDeletedWidgetIds: [],
        stagedAddedWidgetIds: [],
        stagedAddedInstances: [],
        hasUnsavedChanges: false,
        saveError: null,
      });
      return 'ALLOW';
    }

    // Unsaved changes exist: require user confirmation
    set({
      isUnsavedPromptOpen: true,
      pendingWorkspaceSwitchId: newWorkspaceId,
    });
    return 'CONFIRM_REQUIRED';
  },

  /**
   * Forcibly discards unsaved edits from old workspace and transitions to new workspace.
   * Ensures old snapshot is discarded and never leaks into the new workspace.
   */
  forceDiscardAndSwitchWorkspace: (newWorkspaceId: string) => {
    set({
      isEditMode: false,
      activeWorkspaceId: newWorkspaceId,
      originalLayoutsSnapshot: null,
      snapshotWorkspaceId: null,
      stagedDeletedWidgetIds: [],
      stagedAddedWidgetIds: [],
      stagedAddedInstances: [],
      hasUnsavedChanges: false,
      saveError: null,
      isUnsavedPromptOpen: false,
      pendingWorkspaceSwitchId: null,
    });
  },

  closeUnsavedPrompt: () => {
    set({
      isUnsavedPromptOpen: false,
      pendingWorkspaceSwitchId: null,
    });
  },

  isWidgetStagedForDeletion: (widgetInstanceId: string) => {
    return get().stagedDeletedWidgetIds.includes(widgetInstanceId);
  },
}));
