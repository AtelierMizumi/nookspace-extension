import { describe, it, expect, beforeEach } from 'vitest';
import Dexie from 'dexie';
import { NookSpaceDB } from '../../../src/services/database/db';
import { LegacyDataScanner } from '../../../src/features/migrations/services/legacyDataScanner';

describe('LegacyDataScanner Suite — Milestone 9.5', () => {
  let db: NookSpaceDB;
  let scanner: LegacyDataScanner;
  let dbCounter = 0;

  beforeEach(async () => {
    const dbName = `test-scanner-db-${Date.now()}-${++dbCounter}`;
    db = new NookSpaceDB(dbName);
    await db.open();
    scanner = new LegacyDataScanner();
  });

  it('1. performs strictly read-only scanning without altering records', async () => {
    // Seed initial workspace and note
    await db.workspaces.put({
      id: 'ws-main',
      name: 'Main Space',
      icon: 'Sparkles',
      color: '#6366f1',
      isDefault: true,
      order: 0,
      createdAt: 1000,
      updatedAt: 1000,
    });

    await db.notes.put({
      id: 'note-1',
      workspaceId: 'ws-main',
      collectionId: null,
      title: 'Preserved Note',
      content: 'Important content',
      excerpt: 'Important content',
      isPinned: false,
      isFavorite: false,
      isArchived: false,
      tags: ['tag1'],
      order: 0,
      createdAt: 1000,
      updatedAt: 1000,
    });

    const noteCountBefore = await db.notes.count();
    const wsCountBefore = await db.workspaces.count();

    const result = await scanner.scan(db);

    const noteCountAfter = await db.notes.count();
    const wsCountAfter = await db.workspaces.count();
    const noteAfter = await db.notes.get('note-1');

    expect(noteCountBefore).toBe(noteCountAfter);
    expect(wsCountBefore).toBe(wsCountAfter);
    expect(noteAfter?.title).toBe('Preserved Note');
    expect(noteAfter?.content).toBe('Important content');
    expect(result.summary.totalRecordsScanned).toBeGreaterThan(0);
    expect(result.summary.corruptedCount).toBe(0);
  });

  it('2. detects legacy SimpleTodo tasks stored inside widget config', async () => {
    await db.workspaces.put({
      id: 'ws-test',
      name: 'Test Space',
      icon: 'Sparkles',
      color: '#6366f1',
      isDefault: true,
      order: 0,
      createdAt: 1000,
      updatedAt: 1000,
    });

    await db.widgetInstances.put({
      id: 'widget-todo-1',
      workspaceId: 'ws-test',
      widgetType: 'simple-todo',
      isEnabled: true,
      order: 0,
      createdAt: 1000,
      updatedAt: 1000,
      config: {
        tasks: [
          { id: 'task-1', title: 'Buy groceries', completed: false },
          { id: 'task-2', title: 'Call mechanic', completed: true },
        ],
        migratedToTodosTable: false,
      },
    });

    const result = await scanner.scan(db);
    const todoIssue = result.issues.find((i) => i.category === 'legacy_todo_widget');

    expect(todoIssue).toBeDefined();
    expect(todoIssue?.classification).toBe('Migratable');
    expect(todoIssue?.severity).toBe('info');
    expect(todoIssue?.table).toBe('widgetInstances');
    expect(todoIssue?.entityId).toBe('widget-todo-1');
    expect(todoIssue?.repairable).toBe(true);
  });

  it('3. detects legacy QuickNotes scratchpad content stored inside widget config', async () => {
    await db.widgetInstances.put({
      id: 'widget-qn-1',
      workspaceId: 'ws-test',
      widgetType: 'quick-notes',
      isEnabled: true,
      order: 1,
      createdAt: 1000,
      updatedAt: 1000,
      config: {
        content: '# Scratchpad Ideas\n- Build feature A\n- Ship release',
        migratedToNotesTable: false,
      },
    });

    const result = await scanner.scan(db);
    const qnIssue = result.issues.find((i) => i.category === 'legacy_quick_notes_widget');

    expect(qnIssue).toBeDefined();
    expect(qnIssue?.classification).toBe('Migratable');
    expect(qnIssue?.severity).toBe('info');
    expect(qnIssue?.repairable).toBe(true);
  });

  it('4. detects orphan notes referencing non-existent collections', async () => {
    await db.workspaces.put({
      id: 'ws-notes',
      name: 'Notes Space',
      icon: 'Sparkles',
      color: '#6366f1',
      isDefault: true,
      order: 0,
      createdAt: 1000,
      updatedAt: 1000,
    });

    await db.notes.put({
      id: 'note-orphan',
      workspaceId: 'ws-notes',
      collectionId: 'deleted-collection-xyz',
      title: 'Orphan Note',
      content: 'Some note text',
      excerpt: 'Some note text',
      isPinned: false,
      isFavorite: false,
      isArchived: false,
      tags: [],
      order: 0,
      createdAt: 1000,
      updatedAt: 1000,
    });

    const result = await scanner.scan(db);
    const orphanIssue = result.issues.find((i) => i.category === 'orphan_note_collection');

    expect(orphanIssue).toBeDefined();
    expect(orphanIssue?.classification).toBe('Recoverable');
    expect(orphanIssue?.severity).toBe('warning');
    expect(orphanIssue?.repairable).toBe(true);
    expect(orphanIssue?.suggestedAction).toMatch(/Reset collectionId to null/);
  });

  it('5. detects orphan bookmarks referencing non-existent bookmark groups', async () => {
    await db.bookmarks.put({
      id: 'bm-orphan',
      workspaceId: 'ws-main',
      groupId: 'deleted-group-123',
      title: 'Favorite Docs',
      url: 'https://docs.example.com',
      isFavorite: true,
      order: 0,
      createdAt: 1000,
      updatedAt: 1000,
    });

    const result = await scanner.scan(db);
    const orphanBm = result.issues.find((i) => i.category === 'orphan_bookmark_group');

    expect(orphanBm).toBeDefined();
    expect(orphanBm?.classification).toBe('Recoverable');
    expect(orphanBm?.severity).toBe('warning');
    expect(orphanBm?.repairable).toBe(true);
  });

  it('6. detects orphan widget layouts where the widget instance was deleted', async () => {
    await db.widgetLayouts.put({
      id: 'wl-orphan',
      workspaceId: 'ws-main',
      widgetInstanceId: 'deleted-widget-inst-99',
      breakpoint: 'lg',
      x: 0,
      y: 0,
      w: 4,
      h: 3,
      isDefault: false,
      createdAt: 1000,
      updatedAt: 1000,
    });

    const result = await scanner.scan(db);
    const orphanLayout = result.issues.find((i) => i.category === 'orphan_widget_instance');

    expect(orphanLayout).toBeDefined();
    expect(orphanLayout?.classification).toBe('Recoverable');
    expect(orphanLayout?.severity).toBe('info');
    expect(orphanLayout?.repairable).toBe(true);
  });

  it('7. detects corrupted records with missing required primary keys', async () => {
    // Manually put note with empty id
    await (db.notes as any).put({
      id: '',
      workspaceId: 'ws-main',
      title: 'Corrupted note with blank id',
    });

    const result = await scanner.scan(db);
    const corruptIssue = result.issues.find((i) => i.classification === 'Corrupted');

    expect(corruptIssue).toBeDefined();
    expect(corruptIssue?.severity).toBe('critical');
    expect(corruptIssue?.repairable).toBe(false);
  });
});
