import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../../../src/services/database/db';
import { useCustomizationStore } from '../../../src/stores/customizationStore';
import { synchronizeLayout } from '../../../src/features/layout-editor/layoutUtils';
import { Breakpoint, WidgetInstanceEntity, WidgetLayoutEntity } from '../../../src/types/database';
// Ensure all initial widgets are registered
import '../../../src/widgets';

describe('Milestone 3.6 — Reset Layout End-to-End Flow', () => {
  const WS_ID = 'ws-reset-test';

  beforeEach(async () => {
    await db.widgetInstances.clear();
    await db.widgetLayouts.clear();

    // Seed 2 existing widgets in database with custom configs
    const clock: WidgetInstanceEntity = {
      id: 'inst-clock',
      workspaceId: WS_ID,
      widgetType: 'clock',
      title: 'Digital Clock',
      config: { is24Hour: false, showSeconds: true },
      isEnabled: true,
      order: 0,
      createdAt: 1000,
      updatedAt: 1000,
    };

    const todo: WidgetInstanceEntity = {
      id: 'inst-todo',
      workspaceId: WS_ID,
      widgetType: 'simple-todo',
      title: 'Task List Preview',
      config: {
        tasks: [
          { id: 't1', title: 'Critical Task 1', completed: false },
          { id: 't2', title: 'Critical Task 2', completed: true },
        ],
      },
      isEnabled: true,
      order: 1,
      createdAt: 1000,
      updatedAt: 1000,
    };

    await db.widgetInstances.bulkPut([clock, todo]);

    // Seed custom moved layouts (e.g., user had manually moved clock to x:6, y:4)
    const breakpoints: Breakpoint[] = ['lg', 'md', 'sm', 'xs', 'xxs'];
    const customLayouts: WidgetLayoutEntity[] = [];

    for (const bp of breakpoints) {
      customLayouts.push(
        {
          id: `${WS_ID}_inst-clock_${bp}`,
          workspaceId: WS_ID,
          widgetInstanceId: 'inst-clock',
          breakpoint: bp,
          x: 6, // Custom position!
          y: 4,
          w: 6,
          h: 3,
          minW: 2,
          minH: 2,
          isDefault: false,
          createdAt: 1000,
          updatedAt: 1000,
        },
        {
          id: `${WS_ID}_inst-todo_${bp}`,
          workspaceId: WS_ID,
          widgetInstanceId: 'inst-todo',
          breakpoint: bp,
          x: 0,
          y: 0,
          w: 6,
          h: 4,
          minW: 2,
          minH: 2,
          isDefault: false,
          createdAt: 1000,
          updatedAt: 1000,
        }
      );
    }

    await db.widgetLayouts.bulkPut(customLayouts);

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

  it('1. Reset Layout packs widgets to default packing positions across all 5 responsive breakpoints', async () => {
    await useCustomizationStore.getState().enterEditMode(WS_ID, 'lg');

    // Confirm initial positions are custom
    const stateInitial = useCustomizationStore.getState();
    expect(stateInitial.currentLayouts[0].x).toBe(6);
    expect(stateInitial.currentLayouts[0].y).toBe(4);

    // Execute Reset Layout algorithm
    const instances = await db.widgetInstances.where('workspaceId').equals(WS_ID).toArray();
    const breakpoints: Breakpoint[] = ['lg', 'md', 'sm', 'xs', 'xxs'];
    const defaultMap: Record<Breakpoint, WidgetLayoutEntity[]> = { lg: [], md: [], sm: [], xs: [], xxs: [] };

    for (const bp of breakpoints) {
      defaultMap[bp] = synchronizeLayout(WS_ID, bp, instances, []);
    }

    useCustomizationStore.getState().resetEditingLayouts(defaultMap);

    const stateAfterReset = useCustomizationStore.getState();

    // Verify clock was reset to standard default origin (0, 0)
    expect(stateAfterReset.currentLayouts[0].x).toBe(0);
    expect(stateAfterReset.currentLayouts[0].y).toBe(0);

    // Verify hasUnsavedChanges is true
    expect(stateAfterReset.hasUnsavedChanges).toBe(true);

    // CRITICAL: Database was NOT modified yet!
    const clockInDb = await db.widgetLayouts.get(`${WS_ID}_inst-clock_lg`);
    expect(clockInDb?.x).toBe(6); // Still in custom position in DB!
  });

  it('2. Zero Data Loss: Reset Layout preserves all widget configurations, tasks, and notes intact', async () => {
    await useCustomizationStore.getState().enterEditMode(WS_ID, 'lg');

    const instances = await db.widgetInstances.where('workspaceId').equals(WS_ID).toArray();
    const defaultMap: Record<Breakpoint, WidgetLayoutEntity[]> = { lg: [], md: [], sm: [], xs: [], xxs: [] };
    const breakpoints: Breakpoint[] = ['lg', 'md', 'sm', 'xs', 'xxs'];

    for (const bp of breakpoints) {
      defaultMap[bp] = synchronizeLayout(WS_ID, bp, instances, []);
    }

    useCustomizationStore.getState().resetEditingLayouts(defaultMap);

    // Verify widget instances in DB and memory have zero data loss
    const todoInDb = await db.widgetInstances.get('inst-todo');
    expect(todoInDb).toBeDefined();
    const todoTasks = (todoInDb?.config as any)?.tasks;
    expect(todoTasks).toHaveLength(2);
    expect(todoTasks[0].title).toBe('Critical Task 1');

    const clockInDb = await db.widgetInstances.get('inst-clock');
    expect(clockInDb?.config.is24Hour).toBe(false);
    expect(clockInDb?.config.showSeconds).toBe(true);
  });

  it('3. Cancel after Reset Layout rolls back to the exact pre-reset custom layout', async () => {
    await useCustomizationStore.getState().enterEditMode(WS_ID, 'lg');

    const instances = await db.widgetInstances.where('workspaceId').equals(WS_ID).toArray();
    const defaultMap: Record<Breakpoint, WidgetLayoutEntity[]> = { lg: [], md: [], sm: [], xs: [], xxs: [] };
    const breakpoints: Breakpoint[] = ['lg', 'md', 'sm', 'xs', 'xxs'];

    for (const bp of breakpoints) {
      defaultMap[bp] = synchronizeLayout(WS_ID, bp, instances, []);
    }

    // Reset layout
    useCustomizationStore.getState().resetEditingLayouts(defaultMap);
    expect(useCustomizationStore.getState().currentLayouts[0].x).toBe(0);

    // User decides to cancel
    useCustomizationStore.getState().cancelEditMode();

    const stateAfterCancel = useCustomizationStore.getState();
    expect(stateAfterCancel.isEditMode).toBe(false);
    expect(stateAfterCancel.hasUnsavedChanges).toBe(false);

    // Restores original custom position (x: 6, y: 4)
    expect(stateAfterCancel.currentLayouts[0].x).toBe(6);
    expect(stateAfterCancel.currentLayouts[0].y).toBe(4);
  });

  it('4. Done after Reset Layout commits the new default packing into IndexedDB', async () => {
    await useCustomizationStore.getState().enterEditMode(WS_ID, 'lg');

    const instances = await db.widgetInstances.where('workspaceId').equals(WS_ID).toArray();
    const defaultMap: Record<Breakpoint, WidgetLayoutEntity[]> = { lg: [], md: [], sm: [], xs: [], xxs: [] };
    const breakpoints: Breakpoint[] = ['lg', 'md', 'sm', 'xs', 'xxs'];

    for (const bp of breakpoints) {
      defaultMap[bp] = synchronizeLayout(WS_ID, bp, instances, []);
    }

    useCustomizationStore.getState().resetEditingLayouts(defaultMap);

    // User clicks Done to save
    const success = await useCustomizationStore.getState().commitEditMode(WS_ID);
    expect(success).toBe(true);

    const stateAfterCommit = useCustomizationStore.getState();
    expect(stateAfterCommit.isEditMode).toBe(false);
    expect(stateAfterCommit.hasUnsavedChanges).toBe(false);

    // Database is now updated with the reset layout
    const clockInDb = await db.widgetLayouts.get(`${WS_ID}_inst-clock_lg`);
    expect(clockInDb?.x).toBe(0);
    expect(clockInDb?.y).toBe(0);
  });

  it('5. Reset Layout includes staged added widgets in default packing without dropping them', async () => {
    await useCustomizationStore.getState().enterEditMode(WS_ID, 'lg');

    // Stage add a greeting widget
    const newWidget: WidgetInstanceEntity = {
      id: 'inst-new-greeting',
      workspaceId: WS_ID,
      widgetType: 'greeting',
      title: 'Greeting',
      config: {},
      isEnabled: true,
      order: 2,
      createdAt: 2000,
      updatedAt: 2000,
    };
    useCustomizationStore.getState().stageAddWidget('inst-new-greeting', {}, newWidget);

    const instances = await db.widgetInstances.where('workspaceId').equals(WS_ID).toArray();
    const stagedAdded = useCustomizationStore.getState().stagedAddedInstances;
    const allInstances = [...instances, ...stagedAdded];

    const defaultMap: Record<Breakpoint, WidgetLayoutEntity[]> = { lg: [], md: [], sm: [], xs: [], xxs: [] };
    const breakpoints: Breakpoint[] = ['lg', 'md', 'sm', 'xs', 'xxs'];

    for (const bp of breakpoints) {
      defaultMap[bp] = synchronizeLayout(WS_ID, bp, allInstances, []);
    }

    useCustomizationStore.getState().resetEditingLayouts(defaultMap);

    const state = useCustomizationStore.getState();

    // Verify all 3 widgets (including newly added greeting) are in the reset layout
    expect(state.currentLayouts).toHaveLength(3);
    expect(state.currentLayouts.some((l) => l.widgetInstanceId === 'inst-new-greeting')).toBe(true);
  });
});
