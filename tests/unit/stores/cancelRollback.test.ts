import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../../../src/services/database/db';
import { useCustomizationStore } from '../../../src/stores/customizationStore';
import { Breakpoint, WidgetInstanceEntity, WidgetLayoutEntity } from '../../../src/types/database';

describe('Milestone 3.4 — Cancel & Snapshot Rollback', () => {
  const WS_ID = 'ws-cancel-test';

  beforeEach(async () => {
    await db.widgetInstances.clear();
    await db.widgetLayouts.clear();

    // Seed 2 existing widgets in database
    const widgetClock: WidgetInstanceEntity = {
      id: 'inst-clock',
      workspaceId: WS_ID,
      widgetType: 'clock',
      title: 'Digital Clock',
      config: { is24Hour: false },
      isEnabled: true,
      order: 0,
      createdAt: 1000,
      updatedAt: 1000,
    };

    const widgetTodo: WidgetInstanceEntity = {
      id: 'inst-todo',
      workspaceId: WS_ID,
      widgetType: 'todo',
      title: 'Task List Preview',
      config: { defaultFilter: 'all' },
      isEnabled: true,
      order: 1,
      createdAt: 1000,
      updatedAt: 1000,
    };

    await db.widgetInstances.bulkPut([widgetClock, widgetTodo]);

    // Seed layouts across 5 breakpoints
    const breakpoints: Breakpoint[] = ['lg', 'md', 'sm', 'xs', 'xxs'];
    const initialLayouts: WidgetLayoutEntity[] = [];

    for (const bp of breakpoints) {
      initialLayouts.push(
        {
          id: `${WS_ID}_inst-clock_${bp}`,
          workspaceId: WS_ID,
          widgetInstanceId: 'inst-clock',
          breakpoint: bp,
          x: 0,
          y: 0,
          w: bp === 'xs' || bp === 'xxs' ? 2 : 4,
          h: 2,
          minW: 2,
          minH: 2,
          isDefault: true,
          createdAt: 1000,
          updatedAt: 1000,
        },
        {
          id: `${WS_ID}_inst-todo_${bp}`,
          workspaceId: WS_ID,
          widgetInstanceId: 'inst-todo',
          breakpoint: bp,
          x: bp === 'xs' || bp === 'xxs' ? 0 : 4,
          y: bp === 'xs' || bp === 'xxs' ? 2 : 0,
          w: bp === 'xs' || bp === 'xxs' ? 2 : 6,
          h: 4,
          minW: 2,
          minH: 2,
          isDefault: true,
          createdAt: 1000,
          updatedAt: 1000,
        }
      );
    }

    await db.widgetLayouts.bulkPut(initialLayouts);

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
      stagedAddedInstances: [],
      hasUnsavedChanges: false,
      isSaving: false,
      saveError: null,
      isUnsavedPromptOpen: false,
      pendingWorkspaceSwitchId: null,
    });
  });

  it('1. rolls back position and size across all 5 responsive breakpoints to original snapshot', async () => {
    await useCustomizationStore.getState().enterEditMode(WS_ID, 'lg');

    // Modify layout on lg (move clock to x:6, w:6)
    useCustomizationStore.getState().updateEditingLayouts([
      {
        id: `${WS_ID}_inst-clock_lg`,
        workspaceId: WS_ID,
        widgetInstanceId: 'inst-clock',
        breakpoint: 'lg',
        x: 6,
        y: 2,
        w: 6,
        h: 3,
        isDefault: false,
        createdAt: 1000,
        updatedAt: 2000,
      },
      {
        id: `${WS_ID}_inst-todo_lg`,
        workspaceId: WS_ID,
        widgetInstanceId: 'inst-todo',
        breakpoint: 'lg',
        x: 0,
        y: 0,
        w: 4,
        h: 4,
        isDefault: false,
        createdAt: 1000,
        updatedAt: 2000,
      },
    ]);

    // Switch to md and modify
    useCustomizationStore.getState().setBreakpoint('md');
    useCustomizationStore.getState().updateEditingLayouts([
      {
        id: `${WS_ID}_inst-clock_md`,
        workspaceId: WS_ID,
        widgetInstanceId: 'inst-clock',
        breakpoint: 'md',
        x: 2,
        y: 4,
        w: 6,
        h: 2,
        isDefault: false,
        createdAt: 1000,
        updatedAt: 2000,
      },
    ]);

    expect(useCustomizationStore.getState().hasUnsavedChanges).toBe(true);

    // Cancel edit mode
    const rollback = useCustomizationStore.getState().cancelEditMode();

    const state = useCustomizationStore.getState();
    expect(state.isEditMode).toBe(false);
    expect(state.hasUnsavedChanges).toBe(false);
    expect(state.originalLayoutsSnapshot).toBeNull();
    expect(state.snapshotWorkspaceId).toBeNull();

    // Verify lg restored to original
    expect(rollback.rolledBackLayouts?.lg[0].x).toBe(0);
    expect(rollback.rolledBackLayouts?.lg[0].w).toBe(4);

    // Verify md restored to original
    expect(rollback.rolledBackLayouts?.md[0].x).toBe(0);
    expect(rollback.rolledBackLayouts?.md[0].w).toBe(4);

    // Verify database was untouched
    const lgInDb = await db.widgetLayouts.get(`${WS_ID}_inst-clock_lg`);
    expect(lgInDb?.x).toBe(0);
    expect(lgInDb?.w).toBe(4);
  });

  it('2. staged added widgets are cleanly rolled back leaving zero orphan instances or layouts', async () => {
    await useCustomizationStore.getState().enterEditMode(WS_ID, 'lg');

    const stagedWidget: WidgetInstanceEntity = {
      id: 'inst-new-quicknotes',
      workspaceId: WS_ID,
      widgetType: 'notes',
      title: 'Quick Notes',
      config: { noteContent: 'Temporary draft note' },
      isEnabled: true,
      order: 2,
      createdAt: 2000,
      updatedAt: 2000,
    };

    useCustomizationStore.getState().stageAddWidget(
      'inst-new-quicknotes',
      {
        lg: {
          id: `${WS_ID}_inst-new-quicknotes_lg`,
          workspaceId: WS_ID,
          widgetInstanceId: 'inst-new-quicknotes',
          breakpoint: 'lg',
          x: 0,
          y: 4,
          w: 8,
          h: 4,
          isDefault: true,
          createdAt: 2000,
          updatedAt: 2000,
        },
      },
      stagedWidget
    );

    expect(useCustomizationStore.getState().stagedAddedInstances).toHaveLength(1);
    expect(useCustomizationStore.getState().hasUnsavedChanges).toBe(true);

    // User cancels
    useCustomizationStore.getState().cancelEditMode();

    const state = useCustomizationStore.getState();
    expect(state.isEditMode).toBe(false);
    expect(state.stagedAddedInstances).toHaveLength(0);
    expect(state.stagedAddedWidgetIds).toHaveLength(0);

    // Verify zero writes in database
    const widgetInDb = await db.widgetInstances.get('inst-new-quicknotes');
    expect(widgetInDb).toBeUndefined();

    const layoutInDb = await db.widgetLayouts.get(`${WS_ID}_inst-new-quicknotes_lg`);
    expect(layoutInDb).toBeUndefined();
  });

  it('3. staged deleted widgets are restored with 100% data fidelity (no loss of tasks or configs)', async () => {
    await useCustomizationStore.getState().enterEditMode(WS_ID, 'lg');

    // User stages inst-todo for deletion
    useCustomizationStore.getState().stageDeleteWidget('inst-todo');

    expect(useCustomizationStore.getState().stagedDeletedWidgetIds).toContain('inst-todo');
    expect(useCustomizationStore.getState().currentLayouts.some((l) => l.widgetInstanceId === 'inst-todo')).toBe(false);

    // User cancels
    useCustomizationStore.getState().cancelEditMode();

    const state = useCustomizationStore.getState();
    expect(state.stagedDeletedWidgetIds).toHaveLength(0);
    expect(state.currentLayouts.some((l) => l.widgetInstanceId === 'inst-todo')).toBe(true);

    // Verify database record and configuration are completely intact
    const todoInDb = await db.widgetInstances.get('inst-todo');
    expect(todoInDb).toBeDefined();
    expect(todoInDb?.config).toEqual({ defaultFilter: 'all' });
    expect(todoInDb?.title).toBe('Task List Preview');

    // Layouts are intact in database
    const todoLayoutInDb = await db.widgetLayouts.get(`${WS_ID}_inst-todo_lg`);
    expect(todoLayoutInDb).toBeDefined();
  });

  it('4. handles adding and deleting the same widget in the same session then canceling', async () => {
    await useCustomizationStore.getState().enterEditMode(WS_ID, 'lg');

    const tempWidget: WidgetInstanceEntity = {
      id: 'inst-temp',
      workspaceId: WS_ID,
      widgetType: 'clock',
      title: 'Temp Clock',
      config: {},
      isEnabled: true,
      order: 2,
      createdAt: 2000,
      updatedAt: 2000,
    };

    // Add
    useCustomizationStore.getState().stageAddWidget('inst-temp', {}, tempWidget);
    expect(useCustomizationStore.getState().stagedAddedInstances).toHaveLength(1);

    // Delete the same widget
    useCustomizationStore.getState().stageDeleteWidget('inst-temp');
    expect(useCustomizationStore.getState().stagedAddedInstances).toHaveLength(0);
    expect(useCustomizationStore.getState().stagedDeletedWidgetIds).toHaveLength(0); // Not marked as deleted since it was never in DB!

    // Cancel
    useCustomizationStore.getState().cancelEditMode();
    expect(useCustomizationStore.getState().isEditMode).toBe(false);
  });

  it('5. Reset Layout followed by Cancel restores the exact pre-reset snapshot', async () => {
    await useCustomizationStore.getState().enterEditMode(WS_ID, 'lg');

    // Reset editing layouts to default packing
    const defaultPacking: Record<Breakpoint, WidgetLayoutEntity[]> = {
      lg: [
        {
          id: `${WS_ID}_inst-clock_lg`,
          workspaceId: WS_ID,
          widgetInstanceId: 'inst-clock',
          breakpoint: 'lg',
          x: 0,
          y: 0,
          w: 6,
          h: 2,
          isDefault: true,
          createdAt: 1000,
          updatedAt: 3000,
        },
      ],
      md: [],
      sm: [],
      xs: [],
      xxs: [],
    };

    useCustomizationStore.getState().resetEditingLayouts(defaultPacking);

    expect(useCustomizationStore.getState().hasUnsavedChanges).toBe(true);
    expect(useCustomizationStore.getState().currentLayouts[0].w).toBe(6);

    // Cancel edit mode
    useCustomizationStore.getState().cancelEditMode();

    const state = useCustomizationStore.getState();
    expect(state.isEditMode).toBe(false);
    expect(state.hasUnsavedChanges).toBe(false);

    // Pre-reset layout had 2 widgets on lg, clock had w: 4
    expect(state.currentLayouts).toHaveLength(2);
    expect(state.currentLayouts[0].w).toBe(4);
  });

  it('6. Scenario E — Add, Delete, Reset, and Multi-breakpoint edits combined rollback to exact initial state', async () => {
    await useCustomizationStore.getState().enterEditMode(WS_ID, 'lg');

    // 1. Add new widget
    const newWidget: WidgetInstanceEntity = {
      id: 'inst-combo-new',
      workspaceId: WS_ID,
      widgetType: 'greeting',
      title: 'Combo Greeting',
      config: {},
      isEnabled: true,
      order: 2,
      createdAt: 2000,
      updatedAt: 2000,
    };
    useCustomizationStore.getState().stageAddWidget('inst-combo-new', {}, newWidget);

    // 2. Stage delete inst-clock
    useCustomizationStore.getState().stageDeleteWidget('inst-clock');

    // 3. Reset Layout
    useCustomizationStore.getState().resetEditingLayouts({
      lg: [
        {
          id: `${WS_ID}_inst-todo_lg`,
          workspaceId: WS_ID,
          widgetInstanceId: 'inst-todo',
          breakpoint: 'lg',
          x: 0,
          y: 0,
          w: 12,
          h: 4,
          isDefault: true,
          createdAt: 1000,
          updatedAt: 4000,
        },
      ],
      md: [],
      sm: [],
      xs: [],
      xxs: [],
    });

    // 4. Modify another breakpoint (sm)
    useCustomizationStore.getState().setBreakpoint('sm');
    useCustomizationStore.getState().updateEditingLayouts([
      {
        id: `${WS_ID}_inst-todo_sm`,
        workspaceId: WS_ID,
        widgetInstanceId: 'inst-todo',
        breakpoint: 'sm',
        x: 0,
        y: 0,
        w: 6,
        h: 6,
        isDefault: false,
        createdAt: 1000,
        updatedAt: 5000,
      },
    ]);

    expect(useCustomizationStore.getState().hasUnsavedChanges).toBe(true);

    // 5. Cancel
    useCustomizationStore.getState().cancelEditMode();

    const state = useCustomizationStore.getState();
    expect(state.isEditMode).toBe(false);
    expect(state.hasUnsavedChanges).toBe(false);
    expect(state.stagedAddedInstances).toHaveLength(0);
    expect(state.stagedDeletedWidgetIds).toHaveLength(0);
    expect(state.originalLayoutsSnapshot).toBeNull();

    // Verify initial widgets and layouts are restored
    expect(state.currentLayouts).toHaveLength(2); // inst-clock and inst-todo restored on lg
    expect(state.editingLayoutsByBreakpoint.sm).toHaveLength(2);

    // Verify DB was untouched
    const clockInDb = await db.widgetInstances.get('inst-clock');
    expect(clockInDb).toBeDefined();

    const newWidgetInDb = await db.widgetInstances.get('inst-combo-new');
    expect(newWidgetInDb).toBeUndefined();
  });

  it('7. Cancel idempotency: calling cancelEditMode consecutively or out of edit mode is safe and side-effect free', async () => {
    // 1. Calling when NOT in edit mode
    expect(useCustomizationStore.getState().isEditMode).toBe(false);
    expect(() => useCustomizationStore.getState().cancelEditMode()).not.toThrow();

    // 2. Calling twice consecutively after entering edit mode
    await useCustomizationStore.getState().enterEditMode(WS_ID, 'lg');
    expect(useCustomizationStore.getState().isEditMode).toBe(true);

    const call1 = useCustomizationStore.getState().cancelEditMode();
    expect(useCustomizationStore.getState().isEditMode).toBe(false);
    expect(call1.rolledBackLayouts).not.toBeNull();

    // Second call
    const call2 = useCustomizationStore.getState().cancelEditMode();
    expect(useCustomizationStore.getState().isEditMode).toBe(false);
    expect(call2.rolledBackLayouts).toBeNull();
  });

  it('8. Deep clone correctness: editing draft coordinates never mutates the originalLayoutsSnapshot reference', async () => {
    await useCustomizationStore.getState().enterEditMode(WS_ID, 'lg');

    const snapshot = useCustomizationStore.getState().originalLayoutsSnapshot;
    expect(snapshot).not.toBeNull();
    const originalClockX = snapshot!.lg[0].x;

    // Mutate editing draft deeply
    const draft = useCustomizationStore.getState().currentLayouts;
    draft[0].x = 888;
    useCustomizationStore.getState().updateEditingLayouts(draft);

    // Snapshot remains untouched
    expect(useCustomizationStore.getState().originalLayoutsSnapshot!.lg[0].x).toBe(originalClockX);
  });
});
