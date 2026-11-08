import { getSupabaseClient } from '../../../infrastructure/supabase';
import { UpdateProfileInput, UserProfile } from '../types';

interface ProfileRow {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  language: string | null;
  theme: string | null;
  created_at: string;
  updated_at: string;
}

function rowToProfile(row: ProfileRow): UserProfile {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    bio: row.bio,
    language: (row.language === 'en' ? 'en' : 'vi'),
    theme: (row.theme === 'dark' || row.theme === 'light' ? row.theme : 'system'),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class ProfileService {
  /**
   * Fetches user profile from public.profiles table by userId
   */
  async getProfile(userId: string): Promise<UserProfile | null> {
    const client = getSupabaseClient();
    if (!client) {
      return null;
    }

    const { data, error } = await client
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      // In development or if table is empty, fail gracefully
      return null;
    }

    if (!data) {
      return null;
    }

    return rowToProfile(data as ProfileRow);
  }

  /**
   * Updates an existing profile row in public.profiles
   */
  async updateProfile(userId: string, input: UpdateProfileInput): Promise<UserProfile> {
    const client = getSupabaseClient();
    if (!client) {
      throw new Error('AUTH_UNCONFIGURED');
    }

    const payload: Partial<ProfileRow> = {};
    if (input.displayName !== undefined) payload.display_name = input.displayName;
    if (input.bio !== undefined) payload.bio = input.bio;
    if (input.avatarUrl !== undefined) payload.avatar_url = input.avatarUrl;
    if (input.language !== undefined) payload.language = input.language;
    if (input.theme !== undefined) payload.theme = input.theme;

    const { data, error } = await client
      .from('profiles')
      .update(payload)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return rowToProfile(data as ProfileRow);
  }
}

export const profileService = new ProfileService();
