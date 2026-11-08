import { describe, it, expect, beforeEach } from 'vitest';
import { NookSpaceDB } from '../../../src/services/database/db';
import { NookSpaceRecoveryDB } from '../../../src/features/backup/recovery/recoveryDatabase';
import { LegacyDataScanner } from '../../../src/features/migrations/services/legacyDataScanner';
import { LegacyDataRepairService } from '../../../src/features/migrations/services/legacyDataRepairService';
import { MigrationEngine } from '../../../src/features/migrations/services/migrationEngine';
import { MigrationRegistry } from '../../../src/features/migrations/registry/migrationRegistry';
import { MigrationJournalService } from '../../../src/features/migrations/journal/migrationJournalService';
import { registerDefaultMigrations } from '../../../src/features/migrations/definitions/defaultMigrations';

describe('Migration & Scanner Performance Benchmarks — Milestone 9.5', () => {
  let dbCounter = 0;
  const getNextDbName = () => `test-mig-perf-${Date.now()}-${++dbCounter}`;

  it('Small Dataset Benchmark: ~100 entities scan & repair (< 250ms)', async () => {
    const dbName = getNextDbName();
    const db = new NookSpaceDB(dbName);
    await db.open();

    const notes = Array.from({ length: 60 }, (_, i) => ({
      id: `note-s-${i}`,
      workspaceId: 'ws-default-personal',
      collectionId: i % 5 === 0 ? 'orphan-col' : null,
      title: `Note ${i}`,
      content: `Note content ${i}`,
      excerpt: `Note content ${i}`,
      isPinned: false,
      isFavorite: false,
      isArchived: false,
      tags: ['tag1'],
      order: i,
      createdAt: 1000 + i,
      updatedAt: 1000 + i,
    }));

    const bookmarks = Array.from({ length: 40 }, (_, i) => ({
      id: `bm-s-${i}`,
      workspaceId: 'ws-default-personal',
      groupId: i % 5 === 0 ? 'orphan-group' : null,
      title: `Bookmark ${i}`,
      url: `https://example.com/${i}`,
      isFavorite: false,
      order: i,
      createdAt: 1000 + i,
      updatedAt: 1000 + i,
    }));

    await db.notes.bulkPut(notes);
    await db.bookmarks.bulkPut(bookmarks);

    const scanner = new LegacyDataScanner();
    const repairService = new LegacyDataRepairService();

    // Benchmark scan
    const scanStart = performance.now();
    const scanResult = await scanner.scan(db);
    const scanDuration = performance.now() - scanStart;

    // Benchmark repair
    const repairStart = performance.now();
    const repairResult = await repairService.repairIssues(scanResult.issues, db);
    const repairDuration = performance.now() - repairStart;

    console.log(
      `[Small Migration Benchmark] 100 entities — Scan: ${scanDuration.toFixed(2)} ms, Repair: ${repairDuration.toFixed(2)} ms`
    );

    expect(scanResult.summary.totalRecordsScanned).toBeGreaterThanOrEqual(100);
    expect(scanDuration).toBeLessThan(250);
    expect(repairDuration).toBeLessThan(250);
    expect(repairResult.repairedCount).toBeGreaterThan(0);

    db.close();
  });

  it('Medium Dataset Benchmark: ~1,000 entities scan & migration (< 1,000ms)', async () => {
    const dbName = getNextDbName();
    const db = new NookSpaceDB(dbName);
    await db.open();

    const notes = Array.from({ length: 600 }, (_, i) => ({
      id: `note-m-${i}`,
      workspaceId: 'ws-default-personal',
      collectionId: i % 10 === 0 ? 'orphan-col-m' : null,
      title: `Medium Note ${i}`,
      content: `Medium Content ${i}`,
      excerpt: `Medium Content ${i}`,
      isPinned: false,
      isFavorite: false,
      isArchived: false,
      tags: ['perf'],
      order: i,
      createdAt: 1000 + i,
      updatedAt: 1000 + i,
    }));

    const bookmarks = Array.from({ length: 400 }, (_, i) => ({
      id: `bm-m-${i}`,
      workspaceId: 'ws-default-personal',
      groupId: i % 10 === 0 ? 'orphan-grp-m' : null,
      title: `Medium Bookmark ${i}`,
      url: `https://example.com/med/${i}`,
      isFavorite: false,
      order: i,
      createdAt: 1000 + i,
      updatedAt: 1000 + i,
    }));

    await db.notes.bulkPut(notes);
    await db.bookmarks.bulkPut(bookmarks);

    const scanner = new LegacyDataScanner();
    const repairService = new LegacyDataRepairService();

    const scanStart = performance.now();
    const scanResult = await scanner.scan(db);
    const scanDuration = performance.now() - scanStart;

    const repairStart = performance.now();
    const repairResult = await repairService.repairIssues(scanResult.issues, db);
    const repairDuration = performance.now() - repairStart;

    console.log(
      `[Medium Migration Benchmark] 1,000 entities — Scan: ${scanDuration.toFixed(2)} ms, Repair: ${repairDuration.toFixed(2)} ms`
    );

    expect(scanResult.summary.totalRecordsScanned).toBeGreaterThanOrEqual(1000);
    expect(scanDuration).toBeLessThan(1000);
    expect(repairDuration).toBeLessThan(1000);
    expect(repairResult.repairedCount).toBeGreaterThan(0);

    db.close();
  });

  it('Large Dataset Benchmark: ~10,000 entities scan & migration (< 5,000ms)', async () => {
    const dbName = getNextDbName();
    const db = new NookSpaceDB(dbName);
    await db.open();

    const notes = Array.from({ length: 6000 }, (_, i) => ({
      id: `note-l-${i}`,
      workspaceId: 'ws-default-personal',
      collectionId: i % 20 === 0 ? 'orphan-col-l' : null,
      title: `Large Note ${i}`,
      content: `Large Content ${i}`,
      excerpt: `Large Content ${i}`,
      isPinned: false,
      isFavorite: false,
      isArchived: false,
      tags: ['scale'],
      order: i,
      createdAt: 1000 + i,
      updatedAt: 1000 + i,
    }));

    const bookmarks = Array.from({ length: 4000 }, (_, i) => ({
      id: `bm-l-${i}`,
      workspaceId: 'ws-default-personal',
      groupId: i % 20 === 0 ? 'orphan-grp-l' : null,
      title: `Large Bookmark ${i}`,
      url: `https://example.com/large/${i}`,
      isFavorite: false,
      order: i,
      createdAt: 1000 + i,
      updatedAt: 1000 + i,
    }));

    await db.notes.bulkPut(notes);
    await db.bookmarks.bulkPut(bookmarks);

    const scanner = new LegacyDataScanner();
    const repairService = new LegacyDataRepairService();

    const scanStart = performance.now();
    const scanResult = await scanner.scan(db);
    const scanDuration = performance.now() - scanStart;

    const repairStart = performance.now();
    const repairResult = await repairService.repairIssues(scanResult.issues, db);
    const repairDuration = performance.now() - repairStart;

    console.log(
      `[Large Migration Benchmark] 10,000 entities — Scan: ${scanDuration.toFixed(2)} ms, Repair: ${repairDuration.toFixed(2)} ms`
    );

    expect(scanResult.summary.totalRecordsScanned).toBeGreaterThanOrEqual(10000);
    expect(scanDuration).toBeLessThan(5000);
    expect(repairDuration).toBeLessThan(5000);

    db.close();
  });
});
