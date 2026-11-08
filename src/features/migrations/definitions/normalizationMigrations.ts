import { MigrationDefinition, MigrationStepResult } from '../types/migrationTypes';
import { NookSpaceDB } from '../../../services/database/db';

const HEX_COLOR_REGEX = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;

/**
 * Data Normalization Migration: Safe Workspace Theme Metadata Normalization
 *
 * Guarantees:
 * - Only normalizes structural metadata (color hex code, icon fallback).
 * - NEVER modifies user-authored prose, markdown, code blocks, or custom titles.
 */
export const normalizeWorkspaceMetadataMigration: MigrationDefinition = {
  id: 'normalize-workspace-metadata',
  name: 'Workspace Metadata Normalization',
  description: 'Ensures workspaces have valid hex theme colors and icon tokens without touching user-authored content.',
  type: 'normalization',
  dependencies: [],
  execute: async (db: NookSpaceDB): Promise<MigrationStepResult> => {
    let processed = 0;
    let modified = 0;

    await db.transaction('rw', [db.workspaces], async () => {
      const workspaces = await db.workspaces.toArray();
      processed = workspaces.length;

      for (const ws of workspaces) {
        const updates: Record<string, unknown> = {};

        if (!ws.color || typeof ws.color !== 'string' || !HEX_COLOR_REGEX.test(ws.color)) {
          updates.color = '#6366f1';
        }

        if (!ws.icon || typeof ws.icon !== 'string' || ws.icon.trim() === '') {
          updates.icon = 'Sparkles';
        }

        if (Object.keys(updates).length > 0) {
          await db.workspaces.update(ws.id, updates);
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
    const workspaces = await db.workspaces.toArray();
    for (const ws of workspaces) {
      if (!ws.color || !HEX_COLOR_REGEX.test(ws.color)) {
        return {
          valid: false,
          error: `Workspace "${ws.id}" still has invalid color "${ws.color}"`,
        };
      }
    }
    return { valid: true };
  },
};
