import { NookSpaceDB, db } from '../../../services/database/db';
import {
  LegacyIssue,
  LegacyRepairActionDetail,
  LegacyRepairResult,
} from '../types/migrationTypes';
import { legacyTodosEntityMigration, legacyQuickNotesEntityMigration } from '../definitions/entityMigrations';
import { v1ToV2LayoutsMigration } from '../definitions/schemaMigrations';

export class LegacyDataRepairService {
  /**
   * Safely repairs detected issues using non-destructive repair policies.
   */
  async repairIssues(
    issues: LegacyIssue[],
    database: NookSpaceDB = db
  ): Promise<LegacyRepairResult> {
    const details: LegacyRepairActionDetail[] = [];
    let repairedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;

    // Resolve default workspaceId for fallback
    let defaultWorkspaceId = 'ws-default-personal';
    try {
      const defaultWs =
        (await database.workspaces.where('isDefault').equals(1 as any).first()) ||
        (await database.workspaces.where('isDefault').equals(true as any).first()) ||
        (await database.workspaces.orderBy('order').first());
      if (defaultWs && defaultWs.id) {
        defaultWorkspaceId = defaultWs.id;
      }
    } catch {
      // fallback
    }

    for (const issue of issues) {
      if (!issue.repairable) {
        skippedCount++;
        details.push({
          issueId: issue.id,
          entityId: issue.entityId,
          table: issue.table,
          status: 'skipped',
          message: 'Issue is classified as non-repairable automatically.',
        });
        continue;
      }

      try {
        switch (issue.category) {
          case 'orphan_note_collection': {
            await database.notes.update(issue.entityId, { collectionId: null });
            repairedCount++;
            details.push({
              issueId: issue.id,
              entityId: issue.entityId,
              table: 'notes',
              status: 'repaired',
              message: 'Reset orphan collectionId to null. Note preserved in uncategorized.',
            });
            break;
          }

          case 'orphan_bookmark_group': {
            await database.bookmarks.update(issue.entityId, { groupId: null });
            repairedCount++;
            details.push({
              issueId: issue.id,
              entityId: issue.entityId,
              table: 'bookmarks',
              status: 'repaired',
              message: 'Reset orphan groupId to null. Bookmark preserved in uncategorized.',
            });
            break;
          }

          case 'orphan_widget_instance': {
            await database.widgetLayouts.delete(issue.entityId);
            repairedCount++;
            details.push({
              issueId: issue.id,
              entityId: issue.entityId,
              table: 'widgetLayouts',
              status: 'repaired',
              message: 'Removed dangling widget layout item for deleted widget instance.',
            });
            break;
          }

          case 'missing_required_field': {
            if (issue.table === 'notes') {
              const note = await database.notes.get(issue.entityId);
              if (note) {
                const updates: Record<string, unknown> = {};
                if (!note.workspaceId) updates.workspaceId = defaultWorkspaceId;
                if (note.isFavorite === undefined) updates.isFavorite = false;
                if (note.isArchived === undefined) updates.isArchived = false;
                if (note.isPinned === undefined) updates.isPinned = false;
                if (!Array.isArray(note.tags)) updates.tags = [];
                if (typeof note.order !== 'number') updates.order = 0;
                if (note.excerpt === undefined) {
                  const content = note.content || '';
                  const plain = content.replace(/[#*`_~>[\]!]/g, ' ').replace(/\s+/g, ' ').trim();
                  updates.excerpt = plain.slice(0, 300);
                }
                await database.notes.update(note.id, updates as any);
                repairedCount++;
                details.push({
                  issueId: issue.id,
                  entityId: issue.entityId,
                  table: 'notes',
                  status: 'repaired',
                  message: 'Populated missing schema defaults on note entity.',
                });
              } else {
                skippedCount++;
              }
            } else if (issue.table === 'bookmarks') {
              await database.bookmarks.update(issue.entityId, {
                workspaceId: defaultWorkspaceId,
              });
              repairedCount++;
              details.push({
                issueId: issue.id,
                entityId: issue.entityId,
                table: 'bookmarks',
                status: 'repaired',
                message: `Assigned fallback workspaceId "${defaultWorkspaceId}" to bookmark.`,
              });
            } else {
              skippedCount++;
            }
            break;
          }

          case 'legacy_todo_widget': {
            await legacyTodosEntityMigration.execute(database);
            repairedCount++;
            details.push({
              issueId: issue.id,
              entityId: issue.entityId,
              table: 'widgetInstances',
              status: 'repaired',
              message: 'Executed legacy todo migration to extract tasks into todos table.',
            });
            break;
          }

          case 'legacy_quick_notes_widget': {
            await legacyQuickNotesEntityMigration.execute(database);
            repairedCount++;
            details.push({
              issueId: issue.id,
              entityId: issue.entityId,
              table: 'widgetInstances',
              status: 'repaired',
              message: 'Executed quick notes migration to extract scratchpad content into notes table.',
            });
            break;
          }

          case 'deprecated_v1_layout': {
            await v1ToV2LayoutsMigration.execute(database);
            repairedCount++;
            details.push({
              issueId: issue.id,
              entityId: issue.entityId,
              table: 'layouts',
              status: 'repaired',
              message: 'Migrated deprecated v1 layout into widgetLayouts.',
            });
            break;
          }

          default: {
            skippedCount++;
            details.push({
              issueId: issue.id,
              entityId: issue.entityId,
              table: issue.table,
              status: 'skipped',
              message: `No automated repair handler for category "${issue.category}".`,
            });
          }
        }
      } catch (err) {
        failedCount++;
        details.push({
          issueId: issue.id,
          entityId: issue.entityId,
          table: issue.table,
          status: 'failed',
          message: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return {
      issuesProcessed: issues.length,
      repairedCount,
      skippedCount,
      failedCount,
      details,
    };
  }
}

export const legacyDataRepairService = new LegacyDataRepairService();
