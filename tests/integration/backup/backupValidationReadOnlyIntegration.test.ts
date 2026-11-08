import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { NookSpaceDB } from '../../../src/services/database/db';
import { BackupExportService } from '../../../src/features/backup/services/backupExportService';
import { validateBackup } from '../../../src/features/backup/services/backupValidationService';
import type { WorkspaceEntity, BookmarkEntity, BookmarkGroupEntity } from '../../../src/types/database';
import type { NoteEntity, NoteCollectionEntity } from '../../../src/types/notes';

describe('Milestone 9.2 — Database Safety Quality Gate (Read-Only Guarantee)', () => {
  let db: NookSpaceDB;
  const dbName = 'safety-quality-gate-db';

  beforeEach(async () => {
    db = new NookSpaceDB(dbName);

    // Seed database with realistic baseline data
    const now = 1700000000000;
    const ws: WorkspaceEntity = {
      id: 'ws-safety-gate',
      name: 'Safety Workspace',
      icon: 'Shield',
      color: '#10b981',
      isDefault: true,
      order: 0,
      createdAt: now,
      updatedAt: now,
    };

    const group: BookmarkGroupEntity = {
      id: 'grp-safety',
      workspaceId: ws.id,
      title: 'Safety Links',
      order: 0,
      createdAt: now,
      updatedAt: now,
    };

    const bookmark: BookmarkEntity = {
      id: 'bm-safety',
      workspaceId: ws.id,
      groupId: group.id,
      title: 'Docs',
      url: 'https://nookspace.app',
      isFavorite: true,
      order: 0,
      createdAt: now,
      updatedAt: now,
    };

    const collection: NoteCollectionEntity = {
      id: 'col-safety',
      workspaceId: ws.id,
      title: 'Safety Notes',
      color: '#6366f1',
      order: 0,
      createdAt: now,
      updatedAt: now,
    };

    const note: NoteEntity = {
      id: 'note-safety',
      workspaceId: ws.id,
      collectionId: collection.id,
      title: 'Safe Note',
      content: 'This note must never be modified by validation.',
      excerpt: 'This note must never be modified...',
      tags: ['safety'],
      isPinned: true,
      isFavorite: false,
      isArchived: false,
      order: 0,
      createdAt: now,
      updatedAt: now,
    };

    await db.workspaces.add(ws);
    await db.bookmarkGroups.add(group);
    await db.bookmarks.add(bookmark);
    await db.noteCollections.add(collection);
    await db.notes.add(note);
    await db.settings.put({
      id: 'current_settings',
      theme: 'dark',
      accentColor: '#10b981',
      fontFamily: 'Inter',
      fontSize: 'md',
      backgroundType: 'color',
      backgroundValue: '#000000',
      widgetOpacity: 95,
      widgetBlur: 5,
      activeWorkspaceId: ws.id,
      updatedAt: now,
    });
  });

  afterEach(async () => {
    await db.delete();
  });

  it('strictly guarantees 0 database writes across all validation and upgrade scenarios', async () => {
    // 1. Export valid backup to test with
    const exportResult = await new BackupExportService(db).createFullBackup();
    expect(exportResult.backup).toBeDefined();
    const validBackup = exportResult.backup!;

    // 2. Prepare spy observers on ALL Dexie tables and write methods
    const writeMethods = ['add', 'put', 'update', 'delete', 'bulkAdd', 'bulkPut', 'bulkDelete', 'clear'] as const;
    const spies: Array<ReturnType<typeof vi.spyOn>> = [];

    // Collect all Dexie table names
    const tables = [
      db.workspaces,
      db.settings,
      db.widgetInstances,
      db.widgetLayouts,
      db.todos,
      db.notes,
      db.noteCollections,
      db.noteTags,
      db.noteBookmarkLinks,
      db.bookmarks,
      db.bookmarkGroups,
      db.focusSessions,
      db.dailyGoals,
      db.stickyNotes,
      db.vocabulary,
      db.resources,
      db.calendarEvents,
    ];

    tables.forEach((table) => {
      writeMethods.forEach((method) => {
        if (typeof (table as any)[method] === 'function') {
          spies.push(vi.spyOn(table as any, method));
        }
      });
    });

    // Capture initial database state
    const initialCounts = {
      workspaces: await db.workspaces.count(),
      bookmarks: await db.bookmarks.count(),
      bookmarkGroups: await db.bookmarkGroups.count(),
      notes: await db.notes.count(),
      noteCollections: await db.noteCollections.count(),
      settings: await db.settings.count(),
    };

    // Scenario A: Validate authentic valid backup
    const reportValid = await validateBackup(validBackup);
    expect(reportValid.status).toBe('valid');
    expect(reportValid.isValid).toBe(true);

    // Scenario B: Validate tampered backup
    const tamperedBackup = JSON.parse(JSON.stringify(validBackup));
    tamperedBackup.data.workspaces[0].name = 'Tampered Workspace Name';
    const reportTampered = await validateBackup(tamperedBackup);
    expect(reportTampered.status).toBe('invalid');

    // Scenario C: Validate legacy bookmark backup (requires in-memory upgrade)
    const legacyBackup = {
      format: 'nookspace-bookmarks',
      version: 1,
      exportedAt: 1700000000000,
      data: {
        workspaceId: 'ws-legacy',
        groups: [
          {
            id: 'grp-legacy',
            title: 'Legacy Group',
            order: 0,
            createdAt: 1700000000000,
            updatedAt: 1700000000000,
          },
        ],
        bookmarks: [
          {
            id: 'bm-legacy',
            groupId: 'grp-legacy',
            title: 'Legacy BM',
            url: 'https://example.com',
            order: 0,
            createdAt: 1700000000000,
            updatedAt: 1700000000000,
          },
        ],
      },
    };
    const reportLegacy = await validateBackup(legacyBackup);
    expect(reportLegacy.isValid).toBe(true);
    expect(reportLegacy.upgradeApplied).toBe(true);

    // Scenario D: Validate severely corrupted / invalid JSON
    const reportCorrupt = await validateBackup('{ invalid json syntax }');
    expect(reportCorrupt.status).toBe('invalid');

    // Scenario E: Validate cross-reference violation backup
    const crossRefBad = JSON.parse(JSON.stringify(validBackup));
    crossRefBad.data.bookmarks.push({
      id: 'bm-orphan',
      workspaceId: 'ws-non-existent-ghost',
      groupId: null,
      title: 'Orphan',
      url: 'https://orphan.test',
      isFavorite: false,
      order: 0,
      createdAt: 1000,
      updatedAt: 1000,
    });
    crossRefBad.metadata.itemCounts.bookmarks += 1;
    const reportCrossRef = await validateBackup(crossRefBad, { skipChecksumVerification: true });
    expect(reportCrossRef.status).toBe('invalid');

    // VERIFICATION: Check all spies have 0 calls
    spies.forEach((spy) => {
      expect(spy).not.toHaveBeenCalled();
    });

    // VERIFICATION: Compare post-validation database counts and entities
    const postCounts = {
      workspaces: await db.workspaces.count(),
      bookmarks: await db.bookmarks.count(),
      bookmarkGroups: await db.bookmarkGroups.count(),
      notes: await db.notes.count(),
      noteCollections: await db.noteCollections.count(),
      settings: await db.settings.count(),
    };

    expect(postCounts).toEqual(initialCounts);

    // Verify entity data unmodified
    const ws = await db.workspaces.get('ws-safety-gate');
    expect(ws?.name).toBe('Safety Workspace');
    const note = await db.notes.get('note-safety');
    expect(note?.content).toBe('This note must never be modified by validation.');
  });
});
