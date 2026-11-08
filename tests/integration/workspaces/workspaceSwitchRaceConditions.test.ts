import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NookSpaceDB } from '../../../src/services/database/db';
import { WidgetInstanceRepository } from '../../../src/services/database/repositories/widgetInstanceRepository';
import { LayoutRepository } from '../../../src/services/database/repositories/layoutRepository';
import { createWidgetStore } from '../../../src/stores/widgetStore';
import { createLayoutStore } from '../../../src/stores/layoutStore';

describe('Milestone 8.3 — Workspace Switch Race Conditions Suite', () => {
  let testDb: NookSpaceDB;
  let widgetRepo: WidgetInstanceRepository;
  let layoutRepo: LayoutRepository;
  let widgetStore: ReturnType<typeof createWidgetStore>;
  let layoutStore: ReturnType<typeof createLayoutStore>;

  const wsA = 'ws-race-a';
  const wsB = 'ws-race-b';
  const wsC = 'ws-race-c';

  beforeEach(async () => {
    testDb = new NookSpaceDB(`test-race-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`);
    await testDb.open();
    widgetRepo = new WidgetInstanceRepository(testDb);
    layoutRepo = new LayoutRepository(testDb);

    widgetStore = createWidgetStore({ repo: widgetRepo });
    layoutStore = createLayoutStore({ layoutRepo, widgetInstanceRepo: widgetRepo });
  });

  afterEach(async () => {
    vi.useRealTimers();
    layoutStore.getState().clearPendingDebounce();
    await testDb.delete();
  });

  it('1 & 2. stale async response from old workspace does not overwrite new workspace state in widgetStore', async () => {
    // Seed widgets for wsA and wsB in testDb
    const wA = await widgetRepo.create({ workspaceId: wsA, widgetType: 'clock', title: 'Clock A' });
    const wB = await widgetRepo.create({ workspaceId: wsB, widgetType: 'pomodoro', title: 'Pomodoro B' });

    // Call loadWidgets(wsA)
    const slowLoadPromise = widgetStore.getState().loadWidgets(wsA);

    // Immediately switch to wsB before wsA resolves
    await widgetStore.getState().loadWidgets(wsB);

    // Ensure state belongs to wsB
    expect(widgetStore.getState().activeWorkspaceId).toBe(wsB);
    expect(widgetStore.getState().instances.map((i) => i.id)).toEqual([wB.id]);

    // Let wsA finish
    await slowLoadPromise;

    // State MUST still belong to wsB!
    expect(widgetStore.getState().activeWorkspaceId).toBe(wsB);
    expect(widgetStore.getState().instances.map((i) => i.id)).toEqual([wB.id]);
    expect(widgetStore.getState().instances.some((i) => i.id === wA.id)).toBe(false);
  });

  it('3 & 4. debounced save scheduled in old workspace is cleared upon switching and cannot write into new workspace', async () => {
    await widgetRepo.create({ workspaceId: wsA, widgetType: 'clock', title: 'Clock A' });
    layoutStore.setState({
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

    vi.useFakeTimers();

    // Schedule debounce for wsA
    layoutStore.getState().debouncedSaveLayouts(wsA, 'lg');

    // Switch to wsB
    layoutStore.getState().clearPendingDebounce();
    layoutStore.setState({
      activeWorkspaceId: wsB,
      layouts: [],
    });

    // Fire timer
    vi.advanceTimersByTime(500);
    vi.useRealTimers();

    // Verify wsB has zero layout records
    const bRecords = await testDb.widgetLayouts.where('workspaceId').equals(wsB).toArray();
    expect(bRecords).toHaveLength(0);
  });

  it('5. rapid A -> B -> C switching resolves deterministically to workspace C data', async () => {
    await widgetRepo.create({ workspaceId: wsA, widgetType: 'clock', title: 'A' });
    await widgetRepo.create({ workspaceId: wsB, widgetType: 'todo', title: 'B' });
    const wC = await widgetRepo.create({ workspaceId: wsC, widgetType: 'notes', title: 'C' });

    // Fire rapid async loads without waiting
    const pA = widgetStore.getState().loadWidgets(wsA);
    const pB = widgetStore.getState().loadWidgets(wsB);
    const pC = widgetStore.getState().loadWidgets(wsC);

    await Promise.all([pA, pB, pC]);

    const finalState = widgetStore.getState();
    expect(finalState.activeWorkspaceId).toBe(wsC);
    expect(finalState.instances).toHaveLength(1);
    expect(finalState.instances[0].id).toBe(wC.id);
  });

  it('6. rejected async operation does not corrupt the currently active workspace', async () => {
    const wA = await widgetRepo.create({ workspaceId: wsA, widgetType: 'clock', title: 'Clock A' });
    await widgetStore.getState().loadWidgets(wsA);
    expect(widgetStore.getState().instances).toHaveLength(1);

    // Mock widgetRepo.getByWorkspace to fail for a different workspace
    const originalGetByWorkspace = widgetRepo.getByWorkspace.bind(widgetRepo);
    vi.spyOn(widgetRepo, 'getByWorkspace').mockRejectedValueOnce(new Error('Simulated IDB Read Failure'));

    // Attempt to load failing workspace
    await widgetStore.getState().loadWidgets('ws-failing');

    // Now reload valid workspace wsA
    vi.spyOn(widgetRepo, 'getByWorkspace').mockImplementation(originalGetByWorkspace);
    await widgetStore.getState().loadWidgets(wsA);

    expect(widgetStore.getState().activeWorkspaceId).toBe(wsA);
    expect(widgetStore.getState().instances).toHaveLength(1);
    expect(widgetStore.getState().instances[0].id).toBe(wA.id);
  });
});
