import { BookmarkEntity, BookmarkGroupEntity } from '../../../types/bookmarks';
import {
  NookSpaceBookmarkBackupV1,
  NookSpaceBookmarkBackupV1Schema,
} from '../types/bookmarkImportExport';
import { isSafeBookmarkUrl } from '../utils/bookmarkSecurity';

/**
 * Serializes workspace bookmarks and groups into a validated NookSpace JSON backup (V1).
 * Strictly scopes data to the specified workspace and filters out any unsafe URLs.
 */
export function exportBookmarksToJsonBackup(
  workspaceId: string,
  groups: BookmarkGroupEntity[],
  bookmarks: BookmarkEntity[]
): string {
  const safeBookmarks = bookmarks.filter((b) => isSafeBookmarkUrl(b.url));

  const envelope: NookSpaceBookmarkBackupV1 = {
    format: 'nookspace-bookmarks',
    version: 1,
    exportedAt: Date.now(),
    data: {
      workspaceId,
      groups: groups.map((g) => ({
        id: g.id,
        title: g.title,
        color: g.color,
        icon: g.icon,
        order: g.order,
        createdAt: g.createdAt,
        updatedAt: g.updatedAt,
      })),
      bookmarks: safeBookmarks.map((b) => ({
        id: b.id,
        groupId: b.groupId,
        title: b.title,
        url: b.url,
        description: b.description,
        iconUrl: b.iconUrl,
        customColor: b.customColor,
        isFavorite: b.isFavorite,
        order: b.order,
        createdAt: b.createdAt,
        updatedAt: b.updatedAt,
      })),
    },
  };

  // Validate envelope structure against Zod schema
  const validated = NookSpaceBookmarkBackupV1Schema.parse(envelope);

  return JSON.stringify(validated, null, 2);
}
