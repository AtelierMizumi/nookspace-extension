import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from './config';
import { createExtensionStorageAdapter } from './storageAdapter';

let clientInstance: SupabaseClient | null = null;
const storageAdapter = createExtensionStorageAdapter();

/**
 * Returns the singleton Supabase client instance.
 * Returns null if Supabase environment variables are unconfigured.
 */
export function getSupabaseClient(): SupabaseClient | null {
  const config = getSupabaseConfig();
  if (!config.isConfigured) {
    return null;
  }

  if (!clientInstance) {
    clientInstance = createClient(config.url, config.publishableKey, {
      auth: {
        storage: storageAdapter,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
      },
    });
  }

  return clientInstance;
}

/**
 * Resets the client singleton (mainly used in unit tests).
 */
export function resetSupabaseClient(): void {
  clientInstance = null;
}
