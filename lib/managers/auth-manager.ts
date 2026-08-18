import { AuthUtility, type IAuthUtility } from '@/lib/utilities/auth-utility';
import { normalizeAuthError } from '@/lib/utilities/error-utility';

/** Outcome of an auth operation. `error` is already normalized for display. */
export type AuthResult = { ok: true } | { ok: false; error: string };

/** Fields the sign-up flow collects. */
export interface SignUpInput {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  repeatPassword: string;
}

/**
 * Orchestrates auth flows: validates input, performs the operation, and
 * normalizes failures into a discriminated {@link AuthResult} so callers render
 * errors without ever seeing a raw Supabase message.
 */
export class AuthManager {
  constructor(private readonly auth: IAuthUtility = new AuthUtility()) {}

  async signIn(email: string, password: string): Promise<AuthResult> {
    try {
      await this.auth.signInWithPassword(email, password);
      return { ok: true };
    } catch (error) {
      return { ok: false, error: normalizeAuthError(error) };
    }
  }

  async signUp(input: SignUpInput): Promise<AuthResult> {
    if (input.password !== input.repeatPassword) {
      return { ok: false, error: 'Passwords do not match.' };
    }
    try {
      await this.auth.signUp({
        email: input.email,
        password: input.password,
        metadata: { first_name: input.firstName, last_name: input.lastName },
      });
      return { ok: true };
    } catch (error) {
      return { ok: false, error: normalizeAuthError(error) };
    }
  }

  async requestPasswordReset(email: string): Promise<AuthResult> {
    try {
      await this.auth.resetPasswordForEmail(email);
      return { ok: true };
    } catch (error) {
      return { ok: false, error: normalizeAuthError(error) };
    }
  }

  async updatePassword(password: string): Promise<AuthResult> {
    try {
      await this.auth.updatePassword(password);
      return { ok: true };
    } catch (error) {
      return { ok: false, error: normalizeAuthError(error) };
    }
  }

  async signOut(): Promise<AuthResult> {
    try {
      await this.auth.signOut();
      return { ok: true };
    } catch (error) {
      return { ok: false, error: normalizeAuthError(error) };
    }
  }
}

/** Shared instance wired with the real auth utility. */
export const authManager = new AuthManager();
