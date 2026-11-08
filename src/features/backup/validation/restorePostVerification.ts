import { NookSpaceDB } from '../../../services/database/db';
import { NookSpaceUniversalBackupV1 } from '../types/backupTypes';
import { isSafeBookmarkUrl } from '../../bookmarks/utils/bookmarkSecurity';

export interface PostRestoreVerificationResult {
  isValid: boolean;
  errors: string[];
  restoredCounts: Record<string, number>;
}

export async function verifyRestoredDatabase(
  canonicalBackup: NookSpaceUniversalBackupV1,
  database: NookSpaceDB
): Promise<PostRestoreVerificationResult> {
  const errors: string[] = [];
  const restoredCounts: Record<string, number> = {};

  // 1. VERIFY TABLE RECORD COUNTS
  const tableCheckers: Array<{
    name: string;
    countFn: () => Promise<number>;
    expected: number;
  }> = [
    {
      name: 'workspaces',
      countFn: () => database.workspaces.count(),
      expected: canonicalBackup.data.workspaces.length,
    },
    {
      name: 'settings',
      countFn: () => database.settings.count(),
      expected: canonicalBackup.data.settings ? 1 : 0,
    },
    {
      name: 'widgetInstances',
      countFn: () => database.widgetInstances.count(),
      expected: canonicalBackup.data.widgetInstances.length,
    },
    {
      name: 'widgetLayouts',
      countFn: () => database.widgetLayouts.count(),
      expected: canonicalBackup.data.widgetLayouts.length,
    },
    {
      name: 'todos',
      countFn: () => database.todos.count(),
      expected: canonicalBackup.data.todos.length,
    },
    {
      name: 'notes',
      countFn: () => database.notes.count(),
      expected: canonicalBackup.data.notes.length,
    },
    {
      name: 'noteCollections',
      countFn: () => database.noteCollections.count(),
      expected: canonicalBackup.data.noteCollections.length,
    },
    {
      name: 'noteTags',
      countFn: () => database.noteTags.count(),
      expected: canonicalBackup.data.noteTags.length,
    },
    {
      name: 'noteBookmarkLinks',
      countFn: () => database.noteBookmarkLinks.count(),
      expected: canonicalBackup.data.noteBookmarkLinks.length,
    },
    {
      name: 'bookmarks',
      countFn: () => database.bookmarks.count(),
      expected: canonicalBackup.data.bookmarks.length,
    },
    {
      name: 'bookmarkGroups',
      countFn: () => database.bookmarkGroups.count(),
      expected: canonicalBackup.data.bookmarkGroups.length,
    },
    {
      name: 'focusSessions',
      countFn: () => database.focusSessions.count(),
      expected: canonicalBackup.data.focusSessions.length,
    },
    {
      name: 'dailyGoals',
      countFn: () => database.dailyGoals.count(),
      expected: canonicalBackup.data.dailyGoals.length,
    },
    {
      name: 'stickyNotes',
      countFn: () => database.stickyNotes.count(),
      expected: canonicalBackup.data.stickyNotes.length,
    },
    {
      name: 'vocabulary',
      countFn: () => database.vocabulary.count(),
      expected: canonicalBackup.data.vocabulary.length,
    },
    {
      name: 'resources',
      countFn: () => database.resources.count(),
      expected: canonicalBackup.data.resources.length,
    },
    {
      name: 'calendarEvents',
      countFn: () => database.calendarEvents.count(),
      expected: canonicalBackup.data.calendarEvents.length,
    },
  ];

  for (const checker of tableCheckers) {
    try {
      const count = await checker.countFn();
      restoredCounts[checker.name] = count;
      if (count !== checker.expected) {
        errors.push(
          `Record count mismatch in "${checker.name}": expected ${checker.expected}, found ${count}.`
        );
      }
    } catch (err) {
      errors.push(`Failed to count records in "${checker.name}": ${String(err)}`);
    }
  }

  // 2. VERIFY WORKSPACES INTEGRITY
  try {
    const workspaces = await database.workspaces.toArray();
    if (workspaces.length === 0) {
      errors.push('No workspaces found in database after restore.');
    } else {
      const hasDefault = workspaces.some((w) => w.isDefault);
      if (!hasDefault) {
        errors.push('No default workspace marked in database after restore.');
      }
    }

    const wsIds = new Set(workspaces.map((w) => w.id));

    // 3. VERIFY SETTINGS INTEGRITY
    const settings = await database.settings.get('current_settings');
    if (canonicalBackup.data.settings && !settings) {
      errors.push('Settings record "current_settings" is missing after restore.');
    } else if (settings && settings.activeWorkspaceId && !wsIds.has(settings.activeWorkspaceId)) {
      errors.push(
        `Settings activeWorkspaceId "${settings.activeWorkspaceId}" does not exist in restored workspaces.`
      );
    }

    // 4. VERIFY WIDGET INSTANCES & LAYOUTS CONTAINMENT
    const instances = await database.widgetInstances.toArray();
    const instIds = new Set<string>();
    for (const inst of instances) {
      instIds.add(inst.id);
      if (!wsIds.has(inst.workspaceId)) {
        errors.push(
          `Widget instance "${inst.id}" references non-existent workspace "${inst.workspaceId}".`
        );
      }
    }

    const layouts = await database.widgetLayouts.toArray();
    for (const layout of layouts) {
      if (!wsIds.has(layout.workspaceId)) {
        errors.push(
          `Widget layout "${layout.id}" references non-existent workspace "${layout.workspaceId}".`
        );
      }
      if (!instIds.has(layout.widgetInstanceId)) {
        errors.push(
          `Widget layout "${layout.id}" references non-existent widget instance "${layout.widgetInstanceId}".`
        );
      }
    }

    // 5. VERIFY NOTES & COLLECTIONS CONTAINMENT
    const collections = await database.noteCollections.toArray();
    const colMap = new Map(collections.map((c) => [c.id, c.workspaceId]));

    const notes = await database.notes.toArray();
    for (const note of notes) {
      if (!wsIds.has(note.workspaceId)) {
        errors.push(`Note "${note.id}" references non-existent workspace "${note.workspaceId}".`);
      }
      if (note.collectionId) {
        const colWs = colMap.get(note.collectionId);
        if (!colWs) {
          errors.push(`Note "${note.id}" references non-existent collection "${note.collectionId}".`);
        } else if (colWs !== note.workspaceId) {
          errors.push(
            `Cross-workspace mismatch: Note "${note.id}" (ws: ${note.workspaceId}) references collection "${note.collectionId}" (ws: ${colWs}).`
          );
        }
      }
    }

    // 6. VERIFY BOOKMARKS & GROUPS CONTAINMENT
    const groups = await database.bookmarkGroups.toArray();
    const grpMap = new Map(groups.map((g) => [g.id, g.workspaceId]));

    const bookmarks = await database.bookmarks.toArray();
    for (const bm of bookmarks) {
      if (!wsIds.has(bm.workspaceId)) {
        errors.push(
          `Bookmark "${bm.id}" references non-existent workspace "${bm.workspaceId}".`
        );
      }
      if (bm.groupId) {
        const grpWs = grpMap.get(bm.groupId);
        if (!grpWs) {
          errors.push(`Bookmark "${bm.id}" references non-existent group "${bm.groupId}".`);
        } else if (grpWs !== bm.workspaceId) {
          errors.push(
            `Cross-workspace mismatch: Bookmark "${bm.id}" (ws: ${bm.workspaceId}) references group "${bm.groupId}" (ws: ${grpWs}).`
          );
        }
      }

      // Check URL security
      if (bm.url && !isSafeBookmarkUrl(bm.url)) {
        errors.push(`Bookmark "${bm.id}" contains dangerous or executable URL scheme.`);
      }
    }
  } catch (err) {
    errors.push(`Failed post-restore invariant verification: ${String(err)}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    restoredCounts,
  };
}
