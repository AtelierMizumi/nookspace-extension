import { NookSpaceDB, db } from '../db';
import { NoteEntity } from '../../../types/notes';
import { generateExcerpt } from '../../../types/notes';

export interface LegacyQuickNotesConfig {
  content?: string;
  migratedToNotesTable?: boolean;
  migrationStatus?: 'completed' | 'failed';
  migratedAt?: number;
  migratedNoteId?: string;
  [key: string]: unknown;
}

export interface QuickNotesMigrationResult {
  instancesProcessed: number;
  notesMigrated: number;
  notesSkipped: number;
  alreadyMigratedInstances: number;
  status: 'completed' | 'failed';
  errors: string[];
}

/**
 * Extracts a sensible title from the first non-empty line of content.
 */
function extractTitleFromContent(content: string): string {
  const lines = content.split('\n');
  for (const line of lines) {
    const trimmed = line.replace(/^[#*`_~>\s-]+/, '').trim();
    if (trimmed.length > 0) {
      return trimmed.slice(0, 100);
    }
  }
  return 'Scratchpad Note';
}

/**
 * Migrates legacy scratchpad notes from QuickNotesWidget (WidgetInstanceEntity.config.content)
 * into the dedicated Dexie `notes` table.
 *
 * Guarantees:
 * 1. Atomicity: Runs within a Dexie transaction.
 * 2. Idempotency: Uses persistent migration markers and deterministic IDs to prevent duplicates.
 * 3. Data Preservation: Source widget instances and their original content are NEVER deleted.
 * 4. Workspace Isolation: Preserves workspaceId accurately.
 */
export async function migrateLegacyQuickNotes(
  database: NookSpaceDB = db
): Promise<QuickNotesMigrationResult> {
  const result: QuickNotesMigrationResult = {
    instancesProcessed: 0,
    notesMigrated: 0,
    notesSkipped: 0,
    alreadyMigratedInstances: 0,
    status: 'completed',
    errors: [],
  };

  try {
    const widgetInstances = await database.widgetInstances.toArray();
    const quickNotesInstances = widgetInstances.filter(
      (inst) => inst.widgetType === 'quick-notes'
    );

    if (quickNotesInstances.length === 0) {
      return result;
    }

    await database.transaction(
      'rw',
      [database.widgetInstances, database.notes],
      async () => {
        for (const instance of quickNotesInstances) {
          result.instancesProcessed += 1;
          const config = (instance.config || {}) as LegacyQuickNotesConfig;

          // Check if already migrated
          if (config.migratedToNotesTable === true || config.migrationStatus === 'completed') {
            result.alreadyMigratedInstances += 1;
            continue;
          }

          const rawContent = typeof config.content === 'string' ? config.content.trim() : '';

          // If content is empty, mark as migrated without creating an empty note
          if (rawContent.length === 0) {
            result.notesSkipped += 1;
            await database.widgetInstances.update(instance.id, {
              config: {
                ...config,
                migratedToNotesTable: true,
                migrationStatus: 'completed',
                migratedAt: Date.now(),
              },
            });
            continue;
          }

          const noteId = `legacy-note-${instance.id}`;

          // Check if note already exists
          const existingNote = await database.notes.get(noteId);
          if (existingNote) {
            result.alreadyMigratedInstances += 1;
            await database.widgetInstances.update(instance.id, {
              config: {
                ...config,
                migratedToNotesTable: true,
                migrationStatus: 'completed',
                migratedAt: Date.now(),
                migratedNoteId: noteId,
              },
            });
            continue;
          }

          const now = Date.now();
          const title = extractTitleFromContent(rawContent);
          const excerpt = generateExcerpt(rawContent);

          const newNote: NoteEntity = {
            id: noteId,
            workspaceId: instance.workspaceId,
            collectionId: null,
            title,
            content: rawContent,
            excerpt,
            isPinned: false,
            isFavorite: false,
            isArchived: false,
            tags: ['scratchpad'],
            order: 0,
            createdAt: instance.createdAt || now,
            updatedAt: instance.updatedAt || now,
          };

          await database.notes.put(newNote);
          result.notesMigrated += 1;

          await database.widgetInstances.update(instance.id, {
            config: {
              ...config,
              migratedToNotesTable: true,
              migrationStatus: 'completed',
              migratedAt: now,
              migratedNoteId: noteId,
            },
          });
        }
      }
    );
  } catch (err: unknown) {
    result.status = 'failed';
    result.errors.push(err instanceof Error ? err.message : String(err));
  }

  return result;
}
