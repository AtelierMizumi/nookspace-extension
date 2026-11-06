import { describe, it, expect, beforeEach } from 'vitest';
import { NookSpaceDB } from '@/services/database/db';
import { WidgetInstanceRepository } from '@/services/database/repositories/widgetInstanceRepository';

describe('WidgetInstanceRepository', () => {
  let db: NookSpaceDB;
  let repo: WidgetInstanceRepository;

  beforeEach(async () => {
    db = new NookSpaceDB();
    await db.open();
    await db.widgetInstances.clear();
    repo = new WidgetInstanceRepository(db);
  });

  it('creates and retrieves widget instances for a workspace', async () => {
    const created = await repo.create({
      workspaceId: 'ws-test',
      widgetType: 'clock',
      title: 'Main Clock',
      config: { showSeconds: true },
    });

    expect(created.id).toBeDefined();
    expect(created.isEnabled).toBe(true);

    const instances = await repo.getByWorkspace('ws-test');
    expect(instances).toHaveLength(1);
    expect(instances[0].widgetType).toBe('clock');
    expect(instances[0].title).toBe('Main Clock');
  });

  it('updates configuration of an instance', async () => {
    const created = await repo.create({
      workspaceId: 'ws-test',
      widgetType: 'clock',
      config: { showSeconds: false },
    });

    await repo.updateConfig(created.id, { showSeconds: true, format24h: true });
    const updated = await repo.getById(created.id);
    expect(updated?.config).toEqual({ showSeconds: true, format24h: true });
  });

  it('toggles isEnabled flag', async () => {
    const created = await repo.create({
      workspaceId: 'ws-test',
      widgetType: 'clock',
    });

    await repo.toggleEnabled(created.id, false);
    const toggled = await repo.getById(created.id);
    expect(toggled?.isEnabled).toBe(false);
  });

  it('deletes an instance', async () => {
    const created = await repo.create({
      workspaceId: 'ws-test',
      widgetType: 'clock',
    });

    await repo.delete(created.id);
    const remaining = await repo.getByWorkspace('ws-test');
    expect(remaining).toHaveLength(0);
  });
});
