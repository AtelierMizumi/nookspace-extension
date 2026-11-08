import type {
  BackupMetadataV1,
  BackupDataV1,
  NookSpaceUniversalBackupV1,
} from './backupTypes';
import type { ValidationReport } from './validationTypes';
import { z } from 'zod';

export type MergeDataGroup =
  | 'workspaces'
  | 'dashboard'
  | 'tasks'
  | 'notes'
  | 'bookmarks'
  | 'productivity'
  | 'personalData'
  | 'settings';

export const MERGE_DATA_GROUPS: MergeDataGroup[] = [
  'workspaces',
  'dashboard',
  'tasks',
  'notes',
  'bookmarks',
  'productivity',
  'personalData',
  'settings',
];

export const DATA_GROUP_TABLE_MAP: Record<MergeDataGroup, string[]> = {
  workspaces: ['workspaces'],
  dashboard: ['widgetInstances', 'widgetLayouts'],
  tasks: ['todos'],
  notes: ['notes', 'noteCollections', 'noteTags', 'noteBookmarkLinks'],
  bookmarks: ['bookmarks', 'bookmarkGroups'],
  productivity: ['focusSessions', 'dailyGoals'],
  personalData: ['stickyNotes', 'vocabulary', 'resources', 'calendarEvents'],
  settings: ['settings'],
};

export type MergeConflictPolicy =
  | 'skip'
  | 'import_as_new'
  | 'keep_existing'
  | 'replace_existing';

export type ConflictCategory =
  | 'id_collision'
  | 'duplicate_content'
  | 'workspace_conflict'
  | 'missing_parent_reference'
  | 'url_conflict'
  | 'settings_conflict';

export interface MergeConflict {
  id: string; // unique conflict id
  category: ConflictCategory;
  entityType: string;
  sourceId: string;
  existingId?: string;
  title: string;
  description: string;
  availablePolicies: MergeConflictPolicy[];
  defaultPolicy: MergeConflictPolicy;
  selectedPolicy: MergeConflictPolicy;
}

export interface MergeImportOptions {
  selectedGroups: MergeDataGroup[];
  targetWorkspaceId?: string; // If set, all workspace-scoped entities go into this workspace
  createNewWorkspaceForImport?: boolean; // If true, creates a new workspace for incoming workspace-scoped items
  newWorkspaceName?: string;
  defaultConflictPolicy?: MergeConflictPolicy;
  customConflictResolutions?: Record<string, MergeConflictPolicy>; // conflict.id -> policy
  preserveSettings?: boolean; // default true
  skipChecksumVerification?: boolean;
}

export const MergeImportOptionsSchema = z.object({
  selectedGroups: z.array(z.enum([
    'workspaces',
    'dashboard',
    'tasks',
    'notes',
    'bookmarks',
    'productivity',
    'personalData',
    'settings',
  ])).min(1, 'At least one data group must be selected'),
  targetWorkspaceId: z.string().optional(),
  createNewWorkspaceForImport: z.boolean().optional(),
  newWorkspaceName: z.string().optional(),
  defaultConflictPolicy: z.enum(['skip', 'import_as_new', 'keep_existing', 'replace_existing']).optional(),
  customConflictResolutions: z.record(z.enum(['skip', 'import_as_new', 'keep_existing', 'replace_existing'])).optional(),
  preserveSettings: z.boolean().default(true),
  skipChecksumVerification: z.boolean().default(false),
});

export interface MergeImportPreview {
  backupMetadata: BackupMetadataV1;
  selectedGroups: MergeDataGroup[];
  targetWorkspaceMode: 'into_existing' | 'create_new' | 'preserve_source';
  targetWorkspaceId?: string;
  targetWorkspaceName?: string;
  incomingCounts: Record<string, number>;
  existingCounts: Record<string, number>;
  newEntitiesCount: number;
  duplicateCount: number;
  idCollisionCount: number;
  conflicts: MergeConflict[];
  warnings: string[];
  missingDependencies: Array<{
    group: MergeDataGroup;
    dependsOn: MergeDataGroup;
    description: string;
  }>;
  planToken: string; // Deterministic hash of DB state + options for stale check
}

export interface MergeImportPlan {
  planId: string;
  planToken: string;
  createdAt: number;
  selectedGroups: MergeDataGroup[];
  targetWorkspaceId?: string;
  recordsToInsert: Record<string, unknown[]>;
  recordsToUpdate: Record<string, unknown[]>;
  skippedEntityIds: string[];
  idMappings: Record<string, Record<string, string>>; // table -> (sourceId -> targetId)
  summary: {
    toInsertCount: number;
    toUpdateCount: number;
    skippedCount: number;
    conflictsResolvedCount: number;
  };
}

export interface MergeImportProgress {
  stage:
    | 'idle'
    | 'validating'
    | 'analyzing'
    | 'building_plan'
    | 'applying_transaction'
    | 'verifying'
    | 'completed'
    | 'failed';
  message: string;
  percent?: number;
  timestamp: number;
}

export type MergeImportErrorCode =
  | 'MERGE_VALIDATION_FAILED'
  | 'MERGE_LOCK_CONFLICT'
  | 'MERGE_STALE_PLAN'
  | 'MERGE_WORKSPACE_NOT_FOUND'
  | 'MERGE_DEPENDENCY_ERROR'
  | 'MERGE_TRANSACTION_FAILED'
  | 'MERGE_POST_VERIFICATION_FAILED'
  | 'MERGE_ABORTED';

export interface MergeImportError {
  code: MergeImportErrorCode;
  message: string;
  technicalDetails?: string;
  isRecoverable: boolean;
}

export interface MergeImportResult {
  success: boolean;
  operationId: string;
  planId: string;
  insertedCounts: Record<string, number>;
  updatedCounts: Record<string, number>;
  skippedCount: number;
  conflictsResolvedCount: number;
  durationMs: number;
  warnings: string[];
  error?: MergeImportError;
}
