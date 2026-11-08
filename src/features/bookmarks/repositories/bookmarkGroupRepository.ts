import { db, NookSpaceDB } from '../../../services/database/db';
import {
  BookmarkGroupEntity,
  CreateBookmarkGroupInput,
  UpdateBookmarkGroupInput,
  BookmarkGroupSchema,
  CreateBookmarkGroupSchema,
  UpdateBookmarkGroupSchema,
} from '../../../types/bookmarks';

export interface DeleteBookmarkGroupOptions {
  mode?: 'reassign' | 'cascade';
}

export interface DeleteBookmarkGroupResult {
  deleted: boolean;
  mode: 'reassign' | 'cascade';
  affectedBookmarksCount: number;
}

export class BookmarkGroupNotFoundError extends Error {
  constructor(id: string, workspaceId: string) {
    super(`Bookmark group with id "${id}" not found in workspace "${workspaceId}"`);
    this.name = 'BookmarkGroupNotFoundError';
  }
}

export class BookmarkGroupRepository {
  constructor(private database: NookSpaceDB = db) {}

  /**
   * Retrieves a single group by ID strictly scoped to workspaceId.
   * Returns undefined if missing or belonging to another workspace.
   */
  async getById(id: string, workspaceId: string): Promise<BookmarkGroupEntity | undefined> {
    const record = await this.database.bookmarkGroups.get(id);
    if (!record || record.workspaceId !== workspaceId) {
      return undefined;
    }
    return record;
  }

  /**
   * Retrieves all bookmark groups belonging to a specific workspace,
   * deterministically ordered by `order` ascending, then `createdAt`, then `id`.
   */
  async getByWorkspace(workspaceId: string): Promise<BookmarkGroupEntity[]> {
    const records = await this.database.bookmarkGroups
      .where('workspaceId')
      .equals(workspaceId)
      .toArray();

    return records.sort((a, b) => {
      if (a.order !== b.order) return a.order - b.order;
      if (a.createdAt !== b.createdAt) return a.createdAt - b.createdAt;
      return a.id.localeCompare(b.id);
    });
  }

  /**
   * Retrieves multiple bookmark groups by IDs, strictly filtered by workspace.
   * Preserves the ordering of the input IDs array.
   */
  async getByIds(ids: string[], workspaceId: string): Promise<BookmarkGroupEntity[]> {
    if (ids.length === 0) return [];
    const records = await this.database.bookmarkGroups.bulkGet(ids);
    const validMap = new Map<string, BookmarkGroupEntity>();

    for (const record of records) {
      if (record && record.workspaceId === workspaceId) {
        validMap.set(record.id, record);
      }
    }

    const result: BookmarkGroupEntity[] = [];
    for (const id of ids) {
      const match = validMap.get(id);
      if (match) {
        result.push(match);
      }
    }
    return result;
  }

  /**
   * Creates a new bookmark group with Zod validation, transactional order assignment,
   * and workspace scoping.
   */
  async create(input: CreateBookmarkGroupInput): Promise<BookmarkGroupEntity> {
    const validatedInput = CreateBookmarkGroupSchema.parse(input);
    const now = Date.now();

    return this.database.transaction('rw', [this.database.bookmarkGroups], async () => {
      let order = validatedInput.order;
      if (order === undefined) {
        const existing = await this.database.bookmarkGroups
          .where('workspaceId')
          .equals(validatedInput.workspaceId)
          .toArray();
        order = existing.length > 0 ? Math.max(...existing.map((g) => g.order)) + 1 : 0;
      }

      const id =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `grp-${now}-${Math.random().toString(36).substring(2, 9)}`;

      const entity: BookmarkGroupEntity = {
        id,
        workspaceId: validatedInput.workspaceId,
        title: validatedInput.title,
        icon: validatedInput.icon,
        color: validatedInput.color,
        order,
        createdAt: now,
        updatedAt: now,
      };

      const validatedEntity = BookmarkGroupSchema.parse(entity);
      await this.database.bookmarkGroups.put(validatedEntity);
      return validatedEntity;
    });
  }

  /**
   * Updates an existing bookmark group with Zod validation and immutable field protection.
   */
  async update(
    id: string,
    workspaceId: string,
    changes: UpdateBookmarkGroupInput
  ): Promise<BookmarkGroupEntity> {
    const validatedChanges = UpdateBookmarkGroupSchema.parse(changes);

    return this.database.transaction('rw', [this.database.bookmarkGroups], async () => {
      const existing = await this.getById(id, workspaceId);
      if (!existing) {
        throw new BookmarkGroupNotFoundError(id, workspaceId);
      }

      const updatedEntity: BookmarkGroupEntity = {
        ...existing,
        title: validatedChanges.title ?? existing.title,
        icon:
          validatedChanges.icon !== undefined
            ? (validatedChanges.icon ?? undefined)
            : existing.icon,
        color:
          validatedChanges.color !== undefined
            ? (validatedChanges.color ?? undefined)
            : existing.color,
        order: validatedChanges.order ?? existing.order,
        updatedAt: Math.max(Date.now(), existing.createdAt),
      };

      const validated = BookmarkGroupSchema.parse(updatedEntity);
      await this.database.bookmarkGroups.put(validated);
      return validated;
    });
  }

  /**
   * Deletes a bookmark group within a single atomic transaction.
   * Mode A (Default: 'reassign'): Bookmarks in this group are reassigned to Uncategorized (groupId: null).
   * Mode B ('cascade'): Bookmarks in this group are deleted.
   * Enforces strict workspace isolation; foreign workspace groups/bookmarks are never modified.
   */
  async delete(
    id: string,
    workspaceId: string,
    options?: DeleteBookmarkGroupOptions
  ): Promise<DeleteBookmarkGroupResult> {
    const mode = options?.mode ?? 'reassign';

    return this.database.transaction(
      'rw',
      [this.database.bookmarkGroups, this.database.bookmarks],
      async () => {
        const group = await this.getById(id, workspaceId);
        if (!group) {
          return { deleted: false, mode, affectedBookmarksCount: 0 };
        }

        // Find bookmarks strictly belonging to this group and workspace
        const matchingBookmarks = await this.database.bookmarks
          .where('workspaceId')
          .equals(workspaceId)
          .filter((bm) => bm.groupId === id)
          .toArray();

        const affectedCount = matchingBookmarks.length;

        if (mode === 'cascade') {
          if (affectedCount > 0) {
            const idsToDelete = matchingBookmarks.map((bm) => bm.id);
            await this.database.bookmarks.bulkDelete(idsToDelete);
          }
        } else {
          // Mode A: Reassign to Uncategorized (null)
          if (affectedCount > 0) {
            const now = Date.now();
            const reassigned = matchingBookmarks.map((bm) => ({
              ...bm,
              groupId: null,
              updatedAt: Math.max(now, bm.createdAt),
            }));
            await this.database.bookmarks.bulkPut(reassigned);
          }
        }

        await this.database.bookmarkGroups.delete(id);
        return { deleted: true, mode, affectedBookmarksCount: affectedCount };
      }
    );
  }

  /**
   * Reorders an array of groups sequentially starting at 0 within a single atomic transaction.
   * Rejects duplicates, missing IDs, or cross-workspace violations.
   */
  async reorder(groupIds: string[], workspaceId: string): Promise<void> {
    if (groupIds.length === 0) return;

    // Check duplicate IDs
    if (new Set(groupIds).size !== groupIds.length) {
      throw new Error('Duplicate group IDs provided for reordering');
    }

    await this.database.transaction('rw', [this.database.bookmarkGroups], async () => {
      const existingRecords = await this.database.bookmarkGroups.bulkGet(groupIds);
      const now = Date.now();
      const updatedGroups: BookmarkGroupEntity[] = [];

      for (let i = 0; i < groupIds.length; i++) {
        const id = groupIds[i];
        const record = existingRecords[i];

        if (!record) {
          throw new BookmarkGroupNotFoundError(id, workspaceId);
        }

        if (record.workspaceId !== workspaceId) {
          throw new Error(
            `Workspace Isolation Violation: Cannot reorder group "${id}" belonging to workspace "${record.workspaceId}" from workspace "${workspaceId}"`
          );
        }

        updatedGroups.push({
          ...record,
          order: i,
          updatedAt: Math.max(now, record.createdAt),
        });
      }

      await this.database.bookmarkGroups.bulkPut(updatedGroups);
    });
  }
}

export const bookmarkGroupRepository = new BookmarkGroupRepository();
