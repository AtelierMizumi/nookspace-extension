import { NookSpaceBookmarkBackupV1 } from '../../../bookmarks/types/bookmarkImportExport';
import {
  NookSpaceUniversalBackupV1,
  BACKUP_FORMAT_IDENTIFIER,
  BACKUP_FORMAT_VERSION,
} from '../../types/backupTypes';
import { calculateBackupChecksum } from '../../services/backupIntegrityService';

/**
 * In-memory deterministic adapter transforming a legacy M6.7 bookmarks backup
 * ('nookspace-bookmarks' v1) into a canonical NookSpaceUniversalBackupV1 representation.
 *
 * GUARANTEES:
 * 1. Read-only: Never writes to Dexie / IndexedDB.
 * 2. Immutable: Never mutates the source input object.
 * 3. Deterministic: Same input strictly yields identical output.
 */
export async function adaptLegacyBookmarksBackup(
  legacy: NookSpaceBookmarkBackupV1
): Promise<NookSpaceUniversalBackupV1> {
  const wsId = legacy.data.workspaceId || 'ws-imported-bookmarks';
  const exportedAt = legacy.exportedAt || 0;

  // 1. Construct deterministic synthetic workspace to house bookmarks
  const syntheticWorkspace = {
    id: wsId,
    name: 'Imported Bookmarks',
    icon: 'Globe',
    color: '#3b82f6',
    isDefault: true,
    order: 0,
    createdAt: exportedAt,
    updatedAt: exportedAt,
  };

  // 2. Map groups ensuring clean workspace containment
  const groups = legacy.data.groups.map((g) => ({
    id: g.id,
    workspaceId: wsId,
    title: g.title,
    color: g.color,
    icon: g.icon,
    order: g.order ?? 0,
    createdAt: g.createdAt || exportedAt,
    updatedAt: g.updatedAt || exportedAt,
  }));

  // 3. Map bookmarks ensuring clean workspace containment
  const bookmarks = legacy.data.bookmarks.map((b) => ({
    id: b.id,
    workspaceId: wsId,
    groupId: b.groupId,
    title: b.title,
    url: b.url,
    description: b.description,
    iconUrl: b.iconUrl,
    customColor: b.customColor,
    isFavorite: Boolean(b.isFavorite),
    order: b.order ?? 0,
    createdAt: b.createdAt || exportedAt,
    updatedAt: b.updatedAt || exportedAt,
  }));

  const itemCounts: Record<string, number> = {
    workspaces: 1,
    settings: 0,
    widgetInstances: 0,
    widgetLayouts: 0,
    todos: 0,
    notes: 0,
    noteCollections: 0,
    noteTags: 0,
    noteBookmarkLinks: 0,
    bookmarks: bookmarks.length,
    bookmarkGroups: groups.length,
    focusSessions: 0,
    dailyGoals: 0,
    stickyNotes: 0,
    vocabulary: 0,
    resources: 0,
    calendarEvents: 0,
  };

  const draft: NookSpaceUniversalBackupV1 = {
    format: BACKUP_FORMAT_IDENTIFIER,
    formatVersion: BACKUP_FORMAT_VERSION,
    metadata: {
      exportedAt,
      appVersion: 'legacy-p6',
      databaseSchemaVersion: 3,
      exportType: 'full',
      itemCounts,
      integrity: {
        algorithm: 'SHA-256',
        checksum: '0000000000000000000000000000000000000000000000000000000000000000',
      },
    },
    data: {
      workspaces: [syntheticWorkspace],
      settings: null,
      widgetInstances: [],
      widgetLayouts: [],
      todos: [],
      notes: [],
      noteCollections: [],
      noteTags: [],
      noteBookmarkLinks: [],
      bookmarks,
      bookmarkGroups: groups,
      focusSessions: [],
      dailyGoals: [],
      stickyNotes: [],
      vocabulary: [],
      resources: [],
      calendarEvents: [],
    },
  };

  const checksum = await calculateBackupChecksum(draft);

  return {
    ...draft,
    metadata: {
      ...draft.metadata,
      integrity: {
        algorithm: 'SHA-256',
        checksum,
      },
    },
  };
}
