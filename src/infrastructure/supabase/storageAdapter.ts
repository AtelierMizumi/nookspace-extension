import { browserApi } from '../../services/browser';
import { ExtensionStorageAdapter } from './types';

const STORAGE_PREFIX = 'nookspace:supabase:';

/**
 * Custom Supabase SupportedStorage implementation for WebExtensions.
 * Wraps browserApi.storage.local with a memory fallback for robust cross-browser operation.
 */
export function createExtensionStorageAdapter(prefix = STORAGE_PREFIX): ExtensionStorageAdapter {
  const memoryFallback = new Map<string, string>();

  return {
    async getItem(key: string): Promise<string | null> {
      const fullKey = `${prefix}${key}`;
      try {
        const stored = await browserApi.storage.local.get<Record<string, unknown>>([fullKey]);
        if (stored && stored[fullKey] !== undefined && stored[fullKey] !== null) {
          const val = stored[fullKey];
          return typeof val === 'string' ? val : JSON.stringify(val);
        }
      } catch {
        // Fall back to in-memory map
      }
      return memoryFallback.get(fullKey) ?? null;
    },

    async setItem(key: string, value: string): Promise<void> {
      const fullKey = `${prefix}${key}`;
      memoryFallback.set(fullKey, value);
      try {
        await browserApi.storage.local.set({ [fullKey]: value });
      } catch {
        // Error writing to extension storage; memory fallback already holds state
      }
    },

    async removeItem(key: string): Promise<void> {
      const fullKey = `${prefix}${key}`;
      memoryFallback.delete(fullKey);
      try {
        await browserApi.storage.local.remove([fullKey]);
      } catch {
        // Ignored
      }
    },
  };
}
