import { MigrationDefinition, MigrationStepResult } from '../types/migrationTypes';
import { NookSpaceDB } from '../../../services/database/db';
import { WidgetLayoutEntity } from '../../../types/database';

/**
 * Migration v1 -> v2: Layouts to WidgetLayouts Breakpoint Architecture
 */
export const v1ToV2LayoutsMigration: MigrationDefinition = {
  id: 'v1-v2-widget-layouts',
  name: 'Layouts to Breakpoint Architecture Upgrade',
  description: 'Migrates v1 legacy layouts into responsive widgetLayouts records.',
  type: 'schema',
  version: 2,
  dependencies: [],
  execute: async (db: NookSpaceDB): Promise<MigrationStepResult> => {
    let processed = 0;
    let modified = 0;

    await db.transaction('rw', [db.layouts, db.widgetLayouts], async () => {
      const oldLayouts = await db.layouts.toArray();
      processed = oldLayouts.length;

      if (oldLayouts.length === 0) {
        return;
      }

      const now = Date.now();
      const newRecords: WidgetLayoutEntity[] = [];

      for (const layout of oldLayouts) {
        if (layout.items && Array.isArray(layout.items)) {
          for (const item of layout.items) {
            if (item.widgetInstanceId) {
              const layoutId = `${layout.workspaceId}_${item.widgetInstanceId}_lg`;
              const exists = await db.widgetLayouts.get(layoutId);
              if (!exists) {
                newRecords.push({
                  id: layoutId,
                  workspaceId: layout.workspaceId,
                  widgetInstanceId: item.widgetInstanceId,
                  breakpoint: 'lg',
                  x: item.x ?? 0,
                  y: item.y ?? 0,
                  w: item.w ?? 4,
                  h: item.h ?? 3,
                  minW: item.minW,
                  minH: item.minH,
                  maxW: item.maxW,
                  maxH: item.maxH,
                  isDefault: Boolean(layout.isDefault),
                  createdAt: layout.createdAt || now,
                  updatedAt: layout.updatedAt || now,
                });
              }
            }
          }
        }
      }

      if (newRecords.length > 0) {
        await db.widgetLayouts.bulkPut(newRecords);
        modified = newRecords.length;
      }
    });

    return {
      success: true,
      recordsProcessed: processed,
      recordsModified: modified,
    };
  },
  verify: async (db: NookSpaceDB) => {
    const layoutCount = await db.layouts.count();
    const widgetLayoutCount = await db.widgetLayouts.count();
    if (layoutCount > 0 && widgetLayoutCount === 0) {
      return {
        valid: false,
        error: `v1 layouts (${layoutCount}) exist but widgetLayouts is empty`,
      };
    }
    return { valid: true };
  },
};

/**
 * Migration v2 -> v3: Bookmark Workspace Isolation Index
 */
export const v2ToV3BookmarksMigration: MigrationDefinition = {
  id: 'v2-v3-bookmark-workspace',
  name: 'Bookmark Workspace Isolation Upgrade',
  description: 'Ensures all bookmarks are indexed with their parent workspaceId.',
  type: 'schema',
  version: 3,
  dependencies: ['v1-v2-widget-layouts'],
  execute: async (db: NookSpaceDB): Promise<MigrationStepResult> => {
    let processed = 0;
    let modified = 0;

    await db.transaction('rw', [db.bookmarks, db.workspaces, db.settings], async () => {
      const allBookmarks = await db.bookmarks.toArray();
      processed = allBookmarks.length;

      if (allBookmarks.length === 0) return;

      // Determine default workspace
      let targetWorkspaceId = 'ws-default-personal';
      let defaultWs: any;
      try {
        defaultWs = await db.workspaces.where('isDefault').equals(1 as any).first();
      } catch {}
      if (!defaultWs) {
        try {
          const allWs = await db.workspaces.toArray();
          defaultWs = allWs.find((w: any) => Boolean(w.isDefault)) || allWs[0];
        } catch {}
      }

      if (defaultWs && defaultWs.id) {
        targetWorkspaceId = defaultWs.id;
      } else {
        const settings = await db.settings.get('current_settings');
        if (settings && settings.activeWorkspaceId) {
          targetWorkspaceId = settings.activeWorkspaceId;
        }
      }

      for (const bm of allBookmarks) {
        if (!bm.workspaceId || typeof bm.workspaceId !== 'string' || bm.workspaceId.trim() === '') {
          await db.bookmarks.update(bm.id, { workspaceId: targetWorkspaceId });
          modified++;
        }
      }
    });

    return {
      success: true,
      recordsProcessed: processed,
      recordsModified: modified,
    };
  },
  verify: async (db: NookSpaceDB) => {
    const allBookmarks = await db.bookmarks.toArray();
    const missing = allBookmarks.filter(
      (b) => !b.workspaceId || typeof b.workspaceId !== 'string' || b.workspaceId.trim() === ''
    );
    if (missing.length > 0) {
      return {
        valid: false,
        error: `${missing.length} bookmarks missing valid workspaceId`,
      };
    }
    return { valid: true };
  },
};

/**
 * Migration v3 -> v4: Notes & Knowledge System Schema Normalization
 */
export const v3ToV4NotesMigration: MigrationDefinition = {
  id: 'v3-v4-notes-knowledge',
  name: 'Notes & Knowledge Schema Normalization',
  description: 'Enriches notes with collections, excerpt, tags array, and metadata flags.',
  type: 'schema',
  version: 4,
  dependencies: ['v2-v3-bookmark-workspace'],
  execute: async (db: NookSpaceDB): Promise<MigrationStepResult> => {
    let processed = 0;
    let modified = 0;

    await db.transaction('rw', [db.notes, db.workspaces, db.settings], async () => {
      const allNotes = await db.notes.toArray();
      processed = allNotes.length;

      if (allNotes.length === 0) return;

      let targetWorkspaceId = 'ws-default-personal';
      let defaultWs: any;
      try {
        defaultWs = await db.workspaces.where('isDefault').equals(1 as any).first();
      } catch {}
      if (!defaultWs) {
        try {
          const allWs = await db.workspaces.toArray();
          defaultWs = allWs.find((w: any) => Boolean(w.isDefault)) || allWs[0];
        } catch {}
      }

      if (defaultWs && defaultWs.id) {
        targetWorkspaceId = defaultWs.id;
      } else {
        const settings = await db.settings.get('current_settings');
        if (settings && settings.activeWorkspaceId) {
          targetWorkspaceId = settings.activeWorkspaceId;
        }
      }

      for (const note of allNotes) {
        const updates: Record<string, unknown> = {};

        if (!note.workspaceId || typeof note.workspaceId !== 'string' || note.workspaceId.trim() === '') {
          updates.workspaceId = targetWorkspaceId;
        }
        if (note.collectionId === undefined) {
          updates.collectionId = null;
        }
        if (note.isPinned === undefined) {
          updates.isPinned = false;
        }
        if (note.isFavorite === undefined) {
          updates.isFavorite = false;
        }
        if (note.isArchived === undefined) {
          updates.isArchived = false;
        }
        if (!Array.isArray(note.tags)) {
          updates.tags = [];
        }
        if (typeof note.order !== 'number') {
          updates.order = 0;
        }
        if (note.excerpt === undefined) {
          const content = note.content || '';
          const plain = content.replace(/[#*`_~>[\]!]/g, ' ').replace(/\s+/g, ' ').trim();
          updates.excerpt = plain.slice(0, 300);
        }

        if (Object.keys(updates).length > 0) {
          await db.notes.update(note.id, updates as any);
          modified++;
        }
      }
    });

    return {
      success: true,
      recordsProcessed: processed,
      recordsModified: modified,
    };
  },
  verify: async (db: NookSpaceDB) => {
    const allNotes = await db.notes.toArray();
    const invalid = allNotes.filter(
      (n) =>
        !n.workspaceId ||
        n.collectionId === undefined ||
        n.isPinned === undefined ||
        n.isFavorite === undefined ||
        n.isArchived === undefined ||
        !Array.isArray(n.tags)
    );
    if (invalid.length > 0) {
      return {
        valid: false,
        error: `${invalid.length} notes missing schema v4 properties`,
      };
    }
    return { valid: true };
  },
};
