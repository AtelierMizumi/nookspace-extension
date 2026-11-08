import { NookSpaceDB } from '../../../services/database/db';

export type MigrationType = 'schema' | 'entity' | 'relationship' | 'normalization';

export type MigrationStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'recovery_required'
  | 'skipped';

export interface MigrationStepResult {
  success: boolean;
  recordsProcessed: number;
  recordsModified: number;
  details?: Record<string, unknown>;
  error?: string;
}

export interface MigrationExecutionContext {
  database: NookSpaceDB;
  dryRun?: boolean;
}

export interface MigrationDefinition {
  id: string;
  name: string;
  description: string;
  type: MigrationType;
  version?: number;
  dependencies?: string[];
  execute: (db: NookSpaceDB, context?: MigrationExecutionContext) => Promise<MigrationStepResult>;
  rollback?: (db: NookSpaceDB, context?: MigrationExecutionContext) => Promise<MigrationStepResult>;
  verify?: (db: NookSpaceDB) => Promise<{ valid: boolean; error?: string }>;
}

export interface MigrationJournalRecord {
  migrationId: string;
  name: string;
  type: MigrationType;
  version?: number;
  status: MigrationStatus;
  startedAt: number;
  completedAt?: number;
  durationMs: number;
  recordsProcessed: number;
  recordsModified: number;
  checksum?: string;
  error?: string;
}

export interface MigrationEngineResult {
  status: 'completed' | 'partial' | 'failed' | 'no_op' | 'locked';
  totalMigrations: number;
  executedCount: number;
  skippedCount: number;
  failedCount: number;
  totalRecordsProcessed: number;
  totalRecordsModified: number;
  durationMs: number;
  executedRecords: MigrationJournalRecord[];
  error?: string;
}

export type LegacyClassification =
  | 'Compatible'
  | 'Migratable'
  | 'Recoverable'
  | 'Unsupported'
  | 'Corrupted';

export type LegacyIssueSeverity = 'info' | 'warning' | 'critical';

export type LegacyIssueCategory =
  | 'legacy_todo_widget'
  | 'legacy_quick_notes_widget'
  | 'deprecated_v1_layout'
  | 'orphan_note_collection'
  | 'orphan_bookmark_group'
  | 'orphan_widget_instance'
  | 'invalid_enum_value'
  | 'unknown_fields'
  | 'missing_required_field'
  | 'dangling_relationship';

export interface LegacyIssue {
  id: string;
  category: LegacyIssueCategory;
  severity: LegacyIssueSeverity;
  classification: LegacyClassification;
  table: string;
  entityId: string;
  description: string;
  details?: Record<string, unknown>;
  suggestedAction: string;
  repairable: boolean;
}

export interface LegacyScanSummary {
  totalRecordsScanned: number;
  compatibleCount: number;
  migratableCount: number;
  recoverableCount: number;
  unsupportedCount: number;
  corruptedCount: number;
  criticalCount: number;
  warningCount: number;
  infoCount: number;
}

export interface LegacyScanResult {
  scannedAt: number;
  summary: LegacyScanSummary;
  issues: LegacyIssue[];
}

export interface LegacyRepairActionDetail {
  issueId: string;
  entityId: string;
  table: string;
  status: 'repaired' | 'skipped' | 'failed';
  message: string;
}

export interface LegacyRepairResult {
  issuesProcessed: number;
  repairedCount: number;
  skippedCount: number;
  failedCount: number;
  details: LegacyRepairActionDetail[];
}
