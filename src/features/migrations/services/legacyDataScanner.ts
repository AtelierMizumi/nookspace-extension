import { NookSpaceDB, db } from '../../../services/database/db';
import {
  LegacyIssue,
  LegacyScanResult,
  LegacyScanSummary,
} from '../types/migrationTypes';

export class LegacyDataScanner {
  /**
   * Performs an exhaustive, strictly read-only inspection of local IndexedDB data.
   * Guarantees zero writes and zero side effects.
   */
  async scan(database: NookSpaceDB = db): Promise<LegacyScanResult> {
    const issues: LegacyIssue[] = [];
    let totalRecordsScanned = 0;

    // 1. Scan Workspaces
    const workspaces = await database.workspaces.toArray();
    totalRecordsScanned += workspaces.length;
    for (const ws of workspaces) {
      if (!ws.id || typeof ws.id !== 'string') {
        issues.push({
          id: `ws-corrupt-${Date.now()}-${Math.random()}`,
          category: 'missing_required_field',
          severity: 'critical',
          classification: 'Corrupted',
          table: 'workspaces',
          entityId: String(ws.id || 'unknown'),
          description: 'Workspace record is missing a valid primary key (id).',
          suggestedAction: 'Re-assign or remove corrupted workspace record.',
          repairable: false,
        });
      }
    }

    // 2. Scan Layouts (v1 legacy table)
    try {
      const v1Layouts = await database.layouts.toArray();
      totalRecordsScanned += v1Layouts.length;
      if (v1Layouts.length > 0) {
        for (const l of v1Layouts) {
          issues.push({
            id: `issue-layout-v1-${l.id}`,
            category: 'deprecated_v1_layout',
            severity: 'info',
            classification: 'Migratable',
            table: 'layouts',
            entityId: l.id,
            description: `Deprecated v1 layout record detected for workspace "${l.workspaceId}".`,
            suggestedAction: 'Migrate into responsive widgetLayouts breakpointed records.',
            repairable: true,
            details: { workspaceId: l.workspaceId, itemsCount: l.items?.length || 0 },
          });
        }
      }
    } catch {
      // Table may not exist in mock DBs
    }

    // 3. Scan Widget Instances (Legacy Tasks & Scratchpads)
    const instances = await database.widgetInstances.toArray();
    totalRecordsScanned += instances.length;
    const validInstanceIds = new Set<string>();

    for (const inst of instances) {
      if (!inst.id) {
        issues.push({
          id: `inst-corrupt-${Date.now()}-${Math.random()}`,
          category: 'missing_required_field',
          severity: 'critical',
          classification: 'Corrupted',
          table: 'widgetInstances',
          entityId: 'unknown',
          description: 'Widget instance missing valid id.',
          suggestedAction: 'Remove corrupted instance record.',
          repairable: false,
        });
        continue;
      }

      validInstanceIds.add(inst.id);
      const cfg = (inst.config || {}) as Record<string, unknown>;

      // Check legacy simple-todo tasks
      if (inst.widgetType === 'simple-todo' || inst.widgetType === 'todo') {
        if (
          Array.isArray(cfg.tasks) &&
          cfg.tasks.length > 0 &&
          cfg.migratedToTodosTable !== true &&
          cfg.migrationStatus !== 'completed'
        ) {
          issues.push({
            id: `issue-todo-legacy-${inst.id}`,
            category: 'legacy_todo_widget',
            severity: 'info',
            classification: 'Migratable',
            table: 'widgetInstances',
            entityId: inst.id,
            description: `Widget "${inst.id}" contains ${cfg.tasks.length} unmigrated legacy tasks.`,
            suggestedAction: 'Run entity migration to transfer tasks into dedicated todos table.',
            repairable: true,
            details: { taskCount: cfg.tasks.length, workspaceId: inst.workspaceId },
          });
        }
      }

      // Check legacy quick-notes content
      if (inst.widgetType === 'quick-notes') {
        if (
          typeof cfg.content === 'string' &&
          cfg.content.trim().length > 0 &&
          cfg.migratedToNotesTable !== true &&
          cfg.migrationStatus !== 'completed'
        ) {
          issues.push({
            id: `issue-qn-legacy-${inst.id}`,
            category: 'legacy_quick_notes_widget',
            severity: 'info',
            classification: 'Migratable',
            table: 'widgetInstances',
            entityId: inst.id,
            description: `QuickNotes widget "${inst.id}" contains unmigrated scratchpad content.`,
            suggestedAction: 'Run entity migration to create note in dedicated notes table.',
            repairable: true,
            details: { contentLength: cfg.content.length, workspaceId: inst.workspaceId },
          });
        }
      }
    }

    // 4. Scan Widget Layouts (Orphan Layouts)
    try {
      const widgetLayouts = await database.widgetLayouts.toArray();
      totalRecordsScanned += widgetLayouts.length;

      for (const wl of widgetLayouts) {
        if (!validInstanceIds.has(wl.widgetInstanceId)) {
          issues.push({
            id: `issue-orphan-layout-${wl.id}`,
            category: 'orphan_widget_instance',
            severity: 'info',
            classification: 'Recoverable',
            table: 'widgetLayouts',
            entityId: wl.id,
            description: `Widget layout "${wl.id}" references deleted widget "${wl.widgetInstanceId}".`,
            suggestedAction: 'Safely remove orphaned widget layout item.',
            repairable: true,
            details: { widgetInstanceId: wl.widgetInstanceId, breakpoint: wl.breakpoint },
          });
        }
      }
    } catch {
      // Ignore if table not present in test DB
    }

    // 5. Scan Note Collections & Notes (Orphan Collections & Missing Fields)
    const collections = await database.noteCollections.toArray();
    totalRecordsScanned += collections.length;
    const validCollectionIds = new Set(collections.map((c) => c.id));

    const notes = await database.notes.toArray();
    totalRecordsScanned += notes.length;

    for (const note of notes) {
      if (!note.id) {
        issues.push({
          id: `note-corrupt-${Date.now()}-${Math.random()}`,
          category: 'missing_required_field',
          severity: 'critical',
          classification: 'Corrupted',
          table: 'notes',
          entityId: 'unknown',
          description: 'Note record missing primary key (id).',
          suggestedAction: 'Remove corrupted note.',
          repairable: false,
        });
        continue;
      }

      // Check orphan collectionId
      if (note.collectionId && !validCollectionIds.has(note.collectionId)) {
        issues.push({
          id: `issue-orphan-note-col-${note.id}`,
          category: 'orphan_note_collection',
          severity: 'warning',
          classification: 'Recoverable',
          table: 'notes',
          entityId: note.id,
          description: `Note "${note.title || note.id}" references non-existent collection "${note.collectionId}".`,
          suggestedAction: 'Reset collectionId to null to preserve note as uncategorized.',
          repairable: true,
          details: { collectionId: note.collectionId, workspaceId: note.workspaceId },
        });
      }

      // Check missing schema v4 fields
      const missingFields: string[] = [];
      if (note.isFavorite === undefined) missingFields.push('isFavorite');
      if (note.isArchived === undefined) missingFields.push('isArchived');
      if (note.isPinned === undefined) missingFields.push('isPinned');
      if (!Array.isArray(note.tags)) missingFields.push('tags');
      if (!note.workspaceId) missingFields.push('workspaceId');

      if (missingFields.length > 0) {
        issues.push({
          id: `issue-note-fields-${note.id}`,
          category: 'missing_required_field',
          severity: 'warning',
          classification: 'Recoverable',
          table: 'notes',
          entityId: note.id,
          description: `Note "${note.title || note.id}" is missing v4 fields: ${missingFields.join(', ')}.`,
          suggestedAction: 'Populate missing fields with schema defaults.',
          repairable: true,
          details: { missingFields },
        });
      }
    }

    // 6. Scan Bookmark Groups & Bookmarks (Orphan Groups & Missing WorkspaceId)
    const bookmarkGroups = await database.bookmarkGroups.toArray();
    totalRecordsScanned += bookmarkGroups.length;
    const validGroupIds = new Set(bookmarkGroups.map((g) => g.id));

    const bookmarks = await database.bookmarks.toArray();
    totalRecordsScanned += bookmarks.length;

    for (const bm of bookmarks) {
      if (!bm.id) {
        issues.push({
          id: `bm-corrupt-${Date.now()}-${Math.random()}`,
          category: 'missing_required_field',
          severity: 'critical',
          classification: 'Corrupted',
          table: 'bookmarks',
          entityId: 'unknown',
          description: 'Bookmark record missing primary key (id).',
          suggestedAction: 'Remove corrupted bookmark.',
          repairable: false,
        });
        continue;
      }

      if (bm.groupId && !validGroupIds.has(bm.groupId)) {
        issues.push({
          id: `issue-orphan-bm-grp-${bm.id}`,
          category: 'orphan_bookmark_group',
          severity: 'warning',
          classification: 'Recoverable',
          table: 'bookmarks',
          entityId: bm.id,
          description: `Bookmark "${bm.title || bm.url}" references non-existent group "${bm.groupId}".`,
          suggestedAction: 'Reset groupId to null to preserve bookmark as unorganized.',
          repairable: true,
          details: { groupId: bm.groupId, workspaceId: bm.workspaceId },
        });
      }

      if (!bm.workspaceId || typeof bm.workspaceId !== 'string' || bm.workspaceId.trim() === '') {
        issues.push({
          id: `issue-bm-missing-ws-${bm.id}`,
          category: 'missing_required_field',
          severity: 'warning',
          classification: 'Recoverable',
          table: 'bookmarks',
          entityId: bm.id,
          description: `Bookmark "${bm.title || bm.url}" is missing workspaceId foreign key.`,
          suggestedAction: 'Assign default workspaceId.',
          repairable: true,
        });
      }
    }

    // Compute Summary
    const summary: LegacyScanSummary = {
      totalRecordsScanned,
      compatibleCount: 0,
      migratableCount: issues.filter((i) => i.classification === 'Migratable').length,
      recoverableCount: issues.filter((i) => i.classification === 'Recoverable').length,
      unsupportedCount: issues.filter((i) => i.classification === 'Unsupported').length,
      corruptedCount: issues.filter((i) => i.classification === 'Corrupted').length,
      criticalCount: issues.filter((i) => i.severity === 'critical').length,
      warningCount: issues.filter((i) => i.severity === 'warning').length,
      infoCount: issues.filter((i) => i.severity === 'info').length,
    };

    summary.compatibleCount = Math.max(
      0,
      totalRecordsScanned - (summary.migratableCount + summary.recoverableCount + summary.corruptedCount)
    );

    return {
      scannedAt: Date.now(),
      summary,
      issues,
    };
  }
}

export const legacyDataScanner = new LegacyDataScanner();
