import { z } from 'zod';
import { BookmarkEntity, BookmarkGroupEntity } from '../../../types/bookmarks';

// ==========================================
// 1. NOOKSPACE JSON BACKUP SCHEMAS (V1)
// ==========================================

export const BookmarkGroupBackupItemSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(100),
  color: z.string().optional(),
  icon: z.string().optional(),
  order: z.number().int().nonnegative(),
  createdAt: z.number().nonnegative(),
  updatedAt: z.number().nonnegative(),
});

export type BookmarkGroupBackupItem = z.infer<typeof BookmarkGroupBackupItemSchema>;

export const BookmarkBackupItemSchema = z.object({
  id: z.string().min(1),
  groupId: z.string().nullable(),
  title: z.string().min(1).max(200),
  url: z.string().url().max(2048),
  description: z.string().max(1000).optional(),
  iconUrl: z.string().max(2048).optional(),
  customColor: z.string().optional(),
  isFavorite: z.boolean().default(false),
  order: z.number().int().nonnegative(),
  createdAt: z.number().nonnegative(),
  updatedAt: z.number().nonnegative(),
});

export type BookmarkBackupItem = z.infer<typeof BookmarkBackupItemSchema>;

export const NookSpaceBookmarkBackupV1Schema = z.object({
  format: z.literal('nookspace-bookmarks'),
  version: z.literal(1),
  exportedAt: z.number().nonnegative(),
  data: z.object({
    workspaceId: z.string().min(1),
    groups: z.array(BookmarkGroupBackupItemSchema),
    bookmarks: z.array(BookmarkBackupItemSchema),
  }),
});

export type NookSpaceBookmarkBackupV1 = z.infer<typeof NookSpaceBookmarkBackupV1Schema>;

// ==========================================
// 2. PARSED CANDIDATE MODELS (INTERMEDIATE)
// ==========================================

export interface ParsedBookmarkGroup {
  tempId: string;
  title: string;
  color?: string;
  icon?: string;
  order: number;
}

export interface ParsedBookmark {
  tempId: string;
  tempGroupId: string | null;
  title: string;
  url: string;
  description?: string;
  iconUrl?: string;
  customColor?: string;
  isFavorite: boolean;
  order: number;
  isValid: boolean;
  error?: string;
}

// ==========================================
// 3. IMPORT / EXPORT CONFIGURATION & PREVIEW
// ==========================================

export type ImportFormat = 'html' | 'json';
export type ImportMode = 'merge' | 'replace';
export type DuplicatePolicy = 'skip' | 'import' | 'update';
export type FolderConflictPolicy = 'reuse-existing' | 'create-new';

export interface InvalidImportEntry {
  title: string;
  url?: string;
  reason: string;
}

export interface ImportPreview {
  format: ImportFormat;
  sourceFilename: string;
  totalFolders: number;
  totalBookmarks: number;
  validBookmarks: number;
  invalidBookmarks: number;
  rejectedUnsafeUrls: number;
  duplicateBookmarksInFile: number;
  candidateGroups: ParsedBookmarkGroup[];
  candidateBookmarks: ParsedBookmark[];
  invalidEntries: InvalidImportEntry[];
}

export interface ImportPreviewStats {
  expectedAdded: number;
  expectedSkipped: number;
  expectedUpdated: number;
  expectedGroupsCreated: number;
}

export interface ImportExecutionOptions {
  workspaceId: string;
  mode: ImportMode;
  duplicatePolicy: DuplicatePolicy;
  folderConflictPolicy?: FolderConflictPolicy;
}

export interface ImportResult {
  success: boolean;
  mode: ImportMode;
  groupsCreated: number;
  bookmarksCreated: number;
  bookmarksUpdated: number;
  bookmarksSkipped: number;
  error?: string;
}
