import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NookSpaceDB } from '../../../src/services/database/db';
import { LayoutRepository } from '../../../src/services/database/repositories/layoutRepository';
import { WidgetInstanceRepository } from '../../../src/services/database/repositories/widgetInstanceRepository';
import { useLayoutStore } from '../../../src/stores/layoutStore';
import { useCustomizationStore } from '../../../src/stores/customizationStore';
import { Breakpoint, WidgetLayoutEntity } from '../../../src/types/database';

describe('Milestone 8.3 — Workspace Layout Isolation Suite', () => {
  let testDb: NookSpaceDB;
  let layoutRepo: LayoutRepository;
  let widgetRepo: WidgetInstanceRepository;

  const wsA = 'ws-test-layout-a';
  const wsB = 'ws-test-layout-b';
  const wsEmpty = 'ws-test-layout-empty';
  const breakpoints: Breakpoint[] = ['lg', 'md', 'sm', 'xs', 'xxs'];

  beforeEach(async () => {
    testDb = new NookSpaceDB(`test-layout-iso-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`);
    await testDb.open();
    layoutRepo = new LayoutRepository(testDb);
    widgetRepo = new WidgetInstanceRepository(testDb);

    useLayoutStore.getState().clearLayouts();
    useCustomizationStore.setState({
      isEditMode: false,
      activeWorkspaceId: null,
      originalLayoutsSnapshot: null,
      snapshotWorkspaceId: null,
      hasUnsavedChanges: false,
    });
  });

  afterEach(async () => {
    useLayoutStore.getState().clearPendingDebounce();
    await testDb.delete();
  });

  it('1. layouts are strictly isolated between workspace A and workspace B', async () => {
    await layoutRepo.saveLayouts(wsA, 'lg', [
      { workspaceId: wsA, widgetInstanceId: 'w-a1', breakpoint: 'lg', x: 0, y: 0, w: 4, h: 3 },
    ]);
    await layoutRepo.saveLayouts(wsB, 'lg', [
      { workspaceId: wsB, widgetInstanceId: 'w-b1', breakpoint: 'lg', x: 4, y: 0, w: 6, h: 4 },
    ]);

    const aLayouts = await layoutRepo.getLayoutsByWorkspace(wsA, 'lg');
    const bLayouts = await layoutRepo.getLayoutsByWorkspace(wsB, 'lg');

    expect(aLayouts).toHaveLength(1);
    expect(aLayouts[0].widgetInstanceId).toBe('w-a1');
    expect(bLayouts).toHaveLength(1);
    expect(bLayouts[0].widgetInstanceId).toBe('w-b1');
  });

  it('2. all five responsive breakpoints (lg, md, sm, xs, xxs) remain isolated per workspace', async () => {
    for (const bp of breakpoints) {
      await layoutRepo.saveLayouts(wsA, bp, [
        { workspaceId: wsA, widgetInstanceId: 'w-a1', breakpoint: bp, x: 0, y: 0, w: 2, h: 2 },
      ]);
      await layoutRepo.saveLayouts(wsB, bp, [
        { workspaceId: wsB, widgetInstanceId: 'w-b1', breakpoint: bp, x: 0, y: 0, w: 2, h: 2 },
      ]);
    }

    const groupedA = await layoutRepo.getAllLayoutsGrouped(wsA);
    const groupedB = await layoutRepo.getAllLayoutsGrouped(wsB);

    for (const bp of breakpoints) {
      expect(groupedA[bp]).toHaveLength(1);
      expect(groupedA[bp][0].widgetInstanceId).toBe('w-a1');
      expect(groupedB[bp]).toHaveLength(1);
      expect(groupedB[bp][0].widgetInstanceId).toBe('w-b1');
    }
  });

  it('3. moving a widget in workspace A persists coordinates only to workspace A', async () => {
    await layoutRepo.saveLayouts(wsA, 'lg', [
      { workspaceId: wsA, widgetInstanceId: 'w-1', breakpoint: 'lg', x: 0, y: 0, w: 4, h: 3 },
    ]);
    await layoutRepo.saveLayouts(wsB, 'lg', [
      { workspaceId: wsB, widgetInstanceId: 'w-1', breakpoint: 'lg', x: 0, y: 0, w: 4, h: 3 },
    ]);

    // Move in A
    await layoutRepo.saveLayouts(wsA, 'lg', [
      { workspaceId: wsA, widgetInstanceId: 'w-1', breakpoint: 'lg', x: 8, y: 4, w: 4, h: 3 },
    ]);

    const aLayouts = await layoutRepo.getLayoutsByWorkspace(wsA, 'lg');
    const bLayouts = await layoutRepo.getLayoutsByWorkspace(wsB, 'lg');

    expect(aLayouts[0].x).toBe(8);
    expect(aLayouts[0].y).toBe(4);
    expect(bLayouts[0].x).toBe(0);
    expect(bLayouts[0].y).toBe(0);
  });

  it('4. resizing a widget in workspace A persists dimensions only to workspace A', async () => {
    await layoutRepo.saveLayouts(wsA, 'lg', [
      { workspaceId: wsA, widgetInstanceId: 'w-1', breakpoint: 'lg', x: 0, y: 0, w: 4, h: 3 },
    ]);
    await layoutRepo.saveLayouts(wsB, 'lg', [
      { workspaceId: wsB, widgetInstanceId: 'w-1', breakpoint: 'lg', x: 0, y: 0, w: 4, h: 3 },
    ]);

    // Resize in A
    await layoutRepo.saveLayouts(wsA, 'lg', [
      { workspaceId: wsA, widgetInstanceId: 'w-1', breakpoint: 'lg', x: 0, y: 0, w: 8, h: 6 },
    ]);

    const aLayouts = await layoutRepo.getLayoutsByWorkspace(wsA, 'lg');
    const bLayouts = await layoutRepo.getLayoutsByWorkspace(wsB, 'lg');

    expect(aLayouts[0].w).toBe(8);
    expect(aLayouts[0].h).toBe(6);
    expect(bLayouts[0].w).toBe(4);
    expect(bLayouts[0].h).toBe(3);
  });

  it('5. an empty workspace has zero layout records and does not inherit default layout', async () => {
    const emptyLayouts = await layoutRepo.getLayoutsByWorkspace(wsEmpty, 'lg');
    expect(emptyLayouts).toHaveLength(0);

    const groupedEmpty = await layoutRepo.getAllLayoutsGrouped(wsEmpty);
    for (const bp of breakpoints) {
      expect(groupedEmpty[bp]).toHaveLength(0);
    }
  });

  it('6. pending debounced save cannot write into another workspace', async () => {
    vi.useFakeTimers();

    useLayoutStore.setState({
      activeWorkspaceId: wsA,
      layouts: [
        {
          id: `${wsA}_w1_lg`,
          workspaceId: wsA,
          widgetInstanceId: 'w1',
          breakpoint: 'lg',
          x: 0,
          y: 0,
          w: 4,
          h: 3,
          isDefault: false,
          createdAt: 1000,
          updatedAt: 1000,
        },
      ],
    });

    // Trigger debounced save for wsA
    useLayoutStore.getState().debouncedSaveLayouts(wsA, 'lg');

    // Switch workspace to wsB and clear pending debounce
    useLayoutStore.getState().clearPendingDebounce();
    useLayoutStore.setState({
      activeWorkspaceId: wsB,
      layouts: [],
    });

    // Advance timers
    vi.advanceTimersByTime(500);

    // Verify wsB received zero records
    const bRecords = await testDb.widgetLayouts.where('workspaceId').equals(wsB).toArray();
    expect(bRecords).toHaveLength(0);

    vi.useRealTimers();
  });

  it('7. cancelEditMode in CustomizationStudio restores the pristine snapshot without cross-workspace leakage', async () => {
    const snapshot: Record<Breakpoint, WidgetLayoutEntity[]> = {
      lg: [{ id: `${wsA}_w1_lg`, workspaceId: wsA, widgetInstanceId: 'w1', breakpoint: 'lg', x: 0, y: 0, w: 4, h: 3, isDefault: false, createdAt: 1000, updatedAt: 1000 }],
      md: [],
      sm: [],
      xs: [],
      xxs: [],
    };

    useCustomizationStore.setState({
      isEditMode: true,
      activeWorkspaceId: wsA,
      originalLayoutsSnapshot: snapshot,
      snapshotWorkspaceId: wsA,
      hasUnsavedChanges: true,
      currentLayouts: [{ id: `${wsA}_w1_lg`, workspaceId: wsA, widgetInstanceId: 'w1', breakpoint: 'lg', x: 8, y: 8, w: 4, h: 3, isDefault: false, createdAt: 1000, updatedAt: 2000 }],
    });

    const result = useCustomizationStore.getState().cancelEditMode();
    expect(result.rolledBackLayouts).toEqual(snapshot);
    expect(useCustomizationStore.getState().isEditMode).toBe(false);
    expect(useCustomizationStore.getState().hasUnsavedChanges).toBe(false);
  });

  it('8. confirmed workspace switch discards old workspace draft and prevents committing it into new workspace', () => {
    useCustomizationStore.setState({
      isEditMode: true,
      activeWorkspaceId: wsA,
      hasUnsavedChanges: true,
      snapshotWorkspaceId: wsA,
    });

    // Request switch to wsB requires confirmation
    const promptResult = useCustomizationStore.getState().requestWorkspaceSwitch(wsB);
    expect(promptResult).toBe('CONFIRM_REQUIRED');

    // Confirm switch via forceDiscardAndSwitchWorkspace
    useCustomizationStore.getState().forceDiscardAndSwitchWorkspace(wsB);

    const state = useCustomizationStore.getState();
    expect(state.isEditMode).toBe(false);
    expect(state.activeWorkspaceId).toBe(wsB);
    expect(state.originalLayoutsSnapshot).toBeNull();
    expect(state.snapshotWorkspaceId).toBeNull();
    expect(state.hasUnsavedChanges).toBe(false);
  });

  it('9. saveLayouts rejects layout items belonging to a different workspace with Security Violation', async () => {
    await expect(
      layoutRepo.saveLayouts(wsA, 'lg', [
        { workspaceId: wsB, widgetInstanceId: 'w-foreign', breakpoint: 'lg', x: 0, y: 0, w: 4, h: 3 },
      ])
    ).rejects.toThrow(/Security Violation/i);
  });
});
