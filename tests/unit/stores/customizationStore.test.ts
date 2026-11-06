import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useCustomizationStore } from '../../../src/stores/customizationStore';
import { layoutRepo } from '../../../src/services/database/repositories/layoutRepository';
import { widgetInstanceRepo } from '../../../src/services/database/repositories/widgetInstanceRepository';
import { Breakpoint, WidgetLayoutEntity } from '../../../src/types/database';

vi.mock('../../../src/services/database/repositories/layoutRepository', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/services/database/repositories/layoutRepository')>();
  return {
    ...actual,
    layoutRepo: {
      ...actual.layoutRepo,
      getAllLayoutsGrouped: vi.fn(),
      saveLayouts: vi.fn(),
      deleteLayout: vi.fn(),
    },
  };
});

vi.mock('../../../src/services/database/repositories/widgetInstanceRepository', () => ({
  widgetInstanceRepo: {
    delete: vi.fn(),
  },
}));

const mockGroupedLayouts: Record<Breakpoint, WidgetLayoutEntity[]> = {
  lg: [
    {
      id: 'ws-1_widget-clock_lg',
      workspaceId: 'ws-1',
      widgetInstanceId: 'widget-clock',
      breakpoint: 'lg',
      x: 0,
      y: 0,
      w: 4,
      h: 2,
      minW: 2,
      minH: 2,
      isDefault: true,
      createdAt: 1000,
      updatedAt: 1000,
    },
    {
      id: 'ws-1_widget-todo_lg',
      workspaceId: 'ws-1',
      widgetInstanceId: 'widget-todo',
      breakpoint: 'lg',
      x: 4,
      y: 0,
      w: 8,
      h: 4,
      minW: 4,
      minH: 3,
      isDefault: true,
      createdAt: 1000,
      updatedAt: 1000,
    },
  ],
  md: [
    {
      id: 'ws-1_widget-clock_md',
      workspaceId: 'ws-1',
      widgetInstanceId: 'widget-clock',
      breakpoint: 'md',
      x: 0,
      y: 0,
      w: 4,
      h: 2,
      minW: 2,
      minH: 2,
      isDefault: true,
      createdAt: 1000,
      updatedAt: 1000,
    },
  ],
  sm: [],
  xs: [],
  xxs: [],
};

describe('Milestone 3.1 — Customization Studio State Architecture', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useCustomizationStore.setState({
      isEditMode: false,
      activeWorkspaceId: null,
      currentBreakpoint: 'lg',
      currentLayouts: [],
      editingLayoutsByBreakpoint: { lg: [], md: [], sm: [], xs: [], xxs: [] },
      originalLayoutsSnapshot: null,
      snapshotWorkspaceId: null,
      stagedDeletedWidgetIds: [],
      stagedAddedWidgetIds: [],
      hasUnsavedChanges: false,
      isSaving: false,
      saveError: null,
      isUnsavedPromptOpen: false,
      pendingWorkspaceSwitchId: null,
    });
  });

  it('1. initializes in View Mode with clean state and no snapshot', () => {
    const state = useCustomizationStore.getState();
    expect(state.isEditMode).toBe(false);
    expect(state.originalLayoutsSnapshot).toBeNull();
    expect(state.snapshotWorkspaceId).toBeNull();
    expect(state.hasUnsavedChanges).toBe(false);
    expect(state.stagedDeletedWidgetIds).toEqual([]);
    expect(state.stagedAddedWidgetIds).toEqual([]);
  });

  it('2. enterEditMode takes a deep clone snapshot across all breakpoints without writing to IndexedDB', async () => {
    vi.mocked(layoutRepo.getAllLayoutsGrouped).mockResolvedValueOnce(mockGroupedLayouts);

    await useCustomizationStore.getState().enterEditMode('ws-1', 'lg');

    const state = useCustomizationStore.getState();
    expect(state.isEditMode).toBe(true);
    expect(state.activeWorkspaceId).toBe('ws-1');
    expect(state.snapshotWorkspaceId).toBe('ws-1');
    expect(state.hasUnsavedChanges).toBe(false);

    // Snapshot is populated across all 5 breakpoints
    expect(state.originalLayoutsSnapshot).not.toBeNull();
    expect(state.originalLayoutsSnapshot?.lg).toHaveLength(2);
    expect(state.originalLayoutsSnapshot?.md).toHaveLength(1);

    // Deep clone isolation: mutating editing draft does not mutate originalLayoutsSnapshot
    state.currentLayouts[0].x = 99;
    expect(state.originalLayoutsSnapshot?.lg[0].x).toBe(0);

    // Zero DB writes during entry
    expect(layoutRepo.saveLayouts).not.toHaveBeenCalled();
    expect(widgetInstanceRepo.delete).not.toHaveBeenCalled();
  });

  it('3. updateEditingLayouts accurately detects coordinate changes and toggles hasUnsavedChanges', async () => {
    vi.mocked(layoutRepo.getAllLayoutsGrouped).mockResolvedValueOnce(mockGroupedLayouts);
    await useCustomizationStore.getState().enterEditMode('ws-1', 'lg');

    // Move widget-clock from x:0 to x:2
    const moved = [
      { ...mockGroupedLayouts.lg[0], x: 2 },
      { ...mockGroupedLayouts.lg[1] },
    ];
    useCustomizationStore.getState().updateEditingLayouts(moved);

    expect(useCustomizationStore.getState().hasUnsavedChanges).toBe(true);
    expect(useCustomizationStore.getState().currentLayouts[0].x).toBe(2);

    // Moving back to exact original coordinates restores hasUnsavedChanges to false
    const restored = [
      { ...mockGroupedLayouts.lg[0], x: 0 },
      { ...mockGroupedLayouts.lg[1] },
    ];
    useCustomizationStore.getState().updateEditingLayouts(restored);
    expect(useCustomizationStore.getState().hasUnsavedChanges).toBe(false);
  });

  it('4. staged deletion marks widget as pending deletion without immediately deleting from DB', async () => {
    vi.mocked(layoutRepo.getAllLayoutsGrouped).mockResolvedValueOnce(mockGroupedLayouts);
    await useCustomizationStore.getState().enterEditMode('ws-1', 'lg');

    useCustomizationStore.getState().stageDeleteWidget('widget-clock');

    const state = useCustomizationStore.getState();
    expect(state.stagedDeletedWidgetIds).toContain('widget-clock');
    expect(state.hasUnsavedChanges).toBe(true);
    // Widget layout removed from editing draft
    expect(state.currentLayouts.some((l) => l.widgetInstanceId === 'widget-clock')).toBe(false);
    // Database remains untouched
    expect(widgetInstanceRepo.delete).not.toHaveBeenCalled();
    expect(layoutRepo.deleteLayout).not.toHaveBeenCalled();
  });

  it('5. cancelEditMode rolls back to snapshot, releases snapshot, and restores all layouts', async () => {
    vi.mocked(layoutRepo.getAllLayoutsGrouped).mockResolvedValueOnce(mockGroupedLayouts);
    await useCustomizationStore.getState().enterEditMode('ws-1', 'lg');

    // Perform edits and stage deletion
    useCustomizationStore.getState().updateEditingLayouts([
      { ...mockGroupedLayouts.lg[0], x: 5, y: 5 },
    ]);
    useCustomizationStore.getState().stageDeleteWidget('widget-todo');

    expect(useCustomizationStore.getState().hasUnsavedChanges).toBe(true);

    // Cancel edit mode
    const rollback = useCustomizationStore.getState().cancelEditMode();

    const state = useCustomizationStore.getState();
    expect(state.isEditMode).toBe(false);
    expect(state.hasUnsavedChanges).toBe(false);
    expect(state.originalLayoutsSnapshot).toBeNull();
    expect(state.snapshotWorkspaceId).toBeNull();
    expect(state.stagedDeletedWidgetIds).toEqual([]);

    // Restores original coordinates
    expect(state.currentLayouts).toHaveLength(2);
    expect(state.currentLayouts[0].x).toBe(0);
    expect(rollback.stagedDeletedToRestore).toContain('widget-todo');

    // Zero DB writes
    expect(layoutRepo.saveLayouts).not.toHaveBeenCalled();
    expect(widgetInstanceRepo.delete).not.toHaveBeenCalled();
  });

  it('6. commitEditMode persists modified breakpoints, permanently deletes staged items, and releases snapshot', async () => {
    vi.mocked(layoutRepo.getAllLayoutsGrouped).mockResolvedValueOnce(mockGroupedLayouts);
    vi.mocked(layoutRepo.saveLayouts).mockResolvedValue([]);
    vi.mocked(widgetInstanceRepo.delete).mockResolvedValue();
    vi.mocked(layoutRepo.deleteLayout).mockResolvedValue();

    await useCustomizationStore.getState().enterEditMode('ws-1', 'lg');

    // Move widget and stage delete
    useCustomizationStore.getState().updateEditingLayouts([
      { ...mockGroupedLayouts.lg[0], x: 1, y: 1 },
    ]);
    useCustomizationStore.getState().stageDeleteWidget('widget-todo');

    const success = await useCustomizationStore.getState().commitEditMode('ws-1');

    expect(success).toBe(true);
    expect(widgetInstanceRepo.delete).toHaveBeenCalledWith('widget-todo');
    expect(layoutRepo.deleteLayout).toHaveBeenCalledWith('widget-todo');
    expect(layoutRepo.saveLayouts).toHaveBeenCalledTimes(5); // Saved across 5 breakpoints

    const state = useCustomizationStore.getState();
    expect(state.isEditMode).toBe(false);
    expect(state.hasUnsavedChanges).toBe(false);
    expect(state.originalLayoutsSnapshot).toBeNull();
  });

  it('7. commitEditMode handles failure defensively: keeps Edit Mode open with editing state intact and records saveError', async () => {
    vi.mocked(layoutRepo.getAllLayoutsGrouped).mockResolvedValueOnce(mockGroupedLayouts);
    vi.mocked(layoutRepo.saveLayouts).mockRejectedValueOnce(new Error('IndexedDB QuotaExceeded'));

    await useCustomizationStore.getState().enterEditMode('ws-1', 'lg');
    useCustomizationStore.getState().updateEditingLayouts([
      { ...mockGroupedLayouts.lg[0], x: 3 },
    ]);

    const success = await useCustomizationStore.getState().commitEditMode('ws-1');

    expect(success).toBe(false);
    const state = useCustomizationStore.getState();
    expect(state.isEditMode).toBe(true); // Edit Mode remains open
    expect(state.hasUnsavedChanges).toBe(true);
    expect(state.saveError).toBe('IndexedDB QuotaExceeded');
    expect(state.currentLayouts[0].x).toBe(3); // Draft preserved
  });

  it('8. workspace switching safeguards: prevents cross-workspace snapshot contamination', async () => {
    vi.mocked(layoutRepo.getAllLayoutsGrouped).mockResolvedValue(mockGroupedLayouts);
    await useCustomizationStore.getState().enterEditMode('ws-1', 'lg');

    // No unsaved changes -> switch is allowed immediately
    const result1 = useCustomizationStore.getState().requestWorkspaceSwitch('ws-2');
    expect(result1).toBe('ALLOW');
    expect(useCustomizationStore.getState().originalLayoutsSnapshot).toBeNull(); // Old snapshot discarded

    // Enter edit mode in ws-2 and make changes
    await useCustomizationStore.getState().enterEditMode('ws-2', 'lg');
    useCustomizationStore.getState().updateEditingLayouts([
      { ...mockGroupedLayouts.lg[0], x: 5 },
    ]);

    // Unsaved changes exist -> switch requires confirmation
    const result2 = useCustomizationStore.getState().requestWorkspaceSwitch('ws-3');
    expect(result2).toBe('CONFIRM_REQUIRED');
    expect(useCustomizationStore.getState().isUnsavedPromptOpen).toBe(true);
    expect(useCustomizationStore.getState().pendingWorkspaceSwitchId).toBe('ws-3');

    // Force discard cleanly switches and purges ws-2 snapshot
    useCustomizationStore.getState().forceDiscardAndSwitchWorkspace('ws-3');
    const state = useCustomizationStore.getState();
    expect(state.activeWorkspaceId).toBe('ws-3');
    expect(state.isEditMode).toBe(false);
    expect(state.originalLayoutsSnapshot).toBeNull();
    expect(state.hasUnsavedChanges).toBe(false);
  });

  it('9. resetEditingLayouts updates editing state without persisting to DB and can be rolled back via Cancel', async () => {
    vi.mocked(layoutRepo.getAllLayoutsGrouped).mockResolvedValueOnce(mockGroupedLayouts);
    await useCustomizationStore.getState().enterEditMode('ws-1', 'lg');

    const defaultPack: Record<Breakpoint, WidgetLayoutEntity[]> = {
      lg: [{ ...mockGroupedLayouts.lg[0], x: 0, y: 0 }],
      md: [],
      sm: [],
      xs: [],
      xxs: [],
    };

    useCustomizationStore.getState().resetEditingLayouts(defaultPack);

    expect(useCustomizationStore.getState().hasUnsavedChanges).toBe(true);
    expect(layoutRepo.saveLayouts).not.toHaveBeenCalled(); // Not saved yet!

    // Canceling rolls back to the snapshot taken before reset
    useCustomizationStore.getState().cancelEditMode();
    expect(useCustomizationStore.getState().currentLayouts).toHaveLength(2);
    expect(useCustomizationStore.getState().hasUnsavedChanges).toBe(false);
  });
});
