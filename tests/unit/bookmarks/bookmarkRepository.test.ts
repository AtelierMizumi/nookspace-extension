import { describe, it, expect, beforeEach } from 'vitest';
import { NookSpaceDB } from '../../../src/services/database/db';
import {
  BookmarkRepository,
  BookmarkNotFoundError,
} from '../../../src/features/bookmarks/repositories/bookmarkRepository';
import {
  BookmarkGroupRepository,
  BookmarkGroupNotFoundError,
} from '../../../src/features/bookmarks/repositories/bookmarkGroupRepository';

describe('BookmarkRepository — Milestone 6.2 Data Layer', () => {
  let db: NookSpaceDB;
  let repo: BookmarkRepository;
  let groupRepo: BookmarkGroupRepository;

  beforeEach(async () => {
    db = new NookSpaceDB();
    await db.open();
    await db.bookmarks.clear();
    await db.bookmarkGroups.clear();
    repo = new BookmarkRepository(db);
    groupRepo = new BookmarkGroupRepository(db);
  });

  describe('Create Operations & Group Association Validation', () => {
    it('creates an Uncategorized bookmark by default when groupId is null or omitted', async () => {
      const created = await repo.create({
        workspaceId: 'ws-main',
        title: 'NookSpace Docs',
        url: 'https://nookspace.io/docs',
      });

      expect(created.id).toBeDefined();
      expect(created.workspaceId).toBe('ws-main');
      expect(created.groupId).toBeNull();
      expect(created.title).toBe('NookSpace Docs');
      expect(created.url).toBe('https://nookspace.io/docs');
      expect(created.isFavorite).toBe(false);
      expect(created.order).toBe(0);
      expect(created.createdAt).toBeGreaterThan(0);
      expect(created.updatedAt).toBe(created.createdAt);
    });

    it('creates a bookmark associated with a valid group in the same workspace', async () => {
      const group = await groupRepo.create({
        workspaceId: 'ws-main',
        title: 'Work Resources',
      });

      const bm = await repo.create({
        workspaceId: 'ws-main',
        groupId: group.id,
        title: 'Linear App',
        url: 'https://linear.app',
        isFavorite: true,
      });

      expect(bm.groupId).toBe(group.id);
      expect(bm.isFavorite).toBe(true);
      expect(bm.order).toBe(0);
    });

    it('assigns auto-incrementing order within the same group', async () => {
      const group = await groupRepo.create({ workspaceId: 'ws-main', title: 'Tech' });

      const bm1 = await repo.create({
        workspaceId: 'ws-main',
        groupId: group.id,
        title: 'Item 1',
        url: 'https://example.com/1',
      });
      const bm2 = await repo.create({
        workspaceId: 'ws-main',
        groupId: group.id,
        title: 'Item 2',
        url: 'https://example.com/2',
      });

      expect(bm1.order).toBe(0);
      expect(bm2.order).toBe(1);
    });

    it('rejects creation if referenced group does not exist', async () => {
      await expect(
        repo.create({
          workspaceId: 'ws-main',
          groupId: 'non-existent-group',
          title: 'Bad Group',
          url: 'https://example.com',
        })
      ).rejects.toThrow(BookmarkGroupNotFoundError);
    });

    it('rejects creation if referenced group belongs to another workspace (cross-workspace violation)', async () => {
      const foreignGroup = await groupRepo.create({
        workspaceId: 'ws-other',
        title: 'Foreign Folder',
      });

      await expect(
        repo.create({
          workspaceId: 'ws-main',
          groupId: foreignGroup.id,
          title: 'Infiltrator',
          url: 'https://example.com',
        })
      ).rejects.toThrow(BookmarkGroupNotFoundError);
    });

    it('rejects invalid or unsafe URLs via security validation', async () => {
      await expect(
        repo.create({
          workspaceId: 'ws-main',
          title: 'Malicious',
          url: 'javascript:alert(1)',
        })
      ).rejects.toThrow();

      await expect(
        repo.create({
          workspaceId: 'ws-main',
          title: 'Credentialed',
          url: 'https://user:pass@example.com',
        })
      ).rejects.toThrow();
    });
  });

  describe('Read Operations & Workspace Isolation', () => {
    it('retrieves bookmark by ID and workspaceId; returns undefined for wrong workspace or missing ID', async () => {
      const created = await repo.create({
        workspaceId: 'ws-main',
        title: 'Vite',
        url: 'https://vitejs.dev',
      });

      const found = await repo.getById(created.id, 'ws-main');
      expect(found).toEqual(created);

      // Non-existent ID returns undefined
      const notFound = await repo.getById('missing-uuid', 'ws-main');
      expect(notFound).toBeUndefined();

      // Cross-workspace lookup returns undefined (prevents leakage)
      const crossWs = await repo.getById(created.id, 'ws-foreign');
      expect(crossWs).toBeUndefined();
    });

    it('retrieves bookmarks strictly filtered by workspace with deterministic ordering', async () => {
      await repo.create({ workspaceId: 'ws-1', title: 'BM B', url: 'https://b.com', order: 2 });
      await repo.create({ workspaceId: 'ws-1', title: 'BM A', url: 'https://a.com', order: 1 });
      await repo.create({ workspaceId: 'ws-2', title: 'BM Foreign', url: 'https://foreign.com' });

      const ws1Bookmarks = await repo.getByWorkspace('ws-1');
      expect(ws1Bookmarks).toHaveLength(2);
      expect(ws1Bookmarks[0].title).toBe('BM A');
      expect(ws1Bookmarks[1].title).toBe('BM B');

      const ws2Bookmarks = await repo.getByWorkspace('ws-2');
      expect(ws2Bookmarks).toHaveLength(1);
      expect(ws2Bookmarks[0].title).toBe('BM Foreign');
    });

    it('retrieves bookmarks by group (both specific group and Uncategorized null)', async () => {
      const group = await groupRepo.create({ workspaceId: 'ws-1', title: 'Social' });

      await repo.create({
        workspaceId: 'ws-1',
        groupId: group.id,
        title: 'Twitter',
        url: 'https://x.com',
      });
      await repo.create({
        workspaceId: 'ws-1',
        groupId: null,
        title: 'Direct Link',
        url: 'https://direct.com',
      });

      const groupItems = await repo.getByGroup('ws-1', group.id);
      expect(groupItems).toHaveLength(1);
      expect(groupItems[0].title).toBe('Twitter');

      const uncategorizedItems = await repo.getByGroup('ws-1', null);
      expect(uncategorizedItems).toHaveLength(1);
      expect(uncategorizedItems[0].title).toBe('Direct Link');
    });

    it('retrieves favorite bookmarks for a workspace only', async () => {
      await repo.create({
        workspaceId: 'ws-1',
        title: 'Favorite Item',
        url: 'https://fav.com',
        isFavorite: true,
      });
      await repo.create({
        workspaceId: 'ws-1',
        title: 'Regular Item',
        url: 'https://regular.com',
        isFavorite: false,
      });

      const favorites = await repo.getFavorites('ws-1');
      expect(favorites).toHaveLength(1);
      expect(favorites[0].title).toBe('Favorite Item');
    });

    it('retrieves multiple bookmarks by IDs preserving requested order and workspace scoping', async () => {
      const b1 = await repo.create({ workspaceId: 'ws-1', title: 'B1', url: 'https://1.com' });
      const b2 = await repo.create({ workspaceId: 'ws-1', title: 'B2', url: 'https://2.com' });
      const bForeign = await repo.create({ workspaceId: 'ws-2', title: 'Foreign', url: 'https://f.com' });

      const retrieved = await repo.getByIds([b2.id, bForeign.id, b1.id, 'unknown'], 'ws-1');
      expect(retrieved).toHaveLength(2);
      expect(retrieved[0].id).toBe(b2.id);
      expect(retrieved[1].id).toBe(b1.id);
    });
  });

  describe('Update Operations', () => {
    it('updates title, url, description, and group association accurately', async () => {
      const groupA = await groupRepo.create({ workspaceId: 'ws-1', title: 'Group A' });
      const groupB = await groupRepo.create({ workspaceId: 'ws-1', title: 'Group B' });

      const bm = await repo.create({
        workspaceId: 'ws-1',
        groupId: groupA.id,
        title: 'Initial Title',
        url: 'https://initial.com',
      });

      const updated = await repo.update(bm.id, 'ws-1', {
        title: 'Updated Title',
        url: 'https://updated.com',
        groupId: groupB.id,
        description: 'New Description',
      });

      expect(updated.title).toBe('Updated Title');
      expect(updated.url).toBe('https://updated.com');
      expect(updated.groupId).toBe(groupB.id);
      expect(updated.description).toBe('New Description');
      expect(updated.updatedAt).toBeGreaterThanOrEqual(bm.updatedAt);
    });

    it('allows moving a bookmark to Uncategorized by setting groupId to null', async () => {
      const group = await groupRepo.create({ workspaceId: 'ws-1', title: 'Folder' });
      const bm = await repo.create({
        workspaceId: 'ws-1',
        groupId: group.id,
        title: 'Item',
        url: 'https://example.com',
      });

      const updated = await repo.update(bm.id, 'ws-1', { groupId: null });
      expect(updated.groupId).toBeNull();
    });

    it('throws BookmarkNotFoundError when updating a missing bookmark or cross-workspace', async () => {
      await expect(
        repo.update('missing', 'ws-1', { title: 'New' })
      ).rejects.toThrow(BookmarkNotFoundError);

      const bm = await repo.create({
        workspaceId: 'ws-1',
        title: 'Protected',
        url: 'https://example.com',
      });

      await expect(
        repo.update(bm.id, 'ws-foreign', { title: 'Hacked' })
      ).rejects.toThrow(BookmarkNotFoundError);
    });

    it('rejects moving bookmark to a foreign workspace group', async () => {
      const foreignGroup = await groupRepo.create({ workspaceId: 'ws-foreign', title: 'Foreign' });
      const bm = await repo.create({
        workspaceId: 'ws-1',
        title: 'Item',
        url: 'https://example.com',
      });

      await expect(
        repo.update(bm.id, 'ws-1', { groupId: foreignGroup.id })
      ).rejects.toThrow(BookmarkGroupNotFoundError);
    });
  });

  describe('Delete & Favorite Operations', () => {
    it('deletes an existing bookmark and returns true; returns false for missing or foreign', async () => {
      const bm = await repo.create({
        workspaceId: 'ws-1',
        title: 'To Delete',
        url: 'https://example.com',
      });

      // Cross-workspace deletion fails safely
      const foreignDelete = await repo.delete(bm.id, 'ws-foreign');
      expect(foreignDelete).toBe(false);
      expect(await repo.getById(bm.id, 'ws-1')).toBeDefined();

      // Proper workspace deletion succeeds
      const actualDelete = await repo.delete(bm.id, 'ws-1');
      expect(actualDelete).toBe(true);
      expect(await repo.getById(bm.id, 'ws-1')).toBeUndefined();
    });

    it('toggles favorite status via setFavorite', async () => {
      const bm = await repo.create({
        workspaceId: 'ws-1',
        title: 'Fav Test',
        url: 'https://example.com',
        isFavorite: false,
      });

      const faved = await repo.setFavorite(bm.id, 'ws-1', true);
      expect(faved.isFavorite).toBe(true);

      const unfaved = await repo.setFavorite(bm.id, 'ws-1', false);
      expect(unfaved.isFavorite).toBe(false);
    });
  });

  describe('Reordering Operations & Atomicity', () => {
    it('sequentially reorders bookmarks within a group atomically', async () => {
      const group = await groupRepo.create({ workspaceId: 'ws-1', title: 'Links' });
      const bm1 = await repo.create({ workspaceId: 'ws-1', groupId: group.id, title: 'B1', url: 'https://1.com' });
      const bm2 = await repo.create({ workspaceId: 'ws-1', groupId: group.id, title: 'B2', url: 'https://2.com' });
      const bm3 = await repo.create({ workspaceId: 'ws-1', groupId: group.id, title: 'B3', url: 'https://3.com' });

      // Reorder to [B3, B1, B2]
      await repo.reorder([bm3.id, bm1.id, bm2.id], 'ws-1', group.id);

      const reordered = await repo.getByGroup('ws-1', group.id);
      expect(reordered[0].id).toBe(bm3.id);
      expect(reordered[0].order).toBe(0);
      expect(reordered[1].id).toBe(bm1.id);
      expect(reordered[1].order).toBe(1);
      expect(reordered[2].id).toBe(bm2.id);
      expect(reordered[2].order).toBe(2);
    });

    it('reorders bookmarks in Uncategorized (groupId: null)', async () => {
      const bm1 = await repo.create({ workspaceId: 'ws-1', title: 'U1', url: 'https://1.com' });
      const bm2 = await repo.create({ workspaceId: 'ws-1', title: 'U2', url: 'https://2.com' });

      await repo.reorder([bm2.id, bm1.id], 'ws-1', null);
      const reordered = await repo.getByGroup('ws-1', null);
      expect(reordered[0].id).toBe(bm2.id);
      expect(reordered[1].id).toBe(bm1.id);
    });

    it('rejects duplicate IDs during reordering', async () => {
      const bm = await repo.create({ workspaceId: 'ws-1', title: 'U1', url: 'https://1.com' });
      await expect(repo.reorder([bm.id, bm.id], 'ws-1', null)).rejects.toThrow(/Duplicate bookmark IDs/);
    });

    it('rejects cross-workspace or wrong-group IDs and rolls back', async () => {
      const groupA = await groupRepo.create({ workspaceId: 'ws-1', title: 'GA' });
      const groupB = await groupRepo.create({ workspaceId: 'ws-1', title: 'GB' });

      const bmA = await repo.create({ workspaceId: 'ws-1', groupId: groupA.id, title: 'A', url: 'https://a.com' });
      const bmB = await repo.create({ workspaceId: 'ws-1', groupId: groupB.id, title: 'B', url: 'https://b.com' });

      // Attempt to reorder in groupA while including bmB (which belongs to groupB)
      await expect(
        repo.reorder([bmA.id, bmB.id], 'ws-1', groupA.id)
      ).rejects.toThrow(/Group Mismatch/);

      // Verify no changes were committed
      const checkA = await repo.getById(bmA.id, 'ws-1');
      expect(checkA?.order).toBe(0);
    });
  });

  describe('Bookmark Movement Between Folders & Bulk Operations (Milestone 6.4)', () => {
    it('moves a bookmark between two folders, appending to target order and preserving metadata', async () => {
      const groupA = await groupRepo.create({ workspaceId: 'ws-1', title: 'Source' });
      const groupB = await groupRepo.create({ workspaceId: 'ws-1', title: 'Target' });

      // Target already has one bookmark (order 0)
      await repo.create({ workspaceId: 'ws-1', groupId: groupB.id, title: 'Existing in B', url: 'https://b.com' });

      const bm = await repo.create({
        workspaceId: 'ws-1',
        groupId: groupA.id,
        title: 'Move Me',
        url: 'https://move.com',
        description: 'Important link',
        customColor: '#3B82F6',
        isFavorite: true,
      });

      const moved = await repo.move(bm.id, 'ws-1', groupB.id);

      expect(moved.id).toBe(bm.id);
      expect(moved.groupId).toBe(groupB.id);
      expect(moved.order).toBe(1); // Appended after existing item
      expect(moved.title).toBe('Move Me');
      expect(moved.url).toBe('https://move.com');
      expect(moved.description).toBe('Important link');
      expect(moved.customColor).toBe('#3B82F6');
      expect(moved.isFavorite).toBe(true);
      expect(moved.updatedAt).toBeGreaterThanOrEqual(bm.updatedAt);
    });

    it('moves a bookmark to Uncategorized by passing targetGroupId: null', async () => {
      const group = await groupRepo.create({ workspaceId: 'ws-1', title: 'Folder' });
      const bm = await repo.create({
        workspaceId: 'ws-1',
        groupId: group.id,
        title: 'To Uncategorized',
        url: 'https://uncat.com',
      });

      const moved = await repo.move(bm.id, 'ws-1', null);
      expect(moved.groupId).toBeNull();

      const inUncat = await repo.getByGroup('ws-1', null);
      expect(inUncat.some((b) => b.id === bm.id)).toBe(true);
    });

    it('moves a bookmark from Uncategorized into a folder', async () => {
      const group = await groupRepo.create({ workspaceId: 'ws-1', title: 'Folder' });
      const bm = await repo.create({
        workspaceId: 'ws-1',
        groupId: null,
        title: 'From Uncat',
        url: 'https://fromuncat.com',
      });

      const moved = await repo.move(bm.id, 'ws-1', group.id);
      expect(moved.groupId).toBe(group.id);

      const inGroup = await repo.getByGroup('ws-1', group.id);
      expect(inGroup.some((b) => b.id === bm.id)).toBe(true);
    });

    it('handles moving a bookmark to its current folder as a harmless no-op', async () => {
      const group = await groupRepo.create({ workspaceId: 'ws-1', title: 'Folder' });
      const bm = await repo.create({
        workspaceId: 'ws-1',
        groupId: group.id,
        title: 'Same Folder',
        url: 'https://same.com',
      });

      const moved = await repo.move(bm.id, 'ws-1', group.id);
      expect(moved.groupId).toBe(group.id);
      expect(moved.order).toBe(bm.order);
    });

    it('rejects moving bookmark to a foreign or nonexistent group and leaves data unchanged', async () => {
      const foreignGroup = await groupRepo.create({ workspaceId: 'ws-foreign', title: 'Foreign' });
      const bm = await repo.create({
        workspaceId: 'ws-1',
        title: 'Stays WS1',
        url: 'https://stays.com',
      });

      await expect(repo.move(bm.id, 'ws-1', foreignGroup.id)).rejects.toThrow(BookmarkGroupNotFoundError);
      await expect(repo.move(bm.id, 'ws-1', 'non-existent-group')).rejects.toThrow(BookmarkGroupNotFoundError);

      const check = await repo.getById(bm.id, 'ws-1');
      expect(check?.groupId).toBeNull();
    });

    it('rejects moving a missing or cross-workspace bookmark', async () => {
      const group = await groupRepo.create({ workspaceId: 'ws-1', title: 'Folder' });
      await expect(repo.move('missing-id', 'ws-1', group.id)).rejects.toThrow(BookmarkNotFoundError);

      const foreignBm = await repo.create({
        workspaceId: 'ws-foreign',
        title: 'Foreign BM',
        url: 'https://f.com',
      });
      await expect(repo.move(foreignBm.id, 'ws-1', group.id)).rejects.toThrow(BookmarkNotFoundError);
    });

    it('moves multiple bookmarks in an atomic bulk operation (moveBulk)', async () => {
      const groupA = await groupRepo.create({ workspaceId: 'ws-1', title: 'Group A' });
      const groupB = await groupRepo.create({ workspaceId: 'ws-1', title: 'Group B' });

      const bm1 = await repo.create({ workspaceId: 'ws-1', groupId: groupA.id, title: 'Item 1', url: 'https://1.com' });
      const bm2 = await repo.create({ workspaceId: 'ws-1', groupId: groupA.id, title: 'Item 2', url: 'https://2.com' });
      const bm3 = await repo.create({ workspaceId: 'ws-1', groupId: groupA.id, title: 'Item 3', url: 'https://3.com' });

      const movedList = await repo.moveBulk([bm1.id, bm2.id, bm3.id], 'ws-1', groupB.id);

      expect(movedList).toHaveLength(3);
      expect(movedList.every((b) => b.groupId === groupB.id)).toBe(true);
      expect(movedList[0].order).toBe(0);
      expect(movedList[1].order).toBe(1);
      expect(movedList[2].order).toBe(2);

      const inGroupB = await repo.getByGroup('ws-1', groupB.id);
      expect(inGroupB).toHaveLength(3);
      const inGroupA = await repo.getByGroup('ws-1', groupA.id);
      expect(inGroupA).toHaveLength(0);
    });

    it('rejects duplicate IDs in bulk move', async () => {
      const group = await groupRepo.create({ workspaceId: 'ws-1', title: 'Folder' });
      const bm = await repo.create({ workspaceId: 'ws-1', title: 'Single', url: 'https://single.com' });

      await expect(repo.moveBulk([bm.id, bm.id], 'ws-1', group.id)).rejects.toThrow(
        /Duplicate bookmark IDs/
      );
    });

    it('rolls back completely with zero partial writes if one bookmark in bulk move is invalid', async () => {
      const groupA = await groupRepo.create({ workspaceId: 'ws-1', title: 'Group A' });
      const groupB = await groupRepo.create({ workspaceId: 'ws-1', title: 'Group B' });

      const bm1 = await repo.create({ workspaceId: 'ws-1', groupId: groupA.id, title: 'Item 1', url: 'https://1.com' });
      const bmForeign = await repo.create({ workspaceId: 'ws-foreign', title: 'Foreign', url: 'https://foreign.com' });

      await expect(
        repo.moveBulk([bm1.id, bmForeign.id], 'ws-1', groupB.id)
      ).rejects.toThrow(BookmarkNotFoundError);

      // Verify bm1 was rolled back and still belongs to groupA
      const checkBm1 = await repo.getById(bm1.id, 'ws-1');
      expect(checkBm1?.groupId).toBe(groupA.id);
    });
  });

  describe('Database Schema & Index Upgrade (Version 2 -> Version 3)', () => {
    it('verifies that bookmarks are indexed by workspaceId and can execute fast indexed queries', async () => {
      await repo.create({ workspaceId: 'ws-alpha', title: 'Alpha 1', url: 'https://alpha.com' });
      await repo.create({ workspaceId: 'ws-beta', title: 'Beta 1', url: 'https://beta.com' });

      // Verify that IndexedDB schema includes workspaceId on bookmarks
      const indexedCount = await db.bookmarks.where('workspaceId').equals('ws-alpha').count();
      expect(indexedCount).toBe(1);

      const items = await db.bookmarks.where('workspaceId').equals('ws-alpha').toArray();
      expect(items[0].title).toBe('Alpha 1');
    });
  });
});
