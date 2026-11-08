import { describe, it, expect, vi, beforeEach } from 'vitest';
import { avatarStorageService } from '../../../src/features/account/services/avatarStorageService';
import * as supabaseInfrastructure from '../../../src/infrastructure/supabase';

describe('AvatarStorageService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('validates file correctly', () => {
    const validFile = new File(['image-bytes'], 'avatar.png', { type: 'image/png' });
    expect(avatarStorageService.validateFile(validFile).valid).toBe(true);

    const invalidType = new File(['text'], 'doc.pdf', { type: 'application/pdf' });
    expect(avatarStorageService.validateFile(invalidType).valid).toBe(false);

    // Oversized > 5MB
    const bigFile = new File([new Uint8Array(6 * 1024 * 1024)], 'big.jpg', { type: 'image/jpeg' });
    expect(avatarStorageService.validateFile(bigFile).valid).toBe(false);
  });

  it('throws AUTH_UNCONFIGURED if Supabase client is missing', async () => {
    vi.spyOn(supabaseInfrastructure, 'getSupabaseClient').mockReturnValue(null);
    const validFile = new File(['image-bytes'], 'avatar.png', { type: 'image/png' });

    await expect(
      avatarStorageService.uploadAvatar('u-1', validFile)
    ).rejects.toThrow('AUTH_UNCONFIGURED');
  });

  it('uploads file and returns public URL', async () => {
    const mockClient = {
      storage: {
        from: vi.fn().mockReturnValue({
          upload: vi.fn().mockResolvedValue({ error: null }),
          getPublicUrl: vi.fn().mockReturnValue({
            data: { publicUrl: 'https://supabase.co/storage/v1/object/public/avatars/u-1/avatar.png' },
          }),
        }),
      },
    } as any;

    vi.spyOn(supabaseInfrastructure, 'getSupabaseClient').mockReturnValue(mockClient);

    const validFile = new File(['image-bytes'], 'avatar.png', { type: 'image/png' });
    const url = await avatarStorageService.uploadAvatar('u-1', validFile);

    expect(url).toContain('https://supabase.co/storage/v1/object/public/avatars/u-1');
  });
});
