import { db, NookSpaceDB } from '../../../services/database/db';
import {
  BookmarkEntity,
  CreateBookmarkInput,
  UpdateBookmarkInput,
  BookmarkSchema,
  CreateBookmarkSchema,
  UpdateBookmarkSchema,
} from '../../../types/bookmarks';
import { BookmarkGroupNotFoundError } from './bookmarkGroupRepository';

export class BookmarkNotFoundError extends Error {
  constructor(id: string, workspaceId: string) {
    super(`Bookmark with id "${id}" not found in workspace "${workspaceId}"`);
    this.name = 'BookmarkNotFoundError';
  }
}

export class BookmarkRepository {
  constructor(private database: NookSpaceDB = db) {}

  /**
   * Retrieves a single bookmark by ID strictly scoped to workspaceId.
   * Returns undefined if missing or belonging to another workspace.
   */
  async getById(id: string, workspaceId: string): Promise<BookmarkEntity | undefined> {
    const record = await this.database.bookmarks.get(id);
    if (!record || record.workspaceId !== workspaceId) {
      return undefined;
    }
    return record;
  }

  /**
   * Retrieves all bookmarks belonging strictly to a specified workspace,
   * deterministically ordered by `order` ascending, then `createdAt`, then `id`.
   */
  async getByWorkspace(workspaceId: string): Promise<BookmarkEntity[]> {
    const records = await this.database.bookmarks
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
   * Retrieves bookmarks belonging to a specific group within a workspace.
   * Passing `groupId === null` returns Uncategorized bookmarks.
   */
  async getByGroup(workspaceId: string, groupId: string | null): Promise<BookmarkEntity[]> {
    const workspaceBookmarks = await this.getByWorkspace(workspaceId);
    return workspaceBookmarks.filter((bm) => bm.groupId === groupId);
  }

  /**
   * Retrieves favorite bookmarks strictly belonging to a specific workspace.
   */
  async getFavorites(workspaceId: string): Promise<BookmarkEntity[]> {
    const workspaceBookmarks = await this.getByWorkspace(workspaceId);
    return workspaceBookmarks.filter((bm) => bm.isFavorite);
  }

  /**
   * Retrieves multiple bookmarks by IDs, strictly filtering to ensure each record
   * belongs to the requested workspace. Preserves the ordering of the input IDs.
   */
  async getByIds(ids: string[], workspaceId: string): Promise<BookmarkEntity[]> {
    if (ids.length === 0) return [];
    const records = await this.database.bookmarks.bulkGet(ids);
    const validMap = new Map<string, BookmarkEntity>();

    for (const record of records) {
      if (record && record.workspaceId === workspaceId) {
        validMap.set(record.id, record);
      }
    }

    const result: BookmarkEntity[] = [];
    for (const id of ids) {
      const match = validMap.get(id);
      if (match) {
        result.push(match);
      }
    }
    return result;
  }

  /**
   * Creates a new bookmark with Zod validation, group existence verification,
   * and workspace isolation. Runs within a Dexie transaction to prevent race conditions.
   */
  async create(input: CreateBookmarkInput): Promise<BookmarkEntity> {
    const validatedInput = CreateBookmarkSchema.parse(input);
    const now = Date.now();

    return this.database.transaction(
      'rw',
      [this.database.bookmarks, this.database.bookmarkGroups],
      async () => {
        // Verify group exists and belongs to the same workspace if provided
        if (validatedInput.groupId !== null && validatedInput.groupId !== undefined) {
          const group = await this.database.bookmarkGroups.get(validatedInput.groupId);
          if (!group || group.workspaceId !== validatedInput.workspaceId) {
            throw new BookmarkGroupNotFoundError(validatedInput.groupId, validatedInput.workspaceId);
          }
        }

        // Determine sequential order within group if not explicitly specified
        let order = validatedInput.order;
        if (order === undefined) {
          const matchingInGroup = await this.database.bookmarks
            .where('workspaceId')
            .equals(validatedInput.workspaceId)
            .filter((bm) => bm.groupId === (validatedInput.groupId ?? null))
            .toArray();

          order =
            matchingInGroup.length > 0 ? Math.max(...matchingInGroup.map((b) => b.order)) + 1 : 0;
        }

        const id =
          typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : `bm-${now}-${Math.random().toString(36).substring(2, 9)}`;

        const entity: BookmarkEntity = {
          id,
          workspaceId: validatedInput.workspaceId,
          groupId: validatedInput.groupId ?? null,
          title: validatedInput.title,
          url: validatedInput.url,
          description: validatedInput.description,
          iconUrl: validatedInput.iconUrl,
          customColor: validatedInput.customColor,
          isFavorite: validatedInput.isFavorite ?? false,
          order,
          createdAt: now,
          updatedAt: now,
        };

        const validatedEntity = BookmarkSchema.parse(entity);
        await this.database.bookmarks.put(validatedEntity);
        return validatedEntity;
      }
    );
  }

  /**
   * Updates an existing bookmark with Zod validation, destination group verification,
   * and immutable field protection.
   */
  async update(
    id: string,
    workspaceId: string,
    changes: UpdateBookmarkInput
  ): Promise<BookmarkEntity> {
    const validatedChanges = UpdateBookmarkSchema.parse(changes);

    return this.database.transaction(
      'rw',
      [this.database.bookmarks, this.database.bookmarkGroups],
      async () => {
        const existing = await this.getById(id, workspaceId);
        if (!existing) {
          throw new BookmarkNotFoundError(id, workspaceId);
        }

        // If moving to a new group, verify destination group exists and belongs to the same workspace
        if (
          validatedChanges.groupId !== undefined &&
          validatedChanges.groupId !== null &&
          validatedChanges.groupId !== existing.groupId
        ) {
          const targetGroup = await this.database.bookmarkGroups.get(validatedChanges.groupId);
          if (!targetGroup || targetGroup.workspaceId !== workspaceId) {
            throw new BookmarkGroupNotFoundError(validatedChanges.groupId, workspaceId);
          }
        }

        const updatedEntity: BookmarkEntity = {
          ...existing,
          title: validatedChanges.title ?? existing.title,
          url: validatedChanges.url ?? existing.url,
          groupId:
            validatedChanges.groupId !== undefined ? validatedChanges.groupId : existing.groupId,
          description:
            validatedChanges.description !== undefined
              ? (validatedChanges.description ?? undefined)
              : existing.description,
          iconUrl:
            validatedChanges.iconUrl !== undefined
              ? (validatedChanges.iconUrl ?? undefined)
              : existing.iconUrl,
          customColor:
            validatedChanges.customColor !== undefined
              ? (validatedChanges.customColor ?? undefined)
              : existing.customColor,
          isFavorite:
            validatedChanges.isFavorite !== undefined
              ? validatedChanges.isFavorite
              : existing.isFavorite,
          order: validatedChanges.order !== undefined ? validatedChanges.order : existing.order,
          updatedAt: Math.max(Date.now(), existing.createdAt),
        };

        const validated = BookmarkSchema.parse(updatedEntity);
        await this.database.bookmarks.put(validated);
        return validated;
      }
    );
  }

  /**
   * Deletes a bookmark matching both ID and workspace ownership.
   * Returns true if deleted, false if not found.
   */
  async delete(id: string, workspaceId: string): Promise<boolean> {
    const tables = this.database.noteBookmarkLinks
      ? [this.database.bookmarks, this.database.noteBookmarkLinks]
      : [this.database.bookmarks];

    return this.database.transaction('rw', tables, async () => {
      const existing = await this.getById(id, workspaceId);
      if (!existing) {
        return false;
      }

      // Cascade clean-up junction links in noteBookmarkLinks if present
      if (this.database.noteBookmarkLinks) {
        const links = await this.database.noteBookmarkLinks
          .where('bookmarkId')
          .equals(id)
          .toArray();
        if (links.length > 0) {
          await this.database.noteBookmarkLinks.bulkDelete(links.map((l) => l.id));
        }
      }

      await this.database.bookmarks.delete(id);
      return true;
    });
  }

  /**
   * Updates the favorite status of a bookmark with workspace isolation.
   */
  async setFavorite(id: string, workspaceId: string, isFavorite: boolean): Promise<BookmarkEntity> {
    return this.update(id, workspaceId, { isFavorite });
  }

  /**
   * Reorders bookmarks sequentially within a specific group and workspace.
   * Guarantees all-or-nothing atomicity via Dexie transaction.
   */
  async reorder(
    bookmarkIds: string[],
    workspaceId: string,
    groupId: string | null
  ): Promise<void> {
    if (bookmarkIds.length === 0) return;

    if (new Set(bookmarkIds).size !== bookmarkIds.length) {
      throw new Error('Duplicate bookmark IDs provided for reordering');
    }

    await this.database.transaction('rw', [this.database.bookmarks], async () => {
      const existingRecords = await this.database.bookmarks.bulkGet(bookmarkIds);
      const now = Date.now();
      const updatedBookmarks: BookmarkEntity[] = [];

      for (let i = 0; i < bookmarkIds.length; i++) {
        const id = bookmarkIds[i];
        const record = existingRecords[i];

        if (!record || record.workspaceId !== workspaceId) {
          throw new BookmarkNotFoundError(id, workspaceId);
        }

        if (record.groupId !== groupId) {
          throw new Error(
            `Group Mismatch: Bookmark "${id}" belongs to group "${record.groupId}", expected "${groupId}"`
          );
        }

        updatedBookmarks.push({
          ...record,
          order: i,
          updatedAt: Math.max(now, record.createdAt),
        });
      }

      await this.database.bookmarks.bulkPut(updatedBookmarks);
    });
  }

  /**
   * Moves multiple bookmarks to a target group (or null for Uncategorized) within a workspace.
   * Executes atomically in a single Dexie transaction.
   * Rejects duplicate IDs, missing bookmarks, or cross-workspace target groups.
   */
  async moveBulk(
    bookmarkIds: string[],
    workspaceId: string,
    targetGroupId: string | null
  ): Promise<BookmarkEntity[]> {
    if (bookmarkIds.length === 0) return [];

    if (new Set(bookmarkIds).size !== bookmarkIds.length) {
      throw new Error('Duplicate bookmark IDs provided for movement');
    }

    return this.database.transaction(
      'rw',
      [this.database.bookmarks, this.database.bookmarkGroups],
      async () => {
        // If targetGroupId is provided, verify it exists and belongs to the workspace
        if (targetGroupId !== null) {
          const targetGroup = await this.database.bookmarkGroups.get(targetGroupId);
          if (!targetGroup || targetGroup.workspaceId !== workspaceId) {
            throw new BookmarkGroupNotFoundError(targetGroupId, workspaceId);
          }
        }

        // Determine current max order in target group so moved bookmarks append cleanly
        const existingInTarget = await this.database.bookmarks
          .where('workspaceId')
          .equals(workspaceId)
          .filter((bm) => bm.groupId === targetGroupId)
          .toArray();

        let nextOrder =
          existingInTarget.length > 0
            ? Math.max(...existingInTarget.map((b) => b.order)) + 1
            : 0;

        const records = await this.database.bookmarks.bulkGet(bookmarkIds);
        const now = Date.now();
        const updatedBookmarks: BookmarkEntity[] = [];

        for (let i = 0; i < bookmarkIds.length; i++) {
          const id = bookmarkIds[i];
          const record = records[i];

          if (!record || record.workspaceId !== workspaceId) {
            throw new BookmarkNotFoundError(id, workspaceId);
          }

          // If bookmark is already in target group, harmless no-op: preserve its order
          if (record.groupId === targetGroupId) {
            updatedBookmarks.push(record);
            continue;
          }

          const updated: BookmarkEntity = {
            ...record,
            groupId: targetGroupId,
            order: nextOrder++,
            updatedAt: Math.max(now, record.createdAt),
          };

          const validated = BookmarkSchema.parse(updated);
          updatedBookmarks.push(validated);
        }

        await this.database.bookmarks.bulkPut(updatedBookmarks);
        return updatedBookmarks;
      }
    );
  }

  /**
   * Moves a single bookmark to a target group (or null for Uncategorized) within a workspace.
   */
  async move(
    id: string,
    workspaceId: string,
    targetGroupId: string | null
  ): Promise<BookmarkEntity> {
    const [updated] = await this.moveBulk([id], workspaceId, targetGroupId);
    return updated;
  }
}

export const bookmarkRepository = new BookmarkRepository();
