import { describe, it, expect } from 'vitest';
import {
  backupValidationService,
  validateBackup,
} from '../../../src/features/backup/services/backupValidationService';
import { calculateBackupChecksum } from '../../../src/features/backup/services/backupIntegrityService';
import type { NookSpaceUniversalBackupV1 } from '../../../src/features/backup/types/backupTypes';

async function createValidV1Backup(): Promise<NookSpaceUniversalBackupV1> {
  const data = {
    workspaces: [
      {
        id: 'ws-default',
        name: 'Default Workspace',
        icon: 'LayoutGrid',
        order: 0,
        isDefault: true,
        createdAt: 1000,
        updatedAt: 1000,
      },
    ],
    settings: {
      id: 'current_settings' as const,
      theme: 'dark' as const,
      accentColor: '#3b82f6',
      fontFamily: 'Inter',
      fontSize: 'md' as const,
      backgroundType: 'color' as const,
      backgroundValue: '#0f172a',
      widgetOpacity: 90,
      widgetBlur: 10,
      activeWorkspaceId: 'ws-default',
      updatedAt: 1000,
    },
    widgetInstances: [
      {
        id: 'inst-1',
        workspaceId: 'ws-default',
        widgetType: 'clock',
        title: 'Clock',
        config: {},
        isEnabled: true,
        order: 0,
        createdAt: 1000,
        updatedAt: 1000,
      },
    ],
    widgetLayouts: [
      {
        id: 'ws-default_inst-1_lg',
        workspaceId: 'ws-default',
        widgetInstanceId: 'inst-1',
        breakpoint: 'lg' as const,
        x: 0,
        y: 0,
        w: 4,
        h: 4,
        isDefault: true,
        createdAt: 1000,
        updatedAt: 1000,
      },
    ],
    todos: [],
    notes: [],
    noteCollections: [],
    noteTags: [],
    noteBookmarkLinks: [],
    bookmarks: [],
    bookmarkGroups: [],
    focusSessions: [],
    dailyGoals: [],
    stickyNotes: [],
    vocabulary: [],
    resources: [],
    calendarEvents: [],
  };

  const itemCounts: Record<string, number> = {
    workspaces: 1,
    settings: 1,
    widgetInstances: 1,
    widgetLayouts: 1,
    todos: 0,
    notes: 0,
    noteCollections: 0,
    noteTags: 0,
    noteBookmarkLinks: 0,
    bookmarks: 0,
    bookmarkGroups: 0,
    focusSessions: 0,
    dailyGoals: 0,
    stickyNotes: 0,
    vocabulary: 0,
    resources: 0,
    calendarEvents: 0,
  };

  const draft: NookSpaceUniversalBackupV1 = {
    format: 'nookspace-backup',
    formatVersion: 1,
    metadata: {
      exportedAt: 1700000000000,
      appVersion: '0.1.0',
      databaseSchemaVersion: 4,
      exportType: 'full',
      itemCounts,
      integrity: {
        algorithm: 'SHA-256',
        checksum: '0000000000000000000000000000000000000000000000000000000000000000',
      },
    },
    data,
  };

  const checksum = await calculateBackupChecksum(draft);
  draft.metadata.integrity.checksum = checksum;
  return draft;
}

describe('backupValidationService', () => {
  describe('Stage 1: Input Guard & Type Handling', () => {
    it('rejects null or undefined input', async () => {
      const reportNull = await validateBackup(null);
      expect(reportNull.status).toBe('invalid');
      expect(reportNull.isValid).toBe(false);
      expect(reportNull.errors.some((e) => e.code === 'INPUT_NIL')).toBe(true);

      const reportUndefined = await validateBackup(undefined);
      expect(reportUndefined.status).toBe('invalid');
      expect(reportUndefined.errors.some((e) => e.code === 'INPUT_NIL')).toBe(true);
    });

    it('rejects empty string or whitespace string', async () => {
      const reportEmpty = await validateBackup('');
      expect(reportEmpty.status).toBe('invalid');
      expect(reportEmpty.errors.some((e) => e.code === 'INPUT_EMPTY_STRING')).toBe(true);

      const reportWhitespace = await validateBackup('   \n  \t ');
      expect(reportWhitespace.status).toBe('invalid');
      expect(reportWhitespace.errors.some((e) => e.code === 'INPUT_EMPTY_STRING')).toBe(true);
    });

    it('rejects invalid JSON string', async () => {
      const report = await validateBackup('{ invalid json: true,');
      expect(report.status).toBe('invalid');
      expect(report.errors.some((e) => e.code === 'INVALID_JSON_SYNTAX')).toBe(true);
    });

    it('rejects non-object root (JSON arrays, numbers, booleans)', async () => {
      const reportArray = await validateBackup('["some", "array"]');
      expect(reportArray.status).toBe('invalid');
      expect(reportArray.errors.some((e) => e.code === 'ROOT_NOT_AN_OBJECT')).toBe(true);

      const reportNumber = await validateBackup(12345);
      expect(reportNumber.status).toBe('invalid');
      expect(reportNumber.errors.some((e) => e.code === 'UNSUPPORTED_INPUT_TYPE')).toBe(true);
    });

    it('rejects input exceeding hard max size', async () => {
      const hugeString = 'a'.repeat(200);
      const report = await validateBackup(hugeString, { customHardMaxBytes: 100 });
      expect(report.status).toBe('invalid');
      expect(report.errors.some((e) => e.code === 'INPUT_FILE_TOO_LARGE')).toBe(true);
    });

    it('accepts Blob input and parses correctly', async () => {
      const validBackup = await createValidV1Backup();
      const blob = new Blob([JSON.stringify(validBackup)], { type: 'application/json' });
      const report = await validateBackup(blob);
      expect(report.status).toBe('valid');
      expect(report.isValid).toBe(true);
      expect(report.fileSizeBytes).toBeGreaterThan(0);
    });
  });

  describe('Stage 2 & 3: Format and Version Detection', () => {
    it('rejects unrecognized format with unsupported status', async () => {
      const input = {
        format: 'unrecognized-tool-backup',
        formatVersion: 1,
      };
      const report = await validateBackup(input);
      expect(report.status).toBe('unsupported');
      expect(report.isSupported).toBe(false);
      expect(report.errors.some((e) => e.code === 'UNSUPPORTED_FORMAT')).toBe(true);
    });

    it('rejects future format version with unsupported status', async () => {
      const input = {
        format: 'nookspace-backup',
        formatVersion: 2, // future version
      };
      const report = await validateBackup(input);
      expect(report.status).toBe('unsupported');
      expect(report.isSupported).toBe(false);
      expect(report.errors.some((e) => e.code === 'UNSUPPORTED_FUTURE_VERSION')).toBe(true);
    });

    it('rejects non-positive integer format version', async () => {
      const input = {
        format: 'nookspace-backup',
        formatVersion: -1,
      };
      const report = await validateBackup(input);
      expect(report.status).toBe('invalid');
      expect(report.errors.some((e) => e.code === 'INVALID_FORMAT_VERSION')).toBe(true);
    });
  });

  describe('Stage 4: Legacy Format In-Memory Upgrade', () => {
    it('detects and upgrades legacy nookspace-bookmarks v1', async () => {
      const legacyBookmarksBackup = {
        format: 'nookspace-bookmarks',
        version: 1,
        exportedAt: 1700000000000,
        data: {
          workspaceId: 'ws-legacy-bm',
          groups: [
            {
              id: 'grp-1',
              title: 'Work Links',
              order: 0,
              createdAt: 1700000000000,
              updatedAt: 1700000000000,
            },
          ],
          bookmarks: [
            {
              id: 'bm-1',
              groupId: 'grp-1',
              title: 'Google',
              url: 'https://google.com',
              order: 0,
              createdAt: 1700000000000,
              updatedAt: 1700000000000,
            },
          ],
        },
      };

      const report = await validateBackup(legacyBookmarksBackup);
      expect(report.status).toBe('valid');
      expect(report.isValid).toBe(true);
      expect(report.isPartialBackup).toBe(true);
      expect(report.requiresUpgrade).toBe(true);
      expect(report.upgradeApplied).toBe(true);
      expect(report.canonicalBackup).toBeDefined();
      expect(report.canonicalBackup?.format).toBe('nookspace-backup');
      expect(report.canonicalBackup?.formatVersion).toBe(1);
      expect(report.canonicalBackup?.data.bookmarks).toHaveLength(1);
    });

    it('fails when legacy bookmarks backup payload violates schema', async () => {
      const invalidLegacy = {
        format: 'nookspace-bookmarks',
        version: 1,
        exportedAt: 1700000000000,
        data: {
          // missing workspaceId and groups
          bookmarks: 'not an array',
        },
      };

      const report = await validateBackup(invalidLegacy);
      expect(report.status).toBe('invalid');
      expect(report.isValid).toBe(false);
      expect(report.errors.some((e) => e.code === 'LEGACY_BOOKMARKS_SCHEMA_ERROR')).toBe(true);
    });
  });

  describe('Stage 5: Integrity Checksum Verification', () => {
    it('verifies valid checksum on authentic backup', async () => {
      const backup = await createValidV1Backup();
      const report = await validateBackup(backup);
      expect(report.status).toBe('valid');
      expect(report.checksumVerified).toBe(true);
      expect(report.errors).toHaveLength(0);
    });

    it('fails with CHECKSUM_MISMATCH when backup content is tampered with', async () => {
      const backup = await createValidV1Backup();
      // Tamper with data after checksum was generated
      backup.data.workspaces[0].name = 'Tampered Workspace Name';

      const report = await validateBackup(backup);
      expect(report.status).toBe('invalid');
      expect(report.checksumVerified).toBe(false);
      expect(report.errors.some((e) => e.code === 'CHECKSUM_MISMATCH')).toBe(true);
    });

    it('fails with CHECKSUM_MISSING when checksum is blank', async () => {
      const backup = await createValidV1Backup();
      backup.metadata.integrity.checksum = '';

      const report = await validateBackup(backup);
      expect(report.status).toBe('invalid');
      expect(report.checksumVerified).toBe(false);
      expect(report.errors.some((e) => e.code === 'CHECKSUM_MISSING')).toBe(true);
    });

    it('skips checksum verification when skipChecksumVerification option is enabled', async () => {
      const backup = await createValidV1Backup();
      backup.metadata.integrity.checksum = 'tampered-or-invalid-checksum';

      const report = await validateBackup(backup, { skipChecksumVerification: true });
      expect(report.checksumVerified).toBeNull();
      expect(report.errors.some((e) => e.code === 'CHECKSUM_MISMATCH')).toBe(false);
    });
  });

  describe('Stage 6: Schema and Field Validation', () => {
    it('flags schema errors for missing required entity fields', async () => {
      const backup = await createValidV1Backup();
      // Delete required property
      delete (backup.data.workspaces[0] as any).name;
      // Recalculate checksum so checksum check passes and schema check catches it
      backup.metadata.integrity.checksum = await calculateBackupChecksum(backup);

      const report = await validateBackup(backup);
      expect(report.status).toBe('invalid');
      expect(report.errors.some((e) => e.code === 'ENTITY_SCHEMA_ERROR')).toBe(true);
    });

    it('flags metadata schema errors for invalid exportedAt', async () => {
      const backup = await createValidV1Backup();
      (backup.metadata as any).exportedAt = 'not-a-timestamp';
      backup.metadata.integrity.checksum = await calculateBackupChecksum(backup);

      const report = await validateBackup(backup);
      expect(report.status).toBe('invalid');
      expect(report.errors.some((e) => e.code === 'METADATA_SCHEMA_ERROR')).toBe(true);
    });
  });

  describe('Stage 7: Cross-Reference & Domain Integrity Integration', () => {
    it('flags dangerous bookmark URLs in backup', async () => {
      const backup = await createValidV1Backup();
      backup.data.bookmarks.push({
        id: 'bm-bad',
        workspaceId: 'ws-default',
        groupId: null,
        title: 'Dangerous Link',
        url: 'javascript:void(0)',
        isFavorite: false,
        order: 0,
        createdAt: 1000,
        updatedAt: 1000,
      });
      backup.metadata.itemCounts.bookmarks = 1;
      backup.metadata.integrity.checksum = await calculateBackupChecksum(backup);

      const report = await validateBackup(backup);
      expect(report.status).toBe('invalid');
      expect(report.errors.some((e) => e.code === 'DANGEROUS_BOOKMARK_URL_SCHEME')).toBe(true);
    });
  });

  describe('Stage 8: Item Counts Consistency', () => {
    it('produces warning when item counts in metadata differ from array lengths', async () => {
      const backup = await createValidV1Backup();
      backup.metadata.itemCounts.workspaces = 999; // declared 999 but array has 1
      backup.metadata.integrity.checksum = await calculateBackupChecksum(backup);

      const report = await validateBackup(backup);
      expect(report.status).toBe('valid_with_warnings');
      expect(report.isValid).toBe(true);
      expect(report.warnings.some((w) => w.code === 'METADATA_ITEM_COUNT_MISMATCH')).toBe(true);
      expect(report.canonicalBackup).toBeDefined();
    });
  });

  describe('Validation Report & Options', () => {
    it('respects maxErrors limit when collecting multiple errors', async () => {
      const backup = await createValidV1Backup();
      // Introduce multiple invalid entities
      for (let i = 0; i < 50; i++) {
        backup.data.workspaces.push({
          id: `invalid-ws-${i}`,
        } as any);
      }
      backup.metadata.integrity.checksum = await calculateBackupChecksum(backup);

      const report = await validateBackup(backup, { maxErrors: 5 });
      expect(report.errors.length).toBeLessThanOrEqual(5);
    });

    it('measures validation duration in report', async () => {
      const backup = await createValidV1Backup();
      const report = await validateBackup(backup);
      expect(report.validationDurationMs).toBeGreaterThanOrEqual(0);
    });
  });
});
