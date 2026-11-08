import { db, NookSpaceDB } from '../../../services/database/db';
import { BookmarkEntity, BookmarkGroupEntity } from '../../../types/bookmarks';
import {
  ImportExecutionOptions,
  ImportFormat,
  ImportPreview,
  ImportPreviewStats,
  ImportResult,
} from '../types/bookmarkImportExport';
import { parseNetscapeBookmarkHtml } from '../utils/bookmarkHtmlParser';
import { parseNookSpaceJsonBackup } from './bookmarkJsonImportService';
import { browserApi } from '../../../services/browser';
import { STORAGE_KEY_BOOKMARKS_LAST_UPDATED_AT } from '../stores/bookmarkStore';

async function notifyBookmarksUpdated(): Promise<void> {
  try {
    await browserApi.storage.local.set({
      [STORAGE_KEY_BOOKMARKS_LAST_UPDATED_AT]: Date.now(),
    });
  } catch {
    // Non-blocking in headless/test environments
  }
}

/**
 * Parses an imported file (HTML or JSON) into a normalized ImportPreview structure.
 */
export function parseImportFile(fileContent: string, filename: string): ImportPreview {
  const trimmed = fileContent.trim();
  if (!trimmed) {
    throw new Error('Selected file is empty.');
  }

  const lowerName = filename.toLowerCase();
  let format: ImportFormat = 'html';

  if (lowerName.endsWith('.json') || trimmed.startsWith('{')) {
    format = 'json';
  } else if (lowerName.endsWith('.html') || lowerName.endsWith('.htm') || trimmed.startsWith('<')) {
    format = 'html';
  }

  if (format === 'json') {
    const jsonResult = parseNookSpaceJsonBackup(trimmed);
    const validCount = jsonResult.bookmarks.filter((b) => b.isValid).length;

    return {
      format: 'json',
      sourceFilename: filename,
      totalFolders: jsonResult.groups.length,
      totalBookmarks: jsonResult.bookmarks.length,
      validBookmarks: validCount,
      invalidBookmarks: jsonResult.bookmarks.length - validCount + jsonResult.invalidEntries.length,
      rejectedUnsafeUrls: jsonResult.rejectedUnsafeUrls,
      duplicateBookmarksInFile: jsonResult.duplicateBookmarksInFile,
      candidateGroups: jsonResult.groups,
      candidateBookmarks: jsonResult.bookmarks.filter((b) => b.isValid),
      invalidEntries: jsonResult.invalidEntries,
    };
  }

  // HTML format
  const htmlResult = parseNetscapeBookmarkHtml(trimmed);
  const validBookmarks = htmlResult.bookmarks.filter((b) => b.isValid);

  // Detect duplicate URLs within the HTML file
  const seenUrls = new Set<string>();
  let duplicateCount = 0;
  for (const bm of validBookmarks) {
    if (seenUrls.has(bm.url)) {
      duplicateCount++;
    } else {
      seenUrls.add(bm.url);
    }
  }

  return {
    format: 'html',
    sourceFilename: filename,
    totalFolders: htmlResult.groups.length,
    totalBookmarks: htmlResult.bookmarks.length,
    validBookmarks: validBookmarks.length,
    invalidBookmarks: htmlResult.invalidEntries.length,
    rejectedUnsafeUrls: htmlResult.rejectedUnsafeUrls,
    duplicateBookmarksInFile: duplicateCount,
    candidateGroups: htmlResult.groups,
    candidateBookmarks: validBookmarks,
    invalidEntries: htmlResult.invalidEntries,
  };
}

/**
 * Computes preview statistics against destination workspace records.
 */
export function computePreviewStats(
  preview: ImportPreview,
  existingBookmarks: BookmarkEntity[],
  existingGroups: BookmarkGroupEntity[],
  duplicatePolicy: 'skip' | 'import' | 'update',
  mode: 'merge' | 'replace'
): ImportPreviewStats {
  if (mode === 'replace') {
    return {
      expectedAdded: preview.candidateBookmarks.length,
      expectedSkipped: 0,
      expectedUpdated: 0,
      expectedGroupsCreated: preview.candidateGroups.length,
    };
  }

  const existingUrlMap = new Map<string, BookmarkEntity>();
  existingBookmarks.forEach((b) => existingUrlMap.set(b.url, b));

  let expectedAdded = 0;
  let expectedSkipped = 0;
  let expectedUpdated = 0;

  for (const bm of preview.candidateBookmarks) {
    if (existingUrlMap.has(bm.url)) {
      if (duplicatePolicy === 'skip') {
        expectedSkipped++;
      } else if (duplicatePolicy === 'update') {
        expectedUpdated++;
      } else {
        expectedAdded++;
      }
    } else {
      expectedAdded++;
    }
  }

  const existingGroupTitles = new Set(existingGroups.map((g) => g.title.toLowerCase()));
  let expectedGroupsCreated = 0;

  for (const g of preview.candidateGroups) {
    if (!existingGroupTitles.has(g.title.toLowerCase())) {
      expectedGroupsCreated++;
    }
  }

  return {
    expectedAdded,
    expectedSkipped,
    expectedUpdated,
    expectedGroupsCreated,
  };
}

/**
 * Executes the database import transaction with full atomicity and rollback safety.
 */
export async function executeImportTransaction(
  options: ImportExecutionOptions,
  preview: ImportPreview,
  database: NookSpaceDB = db
): Promise<ImportResult> {
  const { workspaceId, mode, duplicatePolicy, folderConflictPolicy = 'reuse-existing' } = options;
  const now = Date.now();

  function generateId(prefix: string): string {
    return typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${prefix}-${now}-${Math.random().toString(36).substring(2, 9)}`;
  }

  const result = await database.transaction('rw', [database.bookmarks, database.bookmarkGroups], async () => {
    let groupsCreated = 0;
    let bookmarksCreated = 0;
    let bookmarksUpdated = 0;
    let bookmarksSkipped = 0;

    // In-memory mapping from candidate tempId to destination persistent group ID
    const groupIdMap = new Map<string, string>();

    // ==========================================
    // MODE: REPLACE WORKSPACE BOOKMARKS
    // ==========================================
    if (mode === 'replace') {
      // 1. Delete all existing records in target workspace strictly
      await database.bookmarks.where('workspaceId').equals(workspaceId).delete();
      await database.bookmarkGroups.where('workspaceId').equals(workspaceId).delete();

      // 2. Insert all imported groups with new generated IDs
      for (const cg of preview.candidateGroups) {
        const newGroupId = generateId('grp');
        groupIdMap.set(cg.tempId, newGroupId);

        const groupEntity: BookmarkGroupEntity = {
          id: newGroupId,
          workspaceId,
          title: cg.title,
          color: cg.color,
          icon: cg.icon,
          order: cg.order,
          createdAt: now,
          updatedAt: now,
        };

        await database.bookmarkGroups.put(groupEntity);
        groupsCreated++;
      }

      // 3. Insert all candidate bookmarks with new generated IDs and mapped groupIds
      for (const cb of preview.candidateBookmarks) {
        const newBookmarkId = generateId('bm');
        const resolvedGroupId = cb.tempGroupId ? groupIdMap.get(cb.tempGroupId) || null : null;

        const bookmarkEntity: BookmarkEntity = {
          id: newBookmarkId,
          workspaceId,
          groupId: resolvedGroupId,
          title: cb.title,
          url: cb.url,
          description: cb.description,
          iconUrl: cb.iconUrl,
          customColor: cb.customColor,
          isFavorite: cb.isFavorite,
          order: cb.order,
          createdAt: now,
          updatedAt: now,
        };

        await database.bookmarks.put(bookmarkEntity);
        bookmarksCreated++;
      }

      return {
        success: true,
        mode: 'replace' as const,
        groupsCreated,
        bookmarksCreated,
        bookmarksUpdated: 0,
        bookmarksSkipped: 0,
      };
    }

    // ==========================================
    // MODE: MERGE WITH DESTINATION WORKSPACE
    // ==========================================
    const existingGroups = await database.bookmarkGroups
      .where('workspaceId')
      .equals(workspaceId)
      .toArray();

    const existingBookmarks = await database.bookmarks
      .where('workspaceId')
      .equals(workspaceId)
      .toArray();

    const existingGroupByTitle = new Map<string, BookmarkGroupEntity>();
    existingGroups.forEach((g) => existingGroupByTitle.set(g.title.toLowerCase(), g));

    let maxGroupOrder =
      existingGroups.length > 0 ? Math.max(...existingGroups.map((g) => g.order)) : 0;

    // 1. Map or create groups
    for (const cg of preview.candidateGroups) {
      const match = existingGroupByTitle.get(cg.title.toLowerCase());

      if (folderConflictPolicy === 'reuse-existing' && match) {
        groupIdMap.set(cg.tempId, match.id);
      } else {
        const newGroupId = generateId('grp');
        maxGroupOrder++;
        groupIdMap.set(cg.tempId, newGroupId);

        const newGroup: BookmarkGroupEntity = {
          id: newGroupId,
          workspaceId,
          title: cg.title,
          color: cg.color,
          icon: cg.icon,
          order: maxGroupOrder,
          createdAt: now,
          updatedAt: now,
        };

        await database.bookmarkGroups.put(newGroup);
        existingGroupByTitle.set(cg.title.toLowerCase(), newGroup);
        groupsCreated++;
      }
    }

    // 2. Map, insert, or update bookmarks
    const existingBookmarkByUrl = new Map<string, BookmarkEntity>();
    existingBookmarks.forEach((b) => existingBookmarkByUrl.set(b.url, b));

    let maxBookmarkOrder =
      existingBookmarks.length > 0 ? Math.max(...existingBookmarks.map((b) => b.order)) : 0;

    for (const cb of preview.candidateBookmarks) {
      const existingMatch = existingBookmarkByUrl.get(cb.url);
      const targetGroupId = cb.tempGroupId ? groupIdMap.get(cb.tempGroupId) || null : null;

      if (existingMatch) {
        if (duplicatePolicy === 'skip') {
          bookmarksSkipped++;
          continue;
        }

        if (duplicatePolicy === 'update') {
          const updatedEntity: BookmarkEntity = {
            ...existingMatch,
            title: cb.title,
            description: cb.description ?? existingMatch.description,
            groupId: targetGroupId !== null ? targetGroupId : existingMatch.groupId,
            isFavorite: cb.isFavorite || existingMatch.isFavorite,
            updatedAt: now,
          };

          await database.bookmarks.put(updatedEntity);
          bookmarksUpdated++;
          continue;
        }

        // duplicatePolicy === 'import' (proceed to create new)
      }

      maxBookmarkOrder++;
      const newBmId = generateId('bm');

      const newBookmark: BookmarkEntity = {
        id: newBmId,
        workspaceId,
        groupId: targetGroupId,
        title: cb.title,
        url: cb.url,
        description: cb.description,
        iconUrl: cb.iconUrl,
        customColor: cb.customColor,
        isFavorite: cb.isFavorite,
        order: maxBookmarkOrder,
        createdAt: now,
        updatedAt: now,
      };

      await database.bookmarks.put(newBookmark);
      existingBookmarkByUrl.set(cb.url, newBookmark);
      bookmarksCreated++;
    }

    return {
      success: true,
      mode: 'merge' as const,
      groupsCreated,
      bookmarksCreated,
      bookmarksUpdated,
      bookmarksSkipped,
    };
  });

  // Notify after Dexie transaction has committed safely
  await notifyBookmarksUpdated();

  return result;
}
