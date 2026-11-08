import { describe, it, expect, vi, beforeEach } from 'vitest';
import { profileService } from '../../../src/features/account/services/profileService';
import * as supabaseInfrastructure from '../../../src/infrastructure/supabase';

describe('ProfileService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns null if client is unconfigured', async () => {
    vi.spyOn(supabaseInfrastructure, 'getSupabaseClient').mockReturnValue(null);
    const profile = await profileService.getProfile('u-123');
    expect(profile).toBeNull();
  });

  it('fetches and maps profile row to UserProfile correctly', async () => {
    const rawRow = {
      id: 'u-123',
      email: 'test@example.com',
      display_name: 'Test Explorer',
      avatar_url: 'https://example.com/avatar.png',
      bio: 'Coding day and night',
      language: 'vi',
      theme: 'system',
      created_at: '2026-11-08T10:00:00Z',
      updated_at: '2026-11-08T12:00:00Z',
    };

    const mockClient = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: rawRow,
              error: null,
            }),
          }),
        }),
      }),
    } as any;

    vi.spyOn(supabaseInfrastructure, 'getSupabaseClient').mockReturnValue(mockClient);

    const profile = await profileService.getProfile('u-123');
    expect(profile).not.toBeNull();
    expect(profile?.id).toBe('u-123');
    expect(profile?.displayName).toBe('Test Explorer');
    expect(profile?.avatarUrl).toBe('https://example.com/avatar.png');
    expect(profile?.bio).toBe('Coding day and night');
    expect(profile?.language).toBe('vi');
  });

  it('updates profile fields and returns mapped profile', async () => {
    const updatedRow = {
      id: 'u-123',
      email: 'test@example.com',
      display_name: 'Updated Name',
      avatar_url: null,
      bio: 'Updated Bio',
      language: 'en',
      theme: 'dark',
      created_at: '2026-11-08T10:00:00Z',
      updated_at: '2026-11-08T13:00:00Z',
    };

    const mockClient = {
      from: vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: updatedRow,
                error: null,
              }),
            }),
          }),
        }),
      }),
    } as any;

    vi.spyOn(supabaseInfrastructure, 'getSupabaseClient').mockReturnValue(mockClient);

    const profile = await profileService.updateProfile('u-123', {
      displayName: 'Updated Name',
      bio: 'Updated Bio',
      language: 'en',
    });

    expect(profile.displayName).toBe('Updated Name');
    expect(profile.bio).toBe('Updated Bio');
    expect(profile.language).toBe('en');
  });
});
