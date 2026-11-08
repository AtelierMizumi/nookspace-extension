import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NookSpaceDB } from '../../../src/services/database/db';
import { NookSpaceRecoveryDB } from '../../../src/features/backup/recovery/recoveryDatabase';
import { MergePlannerService } from '../../../src/features/backup/services/mergePlannerService';
import { MergeEngineService } from '../../../src/features/backup/services/mergeEngineService';
import { NookSpaceUniversalBackupV1 } from '../../../src/features/backup/types/backupTypes';

describe('Milestone 9.4 — Merge Performance & Scale Benchmarks', () => {
  let db: NookSpaceDB;
  let recoveryDb: NookSpaceRecoveryDB;
  let planner: MergePlannerService;
  let engine: MergeEngineService;

  beforeEach(async () => {
    db = new NookSpaceDB('TestMergePerfDB_' + Date.now());
    await db.open();

    recoveryDb = new NookSpaceRecoveryDB('TestMergePerfRecDB_' + Date.now());
    await recoveryDb.open();

    // Seed default workspace
    await db.workspaces.put({
      id: 'ws-perf-default',
      name: 'Default Perf Workspace',
      icon: 'Home',
      color: '#6366f1',
      order: 0,
      isDefault: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    planner = new MergePlannerService(db);
    engine = new MergeEngineService(db, recoveryDb);
  });

  afterEach(async () => {
    await db.delete();
    await recoveryDb.delete();
  });

  const generateBenchmarkBackup = (counts: {
    bookmarks: number;
    notes: number;
    todos: number;
  }): NookSpaceUniversalBackupV1 => {
    const now = Date.now();
    const bookmarks = Array.from({ length: counts.bookmarks }, (_, i) => ({
      id: `bm-bench-${i}`,
      workspaceId: 'ws-source',
      groupId: null,
      title: `Bookmark ${i}`,
      url: `https://example.com/item/${i}`,
      isFavorite: i % 5 === 0,
      order: i,
      createdAt: now,
      updatedAt: now,
    }));

    const notes = Array.from({ length: counts.notes }, (_, i) => ({
      id: `note-bench-${i}`,
      workspaceId: 'ws-source',
      collectionId: null,
      title: `Note ${i}`,
      content: `Content body for note ${i} with markdown text.`,
      excerpt: `Excerpt ${i}`,
      tags: ['benchmark', 'test'],
      isPinned: i % 10 === 0,
      isFavorite: false,
      isArchived: false,
      order: i,
      createdAt: now,
      updatedAt: now,
    }));

    const todos = Array.from({ length: counts.todos }, (_, i) => ({
      id: `todo-bench-${i}`,
      workspaceId: 'ws-source',
      title: `Task ${i}`,
      completed: i % 2 === 0,
      priority: 'medium' as const,
      order: i,
      createdAt: now,
      updatedAt: now,
    }));

    return {
      format: 'nookspace-backup',
      formatVersion: 1,
      metadata: {
        exportedAt: 1700000000000,
        appVersion: '0.1.0',
        databaseSchemaVersion: 4,
        exportType: 'full' as const,
        itemCounts: {
          workspaces: 1,
          bookmarks: counts.bookmarks,
          notes: counts.notes,
          todos: counts.todos,
        },
        integrity: {
          algorithm: 'SHA-256' as const,
          checksum: 'a'.repeat(64),
        },
      },
      data: {
        workspaces: [
          {
            id: 'ws-source',
            name: 'Source Benchmark Workspace',
            icon: 'Home',
            color: '#6366f1',
            order: 0,
            isDefault: true,
            createdAt: now,
            updatedAt: now,
          },
        ],
        settings: null,
        widgetInstances: [],
        widgetLayouts: [],
        todos,
        notes,
        noteCollections: [],
        noteTags: [],
        noteBookmarkLinks: [],
        bookmarks,
        bookmarkGroups: [],
        focusSessions: [],
        dailyGoals: [],
        stickyNotes: [],
        vocabulary: [],
        resources: [],
        calendarEvents: [],
      },
    };
  };

  it('Small Dataset Benchmark: ~100 entities merge preview & apply', async () => {
    const backup = generateBenchmarkBackup({ bookmarks: 50, notes: 30, todos: 20 });
    const options = {
      selectedGroups: ['bookmarks', 'notes', 'tasks'] as any,
      targetWorkspaceId: 'ws-perf-default',
      skipChecksumVerification: true,
    };

    const previewStart = performance.now();
    const preview = await planner.generatePreview(backup, options);
    const previewDuration = performance.now() - previewStart;

    const plan = await planner.buildMergePlan(preview, backup, options);

    const applyStart = performance.now();
    const result = await engine.executeMerge(plan, options);
    const applyDuration = performance.now() - applyStart;

    console.log(
      `[Small Merge Benchmark] 100 entities — Preview: ${previewDuration.toFixed(2)} ms, Apply: ${applyDuration.toFixed(2)} ms`
    );

    expect(result.success).toBe(true);
    expect(previewDuration).toBeLessThan(500);
    expect(applyDuration).toBeLessThan(1000);

    const totalNotes = await db.notes.count();
    const totalBookmarks = await db.bookmarks.count();
    const totalTodos = await db.todos.count();
    expect(totalNotes).toBe(30);
    expect(totalBookmarks).toBe(50);
    expect(totalTodos).toBe(20);
  });

  it('Medium Dataset Benchmark: ~1,000 entities merge preview & apply', async () => {
    const backup = generateBenchmarkBackup({ bookmarks: 500, notes: 300, todos: 200 });
    const options = {
      selectedGroups: ['bookmarks', 'notes', 'tasks'] as any,
      targetWorkspaceId: 'ws-perf-default',
      skipChecksumVerification: true,
    };

    const previewStart = performance.now();
    const preview = await planner.generatePreview(backup, options);
    const previewDuration = performance.now() - previewStart;

    const plan = await planner.buildMergePlan(preview, backup, options);

    const applyStart = performance.now();
    const result = await engine.executeMerge(plan, options);
    const applyDuration = performance.now() - applyStart;

    console.log(
      `[Medium Merge Benchmark] 1,000 entities — Preview: ${previewDuration.toFixed(2)} ms, Apply: ${applyDuration.toFixed(2)} ms`
    );

    expect(result.success).toBe(true);
    expect(previewDuration).toBeLessThan(2000);
    expect(applyDuration).toBeLessThan(2500);
  });

  it('Large Scale Dataset Benchmark: ~10,000 entities merge preview & apply', async () => {
    const backup = generateBenchmarkBackup({ bookmarks: 5000, notes: 3000, todos: 2000 });
    const options = {
      selectedGroups: ['bookmarks', 'notes', 'tasks'] as any,
      targetWorkspaceId: 'ws-perf-default',
      skipChecksumVerification: true,
    };

    const previewStart = performance.now();
    const preview = await planner.generatePreview(backup, options);
    const previewDuration = performance.now() - previewStart;

    const plan = await planner.buildMergePlan(preview, backup, options);

    const applyStart = performance.now();
    const result = await engine.executeMerge(plan, options);
    const applyDuration = performance.now() - applyStart;

    console.log(
      `[Large Scale Merge Benchmark] 10,000 entities — Preview: ${previewDuration.toFixed(2)} ms, Apply: ${applyDuration.toFixed(2)} ms`
    );

    expect(result.success).toBe(true);
    expect(previewDuration).toBeLessThan(4000);
    expect(applyDuration).toBeLessThan(5000);
  }, 15000);
});
