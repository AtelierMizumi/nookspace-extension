import { describe, it, expect, beforeEach } from 'vitest';
import { NookSpaceDB } from '@/services/database/db';
import { LayoutRepository, WidgetLayoutInput } from '@/services/database/repositories/layoutRepository';

describe('LayoutRepository — Milestone 1 Architecture', () => {
  let db: NookSpaceDB;
  let repo: LayoutRepository;

  beforeEach(async () => {
    db = new NookSpaceDB();
    await db.open();
    await db.widgetLayouts.clear();
    await db.widgetInstances.clear();
    repo = new LayoutRepository(db);
  });

  it('1. creates a valid layout record', async () => {
    const input: WidgetLayoutInput = {
      workspaceId: 'ws-alpha',
      widgetInstanceId: 'inst-clock',
      breakpoint: 'lg',
      x: 0,
      y: 0,
      w: 4,
      h: 2,
      minW: 3,
      minH: 2,
    };

    const created = await repo.createLayout(input);
    expect(created.id).toBe('ws-alpha_inst-clock_lg');
    expect(created.w).toBe(4);
    expect(created.h).toBe(2);

    const fromDb = await db.widgetLayouts.get('ws-alpha_inst-clock_lg');
    expect(fromDb).toBeDefined();
    expect(fromDb?.widgetInstanceId).toBe('inst-clock');
  });

  it('2. reads layouts by workspace and breakpoint', async () => {
    await repo.createLayout({
      workspaceId: 'ws-alpha',
      widgetInstanceId: 'inst-1',
      breakpoint: 'lg',
      x: 0,
      y: 0,
      w: 4,
      h: 2,
    });
    await repo.createLayout({
      workspaceId: 'ws-alpha',
      widgetInstanceId: 'inst-2',
      breakpoint: 'lg',
      x: 4,
      y: 0,
      w: 4,
      h: 2,
    });
    await repo.createLayout({
      workspaceId: 'ws-alpha',
      widgetInstanceId: 'inst-1',
      breakpoint: 'sm', // Different breakpoint
      x: 0,
      y: 0,
      w: 6,
      h: 2,
    });

    const lgLayouts = await repo.getLayoutsByWorkspace('ws-alpha', 'lg');
    expect(lgLayouts).toHaveLength(2);

    const smLayouts = await repo.getLayoutsByWorkspace('ws-alpha', 'sm');
    expect(smLayouts).toHaveLength(1);
  });

  it('3. reads layouts by widget instance', async () => {
    await repo.createLayout({
      workspaceId: 'ws-alpha',
      widgetInstanceId: 'inst-multi',
      breakpoint: 'lg',
      x: 0,
      y: 0,
      w: 4,
      h: 2,
    });
    await repo.createLayout({
      workspaceId: 'ws-alpha',
      widgetInstanceId: 'inst-multi',
      breakpoint: 'md',
      x: 0,
      y: 0,
      w: 5,
      h: 2,
    });

    const instanceLayouts = await repo.getLayoutsByWidgetInstance('inst-multi');
    expect(instanceLayouts).toHaveLength(2);
  });

  it('4. updates coordinates and dimensions', async () => {
    const created = await repo.createLayout({
      workspaceId: 'ws-alpha',
      widgetInstanceId: 'inst-resize',
      breakpoint: 'lg',
      x: 0,
      y: 0,
      w: 4,
      h: 2,
    });

    await repo.updateLayout(created.id, { x: 4, y: 1, w: 6, h: 4 });
    const updated = await db.widgetLayouts.get(created.id);
    expect(updated?.x).toBe(4);
    expect(updated?.y).toBe(1);
    expect(updated?.w).toBe(6);
    expect(updated?.h).toBe(4);
  });

  it('5. saves multiple layouts in an atomic transaction', async () => {
    const items: WidgetLayoutInput[] = [
      { workspaceId: 'ws-tx', widgetInstanceId: 'i-1', breakpoint: 'lg', x: 0, y: 0, w: 4, h: 2 },
      { workspaceId: 'ws-tx', widgetInstanceId: 'i-2', breakpoint: 'lg', x: 4, y: 0, w: 4, h: 2 },
      { workspaceId: 'ws-tx', widgetInstanceId: 'i-3', breakpoint: 'lg', x: 8, y: 0, w: 4, h: 2 },
    ];

    await repo.saveLayouts('ws-tx', 'lg', items);
    const saved = await repo.getLayoutsByWorkspace('ws-tx', 'lg');
    expect(saved).toHaveLength(3);
  });

  it('6. rejects invalid data with Zod validation', async () => {
    // Negative x
    await expect(
      repo.createLayout({
        workspaceId: 'ws-val',
        widgetInstanceId: 'inst-err',
        breakpoint: 'lg',
        x: -1,
        y: 0,
        w: 4,
        h: 2,
      })
    ).rejects.toThrow();

    // Width exceeding maxCols (12 on lg)
    await expect(
      repo.createLayout({
        workspaceId: 'ws-val',
        widgetInstanceId: 'inst-err',
        breakpoint: 'lg',
        x: 0,
        y: 0,
        w: 13,
        h: 2,
      })
    ).rejects.toThrow();

    // maxW smaller than minW
    await expect(
      repo.createLayout({
        workspaceId: 'ws-val',
        widgetInstanceId: 'inst-err',
        breakpoint: 'lg',
        x: 0,
        y: 0,
        w: 4,
        h: 2,
        minW: 5,
        maxW: 3,
      })
    ).rejects.toThrow();
  });

  it('7. prevents duplicate layout records for the same instance in the same breakpoint', async () => {
    const duplicates: WidgetLayoutInput[] = [
      { workspaceId: 'ws-dup', widgetInstanceId: 'i-dup', breakpoint: 'lg', x: 0, y: 0, w: 4, h: 2 },
      { workspaceId: 'ws-dup', widgetInstanceId: 'i-dup', breakpoint: 'lg', x: 4, y: 0, w: 4, h: 2 },
    ];

    const result = await repo.saveLayouts('ws-dup', 'lg', duplicates);
    expect(result).toHaveLength(1);

    const fromDb = await repo.getLayoutsByWorkspace('ws-dup', 'lg');
    expect(fromDb).toHaveLength(1);
  });

  it('8. enforces layout isolation between workspaces', async () => {
    await repo.createLayout({
      workspaceId: 'ws-work',
      widgetInstanceId: 'shared-widget-id',
      breakpoint: 'lg',
      x: 0,
      y: 0,
      w: 4,
      h: 2,
    });
    await repo.createLayout({
      workspaceId: 'ws-study',
      widgetInstanceId: 'shared-widget-id',
      breakpoint: 'lg',
      x: 6,
      y: 3,
      w: 6,
      h: 4,
    });

    const workLayout = await repo.getLayoutsByWorkspace('ws-work', 'lg');
    const studyLayout = await repo.getLayoutsByWorkspace('ws-study', 'lg');

    expect(workLayout).toHaveLength(1);
    expect(workLayout[0].x).toBe(0);

    expect(studyLayout).toHaveLength(1);
    expect(studyLayout[0].x).toBe(6);

    // Deleting one workspace does not affect the other
    await repo.deleteLayoutsByWorkspace('ws-work');
    expect(await repo.getLayoutsByWorkspace('ws-work', 'lg')).toHaveLength(0);
    expect(await repo.getLayoutsByWorkspace('ws-study', 'lg')).toHaveLength(1);
  });

  it('9. enforces layout isolation between breakpoints', async () => {
    await repo.createLayout({
      workspaceId: 'ws-bp',
      widgetInstanceId: 'inst-bp',
      breakpoint: 'lg',
      x: 0,
      y: 0,
      w: 12,
      h: 2,
    });
    await repo.createLayout({
      workspaceId: 'ws-bp',
      widgetInstanceId: 'inst-bp',
      breakpoint: 'xs',
      x: 0,
      y: 0,
      w: 4,
      h: 4,
    });

    const lg = await repo.getLayoutsByWorkspace('ws-bp', 'lg');
    const xs = await repo.getLayoutsByWorkspace('ws-bp', 'xs');

    expect(lg[0].w).toBe(12);
    expect(xs[0].w).toBe(4);
  });

  it('14. resets layout without mutating widget configuration', async () => {
    const now = Date.now();
    // Insert widget instance with config
    await db.widgetInstances.put({
      id: 'inst-cfg-test',
      workspaceId: 'ws-reset',
      widgetType: 'clock',
      title: 'Clock',
      config: { showSeconds: true, customTheme: 'amber' },
      isEnabled: true,
      order: 0,
      createdAt: now,
      updatedAt: now,
    });

    // Create custom layout
    await repo.createLayout({
      workspaceId: 'ws-reset',
      widgetInstanceId: 'inst-cfg-test',
      breakpoint: 'lg',
      x: 8,
      y: 5,
      w: 4,
      h: 2,
    });

    // Reset layout
    await repo.resetLayout('ws-reset', 'lg');

    // Layout is reset to default position (x:0, y:0)
    const resetLayout = await repo.getLayoutsByWorkspace('ws-reset', 'lg');
    expect(resetLayout).toHaveLength(1);
    expect(resetLayout[0].x).toBe(0);
    expect(resetLayout[0].y).toBe(0);

    // Widget instance configuration is 100% untouched
    const instance = await db.widgetInstances.get('inst-cfg-test');
    expect(instance?.config).toEqual({ showSeconds: true, customTheme: 'amber' });
  });

  it('15. handles non-existent workspace or widget instance gracefully', async () => {
    const emptyLayouts = await repo.getLayoutsByWorkspace('non-existent-workspace', 'lg');
    expect(emptyLayouts).toEqual([]);

    const emptyWidget = await repo.getLayoutsByWidgetInstance('non-existent-widget');
    expect(emptyWidget).toEqual([]);

    // Deleting non-existent does not throw
    await expect(repo.deleteLayout('non-existent-widget')).resolves.not.toThrow();
    await expect(repo.deleteLayoutsByWorkspace('non-existent-ws')).resolves.not.toThrow();
  });
});
