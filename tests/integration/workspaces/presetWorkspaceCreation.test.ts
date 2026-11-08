import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import 'fake-indexeddb/auto';
import { NookSpaceDB } from '@/services/database/db';
import { PresetApplicationService } from '@/features/workspaces/services/presetApplicationService';
import { BREAKPOINT_COLUMNS, Breakpoint } from '@/types/database';
import { PRESET_BREAKPOINTS } from '@/features/workspaces/presets/presetSchema';
import '@/widgets';

describe('Preset Workspace Creation — Integration Tests (All 4 Presets)', () => {
  let testDb: NookSpaceDB;
  let service: PresetApplicationService;

  beforeEach(async () => {
    testDb = new NookSpaceDB(`test-preset-integration-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`);
    await testDb.open();
    service = new PresetApplicationService(testDb);
  });

  afterEach(async () => {
    if (testDb) {
      await testDb.delete();
    }
  });

  const testCases = [
    {
      presetId: 'minimalist',
      expectedName: 'Minimalist Focus',
      expectedWidgetCount: 4,
      expectedTypes: ['greeting', 'clock', 'quick-links', 'todo'],
      expectedCategory: 'personal',
    },
    {
      presetId: 'deep-study',
      expectedName: 'Deep Study Room',
      expectedWidgetCount: 7,
      expectedTypes: [
        'greeting',
        'clock',
        'pomodoro',
        'daily-goals',
        'study-tracker',
        'todo',
        'notes',
      ],
      expectedCategory: 'study',
    },
    {
      presetId: 'developer',
      expectedName: 'Dev Station',
      expectedWidgetCount: 6,
      expectedTypes: [
        'clock',
        'quick-links',
        'smart-bookmarks',
        'notes',
        'todo',
        'calendar-overview',
      ],
      expectedCategory: 'development',
    },
    {
      presetId: 'full-studio',
      expectedName: 'Full Studio HQ',
      expectedWidgetCount: 10,
      expectedTypes: [
        'greeting',
        'clock',
        'quick-links',
        'pomodoro',
        'daily-goals',
        'study-tracker',
        'todo',
        'calendar-overview',
        'smart-bookmarks',
        'notes',
      ],
      expectedCategory: 'productivity',
    },
  ];

  for (const tc of testCases) {
    it(`correctly applies preset '${tc.presetId}' with ${tc.expectedWidgetCount} widgets and 5-breakpoint layouts`, async () => {
      const ws = await service.createWorkspaceFromPreset({
        presetId: tc.presetId,
        name: tc.expectedName,
      });

      expect(ws.id).toBeDefined();
      expect(ws.name).toBe(tc.expectedName);

      // 1. Verify widget instances
      const instances = await testDb.widgetInstances
        .where('workspaceId')
        .equals(ws.id)
        .sortBy('order');

      expect(instances).toHaveLength(tc.expectedWidgetCount);
      const actualTypes = instances.map((i) => i.widgetType);
      expect(actualTypes).toEqual(tc.expectedTypes);

      // Verify all instances belong strictly to this workspace
      for (const inst of instances) {
        expect(inst.workspaceId).toBe(ws.id);
        expect(inst.isEnabled).toBe(true);
      }

      // 2. Verify layouts for all 5 breakpoints
      const layouts = await testDb.widgetLayouts
        .where('workspaceId')
        .equals(ws.id)
        .toArray();

      expect(layouts).toHaveLength(tc.expectedWidgetCount * 5);

      for (const bp of PRESET_BREAKPOINTS) {
        const bpLayouts = layouts.filter((l) => l.breakpoint === bp);
        expect(bpLayouts).toHaveLength(tc.expectedWidgetCount);

        const maxCols = BREAKPOINT_COLUMNS[bp];

        // Bounds check
        for (const l of bpLayouts) {
          expect(l.workspaceId).toBe(ws.id);
          expect(l.x).toBeGreaterThanOrEqual(0);
          expect(l.y).toBeGreaterThanOrEqual(0);
          expect(l.w).toBeGreaterThanOrEqual(1);
          expect(l.h).toBeGreaterThanOrEqual(1);
          expect(l.x + l.w).toBeLessThanOrEqual(maxCols);
        }

        // Overlap check
        for (let i = 0; i < bpLayouts.length; i++) {
          const a = bpLayouts[i];
          for (let j = i + 1; j < bpLayouts.length; j++) {
            const b = bpLayouts[j];
            const overlap =
              a.x < b.x + b.w &&
              a.x + a.w > b.x &&
              a.y < b.y + b.h &&
              a.y + a.h > b.y;

            expect(
              overlap,
              `Collision in preset '${tc.presetId}' at breakpoint '${bp}' between ${a.widgetInstanceId} and ${b.widgetInstanceId}`
            ).toBe(false);
          }
        }
      }
    });
  }
});
