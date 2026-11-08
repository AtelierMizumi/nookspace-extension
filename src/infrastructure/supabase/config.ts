import { SupabaseConfig } from './types';

const PLACEHOLDER_URL = 'https://your-project-id.supabase.co';
const PLACEHOLDER_KEY = 'your-supabase-publishable-key';

/**
 * Validates whether a URL is a valid Supabase project endpoint
 */
function isValidUrl(urlStr?: string): boolean {
  if (!urlStr || typeof urlStr !== 'string') return false;
  const trimmed = urlStr.trim();
  if (trimmed === '' || trimmed === PLACEHOLDER_URL) return false;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

/**
 * Validates whether an API key is not an empty or dummy string
 */
function isValidKey(keyStr?: string): boolean {
  if (!keyStr || typeof keyStr !== 'string') return false;
  const trimmed = keyStr.trim();
  return trimmed.length > 10 && trimmed !== PLACEHOLDER_KEY;
}

/**
 * Returns the current Supabase environment configuration.
 * Safely handles missing, placeholder, or invalid environment variables.
 */
export function getSupabaseConfig(): SupabaseConfig {
  const env = (import.meta as any).env || {};
  const envUrl = (env.VITE_SUPABASE_URL as string | undefined)?.trim() || '';
  const envKey = (env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined)?.trim() || '';

  const isConfigured = isValidUrl(envUrl) && isValidKey(envKey);

  return {
    url: envUrl,
    publishableKey: envKey,
    isConfigured,
  };
}

/**
 * Quick check if Supabase has been properly configured with live credentials.
 */
export function isSupabaseConfigured(): boolean {
  return getSupabaseConfig().isConfigured;
}
