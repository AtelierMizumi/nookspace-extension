import type { Session, User } from '@supabase/supabase-js';

export interface UserProfile {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  language: 'en' | 'vi';
  theme: 'dark' | 'light' | 'system';
  createdAt: string;
  updatedAt: string;
}

export type AuthStatus = 'unauthenticated' | 'authenticated' | 'loading' | 'unconfigured';

export type AuthModalView = 'login' | 'register' | 'forgot_password' | 'verification_pending' | 'reset_sent';

export type AccountModalType = 'none' | 'auth' | 'profile' | 'settings';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  confirmPassword?: string;
  displayName?: string;
}

export interface ResetPasswordCredentials {
  email: string;
}

export interface UpdateProfileInput {
  displayName?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  language?: 'en' | 'vi';
  theme?: 'dark' | 'light' | 'system';
}

export interface AuthState {
  status: AuthStatus;
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  isConfigured: boolean;
  isLoading: boolean;
  error: string | null;
  activeModal: AccountModalType;
  authView: AuthModalView;
  pendingEmail: string | null;

  // Actions
  initialize: () => Promise<void>;
  signIn: (credentials: LoginCredentials) => Promise<boolean>;
  signUp: (credentials: RegisterCredentials) => Promise<boolean>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<boolean>;
  updateProfile: (input: UpdateProfileInput) => Promise<boolean>;
  openAuthModal: (view?: AuthModalView) => void;
  openProfileModal: () => void;
  openSettingsModal: () => void;
  closeModals: () => void;
  setAuthView: (view: AuthModalView) => void;
  clearError: () => void;
}
