import {
  NookSpaceUniversalBackupV1,
  BackupIntegrityError,
} from '../types/backupTypes';

/**
 * Deterministically normalizes and sorts object keys recursively for canonical serialization.
 * Excludes undefined fields to match JSON.stringify semantics.
 */
export function canonicalizeValue(value: unknown, seen: WeakSet<object> = new WeakSet()): unknown {
  if (value === null || typeof value !== 'object') {
    return value;
  }

  if (seen.has(value)) {
    throw new BackupIntegrityError('Circular reference detected during canonicalization');
  }
  seen.add(value);

  if (Array.isArray(value)) {
    return value.map((item) => canonicalizeValue(item, seen));
  }

  const record = value as Record<string, unknown>;
  const sortedKeys = Object.keys(record).sort();
  const sortedObj: Record<string, unknown> = {};

  for (const key of sortedKeys) {
    const val = record[key];
    if (val !== undefined) {
      sortedObj[key] = canonicalizeValue(val, seen);
    }
  }

  return sortedObj;
}

/**
 * Serializes an object to a deterministic canonical JSON string.
 */
export function canonicalJsonStringify(value: unknown): string {
  const normalized = canonicalizeValue(value);
  return JSON.stringify(normalized, null, 2);
}

/**
 * Computes SHA-256 hash string from utf-8 text using Web Crypto API.
 */
export async function computeSha256Hex(text: string): Promise<string> {
  const cryptoObj =
    typeof globalThis !== 'undefined' && globalThis.crypto?.subtle
      ? globalThis.crypto
      : undefined;

  if (!cryptoObj?.subtle) {
    throw new BackupIntegrityError('Web Crypto API (crypto.subtle) is not available in the current environment');
  }

  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await cryptoObj.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generates the canonical representation of a backup envelope for checksumming,
 * setting metadata.integrity.checksum to an empty string.
 */
export function getCanonicalChecksumPayload(backup: NookSpaceUniversalBackupV1): NookSpaceUniversalBackupV1 {
  return {
    ...backup,
    metadata: {
      ...backup.metadata,
      integrity: {
        algorithm: 'SHA-256',
        checksum: '',
      },
    },
  };
}

/**
 * Calculates a deterministic SHA-256 checksum over arbitrary canonical payload data.
 */
export async function calculatePayloadChecksum(payload: unknown): Promise<string> {
  const serialized = canonicalJsonStringify(payload);
  return computeSha256Hex(serialized);
}

/**
 * Calculates a deterministic SHA-256 checksum over the universal backup payload.
 */
export async function calculateBackupChecksum(backup: NookSpaceUniversalBackupV1): Promise<string> {
  const canonicalPayload = getCanonicalChecksumPayload(backup);
  const serialized = canonicalJsonStringify(canonicalPayload);
  return computeSha256Hex(serialized);
}

/**
 * Verifies that the checksum recorded in backup.metadata.integrity.checksum
 * matches the computed SHA-256 hash of the canonical payload.
 */
export async function verifyBackupChecksum(backup: NookSpaceUniversalBackupV1): Promise<boolean> {
  const recorded = backup.metadata?.integrity?.checksum;
  if (!recorded || typeof recorded !== 'string' || recorded.length !== 64) {
    return false;
  }
  const computed = await calculateBackupChecksum(backup);
  return recorded.toLowerCase() === computed.toLowerCase();
}
