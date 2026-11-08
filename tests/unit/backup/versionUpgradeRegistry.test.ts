import { describe, it, expect } from 'vitest';
import {
  VersionUpgradeRegistry,
  versionUpgradeRegistry,
} from '../../../src/features/backup/versioning/versionRegistry';
import { adaptLegacyBookmarksBackup } from '../../../src/features/backup/versioning/adapters/legacyBookmarksAdapter';
import { verifyBackupChecksum } from '../../../src/features/backup/services/backupIntegrityService';
import type { NookSpaceBookmarkBackupV1 } from '../../../src/features/bookmarks/types/bookmarkImportExport';

function deepFreeze<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  Object.freeze(obj);
  for (const key of Object.keys(obj as object)) {
    const prop = (obj as any)[key];
    if (prop !== null && (typeof prop === 'object' || typeof prop === 'function') && !Object.isFrozen(prop)) {
      deepFreeze(prop);
    }
  }
  return obj;
}

function createSampleLegacyBackup(): NookSpaceBookmarkBackupV1 {
  return {
    format: 'nookspace-bookmarks',
    version: 1,
    exportedAt: 1700000000000,
    data: {
      workspaceId: 'ws-legacy-123',
      groups: [
        {
          id: 'grp-dev',
          title: 'Development',
          icon: 'Code',
          color: '#3b82f6',
          order: 0,
          createdAt: 1690000000000,
          updatedAt: 1690000000000,
        },
      ],
      bookmarks: [
        {
          id: 'bm-github',
          groupId: 'grp-dev',
          title: 'GitHub',
          url: 'https://github.com',
          description: 'Code repository',
          isFavorite: true,
          order: 0,
          createdAt: 1690000000000,
          updatedAt: 1690000000000,
        },
        {
          id: 'bm-mdn',
          groupId: 'grp-dev',
          title: 'MDN Web Docs',
          url: 'https://developer.mozilla.org',
          isFavorite: false,
          order: 1,
          createdAt: 1690000000000,
          updatedAt: 1690000000000,
        },
      ],
    },
  };
}

describe('versionUpgradeRegistry', () => {
  it('registers default adapter for nookspace-bookmarks v1', () => {
    expect(versionUpgradeRegistry.hasAdapter('nookspace-bookmarks', 1)).toBe(true);
    const adapter = versionUpgradeRegistry.getAdapter('nookspace-bookmarks', 1);
    expect(adapter).toBeDefined();
    expect(adapter?.sourceFormat).toBe('nookspace-bookmarks');
    expect(adapter?.sourceVersion).toBe(1);
    expect(adapter?.targetFormatVersion).toBe(1);
    expect(adapter?.isPartial).toBe(true);
  });

  it('returns false for unregistered formats or versions', () => {
    expect(versionUpgradeRegistry.hasAdapter('unknown-format', 1)).toBe(false);
    expect(versionUpgradeRegistry.hasAdapter('nookspace-bookmarks', 99)).toBe(false);
  });

  it('identifies canonical format and version', () => {
    expect(versionUpgradeRegistry.isCurrentCanonical('nookspace-backup', 1)).toBe(true);
    expect(versionUpgradeRegistry.isCurrentCanonical('nookspace-backup', 2)).toBe(false);
    expect(versionUpgradeRegistry.isCurrentCanonical('nookspace-bookmarks', 1)).toBe(false);
  });

  it('allows registering custom version adapter', () => {
    const registry = new VersionUpgradeRegistry();
    expect(registry.hasAdapter('custom-format', 1)).toBe(false);

    registry.register({
      sourceFormat: 'custom-format',
      sourceVersion: 1,
      targetFormatVersion: 1,
      isPartial: true,
      upgrade: async () => ({} as any),
    });

    expect(registry.hasAdapter('custom-format', 1)).toBe(true);
  });
});

describe('adaptLegacyBookmarksBackup', () => {
  it('upgrades legacy bookmarks backup to canonical NookSpaceUniversalBackupV1', async () => {
    const legacy = createSampleLegacyBackup();
    const canonical = await adaptLegacyBookmarksBackup(legacy);

    expect(canonical.format).toBe('nookspace-backup');
    expect(canonical.formatVersion).toBe(1);
    expect(canonical.metadata.exportedAt).toBe(1700000000000);
    expect(canonical.metadata.appVersion).toBe('legacy-p6');
    expect(canonical.metadata.databaseSchemaVersion).toBe(3);
    expect(canonical.metadata.itemCounts.workspaces).toBe(1);
    expect(canonical.metadata.itemCounts.bookmarks).toBe(2);
    expect(canonical.metadata.itemCounts.bookmarkGroups).toBe(1);

    // Workspace verification
    expect(canonical.data.workspaces).toHaveLength(1);
    expect(canonical.data.workspaces[0].id).toBe('ws-legacy-123');
    expect(canonical.data.workspaces[0].name).toBe('Imported Bookmarks');
    expect(canonical.data.workspaces[0].isDefault).toBe(true);

    // Groups & Bookmarks containment
    expect(canonical.data.bookmarkGroups).toHaveLength(1);
    expect(canonical.data.bookmarkGroups[0].workspaceId).toBe('ws-legacy-123');
    expect(canonical.data.bookmarkGroups[0].title).toBe('Development');

    expect(canonical.data.bookmarks).toHaveLength(2);
    expect(canonical.data.bookmarks[0].workspaceId).toBe('ws-legacy-123');
    expect(canonical.data.bookmarks[0].title).toBe('GitHub');
    expect(canonical.data.bookmarks[0].isFavorite).toBe(true);
    expect(canonical.data.bookmarks[1].isFavorite).toBe(false);

    // Checksum verification
    const isChecksumValid = await verifyBackupChecksum(canonical);
    expect(isChecksumValid).toBe(true);
  });

  it('synthesizes fallback workspace ID when legacy does not provide one', async () => {
    const legacy = createSampleLegacyBackup();
    delete (legacy.data as any).workspaceId;

    const canonical = await adaptLegacyBookmarksBackup(legacy);
    expect(canonical.data.workspaces[0].id).toBe('ws-imported-bookmarks');
    expect(canonical.data.bookmarkGroups[0].workspaceId).toBe('ws-imported-bookmarks');
    expect(canonical.data.bookmarks[0].workspaceId).toBe('ws-imported-bookmarks');
  });

  it('guarantees immutability: deep-frozen input is never mutated', async () => {
    const legacy = createSampleLegacyBackup();
    deepFreeze(legacy);

    // Should not throw TypeError: Cannot assign to read only property
    await expect(adaptLegacyBookmarksBackup(legacy)).resolves.toBeDefined();
  });

  it('guarantees determinism: running twice produces identical backup and checksum', async () => {
    const legacy = createSampleLegacyBackup();
    const result1 = await adaptLegacyBookmarksBackup(legacy);
    const result2 = await adaptLegacyBookmarksBackup(legacy);

    expect(result1.metadata.integrity.checksum).toBe(result2.metadata.integrity.checksum);
    expect(JSON.stringify(result1)).toBe(JSON.stringify(result2));
  });
});
