import { create } from 'zustand';
import { isSupabaseConfigured } from '../../../infrastructure/supabase';
import { authService } from '../services/authService';
import { profileService } from '../services/profileService';
import {
  AccountModalType,
  AuthModalView,
  AuthState,
  LoginCredentials,
  RegisterCredentials,
  UpdateProfileInput,
  UserProfile,
} from '../types';

let isListenerAttached = false;

export const useAuthStore = create<AuthState>((set, get) => ({
  status: isSupabaseConfigured() ? 'loading' : 'unconfigured',
  user: null,
  profile: null,
  session: null,
  isConfigured: isSupabaseConfigured(),
  isLoading: false,
  error: null,
  activeModal: 'none',
  authView: 'login',
  pendingEmail: null,

  initialize: async () => {
    const configured = isSupabaseConfigured();
    set({ isConfigured: configured });

    if (!configured) {
      set({ status: 'unconfigured', isLoading: false });
      return;
    }

    set({ isLoading: true });

    try {
      const session = await authService.getSession();
      if (session && session.user) {
        set({
          session,
          user: session.user,
          status: 'authenticated',
          isLoading: false,
        });

        // Load profile in background
        try {
          const profile = await profileService.getProfile(session.user.id);
          if (profile) {
            set({ profile });
          } else {
            // Fallback profile representation if public.profiles row is still syncing
            const fallbackProfile: UserProfile = {
              id: session.user.id,
              email: session.user.email || '',
              displayName: session.user.user_metadata?.display_name || session.user.email?.split('@')[0] || null,
              avatarUrl: session.user.user_metadata?.avatar_url || null,
              bio: null,
              language: 'vi',
              theme: 'system',
              createdAt: session.user.created_at || new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            set({ profile: fallbackProfile });
          }
        } catch {
          // Non-critical: profile loading failed
        }
      } else {
        set({
          session: null,
          user: null,
          profile: null,
          status: 'unauthenticated',
          isLoading: false,
        });
      }

      // Attach singleton auth listener once
      if (!isListenerAttached) {
        isListenerAttached = true;
        authService.onAuthStateChange(async (event, newSession) => {
          if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
            if (newSession?.user) {
              set({
                session: newSession,
                user: newSession.user,
                status: 'authenticated',
              });
              const profile = await profileService.getProfile(newSession.user.id);
              if (profile) {
                set({ profile });
              }
            }
          } else if (event === 'SIGNED_OUT') {
            set({
              session: null,
              user: null,
              profile: null,
              status: 'unauthenticated',
              activeModal: 'none',
            });
          }
        });
      }
    } catch (err: any) {
      set({
        session: null,
        user: null,
        profile: null,
        status: 'unauthenticated',
        isLoading: false,
        error: err?.message || 'Failed to initialize session',
      });
    }
  },

  signIn: async (credentials: LoginCredentials) => {
    set({ isLoading: true, error: null });
    try {
      const { user, session } = await authService.signIn(credentials);
      set({
        user,
        session,
        status: 'authenticated',
        isLoading: false,
        activeModal: 'none',
        error: null,
      });

      // Load profile
      const profile = await profileService.getProfile(user.id);
      if (profile) {
        set({ profile });
      } else {
        const fallbackProfile: UserProfile = {
          id: user.id,
          email: user.email || '',
          displayName: user.user_metadata?.display_name || user.email?.split('@')[0] || null,
          avatarUrl: user.user_metadata?.avatar_url || null,
          bio: null,
          language: 'vi',
          theme: 'system',
          createdAt: user.created_at || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        set({ profile: fallbackProfile });
      }
      return true;
    } catch (err: any) {
      const msg = err?.message || 'auth.errors.genericLogin';
      set({ isLoading: false, error: msg });
      return false;
    }
  },

  signUp: async (credentials: RegisterCredentials) => {
    set({ isLoading: true, error: null });
    try {
      const { user, session } = await authService.signUp(credentials);
      if (session && user) {
        // Auto-confirmed session
        set({
          user,
          session,
          status: 'authenticated',
          isLoading: false,
          activeModal: 'none',
          error: null,
        });
        const profile = await profileService.getProfile(user.id);
        if (profile) set({ profile });
        return true;
      }

      // Email confirmation required
      set({
        isLoading: false,
        pendingEmail: credentials.email,
        authView: 'verification_pending',
        error: null,
      });
      return true;
    } catch (err: any) {
      const msg = err?.message || 'auth.errors.genericRegister';
      set({ isLoading: false, error: msg });
      return false;
    }
  },

  signOut: async () => {
    set({ isLoading: true, error: null });
    try {
      await authService.signOut();
    } catch {
      // Ignore network errors during sign out; local state is cleared
    } finally {
      set({
        session: null,
        user: null,
        profile: null,
        status: 'unauthenticated',
        isLoading: false,
        activeModal: 'none',
      });
    }
  },

  resetPassword: async (email: string) => {
    set({ isLoading: true, error: null });
    try {
      await authService.resetPassword(email);
      set({
        isLoading: false,
        pendingEmail: email,
        authView: 'reset_sent',
        error: null,
      });
      return true;
    } catch (err: any) {
      const msg = err?.message || 'auth.errors.genericReset';
      set({ isLoading: false, error: msg });
      return false;
    }
  },

  updateProfile: async (input: UpdateProfileInput) => {
    const { user, profile } = get();
    if (!user) return false;

    set({ isLoading: true, error: null });
    try {
      const updated = await profileService.updateProfile(user.id, input);
      set({ profile: updated, isLoading: false, error: null });
      return true;
    } catch (err: any) {
      // If public.profiles isn't setup in remote DB yet, update local state
      if (profile) {
        set({
          profile: {
            ...profile,
            displayName: input.displayName !== undefined ? input.displayName : profile.displayName,
            bio: input.bio !== undefined ? input.bio : profile.bio,
            avatarUrl: input.avatarUrl !== undefined ? input.avatarUrl : profile.avatarUrl,
            language: input.language || profile.language,
            theme: input.theme || profile.theme,
            updatedAt: new Date().toISOString(),
          },
          isLoading: false,
        });
        return true;
      }
      set({ isLoading: false, error: err?.message || 'auth.errors.profileUpdateFailed' });
      return false;
    }
  },

  openAuthModal: (view: AuthModalView = 'login') => {
    set({ activeModal: 'auth', authView: view, error: null, isLoading: false });
  },

  openProfileModal: () => {
    set({ activeModal: 'profile', error: null });
  },

  openSettingsModal: () => {
    set({ activeModal: 'settings', error: null });
  },

  closeModals: () => {
    set({ activeModal: 'none', error: null });
  },

  setAuthView: (view: AuthModalView) => {
    set({ authView: view, error: null });
  },

  clearError: () => {
    set({ error: null });
  },
}));
