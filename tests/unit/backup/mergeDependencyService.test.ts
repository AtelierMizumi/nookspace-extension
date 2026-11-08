import { describe, it, expect } from 'vitest';
import { MergeDependencyService } from '../../../src/features/backup/services/mergeDependencyService';
import type { BackupDataV1 } from '../../../src/features/backup/types/backupTypes';

describe('Milestone 9.4 — Merge Dependency Service Suite', () => {
  const service = new MergeDependencyService();

  const mockBackupData: BackupDataV1 = {
    workspaces: [],
    settings: null,
    widgetInstances: [],
    widgetLayouts: [],
    todos: [],
    notes: [],
    noteCollections: [],
    noteTags: [],
    noteBookmarkLinks: [],
    bookmarks: [],
    bookmarkGroups: [],
    focusSessions: [],
    dailyGoals: [],
    stickyNotes: [],
    vocabulary: [],
    resources: [],
    calendarEvents: [],
  };

  it('detects missing workspace dependency when importing dashboard without targetWorkspaceId', () => {
    const result = service.analyzeDependencies(
      ['dashboard'],
      mockBackupData,
      undefined // No target workspace
    );

    expect(result.missingDependencies).toHaveLength(1);
    expect(result.missingDependencies[0].group).toBe('dashboard');
    expect(result.missingDependencies[0].dependsOn).toBe('workspaces');
  });

  it('resolves dashboard dependency when targetWorkspaceId is supplied', () => {
    const result = service.analyzeDependencies(
      ['dashboard'],
      mockBackupData,
      'ws-target'
    );

    expect(result.missingDependencies).toHaveLength(0);
    expect(result.affectedTables).toContain('widgetInstances');
    expect(result.affectedTables).toContain('widgetLayouts');
    expect(result.affectedTables).toContain('workspaces');
  });

  it('aggregates affected tables correctly for multi-group selection', () => {
    const result = service.analyzeDependencies(
      ['tasks', 'notes', 'bookmarks'],
      mockBackupData
    );

    expect(result.affectedTables).toContain('todos');
    expect(result.affectedTables).toContain('notes');
    expect(result.affectedTables).toContain('noteCollections');
    expect(result.affectedTables).toContain('bookmarks');
    expect(result.affectedTables).toContain('bookmarkGroups');
    expect(result.affectedTables).not.toContain('focusSessions');
  });
});
