import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAuthStore } from '../../../src/features/account/stores/authStore';
import { authService } from '../../../src/features/account/services/authService';
import { profileService } from '../../../src/features/account/services/profileService';
import * as supabaseInfrastructure from '../../../src/infrastructure/supabase';

describe('AuthStore', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    useAuthStore.setState({
      status: 'unauthenticated',
      user: null,
      profile: null,
      session: null,
      isConfigured: false,
      isLoading: false,
      error: null,
      activeModal: 'none',
      authView: 'login',
      pendingEmail: null,
    });
  });

  it('initializes to unconfigured when Supabase credentials are missing', async () => {
    vi.spyOn(supabaseInfrastructure, 'isSupabaseConfigured').mockReturnValue(false);

    await useAuthStore.getState().initialize();

    const state = useAuthStore.getState();
    expect(state.isConfigured).toBe(false);
    expect(state.status).toBe('unconfigured');
    expect(state.user).toBeNull();
  });

  it('restores authenticated session and profile when available', async () => {
    vi.spyOn(supabaseInfrastructure, 'isSupabaseConfigured').mockReturnValue(true);

    const mockUser = { id: 'u-100', email: 'user@nookspace.app' } as any;
    const mockSession = { access_token: 'tok-100', user: mockUser } as any;
    const mockProfile = {
      id: 'u-100',
      email: 'user@nookspace.app',
      displayName: 'Commander Nook',
      avatarUrl: null,
      bio: 'Star explorer',
      language: 'vi' as const,
      theme: 'dark' as const,
      createdAt: '2026-11-08T00:00:00Z',
      updatedAt: '2026-11-08T00:00:00Z',
    };

    vi.spyOn(authService, 'getSession').mockResolvedValue(mockSession);
    vi.spyOn(profileService, 'getProfile').mockResolvedValue(mockProfile);

    await useAuthStore.getState().initialize();

    const state = useAuthStore.getState();
    expect(state.status).toBe('authenticated');
    expect(state.user?.id).toBe('u-100');
    expect(state.profile?.displayName).toBe('Commander Nook');
  });

  it('modal controls toggle activeModal and authView properly', () => {
    useAuthStore.getState().openAuthModal('register');
    expect(useAuthStore.getState().activeModal).toBe('auth');
    expect(useAuthStore.getState().authView).toBe('register');

    useAuthStore.getState().setAuthView('forgot_password');
    expect(useAuthStore.getState().authView).toBe('forgot_password');

    useAuthStore.getState().openProfileModal();
    expect(useAuthStore.getState().activeModal).toBe('profile');

    useAuthStore.getState().openSettingsModal();
    expect(useAuthStore.getState().activeModal).toBe('settings');

    useAuthStore.getState().closeModals();
    expect(useAuthStore.getState().activeModal).toBe('none');
  });

  it('clears state on signOut', async () => {
    useAuthStore.setState({
      status: 'authenticated',
      user: { id: 'u-1' } as any,
      profile: { displayName: 'User 1' } as any,
      session: { access_token: 'abc' } as any,
    });

    vi.spyOn(authService, 'signOut').mockResolvedValue(undefined);

    await useAuthStore.getState().signOut();

    const state = useAuthStore.getState();
    expect(state.status).toBe('unauthenticated');
    expect(state.user).toBeNull();
    expect(state.profile).toBeNull();
    expect(state.session).toBeNull();
  });
});
