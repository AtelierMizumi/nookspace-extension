import { NookSpaceUniversalBackupV1 } from './backupTypes';

export type ValidationStatus =
  | 'valid'
  | 'valid_with_warnings'
  | 'invalid'
  | 'unsupported';

export type IssueSeverity = 'error' | 'warning';

export interface ValidationIssue {
  code: string;
  severity: IssueSeverity;
  path: string;
  title: string;
  description: string;
  table?: string;
  recordId?: string;
}

export interface ValidationReport {
  status: ValidationStatus;
  isValid: boolean;
  isSupported: boolean;
  isPartialBackup: boolean;
  requiresUpgrade: boolean;
  upgradeApplied: boolean;
  detectedFormat: 'nookspace-backup' | 'nookspace-bookmarks' | 'unknown';
  detectedFormatVersion: number | null;
  targetCanonicalFormatVersion: number;
  databaseSchemaVersion: number | null;
  checksumVerified: boolean | null;
  itemCounts: Record<string, number>;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  canonicalBackup: NookSpaceUniversalBackupV1 | null;
  validationDurationMs: number;
  fileSizeBytes: number | null;
}

export interface ValidateBackupOptions {
  skipChecksumVerification?: boolean;
  maxWarnings?: number;
  maxErrors?: number;
  customHardMaxBytes?: number;
}

export const BACKUP_HARD_MAX_BYTES = 100 * 1024 * 1024; // 100 MB safety limit
export const DEFAULT_MAX_ISSUES_LIMIT = 500; // Cap to avoid unbounded memory allocation on fuzzed inputs
