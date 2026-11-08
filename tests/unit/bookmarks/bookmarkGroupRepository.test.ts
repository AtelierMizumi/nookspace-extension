import { describe, it, expect, beforeEach } from 'vitest';
import { NookSpaceDB } from '../../../src/services/database/db';
import {
  BookmarkGroupRepository,
  BookmarkGroupNotFoundError,
} from '../../../src/features/bookmarks/repositories/bookmarkGroupRepository';
import { BookmarkRepository } from '../../../src/features/bookmarks/repositories/bookmarkRepository';

describe('BookmarkGroupRepository — Milestone 6.2 Data Layer', () => {
  let db: NookSpaceDB;
  let groupRepo: BookmarkGroupRepository;
  let bookmarkRepo: BookmarkRepository;

  beforeEach(async () => {
    db = new NookSpaceDB();
    await db.open();
    await db.bookmarkGroups.clear();
    await db.bookmarks.clear();
    groupRepo = new BookmarkGroupRepository(db);
    bookmarkRepo = new BookmarkRepository(db);
  });

  describe('Create Operations', () => {
    it('creates a valid group with auto-generated ID, timestamps, and sequential order', async () => {
      const created = await groupRepo.create({
        workspaceId: 'ws-work',
        title: 'Development Tools',
        icon: 'code',
        color: '#3B82F6',
      });

      expect(created.id).toBeDefined();
      expect(created.workspaceId).toBe('ws-work');
      expect(created.title).toBe('Development Tools');
      expect(created.icon).toBe('code');
      expect(created.color).toBe('#3B82F6');
      expect(created.order).toBe(0);
      expect(created.createdAt).toBeGreaterThan(0);
      expect(created.updatedAt).toBe(created.createdAt);

      const second = await groupRepo.create({
        workspaceId: 'ws-work',
        title: 'Documentation',
      });
      expect(second.order).toBe(1);
    });

    it('respects an explicitly provided order', async () => {
      const created = await groupRepo.create({
        workspaceId: 'ws-work',
        title: 'Priority Group',
        order: 99,
      });
      expect(created.order).toBe(99);
    });

    it('rejects invalid inputs via Zod schema (empty title, invalid color)', async () => {
      await expect(
        groupRepo.create({
          workspaceId: 'ws-work',
          title: '   ',
        })
      ).rejects.toThrow();

      await expect(
        groupRepo.create({
          workspaceId: 'ws-work',
          title: 'Bad Color',
          color: 'not-a-hex',
        })
      ).rejects.toThrow();
    });
  });

  describe('Read Operations & Workspace Isolation', () => {
    it('retrieves group by ID and workspaceId; returns undefined for wrong workspace or missing ID', async () => {
      const created = await groupRepo.create({
        workspaceId: 'ws-1',
        title: 'G1',
      });
      const found = await groupRepo.getById(created.id, 'ws-1');
      expect(found).toEqual(created);

      // Returns undefined for non-existent ID
      const notFound = await groupRepo.getById('non-existent', 'ws-1');
      expect(notFound).toBeUndefined();

      // Returns undefined when accessed from another workspace (prevents cross-workspace leakage)
      const crossWs = await groupRepo.getById(created.id, 'ws-foreign');
      expect(crossWs).toBeUndefined();
    });

    it('retrieves groups strictly filtered by workspace with deterministic ordering', async () => {
      await groupRepo.create({ workspaceId: 'ws-1', title: 'Group B', order: 2 });
      await groupRepo.create({ workspaceId: 'ws-1', title: 'Group A', order: 1 });
      await groupRepo.create({ workspaceId: 'ws-2', title: 'Group Foreign', order: 0 });

      const ws1Groups = await groupRepo.getByWorkspace('ws-1');
      expect(ws1Groups).toHaveLength(2);
      expect(ws1Groups[0].title).toBe('Group A');
      expect(ws1Groups[1].title).toBe('Group B');

      const ws2Groups = await groupRepo.getByWorkspace('ws-2');
      expect(ws2Groups).toHaveLength(1);
      expect(ws2Groups[0].title).toBe('Group Foreign');
    });

    it('retrieves multiple groups by IDs with workspace filtering and preserved order', async () => {
      const g1 = await groupRepo.create({ workspaceId: 'ws-1', title: 'First' });
      const g2 = await groupRepo.create({ workspaceId: 'ws-1', title: 'Second' });
      const gOther = await groupRepo.create({ workspaceId: 'ws-2', title: 'Foreign' });

      const result = await groupRepo.getByIds([g2.id, gOther.id, g1.id, 'missing-id'], 'ws-1');
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe(g2.id);
      expect(result[1].id).toBe(g1.id);
    });
  });

  describe('Update Operations', () => {
    it('updates title, icon, and color while preserving unchanged fields', async () => {
      const created = await groupRepo.create({
        workspaceId: 'ws-1',
        title: 'Old Title',
        icon: 'folder',
        color: '#112233',
      });

      const updated = await groupRepo.update(created.id, 'ws-1', {
        title: 'New Title',
        color: '#AABBCC',
      });

      expect(updated.title).toBe('New Title');
      expect(updated.color).toBe('#AABBCC');
      expect(updated.icon).toBe('folder');
      expect(updated.updatedAt).toBeGreaterThanOrEqual(created.updatedAt);
    });

    it('throws BookmarkGroupNotFoundError if group does not exist', async () => {
      await expect(
        groupRepo.update('missing', 'ws-1', { title: 'New' })
      ).rejects.toThrow(BookmarkGroupNotFoundError);
    });

    it('throws BookmarkGroupNotFoundError on cross-workspace update attempt', async () => {
      const created = await groupRepo.create({
        workspaceId: 'ws-1',
        title: 'Secret Group',
      });

      await expect(
        groupRepo.update(created.id, 'ws-foreign', { title: 'Hacked' })
      ).rejects.toThrow(BookmarkGroupNotFoundError);

      const unchanged = await groupRepo.getById(created.id, 'ws-1');
      expect(unchanged?.title).toBe('Secret Group');
    });
  });

  describe('Delete Operations (Safe Default Reassignment vs Explicit Cascade)', () => {
    it('Mode A (Safe Default): deletes group and reassigns associated bookmarks to Uncategorized (groupId: null)', async () => {
      const group = await groupRepo.create({ workspaceId: 'ws-1', title: 'Temp Folder' });

      const bm1 = await bookmarkRepo.create({
        workspaceId: 'ws-1',
        groupId: group.id,
        title: 'Item 1',
        url: 'https://example.com/1',
      });
      const bm2 = await bookmarkRepo.create({
        workspaceId: 'ws-1',
        groupId: group.id,
        title: 'Item 2',
        url: 'https://example.com/2',
      });

      const deleteResult = await groupRepo.delete(group.id, 'ws-1');
      expect(deleteResult).toEqual({
        deleted: true,
        mode: 'reassign',
        affectedBookmarksCount: 2,
      });

      const checkGroup = await groupRepo.getById(group.id, 'ws-1');
      expect(checkGroup).toBeUndefined();

      const updatedBm1 = await bookmarkRepo.getById(bm1.id, 'ws-1');
      const updatedBm2 = await bookmarkRepo.getById(bm2.id, 'ws-1');
      expect(updatedBm1?.groupId).toBeNull();
      expect(updatedBm2?.groupId).toBeNull();
      expect(updatedBm1?.title).toBe('Item 1');
      expect(updatedBm2?.title).toBe('Item 2');
    });

    it('Mode B (Explicit Cascade): deletes group and permanently deletes all associated bookmarks', async () => {
      const group = await groupRepo.create({ workspaceId: 'ws-1', title: 'Trash Folder' });

      const bm1 = await bookmarkRepo.create({
        workspaceId: 'ws-1',
        groupId: group.id,
        title: 'Cascade Item 1',
        url: 'https://example.com/c1',
      });
      const bm2 = await bookmarkRepo.create({
        workspaceId: 'ws-1',
        groupId: group.id,
        title: 'Cascade Item 2',
        url: 'https://example.com/c2',
      });

      const deleteResult = await groupRepo.delete(group.id, 'ws-1', { mode: 'cascade' });
      expect(deleteResult).toEqual({
        deleted: true,
        mode: 'cascade',
        affectedBookmarksCount: 2,
      });

      expect(await groupRepo.getById(group.id, 'ws-1')).toBeUndefined();
      expect(await bookmarkRepo.getById(bm1.id, 'ws-1')).toBeUndefined();
      expect(await bookmarkRepo.getById(bm2.id, 'ws-1')).toBeUndefined();
    });

    it('prevents cross-workspace group deletion and leaves data untouched', async () => {
      const group = await groupRepo.create({ workspaceId: 'ws-1', title: 'Protected' });
      const bm = await bookmarkRepo.create({
        workspaceId: 'ws-1',
        groupId: group.id,
        title: 'Protected Item',
        url: 'https://example.com',
      });

      const result = await groupRepo.delete(group.id, 'ws-foreign', { mode: 'cascade' });
      expect(result.deleted).toBe(false);

      expect(await groupRepo.getById(group.id, 'ws-1')).toBeDefined();
      expect(await bookmarkRepo.getById(bm.id, 'ws-1')).toBeDefined();
    });
  });

  describe('Reordering Operations', () => {
    it('sequentially reorders groups within a workspace in one atomic transaction', async () => {
      const g1 = await groupRepo.create({ workspaceId: 'ws-1', title: 'G1' });
      const g2 = await groupRepo.create({ workspaceId: 'ws-1', title: 'G2' });
      const g3 = await groupRepo.create({ workspaceId: 'ws-1', title: 'G3' });

      // Reorder to [G3, G1, G2]
      await groupRepo.reorder([g3.id, g1.id, g2.id], 'ws-1');

      const reordered = await groupRepo.getByWorkspace('ws-1');
      expect(reordered[0].id).toBe(g3.id);
      expect(reordered[0].order).toBe(0);
      expect(reordered[1].id).toBe(g1.id);
      expect(reordered[1].order).toBe(1);
      expect(reordered[2].id).toBe(g2.id);
      expect(reordered[2].order).toBe(2);
    });

    it('rejects duplicate IDs during reorder', async () => {
      const g1 = await groupRepo.create({ workspaceId: 'ws-1', title: 'G1' });
      await expect(groupRepo.reorder([g1.id, g1.id], 'ws-1')).rejects.toThrow(
        /Duplicate group IDs/
      );
    });

    it('rejects missing or cross-workspace group IDs', async () => {
      const g1 = await groupRepo.create({ workspaceId: 'ws-1', title: 'G1' });
      const gForeign = await groupRepo.create({ workspaceId: 'ws-2', title: 'Foreign' });

      await expect(groupRepo.reorder([g1.id, 'missing-id'], 'ws-1')).rejects.toThrow(
        BookmarkGroupNotFoundError
      );

      await expect(groupRepo.reorder([g1.id, gForeign.id], 'ws-1')).rejects.toThrow(
        /Workspace Isolation Violation/
      );
    });

    it('preserves unrelated workspace groups ordering completely untouched during reorder', async () => {
      const g1 = await groupRepo.create({ workspaceId: 'ws-1', title: 'WS1 Group 1', order: 0 });
      const g2 = await groupRepo.create({ workspaceId: 'ws-1', title: 'WS1 Group 2', order: 1 });

      const f1 = await groupRepo.create({ workspaceId: 'ws-other', title: 'Other 1', order: 10 });
      const f2 = await groupRepo.create({ workspaceId: 'ws-other', title: 'Other 2', order: 20 });

      // Reorder ws-1 groups
      await groupRepo.reorder([g2.id, g1.id], 'ws-1');

      // Check ws-1 updated
      const ws1Reordered = await groupRepo.getByWorkspace('ws-1');
      expect(ws1Reordered[0].id).toBe(g2.id);
      expect(ws1Reordered[1].id).toBe(g1.id);

      // Check ws-other completely untouched
      const otherGroups = await groupRepo.getByWorkspace('ws-other');
      expect(otherGroups[0].id).toBe(f1.id);
      expect(otherGroups[0].order).toBe(10);
      expect(otherGroups[1].id).toBe(f2.id);
      expect(otherGroups[1].order).toBe(20);
    });
  });

  describe('Folder Renaming & Validation Safeguards (Milestone 6.4)', () => {
    it('renames folder while preserving ID, workspace, creation timestamp, and order', async () => {
      const created = await groupRepo.create({
        workspaceId: 'ws-1',
        title: 'Initial Name',
        order: 5,
      });

      const renamed = await groupRepo.update(created.id, 'ws-1', {
        title: 'Renamed Name',
      });

      expect(renamed.id).toBe(created.id);
      expect(renamed.workspaceId).toBe('ws-1');
      expect(renamed.createdAt).toBe(created.createdAt);
      expect(renamed.order).toBe(5);
      expect(renamed.title).toBe('Renamed Name');
      expect(renamed.updatedAt).toBeGreaterThanOrEqual(created.updatedAt);
    });

    it('rejects empty, whitespace-only, or overly long names during rename', async () => {
      const created = await groupRepo.create({
        workspaceId: 'ws-1',
        title: 'Valid Name',
      });

      await expect(
        groupRepo.update(created.id, 'ws-1', { title: '   ' })
      ).rejects.toThrow();

      await expect(
        groupRepo.update(created.id, 'ws-1', { title: 'a'.repeat(101) })
      ).rejects.toThrow();
    });

    it('ensures folder deletion in one folder does not affect bookmarks in other folders', async () => {
      const groupA = await groupRepo.create({ workspaceId: 'ws-1', title: 'Keep Folder' });
      const groupB = await groupRepo.create({ workspaceId: 'ws-1', title: 'Delete Folder' });

      const bmA = await bookmarkRepo.create({
        workspaceId: 'ws-1',
        groupId: groupA.id,
        title: 'Safe BM',
        url: 'https://safe.com',
      });
      const bmB = await bookmarkRepo.create({
        workspaceId: 'ws-1',
        groupId: groupB.id,
        title: 'Deleted BM',
        url: 'https://deleted.com',
      });

      // Cascade delete groupB
      await groupRepo.delete(groupB.id, 'ws-1', { mode: 'cascade' });

      // Group A and its bookmark are 100% intact
      expect(await groupRepo.getById(groupA.id, 'ws-1')).toBeDefined();
      expect(await bookmarkRepo.getById(bmA.id, 'ws-1')).toBeDefined();

      // Group B and its bookmark are removed
      expect(await groupRepo.getById(groupB.id, 'ws-1')).toBeUndefined();
      expect(await bookmarkRepo.getById(bmB.id, 'ws-1')).toBeUndefined();
    });
  });
});
