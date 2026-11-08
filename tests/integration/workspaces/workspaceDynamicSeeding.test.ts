import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NookSpaceDB } from '../../../src/services/database/db';
import { WorkspaceRepository } from '../../../src/services/database/repositories/workspaceRepository';
import { WidgetInstanceRepository } from '../../../src/services/database/repositories/widgetInstanceRepository';
import { LayoutRepository } from '../../../src/services/database/repositories/layoutRepository';
import { synchronizeLayout } from '../../../src/features/layout-editor/layoutUtils';

describe('Milestone 8.3 — Workspace Dynamic Seeding Suite', () => {
  let testDb: NookSpaceDB;
  let workspaceRepo: WorkspaceRepository;
  let widgetRepo: WidgetInstanceRepository;
  let layoutRepo: LayoutRepository;

  beforeEach(async () => {
    testDb = new NookSpaceDB(`test-seed-iso-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`);
    await testDb.open();
    workspaceRepo = new WorkspaceRepository(testDb);
    widgetRepo = new WidgetInstanceRepository(testDb);
    layoutRepo = new LayoutRepository(testDb);
  });

  afterEach(async () => {
    await testDb.delete();
  });

  it('1. initial installation seeds the 3 default workspaces, but only the default workspace has widgets and layouts', async () => {
    await testDb.seedInitialData();

    const workspaces = await workspaceRepo.getAll();
    expect(workspaces).toHaveLength(3);
    expect(workspaces.map((w) => w.id)).toEqual(['ws-default-personal', 'ws-study', 'ws-dev']);

    // Default workspace has 5 widgets and layouts
    const defaultWidgets = await widgetRepo.getByWorkspace('ws-default-personal');
    expect(defaultWidgets).toHaveLength(5);
    const defaultLayouts = await layoutRepo.getLayoutsByWorkspace('ws-default-personal', 'lg');
    expect(defaultLayouts).toHaveLength(5);

    // Other initial workspaces are clean blank workspaces
    const studyWidgets = await widgetRepo.getByWorkspace('ws-study');
    expect(studyWidgets).toHaveLength(0);
    const devWidgets = await widgetRepo.getByWorkspace('ws-dev');
    expect(devWidgets).toHaveLength(0);
  });

  it('2. newly created workspace starts completely empty (0 widgets, 0 layouts)', async () => {
    await testDb.seedInitialData();

    const newWs = await workspaceRepo.create({
      name: 'Japanese Study',
      icon: 'BookOpen',
      color: '#10b981',
    });

    expect(newWs.id).toMatch(/^ws-/);
    const widgets = await widgetRepo.getByWorkspace(newWs.id);
    expect(widgets).toHaveLength(0);

    const layouts = await layoutRepo.getLayoutsByWorkspace(newWs.id, 'lg');
    expect(layouts).toHaveLength(0);
  });

  it('3. switching to an empty workspace does not trigger auto-seeding of default widgets', async () => {
    await testDb.seedInitialData();

    const blankWs = await workspaceRepo.create({ name: 'Blank Canvas' });

    // Verify multiple getByWorkspace calls remain completely empty
    expect(await widgetRepo.getByWorkspace(blankWs.id)).toHaveLength(0);
    expect(await widgetRepo.getByWorkspace(blankWs.id)).toHaveLength(0);
    expect(await layoutRepo.getLayoutsByWorkspace(blankWs.id, 'lg')).toHaveLength(0);
  });

  it('4 & 5. seedInitialData is strictly idempotent: re-calling it creates zero duplicates', async () => {
    await testDb.seedInitialData();
    const count1 = await testDb.workspaces.count();
    const widgetCount1 = await testDb.widgetInstances.count();

    // Call second and third time
    await testDb.seedInitialData();
    await testDb.seedInitialData();

    const count2 = await testDb.workspaces.count();
    const widgetCount2 = await testDb.widgetInstances.count();

    expect(count2).toBe(count1);
    expect(widgetCount2).toBe(widgetCount1);
  });

  it('6 & 7. newly created blank workspace can add its first widget and persist its first responsive layout', async () => {
    const blankWs = await workspaceRepo.create({ name: 'Fresh Lab' });

    // Add first widget
    const firstWidget = await widgetRepo.create({
      workspaceId: blankWs.id,
      widgetType: 'clock',
      title: 'Lab Clock',
    });

    expect(firstWidget.workspaceId).toBe(blankWs.id);
    const widgets = await widgetRepo.getByWorkspace(blankWs.id);
    expect(widgets).toHaveLength(1);

    // Synchronize and save initial layout
    const synchronized = synchronizeLayout(blankWs.id, 'lg', widgets, []);
    expect(synchronized).toHaveLength(1);
    expect(synchronized[0].widgetInstanceId).toBe(firstWidget.id);

    await layoutRepo.saveLayouts(blankWs.id, 'lg', synchronized);

    const persisted = await layoutRepo.getLayoutsByWorkspace(blankWs.id, 'lg');
    expect(persisted).toHaveLength(1);
    expect(persisted[0].workspaceId).toBe(blankWs.id);
    expect(persisted[0].widgetInstanceId).toBe(firstWidget.id);
  });

  it('8. duplicating a workspace clones dashboard widgets & layouts while leaving content uncopied', async () => {
    await testDb.seedInitialData();

    // Duplicate ws-default-personal
    const duplicated = await workspaceRepo.duplicate('ws-default-personal');
    expect(duplicated.name).toBe('Personal Space (Copy)');

    // Cloned widgets exist with new IDs
    const clonedWidgets = await widgetRepo.getByWorkspace(duplicated.id);
    expect(clonedWidgets).toHaveLength(5);
    expect(clonedWidgets.every((w) => w.workspaceId === duplicated.id)).toBe(true);

    // Cloned layouts exist for duplicated workspace
    const clonedLayouts = await layoutRepo.getLayoutsByWorkspace(duplicated.id, 'lg');
    expect(clonedLayouts).toHaveLength(5);
    expect(clonedLayouts.every((l) => l.workspaceId === duplicated.id)).toBe(true);

    // Original remains pristine
    const originalWidgets = await widgetRepo.getByWorkspace('ws-default-personal');
    expect(originalWidgets).toHaveLength(5);
  });
});
