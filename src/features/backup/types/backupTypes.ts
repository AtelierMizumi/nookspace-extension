import {
  WorkspaceEntity,
  WidgetInstanceEntity,
  WidgetLayoutEntity,
  TodoEntity,
  StickyNoteEntity,
  BookmarkGroupEntity,
  BookmarkEntity,
  VocabularyEntity,
  ResourceEntity,
  FocusSessionEntity,
  DailyGoalEntity,
  CalendarEventEntity,
  AppSettingsEntity,
} from '../../../types/database';

import {
  NoteEntity,
  NoteCollectionEntity,
  NoteTagEntity,
  NoteBookmarkLinkEntity,
} from '../../../types/notes';

export const BACKUP_FORMAT_IDENTIFIER = 'nookspace-backup' as const;
export const BACKUP_FORMAT_VERSION = 1 as const;
export const BACKUP_LARGE_SIZE_WARNING_BYTES = 25 * 1024 * 1024; // 25 MB

export interface BackupIntegrityMetadata {
  algorithm: 'SHA-256';
  checksum: string;
}

export interface BackupMetadataV1 {
  exportedAt: number;
  appVersion: string;
  databaseSchemaVersion: number;
  exportType: 'full';
  itemCounts: Record<string, number>;
  integrity: BackupIntegrityMetadata;
}

export interface BackupDataV1 {
  workspaces: WorkspaceEntity[];
  settings: AppSettingsEntity | null;
  widgetInstances: WidgetInstanceEntity[];
  widgetLayouts: WidgetLayoutEntity[];
  todos: TodoEntity[];
  notes: NoteEntity[];
  noteCollections: NoteCollectionEntity[];
  noteTags: NoteTagEntity[];
  noteBookmarkLinks: NoteBookmarkLinkEntity[];
  bookmarks: BookmarkEntity[];
  bookmarkGroups: BookmarkGroupEntity[];
  focusSessions: FocusSessionEntity[];
  dailyGoals: DailyGoalEntity[];
  stickyNotes: StickyNoteEntity[];
  vocabulary: VocabularyEntity[];
  resources: ResourceEntity[];
  calendarEvents: CalendarEventEntity[];
}

export interface NookSpaceUniversalBackupV1 {
  format: typeof BACKUP_FORMAT_IDENTIFIER;
  formatVersion: typeof BACKUP_FORMAT_VERSION;
  metadata: BackupMetadataV1;
  data: BackupDataV1;
}

export interface BackupExportWarning {
  code: string;
  message: string;
  details?: unknown;
}

export interface BackupExportResult {
  backup: NookSpaceUniversalBackupV1;
  filename: string;
  jsonString: string;
  blob: Blob;
  sizeBytes: number;
  itemCounts: Record<string, number>;
  checksum: string;
  warnings: BackupExportWarning[];
}

export interface BackupExportOptions {
  includeSettings?: boolean;
  appVersionOverride?: string;
}

export class BackupExportError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'BackupExportError';
  }
}

export class BackupSerializationError extends BackupExportError {
  constructor(message: string, public readonly path?: string, cause?: unknown) {
    super(message, cause);
    this.name = 'BackupSerializationError';
  }
}

export class BackupIntegrityError extends BackupExportError {
  constructor(message: string, cause?: unknown) {
    super(message, cause);
    this.name = 'BackupIntegrityError';
  }
}
