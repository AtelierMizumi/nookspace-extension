import {
  MergeDataGroup,
  DATA_GROUP_TABLE_MAP,
} from '../types/mergeTypes';
import type { BackupDataV1 } from '../types/backupTypes';

export interface DependencyAnalysisResult {
  affectedTables: string[];
  warnings: string[];
  missingDependencies: Array<{
    group: MergeDataGroup;
    dependsOn: MergeDataGroup;
    description: string;
  }>;
}

export class MergeDependencyService {
  /**
   * Analyzes selected data groups against backup data and target database.
   */
  analyzeDependencies(
    selectedGroups: MergeDataGroup[],
    backupData: BackupDataV1,
    targetWorkspaceId?: string
  ): DependencyAnalysisResult {
    const warnings: string[] = [];
    const missingDependencies: Array<{
      group: MergeDataGroup;
      dependsOn: MergeDataGroup;
      description: string;
    }> = [];

    const selectedGroupSet = new Set(selectedGroups);

    // 1. Dashboard without workspaces
    if (selectedGroupSet.has('dashboard') && !selectedGroupSet.has('workspaces')) {
      if (!targetWorkspaceId) {
        missingDependencies.push({
          group: 'dashboard',
          dependsOn: 'workspaces',
          description:
            'Dashboard widgets and layouts require either importing workspaces or specifying an existing target workspace.',
        });
      }
    }

    // 2. Notes collections dependency
    if (selectedGroupSet.has('notes')) {
      const incomingNotesWithCollection = (backupData.notes || []).filter(
        (n) => !!n.collectionId
      );
      if (
        incomingNotesWithCollection.length > 0 &&
        (backupData.noteCollections || []).length > 0
      ) {
        // If noteCollections group is part of 'notes' group, they are imported together.
        // In our data group mapping, notes, noteCollections, noteTags, noteBookmarkLinks are all in 'notes'.
      }
    }

    // 3. Bookmarks and groups dependency
    if (selectedGroupSet.has('bookmarks')) {
      // In our data group mapping, bookmarks and bookmarkGroups are together in 'bookmarks'.
    }

    // 4. Note-Bookmark links dependency
    const hasNotes = selectedGroupSet.has('notes');
    const hasBookmarks = selectedGroupSet.has('bookmarks');
    if ((backupData.noteBookmarkLinks || []).length > 0) {
      if (!hasNotes || !hasBookmarks) {
        warnings.push(
          'Note-Bookmark links will only be preserved where both the referenced Note and Bookmark are available.'
        );
      }
    }

    // Collect all affected tables
    const tableSet = new Set<string>();
    for (const group of selectedGroups) {
      const tables = DATA_GROUP_TABLE_MAP[group] || [];
      for (const t of tables) {
        tableSet.add(t);
      }
    }

    // If targetWorkspaceId is specified, we might need workspaces table for validation
    if (targetWorkspaceId) {
      tableSet.add('workspaces');
    }

    return {
      affectedTables: Array.from(tableSet),
      warnings,
      missingDependencies,
    };
  }
}
