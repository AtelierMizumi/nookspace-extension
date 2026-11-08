import { db, NookSpaceDB } from '../../../services/database/db';
import {
  NoteBookmarkLinkEntity,
  CreateNoteBookmarkLinkInput,
  NoteBookmarkLinkSchema,
  CreateNoteBookmarkLinkSchema,
  NoteEntity,
} from '../../../types/notes';
import { BookmarkEntity } from '../../../types/bookmarks';

export class NoteBookmarkLinkRepository {
  constructor(private database: NookSpaceDB = db) {}

  /**
   * Retrieves a specific link between a note and a bookmark within a workspace.
   */
  async getLink(
    workspaceId: string,
    noteId: string,
    bookmarkId: string
  ): Promise<NoteBookmarkLinkEntity | undefined> {
    const records = await this.database.noteBookmarkLinks
      .where('[noteId+bookmarkId]')
      .equals([noteId, bookmarkId])
      .toArray();

    return records.find((r) => r.workspaceId === workspaceId);
  }

  /**
   * Retrieves all junction links for a specific note.
   */
  async getByNote(workspaceId: string, noteId: string): Promise<NoteBookmarkLinkEntity[]> {
    const records = await this.database.noteBookmarkLinks
      .where('noteId')
      .equals(noteId)
      .toArray();

    return records.filter((r) => r.workspaceId === workspaceId);
  }

  /**
   * Retrieves all junction links for a specific bookmark.
   */
  async getByBookmark(workspaceId: string, bookmarkId: string): Promise<NoteBookmarkLinkEntity[]> {
    const records = await this.database.noteBookmarkLinks
      .where('bookmarkId')
      .equals(bookmarkId)
      .toArray();

    return records.filter((r) => r.workspaceId === workspaceId);
  }

  /**
   * Links a note and a bookmark together. Validates that both entities exist in the workspace.
   */
  async create(input: CreateNoteBookmarkLinkInput): Promise<NoteBookmarkLinkEntity> {
    const validatedInput = CreateNoteBookmarkLinkSchema.parse(input);
    const now = Date.now();

    return this.database.transaction(
      'rw',
      [this.database.noteBookmarkLinks, this.database.notes, this.database.bookmarks],
      async () => {
        // Verify note exists in workspace
        const note = await this.database.notes.get(validatedInput.noteId);
        if (!note || note.workspaceId !== validatedInput.workspaceId) {
          throw new Error(
            `Note with id "${validatedInput.noteId}" not found in workspace "${validatedInput.workspaceId}"`
          );
        }

        // Verify bookmark exists in workspace
        const bookmark = await this.database.bookmarks.get(validatedInput.bookmarkId);
        if (!bookmark || bookmark.workspaceId !== validatedInput.workspaceId) {
          throw new Error(
            `Bookmark with id "${validatedInput.bookmarkId}" not found in workspace "${validatedInput.workspaceId}"`
          );
        }

        // Check if link already exists
        const existing = await this.getLink(
          validatedInput.workspaceId,
          validatedInput.noteId,
          validatedInput.bookmarkId
        );
        if (existing) {
          return existing;
        }

        const id =
          typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : `nbl-${now}-${Math.random().toString(36).substring(2, 9)}`;

        const entity: NoteBookmarkLinkEntity = {
          id,
          workspaceId: validatedInput.workspaceId,
          noteId: validatedInput.noteId,
          bookmarkId: validatedInput.bookmarkId,
          createdAt: now,
        };

        const validatedEntity = NoteBookmarkLinkSchema.parse(entity);
        await this.database.noteBookmarkLinks.put(validatedEntity);
        return validatedEntity;
      }
    );
  }

  /**
   * Deletes a specific link between a note and a bookmark.
   */
  async delete(workspaceId: string, noteId: string, bookmarkId: string): Promise<boolean> {
    return this.database.transaction('rw', [this.database.noteBookmarkLinks], async () => {
      const link = await this.getLink(workspaceId, noteId, bookmarkId);
      if (!link) {
        return false;
      }
      await this.database.noteBookmarkLinks.delete(link.id);
      return true;
    });
  }

  /**
   * Deletes all links belonging to a specific note.
   */
  async deleteByNote(workspaceId: string, noteId: string): Promise<number> {
    return this.database.transaction('rw', [this.database.noteBookmarkLinks], async () => {
      const links = await this.getByNote(workspaceId, noteId);
      if (links.length === 0) return 0;
      await this.database.noteBookmarkLinks.bulkDelete(links.map((l) => l.id));
      return links.length;
    });
  }

  /**
   * Deletes all links belonging to a specific bookmark.
   */
  async deleteByBookmark(workspaceId: string, bookmarkId: string): Promise<number> {
    return this.database.transaction('rw', [this.database.noteBookmarkLinks], async () => {
      const links = await this.getByBookmark(workspaceId, bookmarkId);
      if (links.length === 0) return 0;
      await this.database.noteBookmarkLinks.bulkDelete(links.map((l) => l.id));
      return links.length;
    });
  }

  /**
   * Retrieves full BookmarkEntity records linked to a note.
   */
  async getLinkedBookmarksForNote(
    workspaceId: string,
    noteId: string
  ): Promise<BookmarkEntity[]> {
    const links = await this.getByNote(workspaceId, noteId);
    if (links.length === 0) return [];

    const bookmarkIds = links.map((l) => l.bookmarkId);
    const bookmarks = await this.database.bookmarks.bulkGet(bookmarkIds);

    return bookmarks.filter(
      (bm): bm is BookmarkEntity => bm !== undefined && bm.workspaceId === workspaceId
    );
  }

  /**
   * Retrieves full NoteEntity records linked to a bookmark.
   */
  async getLinkedNotesForBookmark(
    workspaceId: string,
    bookmarkId: string
  ): Promise<NoteEntity[]> {
    const links = await this.getByBookmark(workspaceId, bookmarkId);
    if (links.length === 0) return [];

    const noteIds = links.map((l) => l.noteId);
    const notes = await this.database.notes.bulkGet(noteIds);

    return notes.filter(
      (note): note is NoteEntity => note !== undefined && note.workspaceId === workspaceId
    );
  }
}

export const noteBookmarkLinkRepository = new NoteBookmarkLinkRepository();
