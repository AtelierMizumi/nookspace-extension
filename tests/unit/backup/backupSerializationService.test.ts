import { describe, it, expect } from 'vitest';
import {
  validateSerializable,
  serializeBackupToJson,
} from '../../../src/features/backup/services/backupSerializationService';
import {
  BackupSerializationError,
  NookSpaceUniversalBackupV1,
  BACKUP_FORMAT_IDENTIFIER,
  BACKUP_FORMAT_VERSION,
} from '../../../src/features/backup/types/backupTypes';

function createMinimalBackup(): NookSpaceUniversalBackupV1 {
  return {
    format: BACKUP_FORMAT_IDENTIFIER,
    formatVersion: BACKUP_FORMAT_VERSION,
    metadata: {
      exportedAt: 1000,
      appVersion: '0.1.0-alpha.41',
      databaseSchemaVersion: 4,
      exportType: 'full',
      itemCounts: {},
      integrity: {
        algorithm: 'SHA-256',
        checksum: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      },
    },
    data: {
      workspaces: [],
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
  };
}

describe('Milestone 9.1 — Backup Serialization Service', () => {
  describe('validateSerializable', () => {
    it('accepts valid primitives, nested plain objects, arrays, null, and undefined', () => {
      const valid = {
        str: 'Xin chào / こんにちは',
        num: 42,
        zero: 0,
        neg: -10.5,
        bool: true,
        nul: null,
        und: undefined,
        arr: [1, 'two', { three: true }],
        nested: { a: { b: { c: 'deep' } } },
      };

      expect(() => validateSerializable(valid)).not.toThrow();
    });

    it('rejects BigInt with descriptive path error', () => {
      const invalid = {
        data: {
          items: [{ amount: BigInt(100) }],
        },
      };

      expect(() => validateSerializable(invalid)).toThrow(BackupSerializationError);
      expect(() => validateSerializable(invalid)).toThrow(/Unsupported BigInt value encountered at "\$\.data\.items\[0\]\.amount"/);
    });

    it('rejects functions with descriptive path error', () => {
      const invalid = {
        config: {
          onClick: () => {},
        },
      };

      expect(() => validateSerializable(invalid)).toThrow(BackupSerializationError);
      expect(() => validateSerializable(invalid)).toThrow(/Unsupported function encountered at "\$\.config\.onClick"/);
    });

    it('rejects Symbols with descriptive path error', () => {
      const invalid = {
        key: Symbol('test'),
      };

      expect(() => validateSerializable(invalid)).toThrow(BackupSerializationError);
      expect(() => validateSerializable(invalid)).toThrow(/Unsupported Symbol value encountered at "\$\.key"/);
    });

    it('rejects NaN, Infinity, and -Infinity numbers', () => {
      expect(() => validateSerializable({ val: NaN })).toThrow(/Non-finite number \(NaN\)/);
      expect(() => validateSerializable({ val: Infinity })).toThrow(/Non-finite number \(Infinity\)/);
      expect(() => validateSerializable({ val: -Infinity })).toThrow(/Non-finite number \(-Infinity\)/);
    });

    it('detects circular object references safely', () => {
      const circular: any = { name: 'Root' };
      circular.child = { parent: circular };

      expect(() => validateSerializable(circular)).toThrow(BackupSerializationError);
      expect(() => validateSerializable(circular)).toThrow(/Circular reference detected/);
    });

    it('rejects non-plain object instances such as Map or Set or RegExp', () => {
      expect(() => validateSerializable({ tags: new Set(['a', 'b']) })).toThrow(/Unsupported non-plain object type "Set"/);
      expect(() => validateSerializable({ dict: new Map() })).toThrow(/Unsupported non-plain object type "Map"/);
      expect(() => validateSerializable({ regex: /abc/ })).toThrow(/Unsupported non-plain object type "RegExp"/);
    });
  });

  describe('serializeBackupToJson', () => {
    it('produces formatted JSON with 2-space indentation', () => {
      const backup = createMinimalBackup();
      const json = serializeBackupToJson(backup);

      expect(json).toContain('{\n  "format": "nookspace-backup",');
      expect(JSON.parse(json)).toEqual(backup);
    });

    it('faithfully preserves Unicode strings, emoji, and Markdown syntax', () => {
      const backup = createMinimalBackup();
      backup.data.notes = [
        {
          id: 'note-1',
          workspaceId: 'ws-1',
          collectionId: null,
          title: 'Ghi chú tiếng Việt & 日本語のメモ 📝',
          content: '# Header 1\n- [x] Task completed\n`code block`\n\n```ts\nconst x = 1;\n```',
          excerpt: 'Ghi chú...',
          isPinned: true,
          isFavorite: false,
          isArchived: false,
          tags: ['tiếng-việt', 'work'],
          order: 0,
          createdAt: 1000,
          updatedAt: 1000,
        },
      ];

      const json = serializeBackupToJson(backup);
      const parsed = JSON.parse(json);

      expect(parsed.data.notes[0].title).toBe('Ghi chú tiếng Việt & 日本語のメモ 📝');
      expect(parsed.data.notes[0].content).toContain('# Header 1\n- [x] Task completed');
    });

    it('fails explicitly when invalid data is present inside the backup tree', () => {
      const backup = createMinimalBackup();
      (backup.data.workspaces as any) = [{ id: 'ws-1', fn: () => {} }];

      expect(() => serializeBackupToJson(backup)).toThrow(BackupSerializationError);
    });
  });
});
