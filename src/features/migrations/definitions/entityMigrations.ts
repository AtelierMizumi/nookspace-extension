import { MigrationDefinition, MigrationStepResult } from '../types/migrationTypes';
import { NookSpaceDB } from '../../../services/database/db';
import { migrateLegacyTodos } from '../../../services/database/migrations/legacyTodoMigration';
import { migrateLegacyQuickNotes } from '../../../services/database/migrations/legacyQuickNotesMigration';

/**
 * Entity Migration: Legacy Widget Tasks -> Dexie `todos` Table
 */
export const legacyTodosEntityMigration: MigrationDefinition = {
  id: 'legacy-todos',
  name: 'Legacy SimpleTodo Tasks Migration',
  description: 'Migrates tasks stored in SimpleTodo widget configuration to the dedicated todos table.',
  type: 'entity',
  dependencies: [],
  execute: async (db: NookSpaceDB): Promise<MigrationStepResult> => {
    const result = await migrateLegacyTodos(db);
    return {
      success: result.status === 'completed' || result.status === 'partial',
      recordsProcessed: result.instancesProcessed,
      recordsModified: result.tasksMigrated,
      details: {
        tasksMigrated: result.tasksMigrated,
        tasksSkipped: result.tasksSkipped,
        alreadyMigratedInstances: result.alreadyMigratedInstances,
        status: result.status,
      },
      error: result.errors.length > 0 ? result.errors.join('; ') : undefined,
    };
  },
  verify: async (db: NookSpaceDB) => {
    const instances = await db.widgetInstances.toArray();
    const todoInstances = instances.filter(
      (inst) => inst.widgetType === 'simple-todo' || inst.widgetType === 'todo'
    );
    for (const inst of todoInstances) {
      const cfg = (inst.config || {}) as { tasks?: unknown[]; migrationStatus?: string; migratedToTodosTable?: boolean };
      if (Array.isArray(cfg.tasks) && cfg.tasks.length > 0) {
        if (!cfg.migratedToTodosTable && cfg.migrationStatus !== 'completed') {
          return {
            valid: false,
            error: `Widget instance "${inst.id}" still has unmigrated tasks in config`,
          };
        }
      }
    }
    return { valid: true };
  },
};

/**
 * Entity Migration: Legacy QuickNotes Scratchpad -> Dexie `notes` Table
 */
export const legacyQuickNotesEntityMigration: MigrationDefinition = {
  id: 'legacy-quick-notes',
  name: 'Legacy QuickNotes Scratchpad Migration',
  description: 'Migrates scratchpad text stored in QuickNotes widget configuration to the dedicated notes table.',
  type: 'entity',
  dependencies: [],
  execute: async (db: NookSpaceDB): Promise<MigrationStepResult> => {
    const result = await migrateLegacyQuickNotes(db);
    return {
      success: result.status === 'completed',
      recordsProcessed: result.instancesProcessed,
      recordsModified: result.notesMigrated,
      details: {
        notesMigrated: result.notesMigrated,
        notesSkipped: result.notesSkipped,
        alreadyMigratedInstances: result.alreadyMigratedInstances,
        status: result.status,
      },
      error: result.errors.length > 0 ? result.errors.join('; ') : undefined,
    };
  },
  verify: async (db: NookSpaceDB) => {
    const instances = await db.widgetInstances.toArray();
    const qnInstances = instances.filter((inst) => inst.widgetType === 'quick-notes');
    for (const inst of qnInstances) {
      const cfg = (inst.config || {}) as { content?: string; migrationStatus?: string; migratedToNotesTable?: boolean };
      if (typeof cfg.content === 'string' && cfg.content.trim().length > 0) {
        if (!cfg.migratedToNotesTable && cfg.migrationStatus !== 'completed') {
          return {
            valid: false,
            error: `QuickNotes instance "${inst.id}" has unmigrated content in config`,
          };
        }
      }
    }
    return { valid: true };
  },
};
