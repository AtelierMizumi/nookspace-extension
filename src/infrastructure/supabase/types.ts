/**
 * Supabase infrastructure configuration & storage types
 */

export interface SupabaseConfig {
  url: string;
  publishableKey: string;
  isConfigured: boolean;
}

export interface ExtensionStorageAdapter {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
}
