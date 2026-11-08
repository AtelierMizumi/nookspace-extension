import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import 'fake-indexeddb/auto';
import { NookSpaceDB } from '@/services/database/db';
import { PresetApplicationService } from '@/features/workspaces/services/presetApplicationService';
import '@/widgets'; // Ensure widgets are registered
import { minimalistPreset } from '@/features/workspaces/presets/definitions/minimalist';

describe('PresetApplicationService — Unit Tests', () => {
  let testDb: NookSpaceDB;
  let service: PresetApplicationService;

  beforeEach(async () => {
    testDb = new NookSpaceDB(`test-preset-service-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`);
    await testDb.open();
    service = new PresetApplicationService(testDb);
  });

  afterEach(async () => {
    if (testDb) {
      await testDb.delete();
    }
  });

  it('1. successfully creates a workspace from a known preset with correct metadata', async () => {
    const ws = await service.createWorkspaceFromPreset({
      presetId: 'minimalist',
      name: 'My Focus Space',
    });

    expect(ws).toBeDefined();
    expect(ws.id).toMatch(/^ws-/);
    expect(ws.name).toBe('My Focus Space');
    expect(ws.icon).toBe('Home'); // Fallback to preset icon
    expect(ws.isDefault).toBe(true); // First workspace in DB is default
    expect(ws.order).toBe(0);

    const savedInDb = await testDb.workspaces.get(ws.id);
    expect(savedInDb).toBeDefined();
    expect(savedInDb?.name).toBe('My Focus Space');
  });

  it('2. supports custom icon and color overrides', async () => {
    const ws = await service.createWorkspaceFromPreset({
      presetId: 'minimalist',
      name: 'Custom Minimalist',
      icon: 'Coffee',
      color: '#f59e0b',
    });

    expect(ws.icon).toBe('Coffee');
    expect(ws.color).toBe('#f59e0b');

    const saved = await testDb.workspaces.get(ws.id);
    expect(saved?.icon).toBe('Coffee');
    expect(saved?.color).toBe('#f59e0b');
  });

  it('3. rejects unknown preset IDs with a clear error', async () => {
    await expect(
      service.createWorkspaceFromPreset({
        presetId: 'non-existent-preset',
        name: 'Invalid Space',
      })
    ).rejects.toThrow(/Unknown workspace preset: "non-existent-preset"/);
  });

  it('4. rejects invalid workspace names (empty, whitespace, or exceeding 50 chars)', async () => {
    await expect(
      service.createWorkspaceFromPreset({
        presetId: 'minimalist',
        name: '   ',
      })
    ).rejects.toThrow();

    await expect(
      service.createWorkspaceFromPreset({
        presetId: 'minimalist',
        name: 'A'.repeat(51),
      })
    ).rejects.toThrow();
  });

  it('5. rejects invalid workspace color format', async () => {
    await expect(
      service.createWorkspaceFromPreset({
        presetId: 'minimalist',
        name: 'Bad Color Space',
        color: 'not-a-hex-color',
      })
    ).rejects.toThrow();
  });

  it('6. creates the exact expected number of widget instances and links to the new workspace', async () => {
    const ws = await service.createWorkspaceFromPreset({
      presetId: 'minimalist',
      name: 'Minimalist Test',
    });

    const instances = await testDb.widgetInstances
      .where('workspaceId')
      .equals(ws.id)
      .sortBy('order');

    expect(instances).toHaveLength(minimalistPreset.widgets.length);

    // Each instance must have a fresh unique ID and belong to the new workspace
    const instanceIds = new Set(instances.map((i) => i.id));
    expect(instanceIds.size).toBe(instances.length);

    for (const inst of instances) {
      expect(inst.workspaceId).toBe(ws.id);
      expect(inst.isEnabled).toBe(true);
      expect(inst.id).toMatch(/^wi-/);
    }
  });

  it('7. deep-clones widget configurations so they are mutable and independent from preset definitions', async () => {
    const ws = await service.createWorkspaceFromPreset({
      presetId: 'minimalist',
      name: 'Config Mutability Test',
    });

    const instances = await testDb.widgetInstances
      .where('workspaceId')
      .equals(ws.id)
      .toArray();

    for (const inst of instances) {
      expect(inst.config).toBeDefined();
      // Should be mutable without throwing
      inst.config.testModifiedProperty = 'changed';
      expect(inst.config.testModifiedProperty).toBe('changed');
    }

    // Verify original preset widget configs were not mutated
    for (const w of minimalistPreset.widgets) {
      expect((w.config as Record<string, unknown>).testModifiedProperty).toBeUndefined();
    }
  });

  it('8. converts preset layouts for all 5 breakpoints per widget', async () => {
    const ws = await service.createWorkspaceFromPreset({
      presetId: 'minimalist',
      name: 'Layout Breakpoint Test',
    });

    const instances = await testDb.widgetInstances
      .where('workspaceId')
      .equals(ws.id)
      .toArray();

    const expectedLayoutCount = instances.length * 5; // 5 breakpoints per widget
    const layouts = await testDb.widgetLayouts
      .where('workspaceId')
      .equals(ws.id)
      .toArray();

    expect(layouts).toHaveLength(expectedLayoutCount);

    const breakpoints = ['lg', 'md', 'sm', 'xs', 'xxs'];
    for (const inst of instances) {
      const instLayouts = layouts.filter((l) => l.widgetInstanceId === inst.id);
      expect(instLayouts).toHaveLength(5);

      const definedBps = instLayouts.map((l) => l.breakpoint);
      for (const bp of breakpoints) {
        expect(definedBps).toContain(bp);
      }
    }
  });
});
