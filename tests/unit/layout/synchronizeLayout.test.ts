import { describe, it, expect, beforeEach } from 'vitest';
import { synchronizeLayout } from '@/features/layout-editor/layoutUtils';
import { WidgetInstanceEntity, WidgetLayoutEntity } from '@/types/database';
import { widgetRegistry } from '@/features/widget-system/WidgetRegistry';
import { ClockWidget } from '@/widgets/ClockWidget';

describe('synchronizeLayout Algorithm — Milestone 1', () => {
  beforeEach(() => {
    widgetRegistry.register(ClockWidget);
  });

  const now = Date.now();
  const mockInstances: WidgetInstanceEntity[] = [
    {
      id: 'inst-1',
      workspaceId: 'ws-1',
      widgetType: 'clock',
      title: 'Clock 1',
      config: {},
      isEnabled: true,
      order: 0,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'inst-2',
      workspaceId: 'ws-1',
      widgetType: 'clock',
      title: 'Clock 2',
      config: {},
      isEnabled: true,
      order: 1,
      createdAt: now,
      updatedAt: now,
    },
  ];

  it('10. generates deterministic layout positions for new widgets', () => {
    const synchronized = synchronizeLayout('ws-1', 'lg', mockInstances, []);
    expect(synchronized).toHaveLength(2);

    // First widget at 0, 0
    expect(synchronized[0].widgetInstanceId).toBe('inst-1');
    expect(synchronized[0].x).toBe(0);
    expect(synchronized[0].y).toBe(0);
    expect(synchronized[0].w).toBe(4);
    expect(synchronized[0].h).toBe(2);

    // Second widget packed next to first without overlapping (x: 4, y: 0)
    expect(synchronized[1].widgetInstanceId).toBe('inst-2');
    expect(synchronized[1].x).toBe(4);
    expect(synchronized[1].y).toBe(0);
  });

  it('11. retains existing widget layouts without shifting them', () => {
    const existing: WidgetLayoutEntity[] = [
      {
        id: 'ws-1_inst-1_lg',
        workspaceId: 'ws-1',
        widgetInstanceId: 'inst-1',
        breakpoint: 'lg',
        x: 6,
        y: 4,
        w: 5,
        h: 3,
        minW: 3,
        minH: 2,
        isDefault: false,
        createdAt: now,
        updatedAt: now,
      },
    ];

    const synchronized = synchronizeLayout('ws-1', 'lg', mockInstances, existing);
    expect(synchronized).toHaveLength(2);

    // Existing widget inst-1 retains its custom (x: 6, y: 4, w: 5, h: 3)
    const inst1 = synchronized.find((s) => s.widgetInstanceId === 'inst-1');
    expect(inst1?.x).toBe(6);
    expect(inst1?.y).toBe(4);
    expect(inst1?.w).toBe(5);
    expect(inst1?.h).toBe(3);

    // New widget inst-2 finds next available slot
    const inst2 = synchronized.find((s) => s.widgetInstanceId === 'inst-2');
    expect(inst2?.x).toBe(0);
    expect(inst2?.y).toBe(0);
  });

  it('12. deletes layout items for removed widget instances (orphan cleanup)', () => {
    const existingWithOrphan: WidgetLayoutEntity[] = [
      {
        id: 'ws-1_inst-deleted_lg',
        workspaceId: 'ws-1',
        widgetInstanceId: 'inst-deleted', // Instance no longer exists in mockInstances
        breakpoint: 'lg',
        x: 0,
        y: 0,
        w: 4,
        h: 2,
        minW: 3,
        minH: 2,
        isDefault: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'ws-1_inst-1_lg',
        workspaceId: 'ws-1',
        widgetInstanceId: 'inst-1',
        breakpoint: 'lg',
        x: 4,
        y: 0,
        w: 4,
        h: 2,
        minW: 3,
        minH: 2,
        isDefault: true,
        createdAt: now,
        updatedAt: now,
      },
    ];

    const synchronized = synchronizeLayout('ws-1', 'lg', mockInstances, existingWithOrphan);
    // inst-deleted is dropped; inst-1 is kept; inst-2 is added
    expect(synchronized.some((s) => s.widgetInstanceId === 'inst-deleted')).toBe(false);
    expect(synchronized.some((s) => s.widgetInstanceId === 'inst-1')).toBe(true);
    expect(synchronized.some((s) => s.widgetInstanceId === 'inst-2')).toBe(true);
  });

  it('13. satisfies idempotency: consecutive calls with same input produce identical output', () => {
    const pass1 = synchronizeLayout('ws-1', 'lg', mockInstances, []);
    const pass2 = synchronizeLayout('ws-1', 'lg', mockInstances, pass1);
    const pass3 = synchronizeLayout('ws-1', 'lg', mockInstances, pass2);

    expect(pass2).toEqual(pass1);
    expect(pass3).toEqual(pass1);
  });

  it('adapts dimensions properly when synchronizing for smaller breakpoints (e.g. mobile xs max 4 cols)', () => {
    const existingDesktop: WidgetLayoutEntity[] = [
      {
        id: 'ws-1_inst-1_xs',
        workspaceId: 'ws-1',
        widgetInstanceId: 'inst-1',
        breakpoint: 'xs',
        x: 8, // Overflow on xs (max 4 cols)
        y: 0,
        w: 12, // Overflow on xs
        h: 2,
        minW: 2,
        minH: 2,
        isDefault: true,
        createdAt: now,
        updatedAt: now,
      },
    ];

    const synchronized = synchronizeLayout('ws-1', 'xs', mockInstances, existingDesktop);
    const inst1 = synchronized.find((s) => s.widgetInstanceId === 'inst-1');

    // Clamped so w <= 4 and x + w <= 4
    expect(inst1?.w).toBeLessThanOrEqual(4);
    expect((inst1?.x || 0) + (inst1?.w || 0)).toBeLessThanOrEqual(4);
  });
});
