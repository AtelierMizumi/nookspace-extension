import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../../../src/services/database/db';
import { useCustomizationStore } from '../../../src/stores/customizationStore';
import { widgetRegistry } from '../../../src/features/widget-system/WidgetRegistry';
import { synchronizeLayout } from '../../../src/features/layout-editor/layoutUtils';
import { Breakpoint, WidgetInstanceEntity, WidgetLayoutEntity } from '../../../src/types/database';
// Ensure all initial widgets are registered
import '../../../src/widgets';

describe('Milestone 3.5 — Add Widget Integration', () => {
  const WS_ID = 'ws-add-widget-test';

  beforeEach(async () => {
    await db.widgetInstances.clear();
    await db.widgetLayouts.clear();

    // Seed 1 existing widget at (0, 0, 4, 2)
    const existingClock: WidgetInstanceEntity = {
      id: 'inst-existing-clock',
      workspaceId: WS_ID,
      widgetType: 'clock',
      title: 'Digital Clock',
      config: { is24Hour: true },
      isEnabled: true,
      order: 0,
      createdAt: 1000,
      updatedAt: 1000,
    };
    await db.widgetInstances.put(existingClock);

    const breakpoints: Breakpoint[] = ['lg', 'md', 'sm', 'xs', 'xxs'];
    const initialLayouts: WidgetLayoutEntity[] = [];

    for (const bp of breakpoints) {
      initialLayouts.push({
        id: `${WS_ID}_inst-existing-clock_${bp}`,
        workspaceId: WS_ID,
        widgetInstanceId: 'inst-existing-clock',
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
      });
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

  it('1. adding widget in Edit Mode stages instance in-memory with valid default configuration without writing to IndexedDB', async () => {
    await useCustomizationStore.getState().enterEditMode(WS_ID, 'lg');

    const def = widgetRegistry.get('simple-todo');
    expect(def).toBeDefined();

    const instanceId = 'inst-new-todo';
    const stagedInstance: WidgetInstanceEntity = {
      id: instanceId,
      workspaceId: WS_ID,
      widgetType: 'simple-todo',
      title: def?.name || 'Simple Todo',
      config: def?.defaultConfig || {},
      isEnabled: true,
      order: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const breakpoints: Breakpoint[] = ['lg', 'md', 'sm', 'xs', 'xxs'];
    const defaultLayouts: Partial<Record<Breakpoint, WidgetLayoutEntity>> = {};
    const editingLayouts = useCustomizationStore.getState().editingLayoutsByBreakpoint;
    const allInstances = [
      { id: 'inst-existing-clock', workspaceId: WS_ID, widgetType: 'clock', title: 'Clock', config: {}, isEnabled: true, order: 0, createdAt: 1000, updatedAt: 1000 },
      stagedInstance,
    ];

    for (const bp of breakpoints) {
      const existingForBp = editingLayouts[bp] || [];
      const packed = synchronizeLayout(WS_ID, bp, allInstances, existingForBp);
      const item = packed.find((p) => p.widgetInstanceId === instanceId);
      if (item) defaultLayouts[bp] = item;
    }

    useCustomizationStore.getState().stageAddWidget(instanceId, defaultLayouts, stagedInstance);

    // Verify in-memory store state
    const state = useCustomizationStore.getState();
    expect(state.stagedAddedInstances).toHaveLength(1);
    expect(state.stagedAddedInstances[0].widgetType).toBe('simple-todo');
    expect(state.stagedAddedInstances[0].config).toEqual(def?.defaultConfig);
    expect(state.hasUnsavedChanges).toBe(true);

    // CRITICAL: Database remains untouched during editing draft
    const inDb = await db.widgetInstances.get(instanceId);
    expect(inDb).toBeUndefined();
    const layoutInDb = await db.widgetLayouts.get(`${WS_ID}_${instanceId}_lg`);
    expect(layoutInDb).toBeUndefined();
  });

  it('2. allocates non-overlapping layout positions across all 5 responsive breakpoints', async () => {
    await useCustomizationStore.getState().enterEditMode(WS_ID, 'lg');

    const instanceId = 'inst-new-calendar';
    const stagedInstance: WidgetInstanceEntity = {
      id: instanceId,
      workspaceId: WS_ID,
      widgetType: 'calendar-overview',
      title: 'Calendar Overview',
      config: {},
      isEnabled: true,
      order: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const breakpoints: Breakpoint[] = ['lg', 'md', 'sm', 'xs', 'xxs'];
    const defaultLayouts: Partial<Record<Breakpoint, WidgetLayoutEntity>> = {};
    const editingLayouts = useCustomizationStore.getState().editingLayoutsByBreakpoint;
    const allInstances = [
      { id: 'inst-existing-clock', workspaceId: WS_ID, widgetType: 'clock', title: 'Clock', config: {}, isEnabled: true, order: 0, createdAt: 1000, updatedAt: 1000 },
      stagedInstance,
    ];

    for (const bp of breakpoints) {
      const existingForBp = editingLayouts[bp] || [];
      const packed = synchronizeLayout(WS_ID, bp, allInstances, existingForBp);
      const item = packed.find((p) => p.widgetInstanceId === instanceId);
      if (item) defaultLayouts[bp] = item;
    }

    useCustomizationStore.getState().stageAddWidget(instanceId, defaultLayouts, stagedInstance);

    const state = useCustomizationStore.getState();

    // On LG (12 cols), existing clock is at (0, 0, 4, 2).
    // Calendar should be placed adjacent at x >= 4, y: 0 without colliding!
    const lgCalendar = state.editingLayoutsByBreakpoint.lg.find((l) => l.widgetInstanceId === instanceId);
    expect(lgCalendar).toBeDefined();
    expect(lgCalendar?.x).toBeGreaterThanOrEqual(4);
    expect(lgCalendar?.y).toBe(0);

    // On XXS (2 cols), width is clamped to 2 cols max
    const xxsCalendar = state.editingLayoutsByBreakpoint.xxs.find((l) => l.widgetInstanceId === instanceId);
    expect(xxsCalendar).toBeDefined();
    expect(xxsCalendar?.w).toBeLessThanOrEqual(2);
    // Placed below clock (y >= 2) because XXS has only 2 cols
    expect(xxsCalendar?.y).toBeGreaterThanOrEqual(2);
  });

  it('3. cancelling after adding widget completely discards it with zero orphan records in DB', async () => {
    await useCustomizationStore.getState().enterEditMode(WS_ID, 'lg');

    const stagedInstance: WidgetInstanceEntity = {
      id: 'inst-cancelled-widget',
      workspaceId: WS_ID,
      widgetType: 'greeting',
      title: 'Personal Greeting',
      config: {},
      isEnabled: true,
      order: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    useCustomizationStore.getState().stageAddWidget('inst-cancelled-widget', {}, stagedInstance);

    // Cancel edit mode
    useCustomizationStore.getState().cancelEditMode();

    const state = useCustomizationStore.getState();
    expect(state.isEditMode).toBe(false);
    expect(state.stagedAddedInstances).toHaveLength(0);
    expect(state.stagedAddedWidgetIds).toHaveLength(0);

    // Zero writes in DB
    const inDb = await db.widgetInstances.get('inst-cancelled-widget');
    expect(inDb).toBeUndefined();
  });

  it('4. committing after adding widget persists instance and all 5 breakpoint layouts atomically', async () => {
    await useCustomizationStore.getState().enterEditMode(WS_ID, 'lg');

    const instanceId = 'inst-committed-widget';
    const stagedInstance: WidgetInstanceEntity = {
      id: instanceId,
      workspaceId: WS_ID,
      widgetType: 'greeting',
      title: 'Greeting Card',
      config: { userName: 'Sarah' },
      isEnabled: true,
      order: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const breakpoints: Breakpoint[] = ['lg', 'md', 'sm', 'xs', 'xxs'];
    const defaultLayouts: Partial<Record<Breakpoint, WidgetLayoutEntity>> = {};
    const editingLayouts = useCustomizationStore.getState().editingLayoutsByBreakpoint;
    const allInstances = [
      { id: 'inst-existing-clock', workspaceId: WS_ID, widgetType: 'clock', title: 'Clock', config: {}, isEnabled: true, order: 0, createdAt: 1000, updatedAt: 1000 },
      stagedInstance,
    ];

    for (const bp of breakpoints) {
      const existingForBp = editingLayouts[bp] || [];
      const packed = synchronizeLayout(WS_ID, bp, allInstances, existingForBp);
      const item = packed.find((p) => p.widgetInstanceId === instanceId);
      if (item) defaultLayouts[bp] = item;
    }

    useCustomizationStore.getState().stageAddWidget(instanceId, defaultLayouts, stagedInstance);

    const success = await useCustomizationStore.getState().commitEditMode(WS_ID);
    expect(success).toBe(true);

    // Verify in IndexedDB
    const instanceInDb = await db.widgetInstances.get(instanceId);
    expect(instanceInDb).toBeDefined();
    expect(instanceInDb?.config).toEqual({ userName: 'Sarah' });

    // Verify layouts saved across all 5 breakpoints
    for (const bp of breakpoints) {
      const layoutInDb = await db.widgetLayouts.get(`${WS_ID}_${instanceId}_${bp}`);
      expect(layoutInDb).toBeDefined();
    }
  });
});
