import type {
  BackupMetadataV1,
  BackupDataV1,
  NookSpaceUniversalBackupV1,
} from './backupTypes';
import type { ValidationReport } from './validationTypes';

export type RestoreState =
  | 'idle'
  | 'preparing'
  | 'snapshot_creating'
  | 'snapshot_verified'
  | 'restore_started'
  | 'restore_applied'
  | 'verification_started'
  | 'restore_verified'
  | 'rollback_started'
  | 'rollback_in_progress'
  | 'rollback_completed'
  | 'recovery_required'
  | 'completed'
  | 'failed';

export type RestoreErrorCode =
  | 'BACKUP_VALIDATION_FAILED'
  | 'PARTIAL_BACKUP_RESTORE_NOT_SUPPORTED'
  | 'RESTORE_PREFLIGHT_FAILED'
  | 'RESTORE_ALREADY_RUNNING'
  | 'RECOVERY_SNAPSHOT_CREATION_FAILED'
  | 'RECOVERY_SNAPSHOT_VERIFICATION_FAILED'
  | 'RECOVERY_STORAGE_QUOTA_EXCEEDED'
  | 'RESTORE_TRANSACTION_FAILED'
  | 'RESTORE_POST_VERIFICATION_FAILED'
  | 'ROLLBACK_FAILED'
  | 'RECOVERY_REQUIRED'
  | 'RECOVERY_SNAPSHOT_MISSING'
  | 'RECOVERY_SNAPSHOT_CORRUPTED'
  | 'RESTORE_LOCK_CONFLICT'
  | 'RESTORE_INTERRUPTED'
  | 'RESTORE_SETTINGS_INVARIANT_FAILED'
  | 'DEPRECATED_LAYOUTS_UNMIGRATED';

export interface RestoreError {
  code: RestoreErrorCode;
  message: string;
  technicalDetails?: string;
  operationId?: string;
  isRecoverable: boolean;
  suggestedAction?: string;
}

export interface RestoreProgress {
  stage: RestoreState;
  message: string;
  timestamp: number;
  operationId: string;
}

export interface CurrentDatabaseStats {
  workspaceCount: number;
  totalRecords: number;
  tableCounts: Record<string, number>;
  estimatedSnapshotSizeBytes: number;
}

export interface RestorePreflightResult {
  success: boolean;
  operationId: string;
  validationReport: ValidationReport;
  canonicalBackup: NookSpaceUniversalBackupV1 | null;
  currentStats: CurrentDatabaseStats;
  backupStats: {
    workspaceCount: number;
    totalRecords: number;
    tableCounts: Record<string, number>;
  };
  warnings: string[];
  error?: RestoreError;
}

export interface RestorePreflightOptions {
  customHardMaxBytes?: number;
  skipChecksumVerification?: boolean;
}

export interface RestoreSnapshotRecord {
  snapshotId: string;
  operationId: string;
  createdAt: number;
  databaseSchemaVersion: number;
  itemCounts: Record<string, number>;
  checksum: string;
  payload: BackupDataV1;
  status: 'created' | 'verified' | 'used_for_rollback' | 'abandoned';
}

export interface RestoreJournalRecord {
  operationId: string;
  snapshotId: string;
  state: RestoreState;
  startedAt: number;
  updatedAt: number;
  backupMetadata: BackupMetadataV1;
  error?: {
    code: string;
    message: string;
    details?: string;
  };
  recoveryAttemptCount: number;
}

export interface RestoreLockRecord {
  id: string; // 'current_restore_lock'
  operationId: string;
  acquiredAt: number;
  leaseExpiresAt: number;
  tabId: string;
}

export interface FailureInjectionConfig {
  stage:
    | 'before_snapshot'
    | 'during_snapshot'
    | 'after_snapshot_before_verify'
    | 'during_snapshot_verify'
    | 'during_restore_tx'
    | 'after_restore_commit_before_verify'
    | 'during_post_verification'
    | 'during_rollback'
    | 'during_cleanup'
    | 'simulate_process_kill_after_commit';
  secondaryStage?: 'during_rollback';
  customMessage?: string;
}

export interface RestoreOptions {
  onProgress?: (progress: RestoreProgress) => void;
  skipChecksumVerification?: boolean;
  failureInjection?: FailureInjectionConfig;
  tabId?: string;
}

export interface RestoreResult {
  success: boolean;
  operationId: string;
  finalState: RestoreState;
  restoredCounts: Record<string, number>;
  snapshotId?: string;
  durationMs: number;
  error?: RestoreError;
  rollbackOccurred?: boolean;
  rollbackSucceeded?: boolean;
}

export interface RollbackResult {
  success: boolean;
  operationId: string;
  snapshotId: string;
  restoredCounts: Record<string, number>;
  durationMs: number;
  error?: RestoreError;
}

export interface StartupRecoveryResult {
  status:
    | 'clean'
    | 'recovered_from_snapshot'
    | 'recovery_required'
    | 'abandoned_clean';
  operationId?: string;
  previousState?: RestoreState;
  message?: string;
  error?: RestoreError;
}
