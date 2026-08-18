import { createClient } from '@/lib/supabase/client';
import { AUTH_REDIRECT_PATH } from '@/lib/site';

/** Parameters for a sign-up. `metadata` is passed through to `raw_user_meta_data`. */
export interface SignUpParams {
  email: string;
  password: string;
  metadata?: Record<string, unknown>;
}

/**
 * The one place `supabase.auth.*` is called from application code. `AuthManager`
 * uses this. It also owns Supabase-specific details such as the post-auth email
 * redirect URL, so nothing above it needs to know them. Action methods throw on
 * failure; the caller decides how to present it.
 */
export interface IAuthUtility {
  /** The current authenticated user's id (the `sub` claim), or null. */
  getCurrentUserId(): Promise<string | null>;
  signInWithPassword(email: string, password: string): Promise<void>;
  signUp(params: SignUpParams): Promise<void>;
  resetPasswordForEmail(email: string): Promise<void>;
  updatePassword(password: string): Promise<void>;
  signOut(): Promise<void>;
}

/** Centralizes Supabase auth access so auth handling lives in one place. */
export class AuthUtility implements IAuthUtility {
  async getCurrentUserId(): Promise<string | null> {
    const supabase = createClient();
    const { data, error } = await supabase.auth.getClaims();

    if (error || !data?.claims) return null;
    return data.claims.sub ?? null;
  }

  async signInWithPassword(email: string, password: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  }

  async signUp({ email, password, metadata }: SignUpParams): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}${AUTH_REDIRECT_PATH}`,
        data: metadata,
      },
    });
    if (error) throw error;
  }

  async resetPasswordForEmail(email: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/update-password`,
    });
    if (error) throw error;
  }

  async updatePassword(password: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
  }

  async signOut(): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }
}
