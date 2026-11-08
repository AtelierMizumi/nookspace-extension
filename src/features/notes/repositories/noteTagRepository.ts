import { db, NookSpaceDB } from '../../../services/database/db';
import {
  NoteTagEntity,
  CreateNoteTagInput,
  UpdateNoteTagInput,
  NoteTagSchema,
  CreateNoteTagSchema,
  UpdateNoteTagSchema,
} from '../../../types/notes';

export class NoteTagNotFoundError extends Error {
  constructor(id: string, workspaceId: string) {
    super(`Note tag with id "${id}" not found in workspace "${workspaceId}"`);
    this.name = 'NoteTagNotFoundError';
  }
}

export class NoteTagDuplicateError extends Error {
  constructor(name: string, workspaceId: string) {
    super(`Note tag with name "${name}" already exists in workspace "${workspaceId}"`);
    this.name = 'NoteTagDuplicateError';
  }
}

export class NoteTagRepository {
  constructor(private database: NookSpaceDB = db) {}

  /**
   * Retrieves a single note tag by ID strictly scoped to workspaceId.
   */
  async getById(id: string, workspaceId: string): Promise<NoteTagEntity | undefined> {
    const record = await this.database.noteTags.get(id);
    if (!record || record.workspaceId !== workspaceId) {
      return undefined;
    }
    return record;
  }

  /**
   * Retrieves all note tags belonging strictly to a specified workspace,
   * sorted alphabetically by name.
   */
  async getByWorkspace(workspaceId: string): Promise<NoteTagEntity[]> {
    const records = await this.database.noteTags
      .where('workspaceId')
      .equals(workspaceId)
      .toArray();

    return records.sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Retrieves a tag by its normalized name within a workspace.
   */
  async getByName(workspaceId: string, name: string): Promise<NoteTagEntity | undefined> {
    const normalized = name.trim().toLowerCase();
    const records = await this.database.noteTags
      .where('workspaceId')
      .equals(workspaceId)
      .toArray();

    return records.find((t) => t.name.toLowerCase() === normalized);
  }

  /**
   * Creates a new note tag with Zod validation, uniqueness check per workspace, and normalization.
   */
  async create(input: CreateNoteTagInput): Promise<NoteTagEntity> {
    const validatedInput = CreateNoteTagSchema.parse(input);
    const now = Date.now();

    return this.database.transaction('rw', [this.database.noteTags], async () => {
      const existing = await this.getByName(validatedInput.workspaceId, validatedInput.name);
      if (existing) {
        throw new NoteTagDuplicateError(validatedInput.name, validatedInput.workspaceId);
      }

      const id =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `tag-${now}-${Math.random().toString(36).substring(2, 9)}`;

      const entity: NoteTagEntity = {
        id,
        workspaceId: validatedInput.workspaceId,
        name: validatedInput.name,
        color: validatedInput.color,
        createdAt: now,
        updatedAt: now,
      };

      const validatedEntity = NoteTagSchema.parse(entity);
      await this.database.noteTags.put(validatedEntity);
      return validatedEntity;
    });
  }

  /**
   * Updates an existing tag. If the name is changed, it cascades the tag rename
   * to all notes in the workspace within the same atomic transaction.
   */
  async update(
    id: string,
    workspaceId: string,
    changes: UpdateNoteTagInput
  ): Promise<NoteTagEntity> {
    const validatedChanges = UpdateNoteTagSchema.parse(changes);

    return this.database.transaction('rw', [this.database.noteTags, this.database.notes], async () => {
      const existing = await this.getById(id, workspaceId);
      if (!existing) {
        throw new NoteTagNotFoundError(id, workspaceId);
      }

      const oldName = existing.name;
      const newName = validatedChanges.name ?? existing.name;

      if (newName !== oldName) {
        const duplicate = await this.getByName(workspaceId, newName);
        if (duplicate && duplicate.id !== id) {
          throw new NoteTagDuplicateError(newName, workspaceId);
        }

        // Cascade rename tag in all notes in this workspace
        const notesWithTag = await this.database.notes
          .where('workspaceId')
          .equals(workspaceId)
          .filter((note) => note.tags.includes(oldName))
          .toArray();

        if (notesWithTag.length > 0) {
          const now = Date.now();
          const updatedNotes = notesWithTag.map((note) => {
            const nextTags = Array.from(
              new Set(note.tags.map((t) => (t === oldName ? newName : t)))
            );
            return {
              ...note,
              tags: nextTags,
              updatedAt: Math.max(now, note.createdAt),
            };
          });
          await this.database.notes.bulkPut(updatedNotes);
        }
      }

      const updatedEntity: NoteTagEntity = {
        ...existing,
        name: newName,
        color:
          validatedChanges.color !== undefined
            ? (validatedChanges.color ?? undefined)
            : existing.color,
        updatedAt: Math.max(Date.now(), existing.createdAt),
      };

      const validated = NoteTagSchema.parse(updatedEntity);
      await this.database.noteTags.put(validated);
      return validated;
    });
  }

  /**
   * Deletes a note tag and safely removes it from all notes in the workspace.
   */
  async delete(id: string, workspaceId: string): Promise<boolean> {
    return this.database.transaction('rw', [this.database.noteTags, this.database.notes], async () => {
      const existing = await this.getById(id, workspaceId);
      if (!existing) {
        return false;
      }

      const tagName = existing.name;

      // Remove tag from notes
      const notesWithTag = await this.database.notes
        .where('workspaceId')
        .equals(workspaceId)
        .filter((note) => note.tags.includes(tagName))
        .toArray();

      if (notesWithTag.length > 0) {
        const now = Date.now();
        const updatedNotes = notesWithTag.map((note) => ({
          ...note,
          tags: note.tags.filter((t) => t !== tagName),
          updatedAt: Math.max(now, note.createdAt),
        }));
        await this.database.notes.bulkPut(updatedNotes);
      }

      await this.database.noteTags.delete(id);
      return true;
    });
  }

  /**
   * Counts how many notes in the workspace currently use this tag.
   */
  async getNoteCount(id: string, workspaceId: string): Promise<number> {
    const existing = await this.getById(id, workspaceId);
    if (!existing) return 0;

    const count = await this.database.notes
      .where('workspaceId')
      .equals(workspaceId)
      .filter((note) => note.tags.includes(existing.name))
      .count();

    return count;
  }
}

export const noteTagRepository = new NoteTagRepository();
