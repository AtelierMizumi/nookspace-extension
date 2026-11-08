import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { NookSpaceDB } from '@/services/database/db';
import { PresetApplicationService } from '@/features/workspaces/services/presetApplicationService';
import '@/widgets';

describe('PresetApplicationService — Transaction & Rollback Tests', () => {
  let testDb: NookSpaceDB;
  let service: PresetApplicationService;

  beforeEach(async () => {
    testDb = new NookSpaceDB(`test-preset-tx-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`);
    await testDb.open();
    service = new PresetApplicationService(testDb);
  });

  afterEach(async () => {
    if (testDb) {
      await testDb.delete();
    }
  });

  it('1. atomic persistence commits workspaces, widgetInstances, and widgetLayouts simultaneously', async () => {
    const ws = await service.createWorkspaceFromPreset({
      presetId: 'minimalist',
      name: 'Transaction Success Space',
    });

    const workspacesCount = await testDb.workspaces.count();
    const instancesCount = await testDb.widgetInstances.where('workspaceId').equals(ws.id).count();
    const layoutsCount = await testDb.widgetLayouts.where('workspaceId').equals(ws.id).count();

    expect(workspacesCount).toBe(1);
    expect(instancesCount).toBe(4);
    expect(layoutsCount).toBe(20); // 4 widgets * 5 breakpoints
  });

  it('2. failure during widgetLayouts insertion rolls back all records (workspace and widget instances)', async () => {
    // Spy on widgetLayouts.bulkAdd and inject an error
    const bulkAddSpy = vi.spyOn(testDb.widgetLayouts, 'bulkAdd').mockImplementationOnce(() => {
      throw new Error('Simulated IndexedDB Failure on Layouts');
    });

    await expect(
      service.createWorkspaceFromPreset({
        presetId: 'minimalist',
        name: 'Failure Rollback Space',
      })
    ).rejects.toThrow('Simulated IndexedDB Failure on Layouts');

    // Verify 100% rollback: 0 workspaces, 0 widgetInstances, 0 widgetLayouts
    const workspacesCount = await testDb.workspaces.count();
    const instancesCount = await testDb.widgetInstances.count();
    const layoutsCount = await testDb.widgetLayouts.count();

    expect(workspacesCount).toBe(0);
    expect(instancesCount).toBe(0);
    expect(layoutsCount).toBe(0);

    bulkAddSpy.mockRestore();
  });

  it('3. failure during widgetInstances insertion rolls back workspace', async () => {
    const bulkAddSpy = vi.spyOn(testDb.widgetInstances, 'bulkAdd').mockImplementationOnce(() => {
      throw new Error('Simulated IndexedDB Failure on Widget Instances');
    });

    await expect(
      service.createWorkspaceFromPreset({
        presetId: 'minimalist',
        name: 'Failure Rollback Space 2',
      })
    ).rejects.toThrow('Simulated IndexedDB Failure on Widget Instances');

    const workspacesCount = await testDb.workspaces.count();
    const instancesCount = await testDb.widgetInstances.count();
    const layoutsCount = await testDb.widgetLayouts.count();

    expect(workspacesCount).toBe(0);
    expect(instancesCount).toBe(0);
    expect(layoutsCount).toBe(0);

    bulkAddSpy.mockRestore();
  });

  it('4. failure during workspaces insertion leaves zero partial records', async () => {
    const addSpy = vi.spyOn(testDb.workspaces, 'add').mockImplementationOnce(() => {
      throw new Error('Simulated IndexedDB Failure on Workspace Insertion');
    });

    await expect(
      service.createWorkspaceFromPreset({
        presetId: 'minimalist',
        name: 'Failure Rollback Space 3',
      })
    ).rejects.toThrow('Simulated IndexedDB Failure on Workspace Insertion');

    const workspacesCount = await testDb.workspaces.count();
    const instancesCount = await testDb.widgetInstances.count();
    const layoutsCount = await testDb.widgetLayouts.count();

    expect(workspacesCount).toBe(0);
    expect(instancesCount).toBe(0);
    expect(layoutsCount).toBe(0);

    addSpy.mockRestore();
  });
});
