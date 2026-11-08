import { db, NookSpaceDB } from '../../../services/database/db';
import {
  NoteCollectionEntity,
  CreateNoteCollectionInput,
  UpdateNoteCollectionInput,
  NoteCollectionSchema,
  CreateNoteCollectionSchema,
  UpdateNoteCollectionSchema,
} from '../../../types/notes';

export class NoteCollectionNotFoundError extends Error {
  constructor(id: string, workspaceId: string) {
    super(`Note collection with id "${id}" not found in workspace "${workspaceId}"`);
    this.name = 'NoteCollectionNotFoundError';
  }
}

export interface DeleteNoteCollectionOptions {
  mode?: 'reassign' | 'cascade';
}

export interface DeleteNoteCollectionResult {
  deleted: boolean;
  mode: 'reassign' | 'cascade';
  affectedNotesCount: number;
}

export class NoteCollectionRepository {
  constructor(private database: NookSpaceDB = db) {}

  /**
   * Retrieves a single note collection by ID strictly scoped to workspaceId.
   */
  async getById(id: string, workspaceId: string): Promise<NoteCollectionEntity | undefined> {
    const record = await this.database.noteCollections.get(id);
    if (!record || record.workspaceId !== workspaceId) {
      return undefined;
    }
    return record;
  }

  /**
   * Retrieves all note collections belonging strictly to a specified workspace,
   * deterministically ordered by `order` ascending, then `createdAt`, then `id`.
   */
  async getByWorkspace(workspaceId: string): Promise<NoteCollectionEntity[]> {
    const records = await this.database.noteCollections
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
   * Creates a new note collection with Zod validation and workspace isolation.
   */
  async create(input: CreateNoteCollectionInput): Promise<NoteCollectionEntity> {
    const validatedInput = CreateNoteCollectionSchema.parse(input);
    const now = Date.now();

    return this.database.transaction('rw', [this.database.noteCollections], async () => {
      let order = validatedInput.order;
      if (order === undefined) {
        const existing = await this.database.noteCollections
          .where('workspaceId')
          .equals(validatedInput.workspaceId)
          .toArray();

        order = existing.length > 0 ? Math.max(...existing.map((c) => c.order)) + 1 : 0;
      }

      const id =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `col-${now}-${Math.random().toString(36).substring(2, 9)}`;

      const entity: NoteCollectionEntity = {
        id,
        workspaceId: validatedInput.workspaceId,
        title: validatedInput.title,
        description: validatedInput.description,
        color: validatedInput.color,
        icon: validatedInput.icon,
        order,
        createdAt: now,
        updatedAt: now,
      };

      const validatedEntity = NoteCollectionSchema.parse(entity);
      await this.database.noteCollections.put(validatedEntity);
      return validatedEntity;
    });
  }

  /**
   * Updates an existing note collection with Zod validation and immutable field protection.
   */
  async update(
    id: string,
    workspaceId: string,
    changes: UpdateNoteCollectionInput
  ): Promise<NoteCollectionEntity> {
    const validatedChanges = UpdateNoteCollectionSchema.parse(changes);

    return this.database.transaction('rw', [this.database.noteCollections], async () => {
      const existing = await this.getById(id, workspaceId);
      if (!existing) {
        throw new NoteCollectionNotFoundError(id, workspaceId);
      }

      const updatedEntity: NoteCollectionEntity = {
        ...existing,
        title: validatedChanges.title ?? existing.title,
        description:
          validatedChanges.description !== undefined
            ? (validatedChanges.description ?? undefined)
            : existing.description,
        color:
          validatedChanges.color !== undefined
            ? (validatedChanges.color ?? undefined)
            : existing.color,
        icon:
          validatedChanges.icon !== undefined
            ? (validatedChanges.icon ?? undefined)
            : existing.icon,
        order: validatedChanges.order ?? existing.order,
        updatedAt: Math.max(Date.now(), existing.createdAt),
      };

      const validated = NoteCollectionSchema.parse(updatedEntity);
      await this.database.noteCollections.put(validated);
      return validated;
    });
  }

  /**
   * Deletes a note collection within a single atomic transaction.
   * Mode A (Default: 'reassign'): Notes in this collection are set to collectionId: null.
   * Mode B ('cascade'): Notes in this collection (and their bookmark links) are deleted.
   */
  async delete(
    id: string,
    workspaceId: string,
    options?: DeleteNoteCollectionOptions
  ): Promise<DeleteNoteCollectionResult> {
    const mode = options?.mode ?? 'reassign';

    return this.database.transaction(
      'rw',
      [this.database.noteCollections, this.database.notes, this.database.noteBookmarkLinks],
      async () => {
        const collection = await this.getById(id, workspaceId);
        if (!collection) {
          return { deleted: false, mode, affectedNotesCount: 0 };
        }

        const matchingNotes = await this.database.notes
          .where('workspaceId')
          .equals(workspaceId)
          .filter((note) => note.collectionId === id)
          .toArray();

        const affectedCount = matchingNotes.length;

        if (mode === 'cascade') {
          if (affectedCount > 0) {
            const noteIds = matchingNotes.map((n) => n.id);
            const noteIdSet = new Set(noteIds);

            // Cascade delete junction links
            const matchingLinks = await this.database.noteBookmarkLinks
              .where('workspaceId')
              .equals(workspaceId)
              .filter((link) => noteIdSet.has(link.noteId))
              .toArray();

            if (matchingLinks.length > 0) {
              await this.database.noteBookmarkLinks.bulkDelete(matchingLinks.map((l) => l.id));
            }

            await this.database.notes.bulkDelete(noteIds);
          }
        } else {
          // Reassign to null
          if (affectedCount > 0) {
            const now = Date.now();
            const reassigned = matchingNotes.map((n) => ({
              ...n,
              collectionId: null,
              updatedAt: Math.max(now, n.createdAt),
            }));
            await this.database.notes.bulkPut(reassigned);
          }
        }

        await this.database.noteCollections.delete(id);
        return { deleted: true, mode, affectedNotesCount: affectedCount };
      }
    );
  }

  /**
   * Reorders an array of collections sequentially starting at 0 within a single atomic transaction.
   */
  async reorder(collectionIds: string[], workspaceId: string): Promise<void> {
    if (collectionIds.length === 0) return;

    if (new Set(collectionIds).size !== collectionIds.length) {
      throw new Error('Duplicate collection IDs provided for reordering');
    }

    await this.database.transaction('rw', [this.database.noteCollections], async () => {
      const existingRecords = await this.database.noteCollections.bulkGet(collectionIds);
      const now = Date.now();
      const updatedCollections: NoteCollectionEntity[] = [];

      for (let i = 0; i < collectionIds.length; i++) {
        const id = collectionIds[i];
        const record = existingRecords[i];

        if (!record) {
          throw new NoteCollectionNotFoundError(id, workspaceId);
        }

        if (record.workspaceId !== workspaceId) {
          throw new Error(
            `Workspace Isolation Violation: Cannot reorder collection "${id}" belonging to workspace "${record.workspaceId}" from workspace "${workspaceId}"`
          );
        }

        updatedCollections.push({
          ...record,
          order: i,
          updatedAt: Math.max(now, record.createdAt),
        });
      }

      await this.database.noteCollections.bulkPut(updatedCollections);
    });
  }
}

export const noteCollectionRepository = new NoteCollectionRepository();
