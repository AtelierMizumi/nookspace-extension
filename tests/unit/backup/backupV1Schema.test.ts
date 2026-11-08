import { describe, it, expect } from 'vitest';
import {
  NookSpaceUniversalBackupV1Schema,
  BackupMetadataV1Schema,
  BackupDataV1Schema,
} from '../../../src/features/backup/schemas/backupV1Schema';
import {
  StickyNoteEntitySchema,
  VocabularyEntitySchema,
  ResourceEntitySchema,
  CalendarEventEntitySchema,
  AppSettingsEntitySchema,
  WidgetLayoutEntitySchema,
  WidgetInstanceEntitySchema,
} from '../../../src/features/backup/schemas/entitySchemas';
import {
  BACKUP_FORMAT_IDENTIFIER,
  BACKUP_FORMAT_VERSION,
} from '../../../src/features/backup/types/backupTypes';

describe('Milestone 9.1 — Backup V1 Zod Schemas', () => {
  describe('Entity Schemas', () => {
    it('validates StickyNoteEntitySchema correctly', () => {
      const valid = {
        id: 'sn-1',
        workspaceId: 'ws-1',
        content: 'Remember to commit!',
        color: '#fbbf24',
        x: 10,
        y: 20,
        width: 200,
        height: 150,
        zIndex: 1,
        createdAt: 1000,
        updatedAt: 1000,
      };
      expect(StickyNoteEntitySchema.parse(valid)).toEqual(valid);

      expect(() => StickyNoteEntitySchema.parse({ ...valid, color: 'not-hex' })).toThrow();
      expect(() => StickyNoteEntitySchema.parse({ ...valid, width: -5 })).toThrow();
    });

    it('validates VocabularyEntitySchema correctly', () => {
      const valid = {
        id: 'voc-1',
        workspaceId: 'ws-1',
        word: 'Komorebi',
        reading: '木漏れ日',
        meaning: 'Sunlight filtering through trees',
        category: 'Japanese',
        status: 'learning',
        createdAt: 1000,
        updatedAt: 1000,
      };
      expect(VocabularyEntitySchema.parse(valid)).toEqual(valid);

      expect(() => VocabularyEntitySchema.parse({ ...valid, status: 'invalid-status' })).toThrow();
    });

    it('validates ResourceEntitySchema correctly', () => {
      const valid = {
        id: 'res-1',
        workspaceId: 'ws-1',
        title: 'React Documentation',
        url: 'https://react.dev',
        category: 'Development',
        tags: ['frontend', 'react'],
        isPinned: true,
        createdAt: 1000,
        updatedAt: 1000,
      };
      expect(ResourceEntitySchema.parse(valid)).toEqual(valid);

      expect(() => ResourceEntitySchema.parse({ ...valid, title: '' })).toThrow();
      expect(() => ResourceEntitySchema.parse({ ...valid, url: '' })).toThrow();
    });

    it('validates CalendarEventEntitySchema and enforces endDate >= startDate', () => {
      const valid = {
        id: 'evt-1',
        workspaceId: 'ws-1',
        title: 'Sprint Planning',
        startDate: 1000,
        endDate: 2000,
        isAllDay: false,
        createdAt: 1000,
        updatedAt: 1000,
      };
      expect(CalendarEventEntitySchema.parse(valid)).toEqual(valid);

      expect(() =>
        CalendarEventEntitySchema.parse({ ...valid, startDate: 2000, endDate: 1000 })
      ).toThrow(/endDate cannot be earlier than startDate/);
    });

    it('validates AppSettingsEntitySchema correctly', () => {
      const valid = {
        id: 'current_settings',
        theme: 'dark',
        accentColor: '#6366f1',
        fontFamily: 'Inter',
        fontSize: 'md',
        backgroundType: 'color',
        backgroundValue: '#09090b',
        widgetOpacity: 90,
        widgetBlur: 10,
        activeWorkspaceId: 'ws-default',
        updatedAt: 1000,
      };
      expect(AppSettingsEntitySchema.parse(valid)).toEqual(valid);

      expect(() => AppSettingsEntitySchema.parse({ ...valid, id: 'wrong_id' })).toThrow();
      expect(() => AppSettingsEntitySchema.parse({ ...valid, widgetOpacity: 150 })).toThrow();
    });

    it('validates WidgetLayoutEntitySchema and WidgetInstanceEntitySchema', () => {
      const validLayout = {
        id: 'ws-1_wi-1_lg',
        workspaceId: 'ws-1',
        widgetInstanceId: 'wi-1',
        breakpoint: 'lg',
        x: 0,
        y: 0,
        w: 4,
        h: 3,
        isDefault: true,
        createdAt: 1000,
        updatedAt: 1000,
      };
      expect(WidgetLayoutEntitySchema.parse(validLayout)).toEqual(validLayout);

      const validInstance = {
        id: 'wi-1',
        workspaceId: 'ws-1',
        widgetType: 'clock',
        config: { showSeconds: true },
        isEnabled: true,
        order: 0,
        createdAt: 1000,
        updatedAt: 1000,
      };
      expect(WidgetInstanceEntitySchema.parse(validInstance)).toEqual(validInstance);
    });
  });

  describe('NookSpaceUniversalBackupV1Schema', () => {
    it('validates a complete, valid full backup structure', () => {
      const validEnvelope = {
        format: BACKUP_FORMAT_IDENTIFIER,
        formatVersion: BACKUP_FORMAT_VERSION,
        metadata: {
          exportedAt: 1731000000000,
          appVersion: '0.1.0-alpha.41',
          databaseSchemaVersion: 4,
          exportType: 'full',
          itemCounts: { workspaces: 1, todos: 0 },
          integrity: {
            algorithm: 'SHA-256',
            checksum: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
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
      };

      const parsed = NookSpaceUniversalBackupV1Schema.parse(validEnvelope);
      expect(parsed.format).toBe('nookspace-backup');
      expect(parsed.formatVersion).toBe(1);
      expect(parsed.data.workspaces.length).toBe(1);
    });

    it('rejects invalid format or version', () => {
      const invalid = {
        format: 'wrong-format',
        formatVersion: 2,
        metadata: {},
        data: {},
      };
      expect(() => NookSpaceUniversalBackupV1Schema.parse(invalid)).toThrow();
    });

    it('rejects checksum with invalid length or non-hex characters', () => {
      const invalidMeta = {
        exportedAt: 1000,
        appVersion: '0.1.0',
        databaseSchemaVersion: 4,
        exportType: 'full',
        itemCounts: {},
        integrity: {
          algorithm: 'SHA-256',
          checksum: 'not-a-valid-sha-256-hash',
        },
      };
      expect(() => BackupMetadataV1Schema.parse(invalidMeta)).toThrow(/Checksum must be a 64-character hex string/);
    });
  });
});
