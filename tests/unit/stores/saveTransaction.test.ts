import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db } from '../../../src/services/database/db';
import { useCustomizationStore } from '../../../src/stores/customizationStore';
import { layoutRepo } from '../../../src/services/database/repositories/layoutRepository';
import { widgetInstanceRepo } from '../../../src/services/database/repositories/widgetInstanceRepository';
import { Breakpoint, WidgetInstanceEntity, WidgetLayoutEntity } from '../../../src/types/database';

describe('Milestone 3.3 — Save Transaction & Data Integrity', () => {
  const WS_A = 'ws-test-alpha';
  const WS_B = 'ws-test-beta';

  beforeEach(async () => {
    // Clear and re-seed testing database tables
    await db.widgetInstances.clear();
    await db.widgetLayouts.clear();

    // Seed 2 widgets in Workspace A
    const widget1: WidgetInstanceEntity = {
      id: 'w1-clock',
      workspaceId: WS_A,
      widgetType: 'clock',
      title: 'Digital Clock',
      config: { is24Hour: true },
      isEnabled: true,
      order: 0,
      createdAt: 1000,
      updatedAt: 1000,
    };
    const widget2: WidgetInstanceEntity = {
      id: 'w2-todo',
      workspaceId: WS_A,
      widgetType: 'todo',
      title: 'Simple Todo',
      config: {},
      isEnabled: true,
      order: 1,
      createdAt: 1000,
      updatedAt: 1000,
    };

    // Seed 1 widget in Workspace B (Isolation verification)
    const widgetB: WidgetInstanceEntity = {
      id: 'wb-notes',
      workspaceId: WS_B,
      widgetType: 'notes',
      title: 'Personal Notes',
      config: {},
      isEnabled: true,
      order: 0,
      createdAt: 1000,
      updatedAt: 1000,
    };

    await db.widgetInstances.bulkPut([widget1, widget2, widgetB]);

    // Seed layouts for Workspace A (5 breakpoints)
    const breakpoints: Breakpoint[] = ['lg', 'md', 'sm', 'xs', 'xxs'];
    const initialLayouts: WidgetLayoutEntity[] = [];

    for (const bp of breakpoints) {
      initialLayouts.push(
        {
          id: `${WS_A}_w1-clock_${bp}`,
          workspaceId: WS_A,
          widgetInstanceId: 'w1-clock',
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
          id: `${WS_A}_w2-todo_${bp}`,
          workspaceId: WS_A,
          widgetInstanceId: 'w2-todo',
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

      // Workspace B layout
      initialLayouts.push({
        id: `${WS_B}_wb-notes_${bp}`,
        workspaceId: WS_B,
        widgetInstanceId: 'wb-notes',
        breakpoint: bp,
        x: 0,
        y: 0,
        w: 4,
        h: 3,
        minW: 2,
        minH: 2,
        isDefault: true,
        createdAt: 1000,
        updatedAt: 1000,
      });
    }

    await db.widgetLayouts.bulkPut(initialLayouts);

    // Reset store state
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

  it('1. commitEditMode executes an atomic multi-table transaction committing additions, deletions, and layouts', async () => {
    // 1. Enter edit mode
    await useCustomizationStore.getState().enterEditMode(WS_A, 'lg');

    // 2. Stage add a new widget (in-memory)
    const stagedWidget: WidgetInstanceEntity = {
      id: 'w3-greeting',
      workspaceId: WS_A,
      widgetType: 'greeting',
      title: 'Personal Greeting',
      config: { userName: 'Alex' },
      isEnabled: true,
      order: 2,
      createdAt: 2000,
      updatedAt: 2000,
    };

    const newLayoutsByBp: Partial<Record<Breakpoint, WidgetLayoutEntity>> = {
      lg: {
        id: `${WS_A}_w3-greeting_lg`,
        workspaceId: WS_A,
        widgetInstanceId: 'w3-greeting',
        breakpoint: 'lg',
        x: 0,
        y: 4,
        w: 10,
        h: 2,
        isDefault: true,
        createdAt: 2000,
        updatedAt: 2000,
      },
    };

    useCustomizationStore.getState().stageAddWidget('w3-greeting', newLayoutsByBp, stagedWidget);

    // 3. Stage delete w2-todo
    useCustomizationStore.getState().stageDeleteWidget('w2-todo');

    // Verify before commit: database is untouched
    const instBefore = await db.widgetInstances.get('w3-greeting');
    expect(instBefore).toBeUndefined(); // Not in DB yet!
    const todoBefore = await db.widgetInstances.get('w2-todo');
    expect(todoBefore).toBeDefined(); // Still in DB!

    // 4. Commit
    const commitSuccess = await useCustomizationStore.getState().commitEditMode(WS_A);
    expect(commitSuccess).toBe(true);

    // 5. Verify database after atomic commit
    // Staged added widget is now in db
    const addedInDb = await db.widgetInstances.get('w3-greeting');
    expect(addedInDb).toBeDefined();
    expect(addedInDb?.title).toBe('Personal Greeting');

    // Staged deleted widget is removed from db
    const deletedInDb = await db.widgetInstances.get('w2-todo');
    expect(deletedInDb).toBeUndefined();

    // Layouts for deleted widget are purged from db (no orphans)
    const deletedLayouts = await db.widgetLayouts
      .where('widgetInstanceId')
      .equals('w2-todo')
      .toArray();
    expect(deletedLayouts).toHaveLength(0);

    // Layout for new widget is persisted
    const newWidgetLayout = await db.widgetLayouts.get(`${WS_A}_w3-greeting_lg`);
    expect(newWidgetLayout).toBeDefined();
    expect(newWidgetLayout?.w).toBe(10);
  });

  it('2. failure injection during transaction triggers complete rollback with zero partial writes', async () => {
    await useCustomizationStore.getState().enterEditMode(WS_A, 'lg');

    // Stage add widget
    const stagedWidget: WidgetInstanceEntity = {
      id: 'w-fail-test',
      workspaceId: WS_A,
      widgetType: 'clock',
      title: 'Clock Fail Test',
      config: {},
      isEnabled: true,
      order: 2,
      createdAt: 2000,
      updatedAt: 2000,
    };
    useCustomizationStore.getState().stageAddWidget('w-fail-test', {}, stagedWidget);

    // Stage delete widget 1
    useCustomizationStore.getState().stageDeleteWidget('w1-clock');

    // Spy on layoutRepo.saveLayouts to inject a simulated failure during the transaction
    const saveSpy = vi.spyOn(layoutRepo, 'saveLayouts').mockRejectedValueOnce(
      new Error('Simulated IndexedDB Failure: Disk full')
    );

    const success = await useCustomizationStore.getState().commitEditMode(WS_A);

    expect(success).toBe(false);

    // Verify store state: remains in Edit Mode with draft intact and error recorded
    const state = useCustomizationStore.getState();
    expect(state.isEditMode).toBe(true);
    expect(state.hasUnsavedChanges).toBe(true);
    expect(state.saveError).toContain('Simulated IndexedDB Failure: Disk full');

    // CRITICAL: Verify IndexedDB atomicity - full rollback
    // w-fail-test must NOT be in DB
    const failWidgetInDb = await db.widgetInstances.get('w-fail-test');
    expect(failWidgetInDb).toBeUndefined();

    // w1-clock must NOT have been deleted
    const w1StillInDb = await db.widgetInstances.get('w1-clock');
    expect(w1StillInDb).toBeDefined();

    saveSpy.mockRestore();
  });

  it('3. Zod validation failure aborts before transaction without modifying database', async () => {
    await useCustomizationStore.getState().enterEditMode(WS_A, 'lg');

    // Inject an invalid layout coordinate (w = 99 exceeds lg max columns 12)
    const invalidLayout: WidgetLayoutEntity = {
      id: `${WS_A}_w1-clock_lg`,
      workspaceId: WS_A,
      widgetInstanceId: 'w1-clock',
      breakpoint: 'lg',
      x: 0,
      y: 0,
      w: 99, // Invalid!
      h: 2,
      isDefault: false,
      createdAt: 1000,
      updatedAt: 1000,
    };

    useCustomizationStore.getState().updateEditingLayouts([invalidLayout]);

    const success = await useCustomizationStore.getState().commitEditMode(WS_A);

    expect(success).toBe(false);
    expect(useCustomizationStore.getState().saveError).toBeDefined();
    expect(useCustomizationStore.getState().isEditMode).toBe(true);

    // Database still has original w: 4
    const originalLayoutInDb = await db.widgetLayouts.get(`${WS_A}_w1-clock_lg`);
    expect(originalLayoutInDb?.w).toBe(4);
  });

  it('4. prevents concurrent commit calls (double-click guard)', async () => {
    await useCustomizationStore.getState().enterEditMode(WS_A, 'lg');
    useCustomizationStore.getState().updateEditingLayouts([
      {
        id: `${WS_A}_w1-clock_lg`,
        workspaceId: WS_A,
        widgetInstanceId: 'w1-clock',
        breakpoint: 'lg',
        x: 1,
        y: 1,
        w: 4,
        h: 2,
        isDefault: false,
        createdAt: 1000,
        updatedAt: 1000,
      },
    ]);

    // Manually set isSaving = true to simulate ongoing transaction
    useCustomizationStore.setState({ isSaving: true });

    const secondCallResult = await useCustomizationStore.getState().commitEditMode(WS_A);

    // Second call must reject immediately without running another transaction
    expect(secondCallResult).toBe(false);
  });

  it('5. no-op commit when hasUnsavedChanges is false performs zero writes', async () => {
    await useCustomizationStore.getState().enterEditMode(WS_A, 'lg');

    // No edits made (hasUnsavedChanges === false)
    expect(useCustomizationStore.getState().hasUnsavedChanges).toBe(false);

    const transactionSpy = vi.spyOn(db, 'transaction');

    const success = await useCustomizationStore.getState().commitEditMode(WS_A);

    expect(success).toBe(true);
    // Exits edit mode cleanly
    expect(useCustomizationStore.getState().isEditMode).toBe(false);
    // Did NOT execute write transaction
    expect(transactionSpy).not.toHaveBeenCalled();

    transactionSpy.mockRestore();
  });

  it('6. workspace isolation: committing Workspace A never alters Workspace B instances or layouts', async () => {
    // Check initial Workspace B records
    const wbInitial = await db.widgetInstances.get('wb-notes');
    const wbLayoutInitial = await db.widgetLayouts.get(`${WS_B}_wb-notes_lg`);
    expect(wbInitial?.workspaceId).toBe(WS_B);
    expect(wbLayoutInitial?.w).toBe(4);

    // Edit and commit Workspace A
    await useCustomizationStore.getState().enterEditMode(WS_A, 'lg');
    useCustomizationStore.getState().updateEditingLayouts([
      {
        id: `${WS_A}_w1-clock_lg`,
        workspaceId: WS_A,
        widgetInstanceId: 'w1-clock',
        breakpoint: 'lg',
        x: 2,
        y: 2,
        w: 4,
        h: 2,
        isDefault: false,
        createdAt: 1000,
        updatedAt: 1000,
      },
    ]);

    await useCustomizationStore.getState().commitEditMode(WS_A);

    // Verify Workspace B is 100% intact
    const wbAfter = await db.widgetInstances.get('wb-notes');
    const wbLayoutAfter = await db.widgetLayouts.get(`${WS_B}_wb-notes_lg`);
    expect(wbAfter).toEqual(wbInitial);
    expect(wbLayoutAfter).toEqual(wbLayoutInitial);
  });

  it('7. workspace isolation: security check blocks deletion of a widget belonging to another workspace', async () => {
    await useCustomizationStore.getState().enterEditMode(WS_A, 'lg');

    // Malicious or accidental attempt: stage delete wb-notes (which belongs to WS_B)
    useCustomizationStore.setState({
      stagedDeletedWidgetIds: ['wb-notes'],
      hasUnsavedChanges: true,
    });

    const success = await useCustomizationStore.getState().commitEditMode(WS_A);

    expect(success).toBe(false);
    expect(useCustomizationStore.getState().saveError).toContain('Security Violation');

    // Verify wb-notes is NOT deleted from database
    const wbStillInDb = await db.widgetInstances.get('wb-notes');
    expect(wbStillInDb).toBeDefined();
  });

  it('8. cancelEditMode discards all in-memory changes leaving IndexedDB completely untouched', async () => {
    await useCustomizationStore.getState().enterEditMode(WS_A, 'lg');

    // Stage add
    useCustomizationStore.getState().stageAddWidget(
      'w-cancel-test',
      {},
      {
        id: 'w-cancel-test',
        workspaceId: WS_A,
        widgetType: 'clock',
        title: 'Cancel Test',
        config: {},
        isEnabled: true,
        order: 5,
        createdAt: 2000,
        updatedAt: 2000,
      }
    );

    // Stage delete
    useCustomizationStore.getState().stageDeleteWidget('w1-clock');

    // Cancel edit mode
    useCustomizationStore.getState().cancelEditMode();

    const state = useCustomizationStore.getState();
    expect(state.isEditMode).toBe(false);
    expect(state.hasUnsavedChanges).toBe(false);
    expect(state.stagedAddedInstances).toEqual([]);
    expect(state.stagedDeletedWidgetIds).toEqual([]);

    // Verify DB was NEVER written to
    const cancelledWidget = await db.widgetInstances.get('w-cancel-test');
    expect(cancelledWidget).toBeUndefined();

    const clockStillInDb = await db.widgetInstances.get('w1-clock');
    expect(clockStillInDb).toBeDefined();
  });
});
