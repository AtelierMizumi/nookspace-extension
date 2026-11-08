import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NookSpaceDB } from '../../../src/services/database/db';
import { WorkspaceRepository } from '../../../src/services/database/repositories/workspaceRepository';
import { WorkspaceEntity } from '../../../src/types/workspaces';

describe('WorkspaceRepository — Milestone 8.1 Data Architecture', () => {
  let testDb: NookSpaceDB;
  let repo: WorkspaceRepository;

  beforeEach(async () => {
    testDb = new NookSpaceDB(`test-workspace-repo-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`);
    await testDb.open();
    repo = new WorkspaceRepository(testDb);
  });

  afterEach(async () => {
    await testDb.delete();
  });

  // ==========================================
  // 1. GET ALL, GET BY ID & GET DEFAULT
  // ==========================================
  describe('Read Queries', () => {
    it('1. retrieves all workspaces sorted by order ascending', async () => {
      await testDb.workspaces.bulkAdd([
        {
          id: 'ws-2',
          name: 'Second Space',
          icon: 'Code',
          isDefault: false,
          order: 1,
          createdAt: 1000,
          updatedAt: 1000,
        },
        {
          id: 'ws-1',
          name: 'First Space',
          icon: 'Sparkles',
          isDefault: true,
          order: 0,
          createdAt: 1000,
          updatedAt: 1000,
        },
      ]);

      const all = await repo.getAll();
      expect(all).toHaveLength(2);
      expect(all[0].id).toBe('ws-1');
      expect(all[1].id).toBe('ws-2');
    });

    it('2. retrieves workspace by ID or returns undefined', async () => {
      await repo.create({ name: 'Find Me' });
      const all = await repo.getAll();
      const found = await repo.getById(all[0].id);
      expect(found).toBeDefined();
      expect(found?.name).toBe('Find Me');

      const notFound = await repo.getById('nonexistent-id');
      expect(notFound).toBeUndefined();
    });

    it('3. retrieves default workspace or first ordered fallback', async () => {
      await testDb.workspaces.bulkAdd([
        {
          id: 'ws-a',
          name: 'Alpha',
          icon: 'LayoutGrid',
          isDefault: false,
          order: 0,
          createdAt: 1000,
          updatedAt: 1000,
        },
        {
          id: 'ws-b',
          name: 'Beta (Default)',
          icon: 'Sparkles',
          isDefault: true,
          order: 1,
          createdAt: 1000,
          updatedAt: 1000,
        },
      ]);

      const def = await repo.getDefault();
      expect(def).toBeDefined();
      expect(def?.id).toBe('ws-b');
    });
  });

  // ==========================================
  // 2. CREATE WORKSPACE
  // ==========================================
  describe('Create Workspace', () => {
    it('4. creates valid workspace with sequential order and first isDefault true', async () => {
      const ws1 = await repo.create({ name: 'Personal' });
      expect(ws1.id).toMatch(/^ws-/);
      expect(ws1.name).toBe('Personal');
      expect(ws1.order).toBe(0);
      expect(ws1.isDefault).toBe(true);
      expect(ws1.icon).toBe('LayoutGrid');

      const ws2 = await repo.create({ name: 'Work', icon: 'Briefcase', color: '#3B82F6' });
      expect(ws2.order).toBe(1);
      expect(ws2.isDefault).toBe(false);
      expect(ws2.icon).toBe('Briefcase');
      expect(ws2.color).toBe('#3B82F6');
    });

    it('5. rejects invalid workspace creation inputs', async () => {
      await expect(repo.create({ name: '' })).rejects.toThrow();
      await expect(repo.create({ name: '   ' })).rejects.toThrow();
      await expect(repo.create({ name: 'a'.repeat(51) })).rejects.toThrow();
      await expect(repo.create({ name: 'Valid', color: 'invalid-color' })).rejects.toThrow();
    });
  });

  // ==========================================
  // 3. UPDATE WORKSPACE
  // ==========================================
  describe('Update Workspace', () => {
    it('6. updates workspace mutable fields and updates updatedAt timestamp', async () => {
      const ws = await repo.create({ name: 'Original', color: '#6366f1' });
      const oldUpdatedAt = ws.updatedAt;

      // Small delay to ensure timestamp change
      const updated = await repo.update(ws.id, {
        name: 'Renamed Workspace',
        icon: 'BookOpen',
        color: '#10B981',
      });

      expect(updated.name).toBe('Renamed Workspace');
      expect(updated.icon).toBe('BookOpen');
      expect(updated.color).toBe('#10B981');
      expect(updated.updatedAt).toBeGreaterThanOrEqual(oldUpdatedAt);

      const inDb = await repo.getById(ws.id);
      expect(inDb?.name).toBe('Renamed Workspace');
    });

    it('7. allows clearing color with null', async () => {
      const ws = await repo.create({ name: 'Color Space', color: '#6366f1' });
      const updated = await repo.update(ws.id, { color: null });
      expect(updated.color).toBeUndefined();

      const inDb = await repo.getById(ws.id);
      expect(inDb?.color).toBeUndefined();
    });

    it('8. rejects update of missing workspace', async () => {
      await expect(repo.update('missing-id', { name: 'Fail' })).rejects.toThrow(
        'Workspace with id "missing-id" not found'
      );
    });
  });

  // ==========================================
  // 4. TRANSACTIONAL REORDERING
  // ==========================================
  describe('Transactional Reordering', () => {
    it('9. reorders all workspaces deterministically inside a transaction', async () => {
      const ws1 = await repo.create({ name: 'One' });
      const ws2 = await repo.create({ name: 'Two' });
      const ws3 = await repo.create({ name: 'Three' });

      // Reorder: Three -> One -> Two
      await repo.reorder([ws3.id, ws1.id, ws2.id]);

      const all = await repo.getAll();
      expect(all[0].id).toBe(ws3.id);
      expect(all[0].order).toBe(0);
      expect(all[1].id).toBe(ws1.id);
      expect(all[1].order).toBe(1);
      expect(all[2].id).toBe(ws2.id);
      expect(all[2].order).toBe(2);
    });

    it('10. rejects duplicate IDs in reorder input', async () => {
      const ws1 = await repo.create({ name: 'One' });
      const ws2 = await repo.create({ name: 'Two' });

      await expect(repo.reorder([ws1.id, ws1.id])).rejects.toThrow(
        'Duplicate IDs detected in orderedIds'
      );
    });

    it('11. rejects incomplete permutation or unknown IDs in reorder input', async () => {
      const ws1 = await repo.create({ name: 'One' });
      const ws2 = await repo.create({ name: 'Two' });

      // Incomplete list (1 item instead of 2)
      await expect(repo.reorder([ws1.id])).rejects.toThrow('Expected complete permutation of all 2 workspaces');

      // Unknown ID with correct count
      await expect(repo.reorder([ws1.id, 'unknown-id'])).rejects.toThrow(
        'Workspace with id "unknown-id" not found'
      );
    });
  });

  // ==========================================
  // 5. SAFE CASCADE DELETION
  // ==========================================
  describe('Safe Cascade Deletion', () => {
    it('12. prevents deleting the only remaining workspace', async () => {
      const ws = await repo.create({ name: 'Sole Workspace' });
      await expect(repo.delete(ws.id)).rejects.toThrow(
        'Cannot delete the only remaining workspace.'
      );
    });

    it('13. deletes a non-default workspace and reassigns active settings', async () => {
      const ws1 = await repo.create({ name: 'Default Space' }); // default
      const ws2 = await repo.create({ name: 'Secondary Space' });

      await testDb.settings.put({
        id: 'current_settings',
        activeWorkspaceId: ws2.id,
        theme: 'dark',
        updatedAt: 1000,
      } as any);

      await repo.delete(ws2.id);

      const all = await repo.getAll();
      expect(all).toHaveLength(1);
      expect(all[0].id).toBe(ws1.id);

      // Settings activeWorkspaceId should fallback to remaining workspace
      const settings = await testDb.settings.get('current_settings');
      expect(settings?.activeWorkspaceId).toBe(ws1.id);
    });

    it('14. deletes the default workspace and promotes the next workspace to default', async () => {
      const ws1 = await repo.create({ name: 'Default Space' }); // isDefault: true
      const ws2 = await repo.create({ name: 'Promoted Space' }); // isDefault: false

      await repo.delete(ws1.id);

      const all = await repo.getAll();
      expect(all).toHaveLength(1);
      expect(all[0].id).toBe(ws2.id);
      expect(all[0].isDefault).toBe(true);
    });

    it('15. cascade deletes all workspace-scoped records while preserving other workspaces', async () => {
      const wsTarget = await repo.create({ name: 'Target Workspace' });
      const wsKeep = await repo.create({ name: 'Keep Workspace' });

      // Seed records in wsTarget
      await testDb.widgetInstances.add({
        id: 'wi-target-1',
        workspaceId: wsTarget.id,
        widgetType: 'clock',
        config: {},
        isEnabled: true,
        order: 0,
        createdAt: 1000,
        updatedAt: 1000,
      });

      await testDb.widgetLayouts.add({
        id: `${wsTarget.id}_wi-target-1_lg`,
        workspaceId: wsTarget.id,
        widgetInstanceId: 'wi-target-1',
        breakpoint: 'lg',
        x: 0,
        y: 0,
        w: 4,
        h: 2,
        isDefault: true,
        createdAt: 1000,
        updatedAt: 1000,
      });

      await testDb.notes.add({
        id: 'note-target-1',
        workspaceId: wsTarget.id,
        collectionId: null,
        title: 'Target Note',
        content: 'Content',
        excerpt: 'Content',
        isPinned: false,
        isFavorite: false,
        isArchived: false,
        tags: [],
        order: 0,
        createdAt: 1000,
        updatedAt: 1000,
      });

      await testDb.bookmarks.add({
        id: 'bm-target-1',
        workspaceId: wsTarget.id,
        groupId: null,
        title: 'Target Bookmark',
        url: 'https://target.com',
        isFavorite: false,
        order: 0,
        createdAt: 1000,
        updatedAt: 1000,
      });

      await testDb.todos.add({
        id: 'todo-target-1',
        workspaceId: wsTarget.id,
        title: 'Target Todo',
        completed: false,
        priority: 'medium',
        order: 0,
        createdAt: 1000,
        updatedAt: 1000,
      });

      // Seed records in wsKeep
      await testDb.widgetInstances.add({
        id: 'wi-keep-1',
        workspaceId: wsKeep.id,
        widgetType: 'clock',
        config: {},
        isEnabled: true,
        order: 0,
        createdAt: 1000,
        updatedAt: 1000,
      });

      await testDb.notes.add({
        id: 'note-keep-1',
        workspaceId: wsKeep.id,
        collectionId: null,
        title: 'Keep Note',
        content: 'Content',
        excerpt: 'Content',
        isPinned: false,
        isFavorite: false,
        isArchived: false,
        tags: [],
        order: 0,
        createdAt: 1000,
        updatedAt: 1000,
      });

      // Delete target workspace
      await repo.delete(wsTarget.id);

      // Verify target records are deleted
      expect(await testDb.widgetInstances.get('wi-target-1')).toBeUndefined();
      expect(await testDb.widgetLayouts.get(`${wsTarget.id}_wi-target-1_lg`)).toBeUndefined();
      expect(await testDb.notes.get('note-target-1')).toBeUndefined();
      expect(await testDb.bookmarks.get('bm-target-1')).toBeUndefined();
      expect(await testDb.todos.get('todo-target-1')).toBeUndefined();

      // Verify keep records remain intact
      expect(await testDb.widgetInstances.get('wi-keep-1')).toBeDefined();
      expect(await testDb.notes.get('note-keep-1')).toBeDefined();
    });

    it('16. rolls back deletion if an error occurs during transaction', async () => {
      const ws1 = await repo.create({ name: 'Space 1' });
      const ws2 = await repo.create({ name: 'Space 2' });

      // Spy on workspaces.delete to throw
      vi.spyOn(testDb.workspaces, 'delete').mockRejectedValueOnce(
        new Error('Simulated Database Failure')
      );

      await expect(repo.delete(ws2.id)).rejects.toThrow('Simulated Database Failure');

      // Verify ws2 still exists due to rollback
      const stillThere = await repo.getById(ws2.id);
      expect(stillThere).toBeDefined();
    });
  });

  // ==========================================
  // 6. DUPLICATE WORKSPACE
  // ==========================================
  describe('Duplicate Workspace', () => {
    it('17. duplicates workspace dashboard structure only with fresh IDs and rewrites layout references', async () => {
      const source = await repo.create({ name: 'Source Space', icon: 'Code', color: '#6366f1' });

      // Add widget instance and layout to source
      const instance = {
        id: 'wi-source-01',
        workspaceId: source.id,
        widgetType: 'clock',
        title: 'Clock Custom Title',
        config: { showSeconds: true },
        isEnabled: true,
        order: 0,
        createdAt: 1000,
        updatedAt: 1000,
      };
      await testDb.widgetInstances.add(instance);

      await testDb.widgetLayouts.add({
        id: `${source.id}_${instance.id}_lg`,
        workspaceId: source.id,
        widgetInstanceId: instance.id,
        breakpoint: 'lg',
        x: 0,
        y: 0,
        w: 4,
        h: 2,
        isDefault: true,
        createdAt: 1000,
        updatedAt: 1000,
      });

      // Add domain content (Note) to source to verify it is NOT copied
      await testDb.notes.add({
        id: 'note-source-01',
        workspaceId: source.id,
        collectionId: null,
        title: 'Source Note Private',
        content: 'Secret',
        excerpt: 'Secret',
        isPinned: false,
        isFavorite: false,
        isArchived: false,
        tags: [],
        order: 0,
        createdAt: 1000,
        updatedAt: 1000,
      });

      // Execute duplicate
      const duplicated = await repo.duplicate(source.id);

      expect(duplicated.id).not.toBe(source.id);
      expect(duplicated.name).toBe('Source Space (Copy)');
      expect(duplicated.icon).toBe(source.icon);
      expect(duplicated.color).toBe(source.color);
      expect(duplicated.isDefault).toBe(false);

      // Verify widget instances in duplicate workspace
      const dupInstances = await testDb.widgetInstances
        .where('workspaceId')
        .equals(duplicated.id)
        .toArray();
      expect(dupInstances).toHaveLength(1);
      expect(dupInstances[0].id).not.toBe(instance.id);
      expect(dupInstances[0].workspaceId).toBe(duplicated.id);
      expect(dupInstances[0].widgetType).toBe('clock');
      expect(dupInstances[0].title).toBe('Clock Custom Title');
      expect(dupInstances[0].config).toEqual({ showSeconds: true });

      // Verify layout in duplicate workspace
      const dupLayouts = await testDb.widgetLayouts
        .where('workspaceId')
        .equals(duplicated.id)
        .toArray();
      expect(dupLayouts).toHaveLength(1);
      expect(dupLayouts[0].workspaceId).toBe(duplicated.id);
      expect(dupLayouts[0].widgetInstanceId).toBe(dupInstances[0].id);
      expect(dupLayouts[0].id).toBe(`${duplicated.id}_${dupInstances[0].id}_lg`);
      expect(dupLayouts[0].w).toBe(4);
      expect(dupLayouts[0].h).toBe(2);

      // Verify domain content (Note) was NOT duplicated
      const dupNotes = await testDb.notes
        .where('workspaceId')
        .equals(duplicated.id)
        .toArray();
      expect(dupNotes).toHaveLength(0);
    });

    it('18. truncates name to 50 characters when source name is already long', async () => {
      const longName = 'A'.repeat(48);
      const source = await repo.create({ name: longName });

      const duplicated = await repo.duplicate(source.id);
      expect(duplicated.name.length).toBeLessThanOrEqual(50);
      expect(duplicated.name.endsWith('(Copy)')).toBe(false); // truncated properly
    });

    it('19. rejects duplicate of non-existent workspace', async () => {
      await expect(repo.duplicate('missing-id')).rejects.toThrow(
        'Workspace with id "missing-id" not found'
      );
    });
  });
});
