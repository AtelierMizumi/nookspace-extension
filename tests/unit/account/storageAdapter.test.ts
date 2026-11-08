import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createExtensionStorageAdapter } from '../../../src/infrastructure/supabase/storageAdapter';
import { browserApi } from '../../../src/services/browser';

describe('Supabase Extension Storage Adapter', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('stores and retrieves item with custom prefix', async () => {
    const adapter = createExtensionStorageAdapter('test:auth:');
    await adapter.setItem('session_token', 'xyz-123-abc');

    const retrieved = await adapter.getItem('session_token');
    expect(retrieved).toBe('xyz-123-abc');
  });

  it('removes item successfully', async () => {
    const adapter = createExtensionStorageAdapter('test:auth:');
    await adapter.setItem('refresh_token', 'rt-999');
    expect(await adapter.getItem('refresh_token')).toBe('rt-999');

    await adapter.removeItem('refresh_token');
    expect(await adapter.getItem('refresh_token')).toBeNull();
  });

  it('returns null for non-existent key', async () => {
    const adapter = createExtensionStorageAdapter('test:auth:');
    const result = await adapter.getItem('non_existent_key_404');
    expect(result).toBeNull();
  });

  it('falls back cleanly if browser storage throws an error', async () => {
    vi.spyOn(browserApi.storage.local, 'set').mockRejectedValueOnce(new Error('QuotaExceeded'));
    const adapter = createExtensionStorageAdapter('test:err:');

    // Should not throw, should retain in memory
    await adapter.setItem('fallback_token', 'memory-cached-value');
    const value = await adapter.getItem('fallback_token');
    expect(value).toBe('memory-cached-value');
  });
});
