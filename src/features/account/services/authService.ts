import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js';
import { getSupabaseClient } from '../../../infrastructure/supabase';
import { LoginCredentials, RegisterCredentials } from '../types';

export class AuthService {
  /**
   * Signs in a user using email and password.
   */
  async signIn(credentials: LoginCredentials): Promise<{ user: User; session: Session }> {
    const client = getSupabaseClient();
    if (!client) {
      throw new Error('AUTH_UNCONFIGURED');
    }

    const { data, error } = await client.auth.signInWithPassword({
      email: credentials.email.trim(),
      password: credentials.password,
    });

    if (error) {
      throw error;
    }

    if (!data.user || !data.session) {
      throw new Error('NO_SESSION_RETURNED');
    }

    return { user: data.user, session: data.session };
  }

  /**
   * Registers a new user with email, password, and optional metadata.
   */
  async signUp(credentials: RegisterCredentials): Promise<{ user: User | null; session: Session | null }> {
    const client = getSupabaseClient();
    if (!client) {
      throw new Error('AUTH_UNCONFIGURED');
    }

    const { data, error } = await client.auth.signUp({
      email: credentials.email.trim(),
      password: credentials.password,
      options: {
        data: {
          display_name: credentials.displayName?.trim() || undefined,
        },
      },
    });

    if (error) {
      throw error;
    }

    return { user: data.user, session: data.session };
  }

  /**
   * Signs out the current user session and clears storage tokens.
   */
  async signOut(): Promise<void> {
    const client = getSupabaseClient();
    if (!client) {
      return;
    }

    const { error } = await client.auth.signOut();
    if (error) {
      throw error;
    }
  }

  /**
   * Requests a password reset email from Supabase.
   */
  async resetPassword(email: string): Promise<void> {
    const client = getSupabaseClient();
    if (!client) {
      throw new Error('AUTH_UNCONFIGURED');
    }

    const { error } = await client.auth.resetPasswordForEmail(email.trim());
    if (error) {
      throw error;
    }
  }

  /**
   * Retrieves the current persisted session, if available.
   */
  async getSession(): Promise<Session | null> {
    const client = getSupabaseClient();
    if (!client) {
      return null;
    }

    const { data, error } = await client.auth.getSession();
    if (error) {
      return null;
    }

    return data.session;
  }

  /**
   * Subscribes to Supabase authentication state transitions.
   */
  onAuthStateChange(callback: (event: AuthChangeEvent, session: Session | null) => void): { unsubscribe: () => void } {
    const client = getSupabaseClient();
    if (!client) {
      return { unsubscribe: () => {} };
    }

    const { data: { subscription } } = client.auth.onAuthStateChange(callback);
    return {
      unsubscribe: () => subscription.unsubscribe(),
    };
  }
}

export const authService = new AuthService();
