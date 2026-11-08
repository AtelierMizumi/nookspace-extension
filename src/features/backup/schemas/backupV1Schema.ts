import { z } from 'zod';
import { WorkspaceSchema } from '../../../types/workspaces';
import {
  NoteSchema,
  NoteCollectionSchema,
  NoteTagSchema,
  NoteBookmarkLinkSchema,
} from '../../../types/notes';
import { BookmarkGroupSchema } from '../../../types/bookmarks';
import { TodoEntitySchema } from '../../../services/database/repositories/todoRepository';
import { FocusSessionEntitySchema } from '../../../services/database/repositories/focusSessionRepository';
import { DailyGoalEntitySchema } from '../../../types/dailyGoals';
import {
  WidgetInstanceEntitySchema,
  WidgetLayoutEntitySchema,
  StickyNoteEntitySchema,
  VocabularyEntitySchema,
  ResourceEntitySchema,
  CalendarEventEntitySchema,
  AppSettingsEntitySchema,
  BackupBookmarkEntitySchema,
} from './entitySchemas';
import {
  BACKUP_FORMAT_IDENTIFIER,
  BACKUP_FORMAT_VERSION,
} from '../types/backupTypes';

// ==========================================
// 1. BACKUP METADATA SCHEMA
// ==========================================

export const BackupIntegrityMetadataSchema = z.object({
  algorithm: z.literal('SHA-256'),
  checksum: z.string().regex(/^[0-9a-f]{64}$/i, 'Checksum must be a 64-character hex string'),
});

export const BackupMetadataV1Schema = z.object({
  exportedAt: z.number().int().nonnegative(),
  appVersion: z.string().min(1),
  databaseSchemaVersion: z.number().int().positive(),
  exportType: z.literal('full'),
  itemCounts: z.record(z.number().int().nonnegative()),
  integrity: BackupIntegrityMetadataSchema,
});

// ==========================================
// 2. BACKUP DATA SCHEMA
// ==========================================

export const BackupSettingsDataSchema = z
  .union([
    AppSettingsEntitySchema.nullable(),
    z.array(AppSettingsEntitySchema).transform((arr) => arr[0] || null),
  ])
  .default(null);

export const BackupDataV1Schema = z.object({
  workspaces: z.array(WorkspaceSchema),
  settings: BackupSettingsDataSchema,
  widgetInstances: z.array(WidgetInstanceEntitySchema),
  widgetLayouts: z.array(WidgetLayoutEntitySchema),
  todos: z.array(TodoEntitySchema),
  notes: z.array(NoteSchema),
  noteCollections: z.array(NoteCollectionSchema),
  noteTags: z.array(NoteTagSchema),
  noteBookmarkLinks: z.array(NoteBookmarkLinkSchema),
  bookmarks: z.array(BackupBookmarkEntitySchema),
  bookmarkGroups: z.array(BookmarkGroupSchema),
  focusSessions: z.array(FocusSessionEntitySchema),
  dailyGoals: z.array(DailyGoalEntitySchema),
  stickyNotes: z.array(StickyNoteEntitySchema),
  vocabulary: z.array(VocabularyEntitySchema),
  resources: z.array(ResourceEntitySchema),
  calendarEvents: z.array(CalendarEventEntitySchema),
});

// ==========================================
// 3. ROOT UNIVERSAL BACKUP V1 SCHEMA
// ==========================================

export const NookSpaceUniversalBackupV1Schema = z.object({
  format: z.literal(BACKUP_FORMAT_IDENTIFIER),
  formatVersion: z.literal(BACKUP_FORMAT_VERSION),
  metadata: BackupMetadataV1Schema,
  data: BackupDataV1Schema,
});

export type NookSpaceUniversalBackupV1Parsed = z.infer<typeof NookSpaceUniversalBackupV1Schema>;
