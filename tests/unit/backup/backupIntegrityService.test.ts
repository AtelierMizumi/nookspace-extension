import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  canonicalizeValue,
  canonicalJsonStringify,
  computeSha256Hex,
  calculateBackupChecksum,
  verifyBackupChecksum,
  getCanonicalChecksumPayload,
} from '../../../src/features/backup/services/backupIntegrityService';
import {
  NookSpaceUniversalBackupV1,
  BackupIntegrityError,
  BACKUP_FORMAT_IDENTIFIER,
  BACKUP_FORMAT_VERSION,
} from '../../../src/features/backup/types/backupTypes';

function createMockBackup(overrides: Partial<NookSpaceUniversalBackupV1> = {}): NookSpaceUniversalBackupV1 {
  return {
    format: BACKUP_FORMAT_IDENTIFIER,
    formatVersion: BACKUP_FORMAT_VERSION,
    metadata: {
      exportedAt: 1731000000000,
      appVersion: '0.1.0-alpha.41',
      databaseSchemaVersion: 4,
      exportType: 'full',
      itemCounts: { workspaces: 1 },
      integrity: {
        algorithm: 'SHA-256',
        checksum: '',
      },
    },
    data: {
      workspaces: [
        {
          id: 'ws-1',
          name: 'Personal Space',
          icon: 'Sparkles',
          color: '#6366f1',
          isDefault: true,
          order: 0,
          createdAt: 1000,
          updatedAt: 1000,
        },
      ],
      settings: null,
      widgetInstances: [],
      widgetLayouts: [],
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
    },
    ...overrides,
  };
}

describe('Milestone 9.1 — Backup Integrity Service (SHA-256 & Canonicalization)', () => {
  describe('canonicalizeValue & canonicalJsonStringify', () => {
    it('sorts object keys alphabetically regardless of insertion order', () => {
      const objA = { z: 1, a: 2, m: 3 };
      const objB = { a: 2, m: 3, z: 1 };

      const canonA = canonicalJsonStringify(objA);
      const canonB = canonicalJsonStringify(objB);

      expect(canonA).toBe(canonB);
      expect(Object.keys(JSON.parse(canonA))).toEqual(['a', 'm', 'z']);
    });

    it('recursively sorts nested objects and preserves array order', () => {
      const nested = {
        meta: { z: 9, a: 1 },
        items: [{ y: 2, b: 3 }, { x: 4, c: 5 }],
      };
      const canon = canonicalJsonStringify(nested);
      expect(canon).toContain('"a": 1');
      expect(canon).toContain('"b": 3');
    });

    it('omits undefined fields matching standard JSON.stringify semantics', () => {
      const obj = { a: 1, b: undefined, c: null };
      const canon = canonicalJsonStringify(obj);
      expect(JSON.parse(canon)).toEqual({ a: 1, c: null });
    });

    it('throws BackupIntegrityError when circular references are passed', () => {
      const circular: any = { a: 1 };
      circular.self = circular;

      expect(() => canonicalizeValue(circular)).toThrow(BackupIntegrityError);
      expect(() => canonicalizeValue(circular)).toThrow(/Circular reference detected/i);
    });
  });

  describe('computeSha256Hex & Web Crypto', () => {
    it('produces a valid 64-character lowercase hex string for ASCII text', async () => {
      const hash = await computeSha256Hex('hello world');
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
      // SHA-256 of "hello world" is well-known standard
      expect(hash).toBe('b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9');
    });

    it('correctly digests Unicode, Vietnamese, Japanese, and emoji content', async () => {
      const text = 'Xin chào thế giới! こんにちは世界! 🌟🚀 Spaces & Tabs\nLine 2';
      const hash1 = await computeSha256Hex(text);
      const hash2 = await computeSha256Hex(text);

      expect(hash1).toMatch(/^[0-9a-f]{64}$/);
      expect(hash1).toBe(hash2);
    });

    it('throws BackupIntegrityError if crypto.subtle is unavailable', async () => {
      const originalCrypto = globalThis.crypto;
      try {
        // @ts-ignore
        delete globalThis.crypto;
        await expect(computeSha256Hex('test')).rejects.toThrow(BackupIntegrityError);
        await expect(computeSha256Hex('test')).rejects.toThrow(/Web Crypto API/i);
      } finally {
        globalThis.crypto = originalCrypto;
      }
    });
  });

  describe('calculateBackupChecksum & verifyBackupChecksum', () => {
    it('produces identical checksums for identical logical backups regardless of key ordering', async () => {
      const backupA = createMockBackup();
      // Reverse key order in data
      const backupB: NookSpaceUniversalBackupV1 = {
        ...backupA,
        data: {
          calendarEvents: [],
          resources: [],
          vocabulary: [],
          stickyNotes: [],
          dailyGoals: [],
          focusSessions: [],
          bookmarkGroups: [],
          bookmarks: [],
          noteBookmarkLinks: [],
          noteTags: [],
          noteCollections: [],
          notes: [],
          todos: [],
          widgetLayouts: [],
          widgetInstances: [],
          settings: null,
          workspaces: backupA.data.workspaces,
        },
      };

      const checksumA = await calculateBackupChecksum(backupA);
      const checksumB = await calculateBackupChecksum(backupB);

      expect(checksumA).toMatch(/^[0-9a-f]{64}$/);
      expect(checksumA).toBe(checksumB);
    });

    it('produces different checksums when data or metadata changes', async () => {
      const backup1 = createMockBackup();
      const backup2 = createMockBackup({
        metadata: {
          ...backup1.metadata,
          exportedAt: 1732000000000,
        },
      });

      const hash1 = await calculateBackupChecksum(backup1);
      const hash2 = await calculateBackupChecksum(backup2);

      expect(hash1).not.toBe(hash2);
    });

    it('verifies valid checksum and rejects tampered or invalid checksum', async () => {
      const backup = createMockBackup();
      const checksum = await calculateBackupChecksum(backup);

      const validBackup: NookSpaceUniversalBackupV1 = {
        ...backup,
        metadata: {
          ...backup.metadata,
          integrity: {
            algorithm: 'SHA-256',
            checksum,
          },
        },
      };

      const isValid = await verifyBackupChecksum(validBackup);
      expect(isValid).toBe(true);

      // Tampered checksum
      const tamperedChecksumBackup: NookSpaceUniversalBackupV1 = {
        ...validBackup,
        metadata: {
          ...validBackup.metadata,
          integrity: {
            algorithm: 'SHA-256',
            checksum: '0000000000000000000000000000000000000000000000000000000000000000',
          },
        },
      };
      expect(await verifyBackupChecksum(tamperedChecksumBackup)).toBe(false);

      // Tampered data with original checksum
      const tamperedDataBackup: NookSpaceUniversalBackupV1 = {
        ...validBackup,
        data: {
          ...validBackup.data,
          workspaces: [
            {
              ...validBackup.data.workspaces[0],
              name: 'Tampered Name',
            },
          ],
        },
      };
      expect(await verifyBackupChecksum(tamperedDataBackup)).toBe(false);
    });

    it('getCanonicalChecksumPayload excludes checksum by setting it to empty string', () => {
      const backup = createMockBackup();
      backup.metadata.integrity.checksum = 'abc123';

      const canonical = getCanonicalChecksumPayload(backup);
      expect(canonical.metadata.integrity.checksum).toBe('');
      // Original remains unchanged
      expect(backup.metadata.integrity.checksum).toBe('abc123');
    });
  });
});
