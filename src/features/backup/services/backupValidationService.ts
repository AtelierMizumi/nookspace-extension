import {
  NookSpaceUniversalBackupV1,
  BACKUP_FORMAT_IDENTIFIER,
  BACKUP_FORMAT_VERSION,
  BACKUP_LARGE_SIZE_WARNING_BYTES,
} from '../types/backupTypes';
import {
  ValidationReport,
  ValidationStatus,
  ValidationIssue,
  ValidateBackupOptions,
  BACKUP_HARD_MAX_BYTES,
  DEFAULT_MAX_ISSUES_LIMIT,
} from '../types/validationTypes';
import {
  BackupMetadataV1Schema,
  BackupDataV1Schema,
} from '../schemas/backupV1Schema';
import { NookSpaceBookmarkBackupV1Schema } from '../../bookmarks/types/bookmarkImportExport';
import { verifyBackupChecksum } from './backupIntegrityService';
import { validateCrossReferencesAndDomainIntegrity } from '../validation/crossReferenceValidator';
import { versionUpgradeRegistry } from '../versioning/versionRegistry';

export class BackupValidationService {
  /**
   * Validates an untrusted backup (string, object, File, or Blob),
   * detects format and version, verifies SHA-256 integrity, validates all 17 entity tables,
   * performs cross-reference integrity checks, and executes in-memory version upgrades.
   *
   * GUARANTEES:
   * 1. 100% Read-only: Zero writes or mutations to Dexie / IndexedDB.
   * 2. Pure in-memory transformation: Never mutates the input payload.
   */
  async validateBackup(
    input: unknown,
    options: ValidateBackupOptions = {}
  ): Promise<ValidationReport> {
    const startTime = performance.now();
    const errors: ValidationIssue[] = [];
    const warnings: ValidationIssue[] = [];
    const hardMaxBytes = options.customHardMaxBytes || BACKUP_HARD_MAX_BYTES;
    const maxErrors = options.maxErrors || DEFAULT_MAX_ISSUES_LIMIT;
    const maxWarnings = options.maxWarnings || DEFAULT_MAX_ISSUES_LIMIT;

    let fileSizeBytes: number | null = null;
    let parsed: any = null;
    let rawText: string | null = null;

    // Helper to safely append issues respecting limits
    const addError = (issue: ValidationIssue) => {
      if (errors.length < maxErrors) {
        errors.push(issue);
      }
    };
    const addWarning = (issue: ValidationIssue) => {
      if (warnings.length < maxWarnings) {
        warnings.push(issue);
      }
    };

    // ==========================================
    // STAGE 1: INPUT GUARD & TEXT CONVERSION
    // ==========================================
    try {
      if (input === null || input === undefined) {
        addError({
          code: 'INPUT_NIL',
          severity: 'error',
          path: '$',
          title: 'Empty Input',
          description: 'Provided backup input is null or undefined.',
        });
        return this.buildReport({
          status: 'invalid',
          errors,
          warnings,
          startTime,
        });
      }

      // Handle Blob / File
      if (typeof Blob !== 'undefined' && input instanceof Blob) {
        fileSizeBytes = input.size;
        if (fileSizeBytes > hardMaxBytes) {
          addError({
            code: 'INPUT_FILE_TOO_LARGE',
            severity: 'error',
            path: '$',
            title: 'File Exceeds Hard Limit',
            description: `File size (${(fileSizeBytes / (1024 * 1024)).toFixed(2)} MB) exceeds absolute security limit of ${(hardMaxBytes / (1024 * 1024)).toFixed(0)} MB.`,
          });
          return this.buildReport({
            status: 'invalid',
            errors,
            warnings,
            startTime,
            fileSizeBytes,
          });
        }

        if (fileSizeBytes >= BACKUP_LARGE_SIZE_WARNING_BYTES) {
          addWarning({
            code: 'LARGE_BACKUP_SIZE_WARNING',
            severity: 'warning',
            path: '$',
            title: 'Large Backup Size',
            description: `Backup size (${(fileSizeBytes / (1024 * 1024)).toFixed(2)} MB) exceeds recommended 25 MB threshold.`,
          });
        }

        if (typeof (input as any).text === 'function') {
          rawText = await (input as any).text();
        } else if (typeof (input as any).arrayBuffer === 'function') {
          const buffer = await (input as any).arrayBuffer();
          rawText = new TextDecoder().decode(buffer);
        } else if (typeof FileReader !== 'undefined') {
          rawText = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = () => reject(reader.error);
            reader.readAsText(input as Blob);
          });
        } else {
          throw new Error('Neither Blob.text, arrayBuffer, nor FileReader is supported in this runtime.');
        }
        try {
          parsed = JSON.parse(rawText ?? '');
        } catch (jsonErr) {
          addError({
            code: 'INVALID_JSON_SYNTAX',
            severity: 'error',
            path: '$',
            title: 'Invalid JSON Syntax',
            description: `Failed to parse backup JSON from Blob: ${jsonErr instanceof Error ? jsonErr.message : String(jsonErr)}`,
          });
          return this.buildReport({
            status: 'invalid',
            errors,
            warnings,
            startTime,
            fileSizeBytes,
          });
        }
      } else if (typeof input === 'string') {
        const trimmed = input.trim();
        if (trimmed.length === 0) {
          addError({
            code: 'INPUT_EMPTY_STRING',
            severity: 'error',
            path: '$',
            title: 'Empty Backup String',
            description: 'Backup JSON string is empty or contains only whitespace.',
          });
          return this.buildReport({
            status: 'invalid',
            errors,
            warnings,
            startTime,
          });
        }

        fileSizeBytes = new TextEncoder().encode(input).length;
        if (fileSizeBytes > hardMaxBytes) {
          addError({
            code: 'INPUT_FILE_TOO_LARGE',
            severity: 'error',
            path: '$',
            title: 'Payload Exceeds Hard Limit',
            description: `Payload size (${(fileSizeBytes / (1024 * 1024)).toFixed(2)} MB) exceeds absolute security limit.`,
          });
          return this.buildReport({
            status: 'invalid',
            errors,
            warnings,
            startTime,
            fileSizeBytes,
          });
        }

        if (fileSizeBytes >= BACKUP_LARGE_SIZE_WARNING_BYTES) {
          addWarning({
            code: 'LARGE_BACKUP_SIZE_WARNING',
            severity: 'warning',
            path: '$',
            title: 'Large Backup Size',
            description: `Backup size (${(fileSizeBytes / (1024 * 1024)).toFixed(2)} MB) exceeds recommended 25 MB threshold.`,
          });
        }

        try {
          parsed = JSON.parse(input);
        } catch (jsonErr) {
          addError({
            code: 'INVALID_JSON_SYNTAX',
            severity: 'error',
            path: '$',
            title: 'Invalid JSON Syntax',
            description: `Failed to parse backup JSON: ${jsonErr instanceof Error ? jsonErr.message : String(jsonErr)}`,
          });
          return this.buildReport({
            status: 'invalid',
            errors,
            warnings,
            startTime,
            fileSizeBytes,
          });
        }
      } else if (typeof input === 'object') {
        parsed = input;
      } else {
        addError({
          code: 'UNSUPPORTED_INPUT_TYPE',
          severity: 'error',
          path: '$',
          title: 'Unsupported Input Type',
          description: `Expected string, object, File, or Blob but received ${typeof input}.`,
        });
        return this.buildReport({
          status: 'invalid',
          errors,
          warnings,
          startTime,
        });
      }

      // Root value must be a non-null object and not an array
      if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
        addError({
          code: 'ROOT_NOT_AN_OBJECT',
          severity: 'error',
          path: '$',
          title: 'Root Must Be an Object',
          description: `Backup root must be a JSON object, received ${parsed === null ? 'null' : Array.isArray(parsed) ? 'array' : typeof parsed}.`,
        });
        return this.buildReport({
          status: 'invalid',
          errors,
          warnings,
          startTime,
          fileSizeBytes,
        });
      }
    } catch (readErr) {
      addError({
        code: 'INPUT_READ_FAILURE',
        severity: 'error',
        path: '$',
        title: 'Input Read Failure',
        description: `Failed to read backup input: ${readErr instanceof Error ? readErr.message : String(readErr)}`,
      });
      return this.buildReport({
        status: 'invalid',
        errors,
        warnings,
        startTime,
        fileSizeBytes,
      });
    }

    // ==========================================
    // STAGE 2: FORMAT DETECTION
    // ==========================================
    const detectedFormatStr = parsed.format;
    let detectedFormat: 'nookspace-backup' | 'nookspace-bookmarks' | 'unknown' = 'unknown';

    if (detectedFormatStr === BACKUP_FORMAT_IDENTIFIER) {
      detectedFormat = 'nookspace-backup';
    } else if (detectedFormatStr === 'nookspace-bookmarks') {
      detectedFormat = 'nookspace-bookmarks';
    } else {
      addError({
        code: 'UNSUPPORTED_FORMAT',
        severity: 'error',
        path: '$.format',
        title: 'Unsupported Backup Format',
        description: `Format "${detectedFormatStr || 'undefined'}" is not supported by NookSpace.`,
      });
      return this.buildReport({
        status: 'unsupported',
        detectedFormat: 'unknown',
        errors,
        warnings,
        startTime,
        fileSizeBytes,
      });
    }

    // ==========================================
    // STAGE 3: VERSION DETECTION
    // ==========================================
    const rawVersion = detectedFormat === 'nookspace-bookmarks' ? parsed.version : parsed.formatVersion;
    let detectedFormatVersion: number | null = null;

    if (typeof rawVersion !== 'number' || !Number.isInteger(rawVersion) || rawVersion <= 0) {
      addError({
        code: 'INVALID_FORMAT_VERSION',
        severity: 'error',
        path: detectedFormat === 'nookspace-bookmarks' ? '$.version' : '$.formatVersion',
        title: 'Invalid Format Version',
        description: `Format version must be a positive integer, received "${rawVersion}".`,
      });
      return this.buildReport({
        status: 'invalid',
        detectedFormat,
        detectedFormatVersion: null,
        errors,
        warnings,
        startTime,
        fileSizeBytes,
      });
    }

    detectedFormatVersion = rawVersion;

    if (detectedFormat === 'nookspace-backup' && detectedFormatVersion > BACKUP_FORMAT_VERSION) {
      addError({
        code: 'UNSUPPORTED_FUTURE_VERSION',
        severity: 'error',
        path: '$.formatVersion',
        title: 'Unsupported Future Backup Version',
        description: `Backup format version ${detectedFormatVersion} is newer than current supported version ${BACKUP_FORMAT_VERSION}. Please update NookSpace to restore this file.`,
      });
      return this.buildReport({
        status: 'unsupported',
        detectedFormat,
        detectedFormatVersion,
        errors,
        warnings,
        startTime,
        fileSizeBytes,
      });
    }

    // ==========================================
    // STAGE 4: LEGACY ADAPTER OR UNIVERSAL V1
    // ==========================================
    let canonicalBackup: NookSpaceUniversalBackupV1 | null = null;
    let isPartialBackup = false;
    let upgradeApplied = false;
    let requiresUpgrade = false;
    let checksumVerified: boolean | null = null;

    if (detectedFormat === 'nookspace-bookmarks') {
      // Legacy bookmarks format from Phase 6.7
      isPartialBackup = true;
      requiresUpgrade = true;

      const legacyValidation = NookSpaceBookmarkBackupV1Schema.safeParse(parsed);
      if (!legacyValidation.success) {
        legacyValidation.error.issues.forEach((iss) => {
          addError({
            code: 'LEGACY_BOOKMARKS_SCHEMA_ERROR',
            severity: 'error',
            path: `$.${iss.path.join('.')}`,
            title: 'Legacy Bookmark Schema Validation Error',
            description: iss.message,
          });
        });
        return this.buildReport({
          status: 'invalid',
          detectedFormat,
          detectedFormatVersion,
          isPartialBackup,
          requiresUpgrade,
          errors,
          warnings,
          startTime,
          fileSizeBytes,
        });
      }

      // Upgrade in-memory
      try {
        canonicalBackup = await versionUpgradeRegistry
          .getAdapter('nookspace-bookmarks', 1)!
          .upgrade(legacyValidation.data);
        upgradeApplied = true;
      } catch (adaptErr) {
        addError({
          code: 'LEGACY_UPGRADE_FAILED',
          severity: 'error',
          path: '$',
          title: 'Legacy Upgrade Transformation Failed',
          description: `Failed to upgrade legacy bookmarks backup: ${adaptErr instanceof Error ? adaptErr.message : String(adaptErr)}`,
        });
        return this.buildReport({
          status: 'invalid',
          detectedFormat,
          detectedFormatVersion,
          isPartialBackup,
          requiresUpgrade,
          errors,
          warnings,
          startTime,
          fileSizeBytes,
        });
      }
    } else {
      // Universal Backup V1
      canonicalBackup = parsed as NookSpaceUniversalBackupV1;

      // ==========================================
      // STAGE 5: CHECKSUM VERIFICATION
      // ==========================================
      if (options.skipChecksumVerification !== true) {
        try {
          const isChecksumValid = await verifyBackupChecksum(canonicalBackup);
          checksumVerified = isChecksumValid;

          if (!isChecksumValid) {
            const recordedChecksum = canonicalBackup.metadata?.integrity?.checksum;
            if (!recordedChecksum) {
              addError({
                code: 'CHECKSUM_MISSING',
                severity: 'error',
                path: '$.metadata.integrity.checksum',
                title: 'Missing Integrity Checksum',
                description: 'Backup payload is missing the required SHA-256 integrity checksum.',
              });
            } else {
              addError({
                code: 'CHECKSUM_MISMATCH',
                severity: 'error',
                path: '$.metadata.integrity.checksum',
                title: 'Integrity Checksum Mismatch',
                description: 'Backup content does not match the recorded SHA-256 checksum. File may have been edited, corrupted, or truncated.',
              });
            }
          }
        } catch (checksumErr) {
          addError({
            code: 'CHECKSUM_CALCULATION_ERROR',
            severity: 'error',
            path: '$.metadata.integrity',
            title: 'Checksum Calculation Failed',
            description: `Could not verify checksum: ${checksumErr instanceof Error ? checksumErr.message : String(checksumErr)}`,
          });
          checksumVerified = false;
        }
      }
    }

    // ==========================================
    // STAGE 6: ENVELOPE & ENTITY SCHEMA VALIDATION
    // ==========================================
    if (canonicalBackup) {
      // Validate metadata
      const metaResult = BackupMetadataV1Schema.safeParse(canonicalBackup.metadata);
      if (!metaResult.success) {
        metaResult.error.issues.forEach((iss) => {
          addError({
            code: 'METADATA_SCHEMA_ERROR',
            severity: 'error',
            path: `$.metadata.${iss.path.join('.')}`,
            title: 'Metadata Schema Validation Error',
            description: iss.message,
          });
        });
      }

      // Validate data structure across all 17 tables
      const dataResult = BackupDataV1Schema.safeParse(canonicalBackup.data);
      if (!dataResult.success) {
        dataResult.error.issues.forEach((iss) => {
          const pathStr = iss.path.join('.');
          const tableName = iss.path[0] as string | undefined;
          addError({
            code: 'ENTITY_SCHEMA_ERROR',
            severity: 'error',
            path: `$.data.${pathStr}`,
            title: 'Entity Schema Validation Error',
            description: iss.message,
            table: tableName,
          });
        });
      } else {
        // Inspect for ambiguous multiple settings records
        if (Array.isArray(parsed?.data?.settings) && parsed.data.settings.length > 1) {
          addWarning({
            code: 'AMBIGUOUS_SETTINGS_RECORDS',
            severity: 'warning',
            path: '$.data.settings',
            title: 'Multiple Settings Records Encountered',
            description: `Found ${parsed.data.settings.length} settings records in array; primary record was selected and remaining records were retained for inspection.`,
            table: 'settings',
          });
        }

        // ==========================================
        // STAGE 7: CROSS-REFERENCE & DOMAIN INTEGRITY
        // ==========================================
        validateCrossReferencesAndDomainIntegrity(dataResult.data, { errors, warnings });
      }

      // ==========================================
      // STAGE 8: METADATA ITEM COUNTS CONSISTENCY
      // ==========================================
      const declaredCounts = canonicalBackup.metadata?.itemCounts || {};
      const actualData = canonicalBackup.data || ({} as any);

      for (const [tableName, items] of Object.entries(actualData)) {
        if (Array.isArray(items)) {
          const declared = declaredCounts[tableName];
          if (declared !== undefined && declared !== items.length) {
            addWarning({
              code: 'METADATA_ITEM_COUNT_MISMATCH',
              severity: 'warning',
              path: `$.metadata.itemCounts.${tableName}`,
              title: 'Item Count Discrepancy',
              description: `Table "${tableName}" has ${items.length} records, but metadata declared ${declared}.`,
              table: tableName,
            });
          }
        }
      }
    }

    // Determine final validation status
    let status: ValidationStatus = 'valid';
    if (errors.length > 0) {
      status = 'invalid';
    } else if (warnings.length > 0) {
      status = 'valid_with_warnings';
    }

    return this.buildReport({
      status,
      detectedFormat,
      detectedFormatVersion,
      databaseSchemaVersion: canonicalBackup?.metadata?.databaseSchemaVersion ?? null,
      isPartialBackup,
      requiresUpgrade,
      upgradeApplied,
      checksumVerified,
      itemCounts: canonicalBackup?.metadata?.itemCounts || {},
      errors,
      warnings,
      canonicalBackup: status === 'valid' || status === 'valid_with_warnings' ? canonicalBackup : null,
      startTime,
      fileSizeBytes,
    });
  }

  private buildReport(params: {
    status: ValidationStatus;
    detectedFormat?: 'nookspace-backup' | 'nookspace-bookmarks' | 'unknown';
    detectedFormatVersion?: number | null;
    databaseSchemaVersion?: number | null;
    isPartialBackup?: boolean;
    requiresUpgrade?: boolean;
    upgradeApplied?: boolean;
    checksumVerified?: boolean | null;
    itemCounts?: Record<string, number>;
    errors: ValidationIssue[];
    warnings: ValidationIssue[];
    canonicalBackup?: NookSpaceUniversalBackupV1 | null;
    startTime: number;
    fileSizeBytes?: number | null;
  }): ValidationReport {
    const durationMs = performance.now() - params.startTime;
    const isValid = params.status === 'valid' || params.status === 'valid_with_warnings';
    const isSupported = params.status !== 'unsupported';

    return {
      status: params.status,
      isValid,
      isSupported,
      isPartialBackup: Boolean(params.isPartialBackup),
      requiresUpgrade: Boolean(params.requiresUpgrade),
      upgradeApplied: Boolean(params.upgradeApplied),
      detectedFormat: params.detectedFormat || 'unknown',
      detectedFormatVersion: params.detectedFormatVersion ?? null,
      targetCanonicalFormatVersion: BACKUP_FORMAT_VERSION,
      databaseSchemaVersion: params.databaseSchemaVersion ?? null,
      checksumVerified: params.checksumVerified ?? null,
      itemCounts: params.itemCounts || {},
      errors: params.errors,
      warnings: params.warnings,
      canonicalBackup: params.canonicalBackup ?? null,
      validationDurationMs: Math.round(durationMs * 100) / 100,
      fileSizeBytes: params.fileSizeBytes ?? null,
    };
  }
}

export const backupValidationService = new BackupValidationService();
export const validateBackup = (
  input: unknown,
  options?: ValidateBackupOptions
): Promise<ValidationReport> => backupValidationService.validateBackup(input, options);
