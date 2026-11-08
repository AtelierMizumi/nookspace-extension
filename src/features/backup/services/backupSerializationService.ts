import {
  NookSpaceUniversalBackupV1,
  BackupSerializationError,
} from '../types/backupTypes';

/**
 * Validates that a value tree contains only JSON-serializable primitives and collections.
 * Detects BigInt, functions, symbols, NaN, Infinity, -Infinity, and circular references.
 */
export function validateSerializable(value: unknown, path = '$', seen: WeakSet<object> = new WeakSet()): void {
  if (value === null || value === undefined) {
    return;
  }

  const valueType = typeof value;

  if (valueType === 'bigint') {
    throw new BackupSerializationError(`Unsupported BigInt value encountered at "${path}"`, path);
  }

  if (valueType === 'function') {
    throw new BackupSerializationError(`Unsupported function encountered at "${path}"`, path);
  }

  if (valueType === 'symbol') {
    throw new BackupSerializationError(`Unsupported Symbol value encountered at "${path}"`, path);
  }

  if (valueType === 'number') {
    if (!Number.isFinite(value)) {
      throw new BackupSerializationError(`Non-finite number (${value}) encountered at "${path}"`, path);
    }
    return;
  }

  if (valueType === 'string' || valueType === 'boolean') {
    return;
  }

  if (valueType === 'object') {
    if (seen.has(value as object)) {
      throw new BackupSerializationError(`Circular reference detected at "${path}"`, path);
    }
    seen.add(value as object);

    if (Array.isArray(value)) {
      for (let i = 0; i < value.length; i++) {
        validateSerializable(value[i], `${path}[${i}]`, seen);
      }
      return;
    }

    // Reject non-plain objects like Map, Set, WeakMap, Error, RegExp, TypedArray unless serialized
    const proto = Object.getPrototypeOf(value);
    if (proto !== null && proto !== Object.prototype) {
      const constructorName = (value as any)?.constructor?.name || 'UnknownObject';
      throw new BackupSerializationError(
        `Unsupported non-plain object type "${constructorName}" encountered at "${path}"`,
        path
      );
    }

    const record = value as Record<string, unknown>;
    for (const key of Object.keys(record)) {
      validateSerializable(record[key], `${path}.${key}`, seen);
    }
  }
}

/**
 * Validates serializability and formats the universal backup payload into pretty-printed JSON.
 */
export function serializeBackupToJson(backup: NookSpaceUniversalBackupV1): string {
  try {
    validateSerializable(backup);
    return JSON.stringify(backup, null, 2);
  } catch (err) {
    if (err instanceof BackupSerializationError) {
      throw err;
    }
    throw new BackupSerializationError(
      `Failed to serialize backup to JSON: ${err instanceof Error ? err.message : String(err)}`,
      '$',
      err
    );
  }
}
