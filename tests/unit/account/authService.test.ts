import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authService } from '../../../src/features/account/services/authService';
import * as supabaseInfrastructure from '../../../src/infrastructure/supabase';

describe('AuthService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('throws AUTH_UNCONFIGURED if Supabase client is not available', async () => {
    vi.spyOn(supabaseInfrastructure, 'getSupabaseClient').mockReturnValue(null);

    await expect(
      authService.signIn({ email: 'test@example.com', password: 'password123' })
    ).rejects.toThrow('AUTH_UNCONFIGURED');

    await expect(
      authService.signUp({ email: 'test@example.com', password: 'password123' })
    ).rejects.toThrow('AUTH_UNCONFIGURED');

    await expect(
      authService.resetPassword('test@example.com')
    ).rejects.toThrow('AUTH_UNCONFIGURED');
  });

  it('signs in successfully when client returns session and user', async () => {
    const mockUser = { id: 'u-1', email: 'user@example.com' } as any;
    const mockSession = { access_token: 'token-abc', user: mockUser } as any;

    const mockClient = {
      auth: {
        signInWithPassword: vi.fn().mockResolvedValue({
          data: { user: mockUser, session: mockSession },
          error: null,
        }),
      },
    } as any;

    vi.spyOn(supabaseInfrastructure, 'getSupabaseClient').mockReturnValue(mockClient);

    const result = await authService.signIn({
      email: 'user@example.com',
      password: 'password123',
    });

    expect(result.user.id).toBe('u-1');
    expect(result.session.access_token).toBe('token-abc');
    expect(mockClient.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'password123',
    });
  });

  it('signs up successfully with metadata', async () => {
    const mockUser = { id: 'u-2', email: 'new@example.com' } as any;
    const mockSession = { access_token: 'token-xyz', user: mockUser } as any;

    const mockClient = {
      auth: {
        signUp: vi.fn().mockResolvedValue({
          data: { user: mockUser, session: mockSession },
          error: null,
        }),
      },
    } as any;

    vi.spyOn(supabaseInfrastructure, 'getSupabaseClient').mockReturnValue(mockClient);

    const result = await authService.signUp({
      email: 'new@example.com',
      password: 'password123',
      displayName: 'New Member',
    });

    expect(result.user?.id).toBe('u-2');
    expect(mockClient.auth.signUp).toHaveBeenCalledWith({
      email: 'new@example.com',
      password: 'password123',
      options: {
        data: {
          display_name: 'New Member',
        },
      },
    });
  });

  it('signs out successfully', async () => {
    const mockClient = {
      auth: {
        signOut: vi.fn().mockResolvedValue({ error: null }),
      },
    } as any;

    vi.spyOn(supabaseInfrastructure, 'getSupabaseClient').mockReturnValue(mockClient);

    await expect(authService.signOut()).resolves.toBeUndefined();
    expect(mockClient.auth.signOut).toHaveBeenCalled();
  });
});
