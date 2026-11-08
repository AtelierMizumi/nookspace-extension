import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NookSpaceDB } from '../../../src/services/database/db';
import { WidgetInstanceRepository } from '../../../src/services/database/repositories/widgetInstanceRepository';
import { useWidgetStore } from '../../../src/stores/widgetStore';

describe('Milestone 8.3 — Workspace Dashboard Isolation Suite', () => {
  let testDb: NookSpaceDB;
  let testRepo: WidgetInstanceRepository;
  const wsA = 'ws-test-dashboard-a';
  const wsB = 'ws-test-dashboard-b';
  const wsEmpty = 'ws-test-dashboard-empty';

  beforeEach(async () => {
    testDb = new NookSpaceDB(`test-dash-iso-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`);
    await testDb.open();
    testRepo = new WidgetInstanceRepository(testDb);

    // Clear and reset widgetStore
    useWidgetStore.setState({ instances: [], activeWorkspaceId: null, isLoading: false });
  });

  afterEach(async () => {
    await testDb.delete();
  });

  it('1. loads only workspace A widget instances when workspace A is active', async () => {
    await testRepo.create({ workspaceId: wsA, widgetType: 'clock', title: 'A Clock' });
    await testRepo.create({ workspaceId: wsA, widgetType: 'quick-notes', title: 'A Notes' });
    await testRepo.create({ workspaceId: wsB, widgetType: 'pomodoro', title: 'B Pomodoro' });

    const aWidgets = await testRepo.getByWorkspace(wsA);
    expect(aWidgets).toHaveLength(2);
    expect(aWidgets.map((w) => w.title)).toEqual(['A Clock', 'A Notes']);
    expect(aWidgets.every((w) => w.workspaceId === wsA)).toBe(true);
  });

  it('2. loads only workspace B widget instances when workspace B is active', async () => {
    await testRepo.create({ workspaceId: wsA, widgetType: 'clock', title: 'A Clock' });
    await testRepo.create({ workspaceId: wsB, widgetType: 'pomodoro', title: 'B Pomodoro' });

    const bWidgets = await testRepo.getByWorkspace(wsB);
    expect(bWidgets).toHaveLength(1);
    expect(bWidgets[0].title).toBe('B Pomodoro');
    expect(bWidgets[0].workspaceId).toBe(wsB);
  });

  it('3. returns zero widget instances for an empty workspace', async () => {
    await testRepo.create({ workspaceId: wsA, widgetType: 'clock' });
    const emptyWidgets = await testRepo.getByWorkspace(wsEmpty);
    expect(emptyWidgets).toHaveLength(0);
  });

  it('4 & 5. switching A -> B and back B -> A replaces and restores the dashboard instances without data bleed', async () => {
    const wA1 = await testRepo.create({ workspaceId: wsA, widgetType: 'clock', title: 'Clock A' });
    const wB1 = await testRepo.create({ workspaceId: wsB, widgetType: 'todo', title: 'Todo B' });

    // Load workspace A in store
    useWidgetStore.setState({ activeWorkspaceId: wsA, instances: [wA1] });
    expect(useWidgetStore.getState().instances).toHaveLength(1);
    expect(useWidgetStore.getState().instances[0].id).toBe(wA1.id);

    // Switch to workspace B
    useWidgetStore.setState({ activeWorkspaceId: wsB, instances: [wB1] });
    expect(useWidgetStore.getState().instances).toHaveLength(1);
    expect(useWidgetStore.getState().instances[0].id).toBe(wB1.id);

    // Switch back to workspace A
    useWidgetStore.setState({ activeWorkspaceId: wsA, instances: [wA1] });
    expect(useWidgetStore.getState().instances).toHaveLength(1);
    expect(useWidgetStore.getState().instances[0].id).toBe(wA1.id);
  });

  it('6. widget configuration in workspace A does not modify workspace B widget', async () => {
    const wA = await testRepo.create({
      workspaceId: wsA,
      widgetType: 'todo',
      config: { mode: 'compact' },
    });
    const wB = await testRepo.create({
      workspaceId: wsB,
      widgetType: 'todo',
      config: { mode: 'expanded' },
    });

    // Update A's configuration
    await testRepo.updateConfig(wA.id, { mode: 'minimalist' });

    const updatedA = await testRepo.getById(wA.id);
    const untouchedB = await testRepo.getById(wB.id);

    expect(updatedA?.config).toEqual({ mode: 'minimalist' });
    expect(untouchedB?.config).toEqual({ mode: 'expanded' });
  });

  it('7. deleting a widget in workspace A does not affect workspace B', async () => {
    const wA = await testRepo.create({ workspaceId: wsA, widgetType: 'clock' });
    const wB = await testRepo.create({ workspaceId: wsB, widgetType: 'clock' });

    await testRepo.delete(wA.id);

    const aWidgets = await testRepo.getByWorkspace(wsA);
    const bWidgets = await testRepo.getByWorkspace(wsB);

    expect(aWidgets).toHaveLength(0);
    expect(bWidgets).toHaveLength(1);
    expect(bWidgets[0].id).toBe(wB.id);
  });

  it('8. adding a widget to workspace B does not affect workspace A', async () => {
    await testRepo.create({ workspaceId: wsA, widgetType: 'clock' });
    expect(await testRepo.getByWorkspace(wsA)).toHaveLength(1);

    await testRepo.create({ workspaceId: wsB, widgetType: 'pomodoro' });
    expect(await testRepo.getByWorkspace(wsA)).toHaveLength(1);
    expect(await testRepo.getByWorkspace(wsB)).toHaveLength(1);
  });

  it('9. updateConfig throws Security Violation when passed mismatched workspaceId', async () => {
    const wA = await testRepo.create({ workspaceId: wsA, widgetType: 'clock' });

    await expect(
      testRepo.updateConfig(wA.id, { showSeconds: false }, wsB)
    ).rejects.toThrow(/Security Violation/i);
  });

  it('10. delete throws Security Violation when passed mismatched workspaceId', async () => {
    const wA = await testRepo.create({ workspaceId: wsA, widgetType: 'clock' });

    await expect(
      testRepo.delete(wA.id, wsB)
    ).rejects.toThrow(/Security Violation/i);
  });
});
