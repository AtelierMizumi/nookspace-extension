import { describe, it, expect } from 'vitest';
import { exportBookmarksToJsonBackup } from '../../../src/features/bookmarks/services/bookmarkJsonExportService';
import { BookmarkEntity, BookmarkGroupEntity } from '../../../src/types/bookmarks';
import { NookSpaceBookmarkBackupV1Schema } from '../../../src/features/bookmarks/types/bookmarkImportExport';

describe('bookmarkJsonExportService — Milestone 6.7 JSON Backup Exporter', () => {
  const sampleGroups: BookmarkGroupEntity[] = [
    {
      id: 'grp-1',
      workspaceId: 'ws-personal',
      title: 'Dev Resources',
      color: '#3B82F6',
      icon: 'code',
      order: 0,
      createdAt: 1000,
      updatedAt: 1000,
    },
  ];

  const sampleBookmarks: BookmarkEntity[] = [
    {
      id: 'bm-1',
      workspaceId: 'ws-personal',
      groupId: 'grp-1',
      title: 'GitHub',
      url: 'https://github.com',
      description: 'Code repository',
      customColor: '#333333',
      isFavorite: true,
      order: 0,
      createdAt: 1000,
      updatedAt: 1000,
    },
    {
      id: 'bm-unsafe',
      workspaceId: 'ws-personal',
      groupId: null,
      title: 'Unsafe',
      url: 'javascript:void(0)',
      isFavorite: false,
      order: 1,
      createdAt: 2000,
      updatedAt: 2000,
    },
  ];

  it('1. produces a valid JSON string compliant with NookSpaceBookmarkBackupV1Schema', () => {
    const jsonStr = exportBookmarksToJsonBackup('ws-personal', sampleGroups, sampleBookmarks);
    const parsed = JSON.parse(jsonStr);

    const validated = NookSpaceBookmarkBackupV1Schema.parse(parsed);

    expect(validated.format).toBe('nookspace-bookmarks');
    expect(validated.version).toBe(1);
    expect(validated.exportedAt).toBeTypeOf('number');
    expect(validated.data.workspaceId).toBe('ws-personal');
    expect(validated.data.groups).toHaveLength(1);
    expect(validated.data.groups[0].title).toBe('Dev Resources');
  });

  it('2. filters out unsafe URLs and preserves metadata and favorite flags', () => {
    const jsonStr = exportBookmarksToJsonBackup('ws-personal', sampleGroups, sampleBookmarks);
    const parsed = JSON.parse(jsonStr);

    // Unsafe bookmark was excluded
    expect(parsed.data.bookmarks).toHaveLength(1);
    expect(parsed.data.bookmarks[0].title).toBe('GitHub');
    expect(parsed.data.bookmarks[0].isFavorite).toBe(true);
    expect(parsed.data.bookmarks[0].description).toBe('Code repository');
    expect(parsed.data.bookmarks[0].customColor).toBe('#333333');
  });

  it('3. does not mutate original input objects', () => {
    const groupsCopy = JSON.parse(JSON.stringify(sampleGroups));
    const bookmarksCopy = JSON.parse(JSON.stringify(sampleBookmarks));

    exportBookmarksToJsonBackup('ws-personal', sampleGroups, sampleBookmarks);

    expect(sampleGroups).toEqual(groupsCopy);
    expect(sampleBookmarks).toEqual(bookmarksCopy);
  });
});
