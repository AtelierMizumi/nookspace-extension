import { describe, it, expect, beforeEach } from 'vitest';
import { NookSpaceDB } from '../../../src/services/database/db';
import { LegacyDataScanner } from '../../../src/features/migrations/services/legacyDataScanner';
import { LegacyDataRepairService } from '../../../src/features/migrations/services/legacyDataRepairService';

describe('LegacyDataRepairService Suite — Milestone 9.5', () => {
  let db: NookSpaceDB;
  let scanner: LegacyDataScanner;
  let repairService: LegacyDataRepairService;
  let dbCounter = 0;

  beforeEach(async () => {
    const dbName = `test-repair-db-${Date.now()}-${++dbCounter}`;
    db = new NookSpaceDB(dbName);
    await db.open();
    scanner = new LegacyDataScanner();
    repairService = new LegacyDataRepairService();
  });

  it('1. repairs orphan note without deleting user content or markdown text', async () => {
    await db.workspaces.put({
      id: 'ws-default-personal',
      name: 'Personal Space',
      icon: 'Sparkles',
      color: '#6366f1',
      isDefault: true,
      order: 0,
      createdAt: 1000,
      updatedAt: 1000,
    });

    const markdownProse = '# Architecture Notes\n```typescript\nconst a = 10;\n```\nKeep exact text.';
    await db.notes.put({
      id: 'note-orphan-1',
      workspaceId: 'ws-default-personal',
      collectionId: 'non-existent-col',
      title: 'Original Title',
      content: markdownProse,
      excerpt: 'Original Title',
      isPinned: true,
      isFavorite: true,
      isArchived: false,
      tags: ['rust', 'react'],
      order: 0,
      createdAt: 1000,
      updatedAt: 1000,
    });

    const scanBefore = await scanner.scan(db);
    expect(scanBefore.issues.some((i) => i.category === 'orphan_note_collection')).toBe(true);

    const repairResult = await repairService.repairIssues(scanBefore.issues, db);
    expect(repairResult.repairedCount).toBeGreaterThanOrEqual(1);

    const noteAfter = await db.notes.get('note-orphan-1');
    expect(noteAfter).toBeDefined();
    expect(noteAfter?.collectionId).toBeNull();
    expect(noteAfter?.title).toBe('Original Title');
    expect(noteAfter?.content).toBe(markdownProse);
    expect(noteAfter?.tags).toEqual(['rust', 'react']);
    expect(noteAfter?.isPinned).toBe(true);
    expect(noteAfter?.isFavorite).toBe(true);

    // Rescan should show 0 orphan note issues
    const scanAfter = await scanner.scan(db);
    expect(scanAfter.issues.some((i) => i.category === 'orphan_note_collection')).toBe(false);
  });

  it('2. repairs orphan bookmark by setting groupId to null without deleting bookmark', async () => {
    await db.bookmarks.put({
      id: 'bm-orphan-1',
      workspaceId: 'ws-default-personal',
      groupId: 'deleted-group-xyz',
      title: 'Vite Guide',
      url: 'https://vitejs.dev',
      isFavorite: true,
      order: 0,
      createdAt: 1000,
      updatedAt: 1000,
    });

    const scanBefore = await scanner.scan(db);
    const orphanIssue = scanBefore.issues.find((i) => i.category === 'orphan_bookmark_group');
    expect(orphanIssue).toBeDefined();

    const result = await repairService.repairIssues([orphanIssue!], db);
    expect(result.repairedCount).toBe(1);

    const bmAfter = await db.bookmarks.get('bm-orphan-1');
    expect(bmAfter).toBeDefined();
    expect(bmAfter?.groupId).toBeNull();
    expect(bmAfter?.title).toBe('Vite Guide');
    expect(bmAfter?.url).toBe('https://vitejs.dev');
  });

  it('3. safely removes orphaned widgetLayouts whose widget instance was deleted', async () => {
    await db.widgetLayouts.put({
      id: 'layout-orphan-1',
      workspaceId: 'ws-default-personal',
      widgetInstanceId: 'deleted-widget-99',
      breakpoint: 'lg',
      x: 0,
      y: 0,
      w: 4,
      h: 3,
      isDefault: false,
      createdAt: 1000,
      updatedAt: 1000,
    });

    const scanBefore = await scanner.scan(db);
    const layoutIssue = scanBefore.issues.find((i) => i.category === 'orphan_widget_instance');
    expect(layoutIssue).toBeDefined();

    const result = await repairService.repairIssues([layoutIssue!], db);
    expect(result.repairedCount).toBe(1);

    const layoutAfter = await db.widgetLayouts.get('layout-orphan-1');
    expect(layoutAfter).toBeUndefined();
  });

  it('4. populates missing required schema defaults on legacy notes', async () => {
    await (db.notes as any).put({
      id: 'note-legacy-fields',
      workspaceId: 'ws-default-personal',
      title: 'Legacy Note',
      content: 'Legacy note text',
    });

    const scanBefore = await scanner.scan(db);
    const fieldsIssue = scanBefore.issues.find(
      (i) => i.entityId === 'note-legacy-fields' && i.category === 'missing_required_field'
    );
    expect(fieldsIssue).toBeDefined();

    const result = await repairService.repairIssues([fieldsIssue!], db);
    expect(result.repairedCount).toBe(1);

    const noteAfter = await db.notes.get('note-legacy-fields');
    expect(noteAfter?.isFavorite).toBe(false);
    expect(noteAfter?.isArchived).toBe(false);
    expect(noteAfter?.isPinned).toBe(false);
    expect(noteAfter?.tags).toEqual([]);
    expect(noteAfter?.excerpt).toBe('Legacy note text');
  });

  it('5. safely skips non-repairable corrupted issues', async () => {
    const nonRepairableIssue = {
      id: 'issue-non-repairable',
      category: 'missing_required_field' as const,
      severity: 'critical' as const,
      classification: 'Corrupted' as const,
      table: 'workspaces',
      entityId: 'corrupt-1',
      description: 'Missing id',
      suggestedAction: 'Delete corrupt workspace',
      repairable: false,
    };

    const result = await repairService.repairIssues([nonRepairableIssue], db);
    expect(result.skippedCount).toBe(1);
    expect(result.repairedCount).toBe(0);
    expect(result.details[0]?.status).toBe('skipped');
  });
});
