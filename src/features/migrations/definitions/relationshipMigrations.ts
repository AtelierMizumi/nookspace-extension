import { MigrationDefinition, MigrationStepResult } from '../types/migrationTypes';
import { NookSpaceDB } from '../../../services/database/db';

/**
 * Relationship Migration: Repair Dangling Foreign Keys & Junction Records
 */
export const repairDanglingRelationshipsMigration: MigrationDefinition = {
  id: 'repair-dangling-relationships',
  name: 'Foreign-Key & Junction Repair Migration',
  description: 'Safely resolves dangling collection IDs, group IDs, and broken note-bookmark links without deleting user data.',
  type: 'relationship',
  dependencies: ['v3-v4-notes-knowledge'],
  execute: async (db: NookSpaceDB): Promise<MigrationStepResult> => {
    let processed = 0;
    let modified = 0;

    await db.transaction(
      'rw',
      [db.notes, db.noteCollections, db.bookmarks, db.bookmarkGroups, db.noteBookmarkLinks],
      async () => {
        // 1. Repair orphan notes (collectionId does not exist in noteCollections)
        const collections = await db.noteCollections.toArray();
        const validCollectionIds = new Set(collections.map((c) => c.id));
        const allNotes = await db.notes.toArray();
        processed += allNotes.length;

        for (const note of allNotes) {
          if (note.collectionId && !validCollectionIds.has(note.collectionId)) {
            await db.notes.update(note.id, { collectionId: null });
            modified++;
          }
        }

        // 2. Repair orphan bookmarks (groupId does not exist in bookmarkGroups)
        const groups = await db.bookmarkGroups.toArray();
        const validGroupIds = new Set(groups.map((g) => g.id));
        const allBookmarks = await db.bookmarks.toArray();
        processed += allBookmarks.length;

        for (const bookmark of allBookmarks) {
          if (bookmark.groupId && !validGroupIds.has(bookmark.groupId)) {
            await db.bookmarks.update(bookmark.id, { groupId: null });
            modified++;
          }
        }

        // 3. Clean up dangling noteBookmarkLinks where note or bookmark no longer exists
        const validNoteIds = new Set(allNotes.map((n) => n.id));
        const validBookmarkIds = new Set(allBookmarks.map((b) => b.id));
        const allLinks = await db.noteBookmarkLinks.toArray();
        processed += allLinks.length;

        for (const link of allLinks) {
          if (!validNoteIds.has(link.noteId) || !validBookmarkIds.has(link.bookmarkId)) {
            await db.noteBookmarkLinks.delete(link.id);
            modified++;
          }
        }
      }
    );

    return {
      success: true,
      recordsProcessed: processed,
      recordsModified: modified,
    };
  },
  verify: async (db: NookSpaceDB) => {
    const collections = await db.noteCollections.toArray();
    const validCollectionIds = new Set(collections.map((c) => c.id));
    const allNotes = await db.notes.toArray();

    const orphanNotes = allNotes.filter(
      (n) => n.collectionId && !validCollectionIds.has(n.collectionId)
    );
    if (orphanNotes.length > 0) {
      return {
        valid: false,
        error: `Found ${orphanNotes.length} orphan notes after relationship repair`,
      };
    }
    return { valid: true };
  },
};
