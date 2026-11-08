import { db, NookSpaceDB } from '../../../services/database/db';
import {
  NoteEntity,
  CreateNoteInput,
  UpdateNoteInput,
  NoteSchema,
  CreateNoteSchema,
  UpdateNoteSchema,
  generateExcerpt,
} from '../../../types/notes';
import { NoteCollectionNotFoundError } from './noteCollectionRepository';

export class NoteNotFoundError extends Error {
  constructor(id: string, workspaceId: string) {
    super(`Note with id "${id}" not found in workspace "${workspaceId}"`);
    this.name = 'NoteNotFoundError';
  }
}

export class NoteRepository {
  constructor(private database: NookSpaceDB = db) {}

  /**
   * Retrieves a single note by ID strictly scoped to workspaceId.
   */
  async getById(id: string, workspaceId: string): Promise<NoteEntity | undefined> {
    const record = await this.database.notes.get(id);
    if (!record || record.workspaceId !== workspaceId) {
      return undefined;
    }
    return record;
  }

  /**
   * Retrieves all notes belonging strictly to a specified workspace,
   * deterministically ordered by pinned status (pinned first), then order ascending,
   * then updatedAt descending, then id.
   */
  async getByWorkspace(workspaceId: string): Promise<NoteEntity[]> {
    const records = await this.database.notes
      .where('workspaceId')
      .equals(workspaceId)
      .toArray();

    return this.sortNotes(records);
  }

  /**
   * Retrieves notes by collection within a workspace.
   * Passing collectionId === null returns Uncategorized notes.
   */
  async getByCollection(
    workspaceId: string,
    collectionId: string | null
  ): Promise<NoteEntity[]> {
    const records = await this.database.notes
      .where('workspaceId')
      .equals(workspaceId)
      .filter((note) => note.collectionId === collectionId)
      .toArray();

    return this.sortNotes(records);
  }

  /**
   * Retrieves pinned notes within a workspace.
   */
  async getPinned(workspaceId: string): Promise<NoteEntity[]> {
    const records = await this.database.notes
      .where('workspaceId')
      .equals(workspaceId)
      .filter((note) => note.isPinned)
      .toArray();

    return this.sortNotes(records);
  }

  /**
   * Retrieves favorite notes within a workspace.
   */
  async getFavorites(workspaceId: string): Promise<NoteEntity[]> {
    const records = await this.database.notes
      .where('workspaceId')
      .equals(workspaceId)
      .filter((note) => note.isFavorite)
      .toArray();

    return this.sortNotes(records);
  }

  /**
   * Retrieves archived notes within a workspace.
   */
  async getArchived(workspaceId: string): Promise<NoteEntity[]> {
    const records = await this.database.notes
      .where('workspaceId')
      .equals(workspaceId)
      .filter((note) => note.isArchived)
      .toArray();

    return this.sortNotes(records);
  }

  /**
   * Retrieves notes containing a specific tag in a workspace.
   */
  async getByTag(workspaceId: string, tag: string): Promise<NoteEntity[]> {
    const normalized = tag.trim().toLowerCase();
    const records = await this.database.notes
      .where('workspaceId')
      .equals(workspaceId)
      .filter((note) => note.tags.includes(normalized))
      .toArray();

    return this.sortNotes(records);
  }

  /**
   * Retrieves multiple notes by IDs, strictly filtering by workspace and preserving order.
   */
  async getByIds(ids: string[], workspaceId: string): Promise<NoteEntity[]> {
    if (ids.length === 0) return [];
    const records = await this.database.notes.bulkGet(ids);
    const validMap = new Map<string, NoteEntity>();

    for (const record of records) {
      if (record && record.workspaceId === workspaceId) {
        validMap.set(record.id, record);
      }
    }

    const result: NoteEntity[] = [];
    for (const id of ids) {
      const match = validMap.get(id);
      if (match) {
        result.push(match);
      }
    }
    return result;
  }

  /**
   * Creates a new note with validation, collection verification, excerpt generation, and order calculation.
   */
  async create(input: CreateNoteInput): Promise<NoteEntity> {
    const validatedInput = CreateNoteSchema.parse(input);
    const now = Date.now();

    return this.database.transaction(
      'rw',
      [this.database.notes, this.database.noteCollections],
      async () => {
        // If collectionId is provided, verify it exists and matches workspace
        if (validatedInput.collectionId !== null && validatedInput.collectionId !== undefined) {
          const col = await this.database.noteCollections.get(validatedInput.collectionId);
          if (!col || col.workspaceId !== validatedInput.workspaceId) {
            throw new NoteCollectionNotFoundError(
              validatedInput.collectionId,
              validatedInput.workspaceId
            );
          }
        }

        let order = validatedInput.order;
        if (order === undefined) {
          const existingInCollection = await this.database.notes
            .where('workspaceId')
            .equals(validatedInput.workspaceId)
            .filter((n) => n.collectionId === (validatedInput.collectionId ?? null))
            .toArray();

          order =
            existingInCollection.length > 0
              ? Math.max(...existingInCollection.map((n) => n.order)) + 1
              : 0;
        }

        const excerpt =
          validatedInput.excerpt !== undefined
            ? validatedInput.excerpt
            : generateExcerpt(validatedInput.content ?? '');

        const id =
          typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : `note-${now}-${Math.random().toString(36).substring(2, 9)}`;

        const tags = Array.from(
          new Set((validatedInput.tags || []).map((t) => t.trim().toLowerCase()))
        );

        const entity: NoteEntity = {
          id,
          workspaceId: validatedInput.workspaceId,
          collectionId: validatedInput.collectionId ?? null,
          title: validatedInput.title,
          content: validatedInput.content ?? '',
          excerpt,
          isPinned: validatedInput.isPinned ?? false,
          isFavorite: validatedInput.isFavorite ?? false,
          isArchived: validatedInput.isArchived ?? false,
          color: validatedInput.color,
          tags,
          order,
          createdAt: now,
          updatedAt: now,
        };

        const validatedEntity = NoteSchema.parse(entity);
        await this.database.notes.put(validatedEntity);
        return validatedEntity;
      }
    );
  }

  /**
   * Updates an existing note. Automatically regenerates excerpt if content changes and excerpt is omitted.
   */
  async update(
    id: string,
    workspaceId: string,
    changes: UpdateNoteInput
  ): Promise<NoteEntity> {
    const validatedChanges = UpdateNoteSchema.parse(changes);

    return this.database.transaction(
      'rw',
      [this.database.notes, this.database.noteCollections],
      async () => {
        const existing = await this.getById(id, workspaceId);
        if (!existing) {
          throw new NoteNotFoundError(id, workspaceId);
        }

        // Verify collection if changing
        if (
          validatedChanges.collectionId !== undefined &&
          validatedChanges.collectionId !== null &&
          validatedChanges.collectionId !== existing.collectionId
        ) {
          const col = await this.database.noteCollections.get(validatedChanges.collectionId);
          if (!col || col.workspaceId !== workspaceId) {
            throw new NoteCollectionNotFoundError(validatedChanges.collectionId, workspaceId);
          }
        }

        let excerpt = existing.excerpt;
        if (validatedChanges.excerpt !== undefined) {
          excerpt = validatedChanges.excerpt;
        } else if (validatedChanges.content !== undefined) {
          excerpt = generateExcerpt(validatedChanges.content);
        }

        let tags = existing.tags;
        if (validatedChanges.tags !== undefined) {
          tags = Array.from(new Set(validatedChanges.tags.map((t) => t.trim().toLowerCase())));
        }

        const updatedEntity: NoteEntity = {
          ...existing,
          title: validatedChanges.title ?? existing.title,
          content: validatedChanges.content ?? existing.content,
          excerpt,
          collectionId:
            validatedChanges.collectionId !== undefined
              ? validatedChanges.collectionId
              : existing.collectionId,
          isPinned: validatedChanges.isPinned ?? existing.isPinned,
          isFavorite: validatedChanges.isFavorite ?? existing.isFavorite,
          isArchived: validatedChanges.isArchived ?? existing.isArchived,
          color:
            validatedChanges.color !== undefined
              ? (validatedChanges.color ?? undefined)
              : existing.color,
          tags,
          order: validatedChanges.order ?? existing.order,
          updatedAt: Math.max(Date.now(), existing.createdAt),
        };

        const validated = NoteSchema.parse(updatedEntity);
        await this.database.notes.put(validated);
        return validated;
      }
    );
  }

  /**
   * Deletes a note and cascade deletes its junction links.
   */
  async delete(id: string, workspaceId: string): Promise<boolean> {
    return this.database.transaction(
      'rw',
      [this.database.notes, this.database.noteBookmarkLinks],
      async () => {
        const existing = await this.getById(id, workspaceId);
        if (!existing) {
          return false;
        }

        // Clean up junction links
        const links = await this.database.noteBookmarkLinks
          .where('noteId')
          .equals(id)
          .toArray();

        if (links.length > 0) {
          await this.database.noteBookmarkLinks.bulkDelete(links.map((l) => l.id));
        }

        await this.database.notes.delete(id);
        return true;
      }
    );
  }

  /**
   * Reorders an array of notes sequentially starting at 0 within a single atomic transaction.
   */
  async reorder(noteIds: string[], workspaceId: string): Promise<void> {
    if (noteIds.length === 0) return;

    if (new Set(noteIds).size !== noteIds.length) {
      throw new Error('Duplicate note IDs provided for reordering');
    }

    await this.database.transaction('rw', [this.database.notes], async () => {
      const existingRecords = await this.database.notes.bulkGet(noteIds);
      const now = Date.now();
      const updatedNotes: NoteEntity[] = [];

      for (let i = 0; i < noteIds.length; i++) {
        const id = noteIds[i];
        const record = existingRecords[i];

        if (!record) {
          throw new NoteNotFoundError(id, workspaceId);
        }

        if (record.workspaceId !== workspaceId) {
          throw new Error(
            `Workspace Isolation Violation: Cannot reorder note "${id}" belonging to workspace "${record.workspaceId}" from workspace "${workspaceId}"`
          );
        }

        updatedNotes.push({
          ...record,
          order: i,
          updatedAt: Math.max(now, record.createdAt),
        });
      }

      await this.database.notes.bulkPut(updatedNotes);
    });
  }

  /**
   * Convenience helpers
   */
  async moveToCollection(
    noteId: string,
    workspaceId: string,
    targetCollectionId: string | null
  ): Promise<NoteEntity> {
    return this.update(noteId, workspaceId, { collectionId: targetCollectionId });
  }

  async togglePin(id: string, workspaceId: string): Promise<NoteEntity> {
    const existing = await this.getById(id, workspaceId);
    if (!existing) {
      throw new NoteNotFoundError(id, workspaceId);
    }
    return this.update(id, workspaceId, { isPinned: !existing.isPinned });
  }

  async toggleFavorite(id: string, workspaceId: string): Promise<NoteEntity> {
    const existing = await this.getById(id, workspaceId);
    if (!existing) {
      throw new NoteNotFoundError(id, workspaceId);
    }
    return this.update(id, workspaceId, { isFavorite: !existing.isFavorite });
  }

  async toggleArchive(id: string, workspaceId: string): Promise<NoteEntity> {
    const existing = await this.getById(id, workspaceId);
    if (!existing) {
      throw new NoteNotFoundError(id, workspaceId);
    }
    return this.update(id, workspaceId, { isArchived: !existing.isArchived });
  }

  private sortNotes(notes: NoteEntity[]): NoteEntity[] {
    return notes.sort((a, b) => {
      // Pinned notes first
      if (a.isPinned !== b.isPinned) {
        return a.isPinned ? -1 : 1;
      }
      // Order ascending
      if (a.order !== b.order) {
        return a.order - b.order;
      }
      // updatedAt descending
      if (a.updatedAt !== b.updatedAt) {
        return b.updatedAt - a.updatedAt;
      }
      return a.id.localeCompare(b.id);
    });
  }
}

export const noteRepository = new NoteRepository();
