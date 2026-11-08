import { BookmarkEntity, BookmarkGroupEntity } from '../../../types/bookmarks';
import { isSafeBookmarkUrl } from '../utils/bookmarkSecurity';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Generates a standard Netscape Bookmark HTML file content from NookSpace groups and bookmarks.
 * Strictly escapes all textual content and filters out any unsafe URLs.
 */
export function exportBookmarksToNetscapeHtml(
  groups: BookmarkGroupEntity[],
  bookmarks: BookmarkEntity[]
): string {
  const lines: string[] = [
    '<!DOCTYPE NETSCAPE-Bookmark-file-1>',
    '<!-- This is an automatically generated file.',
    '     It will be read and overwritten.',
    '     DO NOT EDIT! -->',
    '<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">',
    '<TITLE>Bookmarks</TITLE>',
    '<H1>Bookmarks</H1>',
    '<DL><p>',
  ];

  // 1. Export folders with their child bookmarks
  const sortedGroups = [...groups].sort((a, b) => a.order - b.order);

  for (const group of sortedGroups) {
    const addDate = Math.floor(group.createdAt / 1000);
    const lastModified = Math.floor(group.updatedAt / 1000);

    lines.push(
      `    <DT><H3 ADD_DATE="${addDate}" LAST_MODIFIED="${lastModified}">${escapeHtml(group.title)}</H3>`
    );
    lines.push('    <DL><p>');

    const groupBookmarks = bookmarks
      .filter((b) => b.groupId === group.id && isSafeBookmarkUrl(b.url))
      .sort((a, b) => a.order - b.order);

    for (const bm of groupBookmarks) {
      const bmAddDate = Math.floor(bm.createdAt / 1000);
      const favAttr = bm.isFavorite ? ' FAVORITE="true"' : '';
      lines.push(
        `        <DT><A HREF="${escapeHtml(bm.url)}" ADD_DATE="${bmAddDate}"${favAttr}>${escapeHtml(bm.title)}</A>`
      );
      if (bm.description) {
        lines.push(`        <DD>${escapeHtml(bm.description)}`);
      }
    }

    lines.push('    </DL><p>');
  }

  // 2. Export Uncategorized bookmarks at root level
  const uncategorizedBookmarks = bookmarks
    .filter((b) => b.groupId === null && isSafeBookmarkUrl(b.url))
    .sort((a, b) => a.order - b.order);

  for (const bm of uncategorizedBookmarks) {
    const bmAddDate = Math.floor(bm.createdAt / 1000);
    const favAttr = bm.isFavorite ? ' FAVORITE="true"' : '';
    lines.push(
      `    <DT><A HREF="${escapeHtml(bm.url)}" ADD_DATE="${bmAddDate}"${favAttr}>${escapeHtml(bm.title)}</A>`
    );
    if (bm.description) {
      lines.push(`    <DD>${escapeHtml(bm.description)}`);
    }
  }

  lines.push('</DL><p>');
  lines.push('');

  return lines.join('\n');
}
