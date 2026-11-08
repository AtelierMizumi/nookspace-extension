import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NookSpaceDB } from '../../../src/services/database/db';
import { migrateLegacyQuickNotes } from '../../../src/services/database/migrations/legacyQuickNotesMigration';
import {
  ensureQuickNotesMigration,
  _resetMigrationCoordinatorForTesting,
} from '../../../src/services/database/migrations/migrationCoordinator';

describe('Legacy Quick Notes Migration Suite', () => {
  let db: NookSpaceDB;

  beforeEach(async () => {
    db = new NookSpaceDB(`test-quick-notes-migration-${Date.now()}-${Math.random()}`);
    await db.open();
    _resetMigrationCoordinatorForTesting();
  });

  afterEach(async () => {
    await db.delete();
  });

  it('1. migrates non-empty scratchpad notes into db.notes preserving workspace and content', async () => {
    // Seed 2 widget instances
    await db.widgetInstances.bulkAdd([
      {
        id: 'wi-qn-1',
        workspaceId: 'ws-alpha',
        widgetType: 'quick-notes',
        isEnabled: true,
        order: 0,
        createdAt: 1000,
        updatedAt: 1000,
        config: {
          content: '# Meeting Notes\nDiscuss Q4 roadmap.',
        },
      },
      {
        id: 'wi-qn-2',
        workspaceId: 'ws-beta',
        widgetType: 'quick-notes',
        isEnabled: true,
        order: 1,
        createdAt: 2000,
        updatedAt: 2000,
        config: {
          content: 'Simple scratchpad reminder without heading.',
        },
      },
    ]);

    const result = await migrateLegacyQuickNotes(db);
    expect(result.status).toBe('completed');
    expect(result.instancesProcessed).toBe(2);
    expect(result.notesMigrated).toBe(2);
    expect(result.notesSkipped).toBe(0);

    // Verify notes in db.notes
    const note1 = await db.notes.get('legacy-note-wi-qn-1');
    expect(note1).toBeDefined();
    expect(note1?.workspaceId).toBe('ws-alpha');
    expect(note1?.title).toBe('Meeting Notes');
    expect(note1?.content).toBe('# Meeting Notes\nDiscuss Q4 roadmap.');
    expect(note1?.tags).toEqual(['scratchpad']);

    const note2 = await db.notes.get('legacy-note-wi-qn-2');
    expect(note2).toBeDefined();
    expect(note2?.workspaceId).toBe('ws-beta');
    expect(note2?.title).toBe('Simple scratchpad reminder without heading.');

    // Original widget instances still retain config.content
    const inst1 = await db.widgetInstances.get('wi-qn-1');
    expect(inst1?.config.content).toBe('# Meeting Notes\nDiscuss Q4 roadmap.');
    expect(inst1?.config.migratedToNotesTable).toBe(true);
  });

  it('2. skips empty content scratchpads without creating empty notes', async () => {
    await db.widgetInstances.add({
      id: 'wi-empty',
      workspaceId: 'ws-alpha',
      widgetType: 'quick-notes',
      isEnabled: true,
      order: 0,
      createdAt: 1000,
      updatedAt: 1000,
      config: {
        content: '   \n  ',
      },
    });

    const result = await migrateLegacyQuickNotes(db);
    expect(result.status).toBe('completed');
    expect(result.notesMigrated).toBe(0);
    expect(result.notesSkipped).toBe(1);

    const note = await db.notes.get('legacy-note-wi-empty');
    expect(note).toBeUndefined();
  });

  it('3. is strictly idempotent and never creates duplicate notes on repeated calls', async () => {
    await db.widgetInstances.add({
      id: 'wi-repeat',
      workspaceId: 'ws-alpha',
      widgetType: 'quick-notes',
      isEnabled: true,
      order: 0,
      createdAt: 1000,
      updatedAt: 1000,
      config: {
        content: 'Persistent note content',
      },
    });

    const firstRun = await migrateLegacyQuickNotes(db);
    expect(firstRun.notesMigrated).toBe(1);

    const secondRun = await migrateLegacyQuickNotes(db);
    expect(secondRun.notesMigrated).toBe(0);
    expect(secondRun.alreadyMigratedInstances).toBe(1);

    const count = await db.notes.count();
    expect(count).toBe(1);
  });

  it('4. coordinator executes once across concurrent callers', async () => {
    await db.widgetInstances.add({
      id: 'wi-coord',
      workspaceId: 'ws-alpha',
      widgetType: 'quick-notes',
      isEnabled: true,
      order: 0,
      createdAt: 1000,
      updatedAt: 1000,
      config: {
        content: 'Concurrent note test',
      },
    });

    const [res1, res2] = await Promise.all([
      ensureQuickNotesMigration(db),
      ensureQuickNotesMigration(db),
    ]);

    expect(res1.status).toBe('completed');
    expect(res2.status).toBe('completed');
    expect(await db.notes.count()).toBe(1);
  });
});
